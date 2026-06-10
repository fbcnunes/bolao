-- CreateIndex
CREATE INDEX `BolaoMember_bolaoId_status_idx` ON `BolaoMember`(`bolaoId`, `status`);

-- CreateIndex
CREATE INDEX `BolaoMember_bolaoId_status_role_idx` ON `BolaoMember`(`bolaoId`, `status`, `role`);

-- CreateIndex
CREATE INDEX `BolaoMember_userId_status_idx` ON `BolaoMember`(`userId`, `status`);

-- CreateIndex
CREATE INDEX `Match_status_idx` ON `Match`(`status`);

-- CreateIndex
CREATE INDEX `Match_dateTime_idx` ON `Match`(`dateTime`);

-- CreateIndex
CREATE INDEX `Match_homeTeam_awayTeam_status_idx` ON `Match`(`homeTeam`, `awayTeam`, `status`);

-- CreateIndex
CREATE INDEX `Odd_matchId_capturedAt_idx` ON `Odd`(`matchId`, `capturedAt`);

-- CreateIndex
CREATE INDEX `Prediction_bolaoId_userId_idx` ON `Prediction`(`bolaoId`, `userId`);

-- CreateIndex
CREATE INDEX `Prediction_bolaoId_matchId_idx` ON `Prediction`(`bolaoId`, `matchId`);

-- CreateIndex
CREATE INDEX `Prediction_bolaoId_correct_idx` ON `Prediction`(`bolaoId`, `correct`);

-- CreateIndex
CREATE INDEX `Score_bolaoId_roundId_idx` ON `Score`(`bolaoId`, `roundId`);

-- CreateIndex
CREATE INDEX `Score_bolaoId_userId_idx` ON `Score`(`bolaoId`, `userId`);
