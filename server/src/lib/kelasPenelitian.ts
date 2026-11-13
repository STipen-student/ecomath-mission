/**
 * Saring sesi eksperimen draf 2 (kode kelas DRAF2-) keluar dari data penelitian.
 * Dipakai di setiap laporan guru, rekap admin, dan ekspor CSV, supaya data
 * instrumen 1.1.0 tidak tercampur dengan eksperimen TheoTown.
 */
export const KECUALI_DRAF2 = { NOT: { classCode: { startsWith: 'DRAF2-' } } } as const;
