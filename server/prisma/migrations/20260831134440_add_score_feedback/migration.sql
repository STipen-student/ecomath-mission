/*
  Warnings:

  - Added the required column `feedback` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "k1" INTEGER NOT NULL,
    "k2" INTEGER NOT NULL,
    "k3" INTEGER NOT NULL,
    "k4" INTEGER NOT NULL,
    "rawSum" INTEGER NOT NULL,
    "weightedComposite" REAL NOT NULL,
    "k4ManualOverride" INTEGER,
    "k4ReviewNote" TEXT,
    "trace" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TaskAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Score" ("attemptId", "computedAt", "id", "k1", "k2", "k3", "k4", "k4ManualOverride", "k4ReviewNote", "level", "rawSum", "scoringVersion", "sessionId", "taskId", "trace", "weightedComposite") SELECT "attemptId", "computedAt", "id", "k1", "k2", "k3", "k4", "k4ManualOverride", "k4ReviewNote", "level", "rawSum", "scoringVersion", "sessionId", "taskId", "trace", "weightedComposite" FROM "Score";
DROP TABLE "Score";
ALTER TABLE "new_Score" RENAME TO "Score";
CREATE UNIQUE INDEX "Score_attemptId_key" ON "Score"("attemptId");
CREATE INDEX "Score_sessionId_idx" ON "Score"("sessionId");
CREATE INDEX "Score_taskId_idx" ON "Score"("taskId");
CREATE INDEX "Score_level_idx" ON "Score"("level");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
