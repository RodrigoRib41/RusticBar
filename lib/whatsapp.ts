export type OtpDeliveryResult =
  | {
      channel: "whatsapp";
      messageId?: string;
      to: string;
    }
  | {
      channel: "mock";
      mockOtp: string;
      to: string;
    };

type WhatsAppMessageResponse = {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
  };
};

type WhatsAppTemplateComponent =
  | {
      type: "body";
      parameters: Array<{
        type: "text";
        text: string;
      }>;
    }
  | {
      type: "button";
      sub_type: string;
      index: string;
      parameters: Array<{
        type: "text";
        text: string;
      }>;
    };

export class OtpDeliveryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OtpDeliveryError";
  }
}

export async function sendOtpByWhatsApp(phone: string, token: string): Promise<OtpDeliveryResult> {
  const recipient = toWhatsAppRecipient(phone);

  if (!hasWhatsAppCredentials()) {
    if (process.env.MOCK_OTP !== "false") {
      console.info(`[reservas:otp:mock] WhatsApp ${recipient} -> ${token}`);

      return {
        channel: "mock",
        mockOtp: token,
        to: recipient,
      };
    }

    throw new OtpDeliveryError(
      "missing_whatsapp_config",
      "Falta configurar WhatsApp Cloud API para enviar el codigo.",
    );
  }

  const payload = buildOtpTemplatePayload(recipient, token);
  const response = await fetch(getMessagesEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as WhatsAppMessageResponse;

  if (!response.ok) {
    const details = data.error?.message ?? `WhatsApp respondio con HTTP ${response.status}.`;
    throw new OtpDeliveryError("whatsapp_delivery_failed", details);
  }

  return {
    channel: "whatsapp",
    messageId: data.messages?.[0]?.id,
    to: recipient,
  };
}

function buildOtpTemplatePayload(to: string, token: string) {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? "authentication_code_copy_code_button";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "es_AR";
  const components: WhatsAppTemplateComponent[] = [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: token,
        },
      ],
    },
  ];

  if (process.env.WHATSAPP_TEMPLATE_HAS_OTP_BUTTON !== "false") {
    components.push({
      type: "button",
      sub_type: process.env.WHATSAPP_TEMPLATE_BUTTON_SUBTYPE ?? "url",
      index: process.env.WHATSAPP_TEMPLATE_BUTTON_INDEX ?? "0",
      parameters: [
        {
          type: "text",
          text: token,
        },
      ],
    });
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  };
}

function getMessagesEndpoint() {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v24.0";

  return `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

function hasWhatsAppCredentials() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function toWhatsAppRecipient(phone: string) {
  return phone.replace(/\D/g, "");
}
