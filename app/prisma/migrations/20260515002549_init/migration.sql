-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('PARTICIPANTE', 'ADMIN') NOT NULL DEFAULT 'PARTICIPANTE',
    `status` ENUM('PENDENTE', 'ATIVO', 'RECUSADO') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` VARCHAR(191) NOT NULL,
    `apiId` INTEGER NOT NULL,
    `phase` ENUM('GRUPOS', 'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL') NOT NULL,
    `round` INTEGER NOT NULL,
    `homeTeam` VARCHAR(191) NOT NULL,
    `awayTeam` VARCHAR(191) NOT NULL,
    `dateTime` DATETIME(3) NOT NULL,
    `result` ENUM('CASA', 'EMPATE', 'FORA') NULL,
    `status` ENUM('AGENDADO', 'AO_VIVO', 'ENCERRADO') NOT NULL DEFAULT 'AGENDADO',

    UNIQUE INDEX `Match_apiId_key`(`apiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Odd` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `oddHome` DOUBLE NOT NULL,
    `oddDraw` DOUBLE NOT NULL,
    `oddAway` DOUBLE NOT NULL,
    `favorite` ENUM('CASA', 'EMPATE', 'FORA') NOT NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prediction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `prediction` ENUM('CASA', 'EMPATE', 'FORA') NOT NULL,
    `oddId` VARCHAR(191) NOT NULL,
    `oddTimestamp` DATETIME(3) NOT NULL,
    `correct` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Prediction_userId_matchId_key`(`userId`, `matchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Round` (
    `id` VARCHAR(191) NOT NULL,
    `phase` ENUM('GRUPOS', 'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL') NOT NULL,
    `number` INTEGER NOT NULL,
    `bonusCalculated` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Score` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `roundPoints` DOUBLE NOT NULL DEFAULT 0,
    `bonus` DOUBLE NOT NULL DEFAULT 0,
    `accumulatedPoints` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `Score_userId_roundId_key`(`userId`, `roundId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Odd` ADD CONSTRAINT `Odd_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_oddId_fkey` FOREIGN KEY (`oddId`) REFERENCES `Odd`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Score` ADD CONSTRAINT `Score_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Score` ADD CONSTRAINT `Score_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `Round`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
