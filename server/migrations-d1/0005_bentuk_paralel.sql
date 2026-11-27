-- Bentuk paralel soal: set angka (A/B/C) yang diterima siswa pada percobaan ini.
-- 'A' = soal asli; percobaan lama otomatis bernilai 'A'.
ALTER TABLE "TaskAttempt" ADD COLUMN "bentuk" TEXT NOT NULL DEFAULT 'A';
