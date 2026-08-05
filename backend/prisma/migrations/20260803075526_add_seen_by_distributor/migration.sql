-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_QUOTE',
    "taskType" TEXT NOT NULL,
    "wordCount" INTEGER,
    "deadline" DATETIME,
    "university" TEXT,
    "aiDescription" TEXT,
    "rawPrompt" TEXT,
    "revisionRound" INTEGER NOT NULL DEFAULT 0,
    "seenByDistributor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("aiDescription", "createdAt", "createdById", "deadline", "id", "rawPrompt", "revisionRound", "status", "taskType", "title", "university", "updatedAt", "wordCount") SELECT "aiDescription", "createdAt", "createdById", "deadline", "id", "rawPrompt", "revisionRound", "status", "taskType", "title", "university", "updatedAt", "wordCount" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
