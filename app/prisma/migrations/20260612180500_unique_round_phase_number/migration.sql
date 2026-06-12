UPDATE `Score` s
JOIN `Round` old_round ON old_round.`id` = s.`roundId`
JOIN (
    SELECT `phase`, `number`, MIN(`id`) AS keep_id
    FROM `Round`
    GROUP BY `phase`, `number`
) kept_round ON kept_round.`phase` = old_round.`phase`
    AND kept_round.`number` = old_round.`number`
SET s.`roundId` = kept_round.`keep_id`
WHERE old_round.`id` <> kept_round.`keep_id`;

DELETE old_round
FROM `Round` old_round
JOIN (
    SELECT `phase`, `number`, MIN(`id`) AS keep_id
    FROM `Round`
    GROUP BY `phase`, `number`
) kept_round ON kept_round.`phase` = old_round.`phase`
    AND kept_round.`number` = old_round.`number`
WHERE old_round.`id` <> kept_round.`keep_id`;

CREATE UNIQUE INDEX `Round_phase_number_key` ON `Round`(`phase`, `number`);
