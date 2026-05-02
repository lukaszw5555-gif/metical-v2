// @ts-ignore – Deno runtime
import type { TDocumentDefinitions } from "npm:pdfmake/interfaces";

export interface OfferData {
  offer_number: string | null;
  offer_type: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_city?: string;
  investment_address?: string;
  pv_power_kw?: number;
  panel_power_w?: number;
  panel_count?: number;
  inverter_name?: string;
  valid_until?: string;
  created_at?: string;
  vat_rate?: number;
  price_gross?: number;
  offer_note?: string;
  items: Array<{
    category: string;
    manufacturer?: string;
    trade_name: string;
    unit: string;
    quantity: number;
    power_w?: number;
    capacity_kwh?: number;
  }>;
}

const C = {
  dark: "#1A1A2E",
  darkMid: "#23233C",
  gold: "#C9A84C",
  goldLight: "#E8D48B",
  text: "#1E1E3A",
  muted: "#7A7A9A",
  light: "#F5F5FA",
  border: "#E6E6F0",
  white: "#FFFFFF",
};

const OFFER_TYPE_PL: Record<string, string> = {
  pv: "Fotowoltaika",
  pv_me: "Fotowoltaika + Magazyn energii",
  me: "Magazyn energii",
  individual: "Oferta indywidualna",
};

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function createOfferDefinition(data: OfferData): TDocumentDefinitions {
  const { offer, items } = { offer: data, items: data.items };

  const storageKwh = items
    .filter((i) => i.category === "Magazyny energii" && i.capacity_kwh && i.capacity_kwh > 0)
    .reduce((s, i) => s + (i.capacity_kwh || 0) * i.quantity, 0);

  const badges: string[] = [];
  if (offer.pv_power_kw && offer.pv_power_kw > 0) badges.push(`${offer.pv_power_kw} kWp`);
  if (offer.panel_count) badges.push(`${offer.panel_count} paneli`);
  if (storageKwh > 0) badges.push(`Magazyn ${storageKwh.toFixed(1)} kWh`);
  badges.push("Dostawa komponentów");
  badges.push("Montaż i uruchomienie");
  badges.push("Konfiguracja systemu");

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: C.text,
    },
    background: function (currentPage) {
      if (currentPage === 1) {
        return [
          {
            canvas: [
              { type: "rect", x: 0, y: 0, w: 595, h: 300, color: C.dark },
              { type: "rect", x: 0, y: 0, w: 595, h: 5, color: C.gold },
            ],
          },
        ];
      }
      return [
        {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 595, h: 5, color: C.gold },
          ],
        },
      ];
    },
    footer: function (currentPage, pageCount) {
      return {
        stack: [
          {
            canvas: [{ type: "rect", x: 0, y: 0, w: 595, h: 30, color: C.dark }],
          },
          {
            text: "METICAL Sp. z o.o.",
            alignment: "center",
            fontSize: 7,
            bold: true,
            color: C.gold,
            margin: [0, -20, 0, 0],
          },
          {
            text: `Strona ${currentPage} z ${pageCount}`,
            alignment: "right",
            fontSize: 7,
            color: C.muted,
            margin: [0, -20, 40, 0],
          },
        ],
      };
    },
    content: [
      // ─── PAGE 1: COVER ──────────────────────────────────────────────────
      {
        text: "METICAL",
        fontSize: 32,
        bold: true,
        color: C.gold,
        margin: [0, 20, 0, 0],
      },
      {
        text: "OFERTA HANDLOWA",
        fontSize: 10,
        color: C.goldLight,
        margin: [0, 2, 0, 0],
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 5, x2: 120, y2: 5, lineWidth: 1, lineColor: C.gold }],
      },
      {
        text: (OFFER_TYPE_PL[offer.offer_type] || offer.offer_type).toUpperCase(),
        fontSize: 8,
        bold: true,
        color: C.gold,
        margin: [0, 20, 0, 0],
      },

      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            stack: [
              {
                columns: [
                  { text: "Nr oferty:", width: 70, color: "#A0A0B9" },
                  { text: offer.offer_number || "--", width: 100, bold: true, color: C.white },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                columns: [
                  { text: "Data:", width: 70, color: "#A0A0B9" },
                  { text: fmtDate(offer.created_at), width: 100, bold: true, color: C.white },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                columns: [
                  { text: "Ważna do:", width: 70, color: "#A0A0B9" },
                  { text: fmtDate(offer.valid_until), width: 100, bold: true, color: C.white },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                columns: [
                  { text: "Klient:", width: 70, color: "#A0A0B9" },
                  { text: offer.customer_name, width: 100, bold: true, color: C.white },
                ],
                margin: [0, 0, 0, 4],
              },
            ],
            margin: [0, -50, 0, 0],
          },
        ],
      },

      {
        text: offer.customer_name,
        fontSize: 18,
        bold: true,
        color: C.white,
        margin: [0, 60, 0, 0],
      },
      {
        text: offer.investment_address || "",
        fontSize: 9,
        color: "#A0A0B9",
        margin: [0, 4, 0, 0],
      },

      // Price Card
      {
        stack: [
          {
            canvas: [
              {
                type: "rect",
                x: 0,
                y: 0,
                w: 515,
                h: 120,
                r: 6,
                color: C.darkMid,
              },
              {
                type: "rect",
                x: 150,
                y: 0,
                w: 215,
                h: 3,
                color: C.gold,
              },
            ],
          },
          {
            text: "CENA KOŃCOWA BRUTTO",
            alignment: "center",
            fontSize: 9,
            bold: true,
            color: C.gold,
            margin: [0, -100, 0, 0],
          },
          {
            text: fmtCurrency(offer.price_gross || 0),
            alignment: "center",
            fontSize: 32,
            bold: true,
            color: C.white,
            margin: [0, 10, 0, 0],
          },
          {
            text: `Cena zawiera VAT ${offer.vat_rate || 8}%`,
            alignment: "center",
            fontSize: 9,
            color: "#9696AF",
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 60, 0, 0],
      },

      // Scope summary
      {
        columns: badges.map((b) => ({
          width: "auto",
          stack: [
            {
              text: b,
              fontSize: 7.5,
              background: C.light,
              margin: [4, 4, 4, 4],
            },
          ],
          margin: [0, 0, 5, 5],
        })),
        margin: [0, 20, 0, 0],
        columnGap: 5,
      },

      { text: "", pageBreak: "after" },

      // ─── PAGE 2: DETAILS ────────────────────────────────────────────────
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "DANE KLIENTA", fontSize: 8.5, bold: true, color: C.gold, margin: [0, 0, 0, 4] },
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: C.gold }] },
              { text: "Klient", fontSize: 7, color: C.muted, margin: [0, 8, 0, 0] },
              { text: offer.customer_name, fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
              { text: "Telefon", fontSize: 7, color: C.muted, margin: [0, 6, 0, 0] },
              { text: offer.customer_phone || "--", fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
              { text: "E-mail", fontSize: 7, color: C.muted, margin: [0, 6, 0, 0] },
              { text: offer.customer_email || "--", fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
              { text: "Miejscowość", fontSize: 7, color: C.muted, margin: [0, 6, 0, 0] },
              { text: offer.customer_city || "--", fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "PARAMETRY TECHNICZNE", fontSize: 8.5, bold: true, color: C.gold, margin: [0, 0, 0, 4] },
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: C.gold }] },
              { text: "Moc instalacji", fontSize: 7, color: C.muted, margin: [0, 8, 0, 0] },
              { text: `${offer.pv_power_kw || 0} kWp`, fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
              { text: "Liczba paneli", fontSize: 7, color: C.muted, margin: [0, 6, 0, 0] },
              { text: `${offer.panel_count || 0} szt.`, fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
              { text: "Falownik", fontSize: 7, color: C.muted, margin: [0, 6, 0, 0] },
              { text: offer.inverter_name || "--", fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
              { text: "Magazyn energii", fontSize: 7, color: C.muted, margin: [0, 6, 0, 0] },
              { text: storageKwh > 0 ? `${storageKwh.toFixed(1)} kWh` : "Brak", fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 30],
      },

      { text: "ZAKRES DOSTAWY", fontSize: 8.5, bold: true, color: C.gold, margin: [0, 0, 0, 4] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: C.gold }] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 100, 40, 40],
          body: [
            [
              { text: "Element / zakres", style: "tableHeader" },
              { text: "Producent", style: "tableHeader" },
              { text: "Ilość", style: "tableHeader", alignment: "right" },
              { text: "J.m.", style: "tableHeader" },
            ],
            ...items.map((item) => [
              { text: item.trade_name, style: "tableCell" },
              { text: item.manufacturer || "--", style: "tableCell" },
              { text: String(item.quantity), style: "tableCell", alignment: "right" },
              { text: item.unit, style: "tableCell" },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.1),
          vLineWidth: () => 0,
          hLineColor: () => C.border,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          fillColor: (i) => (i > 0 && i % 2 === 0 ? C.light : null),
        },
        margin: [0, 10, 0, 30],
      },

      { text: "WARUNKI HANDLOWE", fontSize: 8.5, bold: true, color: C.gold, margin: [0, 0, 0, 4] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: C.gold }] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Ważność oferty", fontSize: 7, color: C.muted, margin: [0, 8, 0, 0] },
              { text: fmtDate(offer.valid_until), fontSize: 9, bold: true },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Czas realizacji", fontSize: 7, color: C.muted, margin: [0, 8, 0, 0] },
              { text: "Do ustalenia po akceptacji", fontSize: 9, bold: true },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      {
        text: "Kolejny krok:",
        bold: true,
        margin: [0, 10, 0, 2],
      },
      {
        text: "Potwierdzenie zakresu, dostępności komponentów i terminu montażu.",
        fontSize: 9,
      },

      {
        columns: [
          {
            width: "*",
            stack: [
              { canvas: [{ type: "line", x1: 0, y1: 50, x2: 180, y2: 50, lineWidth: 0.5, lineColor: C.muted }] },
              { text: "Podpis handlowca", alignment: "center", fontSize: 7, color: C.muted, margin: [0, 5, 0, 0] },
            ],
            margin: [0, 40, 20, 0],
          },
          {
            width: "*",
            stack: [
              { canvas: [{ type: "line", x1: 0, y1: 50, x2: 180, y2: 50, lineWidth: 0.5, lineColor: C.muted }] },
              { text: "Podpis klienta", alignment: "center", fontSize: 7, color: C.muted, margin: [0, 5, 0, 0] },
            ],
            margin: [20, 40, 0, 0],
          },
        ],
      },

      {
        text: "Oferta ma charakter informacyjny i wymaga potwierdzenia dostępności komponentów oraz warunków montażu po wizji lokalnej lub analizie technicznej.",
        fontSize: 7,
        color: C.muted,
        alignment: "center",
        margin: [0, 40, 0, 0],
      },
    ],
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: C.white,
        fillColor: C.dark,
      },
      tableCell: {
        fontSize: 8,
      },
    },
  };
}
