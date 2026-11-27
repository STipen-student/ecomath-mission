-- Persetujuan partisipasi penelitian (siswa) dan pernyataan izin orang tua/wali.
--   persetujuanVersi : versi teks persetujuan yang disetujui (NULL = belum)
--   persetujuanPada  : waktu siswa menyetujui
--   izinWali         : siswa menyatakan orang tua/wali sudah memberi izin tertulis
ALTER TABLE "Session" ADD COLUMN "persetujuanVersi" TEXT;
ALTER TABLE "Session" ADD COLUMN "persetujuanPada" DATETIME;
ALTER TABLE "Session" ADD COLUMN "izinWali" BOOLEAN;
