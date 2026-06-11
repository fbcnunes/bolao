-- CreateTable
CREATE TABLE `UserEmailChangeAudit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `oldEmail` VARCHAR(191) NOT NULL,
    `newEmail` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserEmailChangeAudit_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `UserEmailChangeAudit_changedById_createdAt_idx`(`changedById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserEmailChangeAudit` ADD CONSTRAINT `UserEmailChangeAudit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserEmailChangeAudit` ADD CONSTRAINT `UserEmailChangeAudit_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
