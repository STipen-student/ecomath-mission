-- Misi Kota Hijau: tugas kinerja KPMM kedua, dinilai dengan rubrik KH1-KH4.
-- Satu baris per sesi; terpisah dari tabel Score (K1-K4).
CREATE TABLE "KotaHijau" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "versi" TEXT NOT NULL,
    "kh1" INTEGER NOT NULL,
    "kh2" INTEGER NOT NULL,
    "kh3" INTEGER NOT NULL,
    "kh4" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KotaHijau_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KotaHijau_sessionId_key" ON "KotaHijau"("sessionId");
