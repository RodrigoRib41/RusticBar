import { BarDailyRevenue } from "@prisma/client";
import { prisma } from "./prisma";
import { getTodayDateString } from "./reservations";

export type BalanceFilters = {
  endDate?: string;
  startDate?: string;
};

export type DailyRevenueView = {
  closedTables: number;
  date: string;
  total: number;
};

export type BalanceView = {
  days: DailyRevenueView[];
  endDate: string;
  startDate: string;
  total: number;
};

export class BalanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "BalanceError";
  }
}

export function parseBalanceFilters(searchParams: URLSearchParams): BalanceFilters {
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const filters = {
    endDate: endDate ? parseDateString(endDate) : undefined,
    startDate: startDate ? parseDateString(startDate) : undefined,
  };

  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    throw new BalanceError("invalid_range", "La fecha desde no puede ser posterior a la fecha hasta.");
  }

  return filters;
}

export function parseBalanceResetInput(payload: unknown) {
  const body = asRecord(payload);
  const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";

  if (confirmation !== "Confirmar") {
    throw new BalanceError("invalid_confirmation", "Escribi Confirmar para borrar el historial.", 400);
  }
}

export async function getBalance(filters: BalanceFilters = {}): Promise<BalanceView> {
  const startDate = filters.startDate ? parseDateString(filters.startDate) : undefined;
  const endDate = filters.endDate ? parseDateString(filters.endDate) : undefined;
  const rows = await prisma.barDailyRevenue.findMany({
    orderBy: {
      date: "asc",
    },
    where: {
      total: {
        gt: 0,
      },
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { gte: dateToDatabaseValue(startDate) } : {}),
              ...(endDate ? { lte: dateToDatabaseValue(endDate) } : {}),
            },
          }
        : {}),
    },
  });
  const days = rows.map(serializeDailyRevenue);
  const today = getTodayDateString();

  return {
    days,
    endDate: endDate ?? days.at(-1)?.date ?? startDate ?? today,
    startDate: startDate ?? days[0]?.date ?? endDate ?? today,
    total: days.reduce((sum, day) => sum + day.total, 0),
  };
}

export async function resetBalanceHistory() {
  const deleted = await prisma.barDailyRevenue.deleteMany();

  return deleted.count;
}

export function createBalanceExcel(balance: BalanceView) {
  const rows = [
    ...balance.days.map((day) => ({
      closedTables: day.closedTables,
      date: day.date,
      total: day.total,
    })),
    {
      closedTables: balance.days.reduce((sum, day) => sum + day.closedTables, 0),
      date: "Total",
      total: balance.total,
    },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#FBBF24" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Money"><NumberFormat ss:Format="&quot;$&quot;#,##0"/></Style>
    <Style ss:ID="Total"><Font ss:Bold="1"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="Balance">
    <Table>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Ingresos</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Mesas cerradas</Data></Cell>
      </Row>
      ${rows
        .map(
          (row, index) => `
      <Row>
        <Cell${index === rows.length - 1 ? ' ss:StyleID="Total"' : ""}><Data ss:Type="String">${escapeXml(row.date)}</Data></Cell>
        <Cell ss:StyleID="${index === rows.length - 1 ? "Total" : "Money"}"><Data ss:Type="Number">${row.total}</Data></Cell>
        <Cell${index === rows.length - 1 ? ' ss:StyleID="Total"' : ""}><Data ss:Type="Number">${row.closedTables}</Data></Cell>
      </Row>`,
        )
        .join("")}
    </Table>
  </Worksheet>
</Workbook>`;
}

function serializeDailyRevenue(row: BarDailyRevenue): DailyRevenueView {
  return {
    closedTables: row.closedTables,
    date: databaseDateToString(row.date),
    total: row.total,
  };
}

function parseDateString(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BalanceError("invalid_date", "Ingresa una fecha valida.");
  }

  const parsed = dateToDatabaseValue(date);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new BalanceError("invalid_date", "Ingresa una fecha valida.");
  }

  return date;
}

function dateToDatabaseValue(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function databaseDateToString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
