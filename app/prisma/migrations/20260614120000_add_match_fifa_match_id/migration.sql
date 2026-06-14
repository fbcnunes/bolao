ALTER TABLE `Match` ADD COLUMN `fifaMatchId` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `Match_fifaMatchId_key` ON `Match`(`fifaMatchId`);
