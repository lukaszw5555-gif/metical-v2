import type { PvComponent, CreatePvComponentInput, PvComponentCategory } from '../types/pvComponentTypes';
import { PV_COMPONENT_CSV_COLUMNS, PV_COMPONENT_CSV_TEMPLATE_COLUMNS, PV_COMPONENT_CATEGORIES } from '../types/pvComponentTypes';

const SEP = ';';

// ─── Export CSV ──────────────────────────────────────────

export function exportComponentsCsv(components: PvComponent[]) {
  const header = PV_COMPONENT_CSV_COLUMNS.join(SEP);

  const rows = components.map(c =>
    PV_COMPONENT_CSV_COLUMNS.map(col => {
      const val = c[col as keyof PvComponent];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      const str = String(val);
      // Escape fields containing separator, quotes, or newlines
      if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(SEP)
  );

  const bom = '\uFEFF'; // BOM for Excel UTF-8 detection
  const csv = bom + [header, ...rows].join('\r\n');

  downloadFile(csv, `pv_components_${formatDate()}.csv`, 'text/csv;charset=utf-8');
}

// ─── Download Template ──────────────────────────────────

export function downloadTemplateCsv() {
  const bom = '\uFEFF';
  const header = PV_COMPONENT_CSV_TEMPLATE_COLUMNS.join(SEP);
  const csv = bom + header + '\r\n';
  downloadFile(csv, `pv_components_szablon.csv`, 'text/csv;charset=utf-8');
}

// ─── Parse CSV ──────────────────────────────────────────

export interface CsvParseResult {
  newRows: CreatePvComponentInput[];
  updateRows: { id: string; data: Partial<CreatePvComponentInput> }[];
  errors: string[];
  skipped: number;
}

export function parseCsvFile(text: string, existingIds: Set<string>): CsvParseResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result: CsvParseResult = { newRows: [], updateRows: [], errors: [], skipped: 0 };

  if (lines.length < 2) {
    result.errors.push('Plik CSV jest pusty lub nie zawiera danych.');
    return result;
  }

  const headerLine = lines[0].trim();
  const headers = parseCsvLine(headerLine);
  const headerMap = new Map<string, number>();
  headers.forEach((h, i) => headerMap.set(h.toLowerCase().trim(), i));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    const rowNum = i + 1;

    const get = (col: string): string => {
      const idx = headerMap.get(col.toLowerCase());
      return idx !== undefined && idx < fields.length ? fields[idx].trim() : '';
    };

    // Validate required fields
    const category = get('category');
    const tradeName = get('trade_name');
    let unit = get('unit');

    if (!category) { result.errors.push(`Wiersz ${rowNum}: brak kategorii.`); result.skipped++; continue; }
    if (!tradeName) { result.errors.push(`Wiersz ${rowNum}: brak nazwy handlowej (trade_name).`); result.skipped++; continue; }

    // Validate category
    if (!PV_COMPONENT_CATEGORIES.includes(category as PvComponentCategory)) {
      result.errors.push(`Wiersz ${rowNum}: nieznana kategoria "${category}".`);
      result.skipped++;
      continue;
    }

    // Defaults
    if (!unit) unit = 'szt.';
    const activeStr = get('active');
    const active = activeStr === '' || activeStr.toLowerCase() === 'true' || activeStr === '1';
    const vatRate = parseNum(get('vat_rate'), 23);
    const purchasePrice = parseNum(get('purchase_price'), 0);
    const sellingPrice = parseNum(get('selling_price'), 0);

    const row: CreatePvComponentInput = {
      category: category as PvComponentCategory,
      manufacturer: get('manufacturer') || null,
      model: get('model') || null,
      trade_name: tradeName,
      unit,
      param1: get('param1') || null,
      param2: get('param2') || null,
      description: get('description') || null,
      active,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      vat_rate: vatRate,
      power_w: get('power_w') ? parseFloat(get('power_w')) : null,
      capacity_kwh: get('capacity_kwh') ? parseFloat(get('capacity_kwh')) : null,
      notes: get('notes') || null,
    };

    const id = get('id');
    if (id && existingIds.has(id)) {
      result.updateRows.push({ id, data: row });
    } else {
      result.newRows.push(row);
    }
  }

  return result;
}

// ─── Helpers ────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === SEP) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseNum(val: string, fallback: number): number {
  if (!val) return fallback;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
