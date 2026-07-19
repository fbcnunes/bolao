import { MatchPhase, MatchStatus, PredictionResult, PrismaClient } from "@prisma/client";

import { normalizeTeamName } from "@/lib/football-data";

type MatchCandidate = {
  id: string;
  dateTime: Date;
  homeTeam: string;
  awayTeam: string;
  phase: MatchPhase;
  fifaMatchId: string | null;
  status: MatchStatus;
  result: PredictionResult | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalty: number | null;
  awayPenalty: number | null;
};

export type ExternalMatchForLookup = {
  fifaMatchId?: string | null;
  homeTeam: string;
  awayTeam: string;
  dateTime?: Date | null;
};

const LIVE_STATUSES = new Set([
  "in_play",
  "in play",
  "live",
  "paused",
  "pause",
  "halftime",
  "half_time",
  "ht",
  "1st_half",
  "2nd_half",
  "extra_time",
  "penalties",
]);

const FINISHED_STATUSES = new Set([
  "finished",
  "ended",
  "after_extra_time",
  "after extra time",
  "after_penalties",
  "after penalties",
  "ft",
  "aet",
]);

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toLowerCase();
}

export function isFinishedExternalStatus(status: string | null | undefined) {
  return FINISHED_STATUSES.has(normalizeStatus(status));
}

export function statusFromLiveScore(status: string | null | undefined): MatchStatus | null {
  const normalized = normalizeStatus(status);

  if (LIVE_STATUSES.has(normalized)) return MatchStatus.AO_VIVO;
  if (FINISHED_STATUSES.has(normalized)) return null;

  return MatchStatus.AGENDADO;
}

export function statusFromFootballData(status: string | null | undefined): MatchStatus | null {
  if (status === "IN_PLAY" || status === "PAUSED") return MatchStatus.AO_VIVO;
  if (status === "FINISHED") return null;

  return MatchStatus.AGENDADO;
}

export function isKnockoutPhase(phase: MatchPhase | string): boolean {
  return phase !== MatchPhase.GRUPOS;
}

export function resultFromScore(homeScore: number, awayScore: number): PredictionResult {
  if (homeScore > awayScore) return PredictionResult.CASA;
  if (awayScore > homeScore) return PredictionResult.FORA;
  return PredictionResult.EMPATE;
}

export function finalResultFromScore(
  phase: MatchPhase | string,
  homeScore: number,
  awayScore: number,
  homePenalty?: number | null,
  awayPenalty?: number | null
): PredictionResult | null {
  const regularResult = resultFromScore(homeScore, awayScore);

  if (!isKnockoutPhase(phase) || regularResult !== PredictionResult.EMPATE) {
    return regularResult;
  }

  if (homePenalty === null || homePenalty === undefined || awayPenalty === null || awayPenalty === undefined) {
    return null;
  }

  if (homePenalty > awayPenalty) return PredictionResult.CASA;
  if (awayPenalty > homePenalty) return PredictionResult.FORA;

  return null;
}

export function reverseResult(result: PredictionResult): PredictionResult {
  if (result === PredictionResult.CASA) return PredictionResult.FORA;
  if (result === PredictionResult.FORA) return PredictionResult.CASA;
  return result;
}

export function normalizeExternalTeamName(teamName: string | null | undefined) {
  return normalizeTeamName(teamName ?? "");
}

export async function findMatchForExternalMatch(
  prisma: PrismaClient,
  externalMatch: ExternalMatchForLookup,
  options: { excludeFinished?: boolean } = {}
): Promise<MatchCandidate | null> {
  if (externalMatch.fifaMatchId) {
    const matches = options.excludeFinished
      ? await prisma.$queryRaw<MatchCandidate[]>`
          SELECT id, dateTime, homeTeam, awayTeam, phase, fifaMatchId, status, result, homeScore, awayScore, homePenalty, awayPenalty
          FROM \`Match\`
          WHERE fifaMatchId = ${externalMatch.fifaMatchId}
            AND status <> ${MatchStatus.ENCERRADO}
          LIMIT 1
        `
      : await prisma.$queryRaw<MatchCandidate[]>`
          SELECT id, dateTime, homeTeam, awayTeam, phase, fifaMatchId, status, result, homeScore, awayScore, homePenalty, awayPenalty
          FROM \`Match\`
          WHERE fifaMatchId = ${externalMatch.fifaMatchId}
          LIMIT 1
        `;
    const match = matches[0];

    if (match) return match;
  }

  if (!externalMatch.homeTeam || !externalMatch.awayTeam) return null;

  const candidateMatches = options.excludeFinished
    ? await prisma.$queryRaw<MatchCandidate[]>`
        SELECT id, dateTime, homeTeam, awayTeam, phase, fifaMatchId, status, result, homeScore, awayScore, homePenalty, awayPenalty
        FROM \`Match\`
        WHERE status <> ${MatchStatus.ENCERRADO}
          AND (
            (homeTeam = ${externalMatch.homeTeam} AND awayTeam = ${externalMatch.awayTeam})
            OR (homeTeam = ${externalMatch.awayTeam} AND awayTeam = ${externalMatch.homeTeam})
          )
      `
    : await prisma.$queryRaw<MatchCandidate[]>`
        SELECT id, dateTime, homeTeam, awayTeam, phase, fifaMatchId, status, result, homeScore, awayScore, homePenalty, awayPenalty
        FROM \`Match\`
        WHERE (homeTeam = ${externalMatch.homeTeam} AND awayTeam = ${externalMatch.awayTeam})
           OR (homeTeam = ${externalMatch.awayTeam} AND awayTeam = ${externalMatch.homeTeam})
      `;

  if (candidateMatches.length === 0) return null;
  if (!externalMatch.dateTime) return candidateMatches[0];

  return candidateMatches.sort(
    (a, b) =>
      Math.abs(a.dateTime.getTime() - externalMatch.dateTime!.getTime()) -
      Math.abs(b.dateTime.getTime() - externalMatch.dateTime!.getTime())
  )[0];
}

export function isSameTeamOrder(match: MatchCandidate, externalMatch: ExternalMatchForLookup) {
  return match.homeTeam === externalMatch.homeTeam && match.awayTeam === externalMatch.awayTeam;
}
