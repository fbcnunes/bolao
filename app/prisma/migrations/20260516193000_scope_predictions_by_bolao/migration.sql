-- Scope champion picks, match predictions, and scores by bolao.
-- This project intentionally resets existing data before applying this migration.

ALTER TABLE `BolaoMember` ADD COLUMN `championPick` VARCHAR(191) NULL;

ALTER TABLE `User` DROP COLUMN `championPick`;

CREATE INDEX `Prediction_userId_idx` ON `Prediction`(`userId`);
CREATE INDEX `Prediction_matchId_idx` ON `Prediction`(`matchId`);
ALTER TABLE `Prediction` DROP INDEX `Prediction_userId_matchId_key`;
ALTER TABLE `Prediction` ADD COLUMN `bolaoId` VARCHAR(191) NOT NULL;
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_bolaoId_fkey` FOREIGN KEY (`bolaoId`) REFERENCES `Bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX `Prediction_bolaoId_userId_matchId_key` ON `Prediction`(`bolaoId`, `userId`, `matchId`);

CREATE INDEX `Score_userId_idx` ON `Score`(`userId`);
CREATE INDEX `Score_roundId_idx` ON `Score`(`roundId`);
ALTER TABLE `Score` DROP INDEX `Score_userId_roundId_key`;
ALTER TABLE `Score` ADD COLUMN `bolaoId` VARCHAR(191) NOT NULL;
ALTER TABLE `Score` ADD CONSTRAINT `Score_bolaoId_fkey` FOREIGN KEY (`bolaoId`) REFERENCES `Bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX `Score_bolaoId_userId_roundId_key` ON `Score`(`bolaoId`, `userId`, `roundId`);
