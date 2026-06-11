import prisma from "@/lib/prisma";

export const SYNC_KEYS = {
  odds: "odds",
  matches: "matches",
} as const;

type SyncKey = (typeof SYNC_KEYS)[keyof typeof SYNC_KEYS];

type SyncStatusRow = {
  key: SyncKey;
  syncedAt: Date;
};

export async function markSyncCompleted(key: SyncKey) {
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO SyncStatus (\`key\`, syncedAt, createdAt, updatedAt)
    VALUES (${key}, ${now}, ${now}, ${now})
    ON DUPLICATE KEY UPDATE syncedAt = ${now}, updatedAt = ${now}
  `;
}

export async function getSyncStatuses() {
  const rows = await prisma.$queryRaw<SyncStatusRow[]>`
    SELECT \`key\`, syncedAt
    FROM SyncStatus
    WHERE \`key\` IN (${SYNC_KEYS.odds}, ${SYNC_KEYS.matches})
  `;

  return {
    odds: rows.find((row) => row.key === SYNC_KEYS.odds)?.syncedAt ?? null,
    matches: rows.find((row) => row.key === SYNC_KEYS.matches)?.syncedAt ?? null,
  };
}
