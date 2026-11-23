-- Login siswa dengan NIS + kode kelas + PIN, dan penyimpanan progres permainan.
--   pinHash : hash PIN (pbkdf2, bergaram); NULL = sesi lama tanpa login;
--             'RESET' = guru mereset PIN, PIN baru dibuat saat login berikutnya.
--   progres : JSON keadaan permainan (koin, misi, bangunan) agar ikut ke perangkat lain.
ALTER TABLE "Session" ADD COLUMN "pinHash" TEXT;
ALTER TABLE "Session" ADD COLUMN "progres" TEXT;
CREATE INDEX "Session_studentId_classCode_idx" ON "Session"("studentId", "classCode");
