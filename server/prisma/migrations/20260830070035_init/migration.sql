-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT,
    "classCode" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "userAgent" TEXT,
    "sessionComposite" REAL
);

-- CreateTable
CREATE TABLE "TaskAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "TaskAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "isValidAtTime" BOOLEAN NOT NULL,
    "durationSinceLastEventMs" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TaskAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
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
    "scoringVersion" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TaskAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Session_classCode_idx" ON "Session"("classCode");

-- CreateIndex
CREATE INDEX "Session_startedAt_idx" ON "Session"("startedAt");

-- CreateIndex
CREATE INDEX "TaskAttempt_taskId_idx" ON "TaskAttempt"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAttempt_sessionId_level_key" ON "TaskAttempt"("sessionId", "level");

-- CreateIndex
CREATE INDEX "EventLog_attemptId_timestampMs_idx" ON "EventLog"("attemptId", "timestampMs");

-- CreateIndex
CREATE INDEX "EventLog_sessionId_idx" ON "EventLog"("sessionId");

-- CreateIndex
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "Score_attemptId_key" ON "Score"("attemptId");

-- CreateIndex
CREATE INDEX "Score_sessionId_idx" ON "Score"("sessionId");

-- CreateIndex
CREATE INDEX "Score_taskId_idx" ON "Score"("taskId");

-- CreateIndex
CREATE INDEX "Score_level_idx" ON "Score"("level");
