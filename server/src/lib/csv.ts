/**
 * Penulisan CSV yang aman untuk diimpor ke SPSS/R/Jamovi.
 *
 * Aturan pengutipan mengikuti RFC 4180: nilai yang mengandung koma, tanda kutip,
 * atau baris baru dibungkus tanda kutip ganda, dan tanda kutip di dalam nilai
 * digandakan. Ini penting karena payload event berisi JSON yang hampir selalu
 * mengandung koma dan tanda kutip - tanpa pengutipan yang benar, satu kolom
 * dapat "meluber" dan menggeser seluruh kolom di kanannya.
 */

export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * @param rows        baris data; kolom diambil dari gabungan kunci semua baris
 * @param withBom     sisipkan BOM UTF-8 agar Excel di Windows membaca karakter
 *                    Indonesia dengan benar saat berkas dibuka langsung
 */
export function toCsv(rows: CsvRow[], withBom = true): string {
  if (rows.length === 0) return withBom ? '\uFEFF' : '';

  const headers: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ];

  return (withBom ? '\uFEFF' : '') + lines.join('\r\n') + '\r\n';
}
