-- 1. Adiciona MASTER ao enum (mantendo ADMIN ainda)
ALTER TABLE `User` MODIFY `role` ENUM('MASTER', 'PARTICIPANTE', 'ADMIN') NOT NULL DEFAULT 'PARTICIPANTE';

-- 2. Converte todos os ADMIN para MASTER
UPDATE `User` SET `role` = 'MASTER' WHERE `role` = 'ADMIN';

-- 3. Remove ADMIN do enum
ALTER TABLE `User` MODIFY `role` ENUM('MASTER', 'PARTICIPANTE') NOT NULL DEFAULT 'PARTICIPANTE';

-- 4. CreateTable Bolao
CREATE TABLE `Bolao` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `inviteCode` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'ATIVO', 'RECUSADO') NOT NULL DEFAULT 'PENDENTE',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Bolao_inviteCode_key`(`inviteCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. CreateTable BolaoMember
CREATE TABLE `BolaoMember` (
    `bolaoId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'PARTICIPANTE') NOT NULL DEFAULT 'PARTICIPANTE',
    `status` ENUM('PENDENTE', 'ATIVO', 'RECUSADO') NOT NULL DEFAULT 'PENDENTE',

    PRIMARY KEY (`bolaoId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. Foreign keys
ALTER TABLE `Bolao` ADD CONSTRAINT `Bolao_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BolaoMember` ADD CONSTRAINT `BolaoMember_bolaoId_fkey` FOREIGN KEY (`bolaoId`) REFERENCES `Bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BolaoMember` ADD CONSTRAINT `BolaoMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
