import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CellValue, Dataset } from '../types';

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function coerce(v: unknown): CellValue {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
}

function toDataset(name: string, grid: unknown[][], firstRowHeader: boolean): Dataset {
  const cleaned = grid.filter((r) => r.some((c) => c !== null && c !== undefined && c !== ''));
  if (cleaned.length === 0) {
    return { id: uid('ds'), name, columns: ['A'], rows: [[null]] };
  }
  const width = Math.max(...cleaned.map((r) => r.length));
  let columns: string[];
  let body: unknown[][];
  if (firstRowHeader) {
    columns = Array.from({ length: width }, (_, i) => {
      const h = cleaned[0][i];
      return h === null || h === undefined || h === '' ? `Col${i + 1}` : String(h);
    });
    body = cleaned.slice(1);
  } else {
    columns = Array.from({ length: width }, (_, i) => `Col${i + 1}`);
    body = cleaned;
  }
  const rows = body.map((r) => Array.from({ length: width }, (_, i) => coerce(r[i])));
  return { id: uid('ds'), name, columns, rows };
}

export function parseDelimitedText(text: string, name: string, firstRowHeader: boolean): Dataset {
  const result = Papa.parse<string[]>(text.trim(), { delimitersToGuess: [',', '\t', ';', '|'] });
  return toDataset(name, result.data, firstRowHeader);
}

export async function parseFile(file: File, firstRowHeader: boolean): Promise<Dataset[]> {
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    return wb.SheetNames.map((sheetName) => {
      const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        defval: null,
      });
      const name = wb.SheetNames.length > 1 ? `${baseName} · ${sheetName}` : baseName;
      return toDataset(name, grid, firstRowHeader);
    });
  }
  const text = await file.text();
  return [parseDelimitedText(text, baseName, firstRowHeader)];
}

/** Extract numeric values of one column. */
export function numericColumn(ds: Dataset, col: number): number[] {
  if (col < 0 || col >= ds.columns.length) return [];
  return ds.rows
    .map((r) => r[col])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

/** All column indices that contain mostly numbers. */
export function numericColumnIndices(ds: Dataset): number[] {
  return ds.columns
    .map((_, i) => i)
    .filter((i) => {
      const vals = ds.rows.map((r) => r[i]).filter((v) => v !== null);
      if (vals.length === 0) return false;
      const numeric = vals.filter((v) => typeof v === 'number').length;
      return numeric / vals.length > 0.6;
    });
}
