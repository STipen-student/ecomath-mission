/**
 * Saring sesi eksperimen draf 2 (kode kelas DRAF2-) keluar dari data penelitian.
 * Dipakai di setiap laporan guru, rekap admin, dan ekspor CSV, supaya data
 * instrumen 1.1.0 tidak tercampur dengan eksperimen TheoTown.
 */
export const KECUALI_DRAF2 = { NOT: { classCode: { startsWith: 'DRAF2-' } } } as const;

/**
 * Kode kelas data UJI COBA (pengembang/peneliti), mis. UJI, UJI-DEPLOY,
 * UJI-LOGIN. Sesi ini bukan data penelitian dan tidak boleh ikut dianalisis.
 */
export const AWALAN_KELAS_UJI = 'UJI';

/**
 * Saringan sesi untuk data penelitian:
 *  - selalu tanpa eksperimen draf 2 (DRAF2-);
 *  - tanpa kode kelas tertentu: tanpa kelas uji coba (berawalan UJI);
 *  - dengan kode kelas tertentu: hanya kelas itu (kelas uji tetap bisa dilihat
 *    bila dipilih secara eksplisit, mis. untuk memeriksa sistem).
 */
export function saringKelas(classCode?: string | null): Record<string, unknown> {
  if (classCode) return { ...KECUALI_DRAF2, classCode };
  return { AND: [KECUALI_DRAF2, { NOT: { classCode: { startsWith: AWALAN_KELAS_UJI } } }] };
}
