import { MatchPhase, PrismaClient } from "@prisma/client";

export const ROUND_BONUS_POINTS = 10;

export const PHASE_POINTS: Record<MatchPhase, number> = {
  GRUPOS: 10,
  PLAYOFFS: 15,
  OITAVAS: 20,
  QUARTAS: 30,
  SEMI: 40,
  FINAL: 50,
};

const RECALCULATION_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
};

type ScoreAccumulator = {
  bolaoId: string;
  userId: string;
  roundId: string;
  roundPoints: number;
  accumulatedPoints: number;
};

function getPhasePoints(phase: MatchPhase): number {
  return PHASE_POINTS[phase] ?? PHASE_POINTS.GRUPOS;
}

function roundKey(phase: MatchPhase, number: number): string {
  return `${phase}:${number}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function recalculateScoresAndRoundBonuses(prisma: PrismaClient) {
  const [finishedMatches, allMatches] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: "ENCERRADO",
        result: { not: null },
      },
      include: {
        predictions: {
          select: {
            id: true,
            bolaoId: true,
            userId: true,
            prediction: true,
          },
        },
      },
    }),
    prisma.match.findMany({
      select: {
        phase: true,
        round: true,
        status: true,
        result: true,
      },
    }),
  ]);

  const requiredRounds = new Map<string, { phase: MatchPhase; number: number }>();

  for (const match of finishedMatches) {
    requiredRounds.set(roundKey(match.phase, match.round), {
      phase: match.phase,
      number: match.round,
    });
  }

  const roundStatus = new Map<string, { total: number; finished: number }>();

  for (const match of allMatches) {
    const key = roundKey(match.phase, match.round);
    const current = roundStatus.get(key) ?? { total: 0, finished: 0 };
    current.total++;
    if (match.status === "ENCERRADO" && match.result) current.finished++;
    roundStatus.set(key, current);
  }

  return prisma.$transaction(async (tx) => {
    await tx.score.deleteMany();

    await tx.prediction.updateMany({
      data: { correct: null },
    });

    if (requiredRounds.size > 0) {
      await tx.round.createMany({
        data: Array.from(requiredRounds.values()).map(({ phase, number }) => ({
          id: `${phase.toLowerCase()}-rodada-${number}`,
          phase,
          number,
        })),
        skipDuplicates: true,
      });
    }

    const rounds = await tx.round.findMany({
      select: {
        id: true,
        phase: true,
        number: true,
      },
    });

    const roundIdByKey = new Map(
      rounds.map((round) => [roundKey(round.phase, round.number), round.id])
    );

    const correctPredictionIds: string[] = [];
    const incorrectPredictionIds: string[] = [];
    const scoresByUserRound = new Map<string, ScoreAccumulator>();
    let predictionsProcessed = 0;

    for (const match of finishedMatches) {
      if (!match.result) continue;

      const roundId = roundIdByKey.get(roundKey(match.phase, match.round));
      if (!roundId) continue;

      const pointsEarned = getPhasePoints(match.phase);

      for (const prediction of match.predictions) {
        const isCorrect = prediction.prediction === match.result;
        const predictionIds = isCorrect ? correctPredictionIds : incorrectPredictionIds;
        predictionIds.push(prediction.id);

        if (isCorrect) {
          const scoreKey = `${prediction.bolaoId}:${prediction.userId}:${roundId}`;
          const current = scoresByUserRound.get(scoreKey) ?? {
            bolaoId: prediction.bolaoId,
            userId: prediction.userId,
            roundId,
            roundPoints: 0,
            accumulatedPoints: 0,
          };

          current.roundPoints += pointsEarned;
          current.accumulatedPoints += pointsEarned;
          scoresByUserRound.set(scoreKey, current);
        }

        predictionsProcessed++;
      }
    }

    for (const ids of chunk(correctPredictionIds, 500)) {
      await tx.prediction.updateMany({
        where: { id: { in: ids } },
        data: { correct: true },
      });
    }

    for (const ids of chunk(incorrectPredictionIds, 500)) {
      await tx.prediction.updateMany({
        where: { id: { in: ids } },
        data: { correct: false },
      });
    }

    const scoreRows = Array.from(scoresByUserRound.values());

    if (scoreRows.length > 0) {
      await tx.score.createMany({
        data: scoreRows,
      });
    }

    const completedRoundIds = new Set<string>();

    for (const round of rounds) {
      const status = roundStatus.get(roundKey(round.phase, round.number));
      if (status && status.total > 0 && status.total === status.finished) {
        completedRoundIds.add(round.id);
      }
    }

    await tx.round.updateMany({
      data: { bonusCalculated: false },
    });

    if (completedRoundIds.size > 0) {
      await tx.round.updateMany({
        where: { id: { in: Array.from(completedRoundIds) } },
        data: { bonusCalculated: true },
      });
    }

    const scores = completedRoundIds.size > 0
      ? await tx.score.findMany({
          where: {
            roundPoints: { gt: 0 },
            roundId: { in: Array.from(completedRoundIds) },
          },
          select: {
            id: true,
            bolaoId: true,
            roundId: true,
            roundPoints: true,
          },
        })
      : [];

    const scoresByBolaoRound = new Map<string, typeof scores>();

    for (const score of scores) {
      const key = `${score.bolaoId}:${score.roundId}`;
      const entries = scoresByBolaoRound.get(key) ?? [];
      entries.push(score);
      scoresByBolaoRound.set(key, entries);
    }

    let bonusAwarded = 0;

    for (const entries of scoresByBolaoRound.values()) {
      const maxRoundPoints = Math.max(...entries.map((score) => score.roundPoints));
      const winners = entries.filter((score) => score.roundPoints === maxRoundPoints);

      for (const winner of winners) {
        await tx.score.update({
          where: { id: winner.id },
          data: {
            bonus: ROUND_BONUS_POINTS,
            accumulatedPoints: { increment: ROUND_BONUS_POINTS },
          },
        });
        bonusAwarded++;
      }
    }

    return {
      matchesProcessed: finishedMatches.length,
      predictionsProcessed,
      scoresRebuilt: scoreRows.length,
      completedRounds: completedRoundIds.size,
      bonusAwarded,
    };
  }, RECALCULATION_TRANSACTION_OPTIONS);
}
