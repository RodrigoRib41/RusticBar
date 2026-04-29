export type MenuItem = {
  name: string;
  description: string;
  price: string;
  image: string;
  badge?: string;
};

export type MenuGroup = {
  title: string;
  note?: string;
  items: MenuItem[];
};

export type MenuSection = {
  slug: "comidas" | "bebidas" | "postres";
  title: string;
  note: string;
  groups: MenuGroup[];
};

const image = (photoId: string) =>
  `https://unsplash.com/photos/${photoId}/download?force=true&w=720`;

export const menuSections: MenuSection[] = [
  {
    slug: "comidas",
    title: "Comidas",
    note: "Clasicos de pub, minutas y platos para compartir",
    groups: [
      {
        title: "Para picar",
        note: "Ideales para compartir en la mesa",
        items: [
          {
            name: "Papas Rustic",
            description: "Papas doradas, cheddar, panceta crocante y verdeo.",
            price: "$8.900",
            image: image("mFPlHlDLtUA"),
            badge: "Popular",
          },
          {
            name: "Papas provenzal",
            description: "Papas baston con ajo, perejil y dip de mayonesa casera.",
            price: "$7.500",
            image: image("vi0kZuoe0-8"),
          },
          {
            name: "Nachos del pub",
            description: "Totopos, carne especiada, cheddar, pico de gallo y crema.",
            price: "$10.200",
            image: image("FUmVP6PSSSs"),
          },
          {
            name: "Rabas con alioli",
            description: "Rabas tiernas con limon y alioli de la casa.",
            price: "$12.500",
            image: image("COtv-D5osKA"),
          },
          {
            name: "Bastones de muzza",
            description: "Mozzarella rebozada, salsa fileto y toque de oregano.",
            price: "$8.700",
            image: image("3AoHmfsKPa8"),
          },
        ],
      },
      {
        title: "Milanesas",
        note: "Salen con papas fritas o pure",
        items: [
          {
            name: "Mila napolitana",
            description: "Milanesa de carne, jamon, muzzarella, tomate y oregano.",
            price: "$12.900",
            image: image("774GQuMpFnQ"),
            badge: "Clasica",
          },
          {
            name: "Mila cheddar",
            description: "Cheddar fundido, panceta crocante y verdeo.",
            price: "$13.800",
            image: image("Q9vMQoNm0bM"),
          },
          {
            name: "Mila fugazzeta",
            description: "Muzzarella, cebolla salteada y lluvia de oregano.",
            price: "$13.400",
            image: image("NO-ewxS6tGY"),
          },
          {
            name: "Suprema Rustic",
            description: "Suprema de pollo con salsa cremosa, champis y papas.",
            price: "$13.200",
            image: image("dRx5_RaePIo"),
          },
        ],
      },
      {
        title: "Hamburguesas",
        note: "Todas salen con papas",
        items: [
          {
            name: "Rustic Burger",
            description: "Doble carne, cheddar, panceta, cebolla crispy y BBQ.",
            price: "$11.900",
            image: image("GzdWvD7ADWU"),
            badge: "Recomendada",
          },
          {
            name: "Smash Clasica",
            description: "Carne smash, queso americano, pickles y salsa secreta.",
            price: "$9.800",
            image: image("0aYRypre3g4"),
          },
          {
            name: "Blue Cheese",
            description: "Doble carne, queso azul, cebolla caramelizada y rucula.",
            price: "$12.600",
            image: image("B2E7uN08CEk"),
          },
          {
            name: "Veggie Pub",
            description: "Medallon veggie, queso, tomate, rucula y mayo ahumada.",
            price: "$9.500",
            image: image("yE9Rq_KGrLI"),
          },
        ],
      },
      {
        title: "Minutas",
        note: "Rapidas, abundantes y bien de barra",
        items: [
          {
            name: "Lomito completo",
            description: "Lomo, jamon, queso, huevo, lechuga, tomate y papas.",
            price: "$12.400",
            image: image("076m8JMwBsI"),
          },
          {
            name: "Tostado mixto",
            description: "Jamon y queso en pan de miga tostado con papas pay.",
            price: "$6.900",
            image: image("4NQrFtFBIaI"),
          },
          {
            name: "Pizza muzzarella",
            description: "Salsa de tomate, muzzarella, aceitunas y oregano.",
            price: "$9.900",
            image: image("DPrldCuaoJ8"),
          },
        ],
      },
    ],
  },
  {
    slug: "bebidas",
    title: "Bebidas",
    note: "Sin alcohol, cervezas, tragos y clasicos de boliche",
    groups: [
      {
        title: "Sin alcohol",
        items: [
          {
            name: "Gaseosa",
            description: "Linea Coca-Cola, vaso o botella segun disponibilidad.",
            price: "$2.900",
            image: image("uurg0rkdNjE"),
          },
          {
            name: "Agua mineral",
            description: "Con o sin gas.",
            price: "$2.400",
            image: image("n9cmgm5xcgE"),
          },
          {
            name: "Limonada Rustic",
            description: "Limon, menta, jengibre y almibar suave.",
            price: "$3.800",
            image: image("DTlDH3jF89k"),
          },
          {
            name: "Pomelada",
            description: "Pomelo exprimido, soda y toque de menta.",
            price: "$3.900",
            image: image("Xf6Uc2rHp74"),
          },
        ],
      },
      {
        title: "Cervezas",
        items: [
          {
            name: "Pinta artesanal",
            description: "Consultanos por los estilos disponibles de la noche.",
            price: "$4.200",
            image: image("3Mcn6WhJVds"),
            badge: "Tirada",
          },
          {
            name: "Media pinta",
            description: "Ideal para probar estilos.",
            price: "$2.900",
            image: image("WoVLtEVuWUg"),
          },
          {
            name: "Balde x6",
            description: "Seis botellas o latas seleccionadas.",
            price: "$18.500",
            image: image("RuHMDFzKpgs"),
          },
          {
            name: "Corona",
            description: "Botella con lima.",
            price: "$5.900",
            image: image("D6ZEf2YBqfE"),
          },
        ],
      },
      {
        title: "Tragos",
        items: [
          {
            name: "Fernet con cola",
            description: "Clasico de barra servido en vaso largo.",
            price: "$5.800",
            image: image("KtsmfnTyhTg"),
            badge: "Clasico",
          },
          {
            name: "Gin tonic",
            description: "Gin, tonica premium y botanicos de estacion.",
            price: "$6.900",
            image: image("AquVFyceuXk"),
          },
          {
            name: "Campari orange",
            description: "Campari, jugo de naranja y rodaja citrica.",
            price: "$6.200",
            image: image("nY5DJyAcxE4"),
          },
          {
            name: "Aperol spritz",
            description: "Aperol, espumante, soda y naranja.",
            price: "$7.200",
            image: image("58BUJo2VvyE"),
          },
          {
            name: "Mojito",
            description: "Ron, lima, menta, azucar y soda.",
            price: "$6.800",
            image: image("T5Xqblq5KNk"),
          },
          {
            name: "Cuba libre",
            description: "Ron, cola y lima.",
            price: "$5.900",
            image: image("KtsmfnTyhTg"),
          },
        ],
      },
      {
        title: "Boliche",
        note: "Botellas y combos para la noche",
        items: [
          {
            name: "Vodka con energizante",
            description: "Botella de vodka con 4 energizantes.",
            price: "$42.000",
            image: image("T3fZK2TW9h0"),
          },
          {
            name: "Champagne",
            description: "Botella fria para la mesa.",
            price: "$28.000",
            image: image("8a63U2IOCy0"),
          },
          {
            name: "Whisky importado",
            description: "Botella con hielo y mixer a eleccion.",
            price: "$55.000",
            image: image("eEvdnaLCTjM"),
          },
          {
            name: "Shots x6",
            description: "Ronda de shots dulces o fuertes.",
            price: "$12.000",
            image: image("CXOLY7UXSV4"),
            badge: "Ronda",
          },
        ],
      },
    ],
  },
  {
    slug: "postres",
    title: "Postres",
    note: "Final dulce para cerrar la ronda",
    groups: [
      {
        title: "Dulces",
        items: [
          {
            name: "Brownie tibio",
            description: "Con helado de crema americana y salsa de chocolate.",
            price: "$5.500",
            image: image("yacMYOlyvpw"),
          },
          {
            name: "Flan casero",
            description: "Con dulce de leche y crema.",
            price: "$4.800",
            image: image("PerJ_q-EuKw"),
          },
          {
            name: "Panqueque con dulce",
            description: "Panqueque caliente con dulce de leche y azucar impalpable.",
            price: "$5.200",
            image: image("H_tbutCB-rU"),
          },
          {
            name: "Copa helada",
            description: "Dos bochas, crema, salsa y crocante.",
            price: "$5.900",
            image: image("IsdL4-vMA3I"),
          },
        ],
      },
    ],
  },
];

export const getMenuSection = (slug: MenuSection["slug"]) =>
  menuSections.find((section) => section.slug === slug);

export const getSectionCover = (section: MenuSection) => section.groups[0].items[0].image;
