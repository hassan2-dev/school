import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { ParsedDocument, ParsedTable } from './extract';

export async function parseDocx(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const tables = tablesFromHtml(htmlResult.value);
  return {
    fileName: file.name,
    text: textResult.value,
    tables: tables.length ? tables : inferSingleColumnTable(textResult.value),
  };
}

export async function parseXlsx(file: File): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
  const text = matrix.map((r) => r.join(' ')).join('\n');
  const tables = matrixToTables(matrix);
  return { fileName: file.name, text, tables };
}

export async function parsePdf(file: File): Promise<ParsedDocument> {
  // Lightweight text extraction without worker for Vite compatibility.
  // For production OCR / complex layouts, use Cloud Functions + pdf.js worker.
  const pdfjs = await import('pdfjs-dist');
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .filter(Boolean);
    pages.push(strings.join(' '));
  }
  const text = pages.join('\n');
  return {
    fileName: file.name,
    text,
    tables: inferSingleColumnTable(text),
  };
}

export async function parseFile(file: File): Promise<ParsedDocument> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) return parseDocx(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
  if (name.endsWith('.pdf')) return parsePdf(file);
  throw new Error(`Unsupported file type: ${file.name}`);
}

function tablesFromHtml(html: string): ParsedTable[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables: ParsedTable[] = [];
  doc.querySelectorAll('table').forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('th,td')).map((cell) => (cell.textContent || '').trim()),
    );
    if (rows.length < 2) return;
    const headers = rows[0];
    tables.push({ headers, rows: rows.slice(1) });
  });
  return tables;
}

function matrixToTables(matrix: string[][]): ParsedTable[] {
  if (!matrix.length) return [];
  // Find header row: first row with "اسم" or multiple non-empty cells
  let headerIdx = matrix.findIndex((r) => r.some((c) => /اسم|الطالب|name/i.test(String(c))));
  if (headerIdx < 0) headerIdx = 0;
  const headers = matrix[headerIdx].map((c) => String(c ?? '').trim());
  const rows = matrix
    .slice(headerIdx + 1)
    .map((r) => headers.map((_, i) => String(r[i] ?? '').trim()))
    .filter((r) => r.some((c) => c));
  return [{ headers, rows }];
}

function inferSingleColumnTable(text: string): ParsedTable[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Heuristic: lines that look like "1 Name 8 7 ..."
  const dataLines = lines.filter((l) => /^\d+[\s.\-–]+.+/.test(l) || /^[\u0600-\u06FF].+\d+/.test(l));
  if (dataLines.length < 3) return [];

  const headers = ['الرقم', 'اسم الطالب', 'الدرجة'];
  const rows = dataLines.map((line) => {
    const parts = line.split(/\s+/);
    const num = parts[0];
    const score = parts[parts.length - 1];
    const name = parts.slice(1, -1).join(' ') || parts.slice(1).join(' ');
    return [num, name, score];
  });
  return [{ headers, rows }];
}
