-- DropForeignKey
ALTER TABLE `Prediction` DROP FOREIGN KEY `Prediction_oddId_fkey`;

-- AlterTable
ALTER TABLE `Prediction` MODIFY `oddId` VARCHAR(191) NULL,
    MODIFY `oddTimestamp` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_oddId_fkey` FOREIGN KEY (`oddId`) REFERENCES `Odd`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
