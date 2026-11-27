-- Pengaturan bersama server (mis. saklar mode adaptif), disimpan di database
-- agar sama untuk semua salinan Worker dan tidak hilang saat server dimuat ulang.
CREATE TABLE "Pengaturan" (
    "kunci" TEXT NOT NULL PRIMARY KEY,
    "nilai" TEXT NOT NULL,
    "diubahPada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
