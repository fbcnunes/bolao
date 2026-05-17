import { PrismaClient, MatchPhase, MatchStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// All times in UTC (BRT = UTC-3, so BRT + 3h = UTC)
const matches = [
  // ─── GRUPO A: África do Sul, México, Tchéquia, Coreia do Sul ───
  { apiId: 100001, group: 'A', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'África do Sul', awayTeam: 'México',       dateTime: new Date('2026-06-11T19:00:00Z') },
  { apiId: 100002, group: 'A', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Tchéquia',       awayTeam: 'Coreia do Sul', dateTime: new Date('2026-06-12T02:00:00Z') },
  { apiId: 100003, group: 'A', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'África do Sul', awayTeam: 'Tchéquia',      dateTime: new Date('2026-06-18T16:00:00Z') },
  { apiId: 100004, group: 'A', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'México',         awayTeam: 'Coreia do Sul', dateTime: new Date('2026-06-19T01:00:00Z') },
  { apiId: 100005, group: 'A', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'México',         awayTeam: 'Tchéquia',      dateTime: new Date('2026-06-26T01:00:00Z') },
  { apiId: 100006, group: 'A', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'África do Sul', awayTeam: 'Coreia do Sul', dateTime: new Date('2026-06-26T01:00:00Z') },

  // ─── GRUPO B: Bósnia-Herzegovina, Canadá, Suíça, Catar ───
  { apiId: 100007, group: 'B', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Canadá',           awayTeam: 'Bósnia-Herzegovina', dateTime: new Date('2026-06-12T19:00:00Z') },
  { apiId: 100008, group: 'B', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Catar',            awayTeam: 'Suíça',              dateTime: new Date('2026-06-13T19:00:00Z') },
  { apiId: 100009, group: 'B', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Suíça',            awayTeam: 'Bósnia-Herzegovina', dateTime: new Date('2026-06-18T19:00:00Z') },
  { apiId: 100010, group: 'B', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Canadá',           awayTeam: 'Catar',              dateTime: new Date('2026-06-18T22:00:00Z') },
  { apiId: 100011, group: 'B', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Suíça',            awayTeam: 'Canadá',             dateTime: new Date('2026-06-24T19:00:00Z') },
  { apiId: 100012, group: 'B', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Bósnia-Herzegovina', awayTeam: 'Catar',            dateTime: new Date('2026-06-24T19:00:00Z') },

  // ─── GRUPO C: Brasil, Marrocos, Escócia, Haiti ───
  { apiId: 100013, group: 'C', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Brasil',   awayTeam: 'Marrocos', dateTime: new Date('2026-06-13T22:00:00Z') },
  { apiId: 100014, group: 'C', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Haiti',    awayTeam: 'Escócia',  dateTime: new Date('2026-06-14T01:00:00Z') },
  { apiId: 100015, group: 'C', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Brasil',   awayTeam: 'Haiti',    dateTime: new Date('2026-06-20T01:00:00Z') },
  { apiId: 100016, group: 'C', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Escócia',  awayTeam: 'Marrocos', dateTime: new Date('2026-06-19T22:00:00Z') },
  { apiId: 100017, group: 'C', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Escócia',  awayTeam: 'Brasil',   dateTime: new Date('2026-06-24T22:00:00Z') },
  { apiId: 100018, group: 'C', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Marrocos', awayTeam: 'Haiti',    dateTime: new Date('2026-06-24T22:00:00Z') },

  // ─── GRUPO D: EUA, Paraguai, Turquia, Austrália ───
  { apiId: 100019, group: 'D', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'EUA',       awayTeam: 'Paraguai',   dateTime: new Date('2026-06-13T01:00:00Z') },
  { apiId: 100020, group: 'D', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Austrália', awayTeam: 'Turquia',    dateTime: new Date('2026-06-13T04:00:00Z') },
  { apiId: 100021, group: 'D', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'EUA',       awayTeam: 'Austrália',  dateTime: new Date('2026-06-19T19:00:00Z') },
  { apiId: 100022, group: 'D', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Turquia',   awayTeam: 'Paraguai',   dateTime: new Date('2026-06-20T04:00:00Z') },
  { apiId: 100023, group: 'D', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Turquia',   awayTeam: 'EUA',        dateTime: new Date('2026-06-26T02:00:00Z') },
  { apiId: 100024, group: 'D', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Paraguai',  awayTeam: 'Austrália',  dateTime: new Date('2026-06-26T02:00:00Z') },

  // ─── GRUPO E: Alemanha, Curaçao, Equador, Costa do Marfim ───
  { apiId: 100025, group: 'E', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Alemanha',        awayTeam: 'Curaçao',         dateTime: new Date('2026-06-14T17:00:00Z') },
  { apiId: 100026, group: 'E', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Costa do Marfim', awayTeam: 'Equador',         dateTime: new Date('2026-06-14T23:00:00Z') },
  { apiId: 100027, group: 'E', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Alemanha',        awayTeam: 'Costa do Marfim', dateTime: new Date('2026-06-20T20:00:00Z') },
  { apiId: 100028, group: 'E', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Equador',         awayTeam: 'Curaçao',         dateTime: new Date('2026-06-21T00:00:00Z') },
  { apiId: 100029, group: 'E', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Equador',         awayTeam: 'Alemanha',        dateTime: new Date('2026-06-25T20:00:00Z') },
  { apiId: 100030, group: 'E', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Curaçao',         awayTeam: 'Costa do Marfim', dateTime: new Date('2026-06-25T20:00:00Z') },

  // ─── GRUPO F: Países Baixos, Japão, Suécia, Tunísia ───
  { apiId: 100031, group: 'F', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Países Baixos', awayTeam: 'Japão',        dateTime: new Date('2026-06-14T20:00:00Z') },
  { apiId: 100032, group: 'F', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Suécia',        awayTeam: 'Tunísia',      dateTime: new Date('2026-06-15T02:00:00Z') },
  { apiId: 100033, group: 'F', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Países Baixos', awayTeam: 'Suécia',       dateTime: new Date('2026-06-20T17:00:00Z') },
  { apiId: 100034, group: 'F', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Tunísia',       awayTeam: 'Japão',        dateTime: new Date('2026-06-21T04:00:00Z') },
  { apiId: 100035, group: 'F', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Japão',         awayTeam: 'Suécia',       dateTime: new Date('2026-06-25T23:00:00Z') },
  { apiId: 100036, group: 'F', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Tunísia',       awayTeam: 'Países Baixos', dateTime: new Date('2026-06-25T23:00:00Z') },

  // ─── GRUPO G: Bélgica, Egito, Irã, Nova Zelândia ───
  { apiId: 100037, group: 'G', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Bélgica',      awayTeam: 'Egito',        dateTime: new Date('2026-06-15T19:00:00Z') },
  { apiId: 100038, group: 'G', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Irã',          awayTeam: 'Nova Zelândia', dateTime: new Date('2026-06-16T01:00:00Z') },
  { apiId: 100039, group: 'G', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Bélgica',      awayTeam: 'Irã',          dateTime: new Date('2026-06-21T19:00:00Z') },
  { apiId: 100040, group: 'G', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Nova Zelândia', awayTeam: 'Egito',        dateTime: new Date('2026-06-22T01:00:00Z') },
  { apiId: 100041, group: 'G', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Egito',        awayTeam: 'Irã',          dateTime: new Date('2026-06-27T03:00:00Z') },
  { apiId: 100042, group: 'G', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Nova Zelândia', awayTeam: 'Bélgica',      dateTime: new Date('2026-06-27T03:00:00Z') },

  // ─── GRUPO H: Espanha, Cabo Verde, Arábia Saudita, Uruguai ───
  { apiId: 100043, group: 'H', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Espanha',       awayTeam: 'Cabo Verde',    dateTime: new Date('2026-06-15T16:00:00Z') },
  { apiId: 100044, group: 'H', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Arábia Saudita', awayTeam: 'Uruguai',      dateTime: new Date('2026-06-15T22:00:00Z') },
  { apiId: 100045, group: 'H', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Espanha',       awayTeam: 'Arábia Saudita', dateTime: new Date('2026-06-21T16:00:00Z') },
  { apiId: 100046, group: 'H', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Uruguai',       awayTeam: 'Cabo Verde',    dateTime: new Date('2026-06-21T22:00:00Z') },
  { apiId: 100047, group: 'H', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Uruguai',       awayTeam: 'Espanha',       dateTime: new Date('2026-06-27T00:00:00Z') },
  { apiId: 100048, group: 'H', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Cabo Verde',    awayTeam: 'Arábia Saudita', dateTime: new Date('2026-06-27T00:00:00Z') },

  // ─── GRUPO I: França, Senegal, Noruega, Iraque ───
  { apiId: 100049, group: 'I', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'França',   awayTeam: 'Senegal', dateTime: new Date('2026-06-16T19:00:00Z') },
  { apiId: 100050, group: 'I', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Noruega',  awayTeam: 'Iraque',  dateTime: new Date('2026-06-16T22:00:00Z') },
  { apiId: 100051, group: 'I', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'França',   awayTeam: 'Iraque',  dateTime: new Date('2026-06-22T21:00:00Z') },
  { apiId: 100052, group: 'I', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Noruega',  awayTeam: 'Senegal', dateTime: new Date('2026-06-23T00:00:00Z') },
  { apiId: 100053, group: 'I', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Noruega',  awayTeam: 'França',  dateTime: new Date('2026-06-26T19:00:00Z') },
  { apiId: 100054, group: 'I', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Iraque',   awayTeam: 'Senegal', dateTime: new Date('2026-06-26T19:00:00Z') },

  // ─── GRUPO J: Argentina, Argélia, Áustria, Jordânia ───
  { apiId: 100055, group: 'J', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Argentina', awayTeam: 'Argélia',  dateTime: new Date('2026-06-17T01:00:00Z') },
  { apiId: 100056, group: 'J', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Áustria',   awayTeam: 'Jordânia', dateTime: new Date('2026-06-17T04:00:00Z') },
  { apiId: 100057, group: 'J', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Argentina', awayTeam: 'Áustria',  dateTime: new Date('2026-06-22T17:00:00Z') },
  { apiId: 100058, group: 'J', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Jordânia',  awayTeam: 'Argélia',  dateTime: new Date('2026-06-23T03:00:00Z') },
  { apiId: 100059, group: 'J', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Argélia',   awayTeam: 'Áustria',  dateTime: new Date('2026-06-28T02:00:00Z') },
  { apiId: 100060, group: 'J', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Jordânia',  awayTeam: 'Argentina', dateTime: new Date('2026-06-28T02:00:00Z') },

  // ─── GRUPO K: Portugal, Congo DR, Colômbia, Uzbequistão ───
  { apiId: 100061, group: 'K', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Portugal',     awayTeam: 'Congo DR',     dateTime: new Date('2026-06-17T17:00:00Z') },
  { apiId: 100062, group: 'K', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Colômbia',     awayTeam: 'Uzbequistão',  dateTime: new Date('2026-06-18T02:00:00Z') },
  { apiId: 100063, group: 'K', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Portugal',     awayTeam: 'Uzbequistão',  dateTime: new Date('2026-06-23T17:00:00Z') },
  { apiId: 100064, group: 'K', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Congo DR',     awayTeam: 'Colômbia',     dateTime: new Date('2026-06-24T02:00:00Z') },
  { apiId: 100065, group: 'K', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Colômbia',     awayTeam: 'Portugal',     dateTime: new Date('2026-06-27T23:30:00Z') },
  { apiId: 100066, group: 'K', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Congo DR',     awayTeam: 'Uzbequistão',  dateTime: new Date('2026-06-27T23:30:00Z') },

  // ─── GRUPO L: Inglaterra, Croácia, Panamá, Gana ───
  { apiId: 100067, group: 'L', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Croácia',   awayTeam: 'Inglaterra', dateTime: new Date('2026-06-17T20:00:00Z') },
  { apiId: 100068, group: 'L', phase: MatchPhase.GRUPOS, round: 1, homeTeam: 'Panamá',    awayTeam: 'Gana',       dateTime: new Date('2026-06-17T23:00:00Z') },
  { apiId: 100069, group: 'L', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Croácia',   awayTeam: 'Panamá',     dateTime: new Date('2026-06-23T23:00:00Z') },
  { apiId: 100070, group: 'L', phase: MatchPhase.GRUPOS, round: 2, homeTeam: 'Inglaterra', awayTeam: 'Gana',       dateTime: new Date('2026-06-23T20:00:00Z') },
  { apiId: 100071, group: 'L', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Panamá',    awayTeam: 'Inglaterra', dateTime: new Date('2026-06-27T21:00:00Z') },
  { apiId: 100072, group: 'L', phase: MatchPhase.GRUPOS, round: 3, homeTeam: 'Croácia',   awayTeam: 'Gana',       dateTime: new Date('2026-06-27T21:00:00Z') },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // Admin user
  const adminEmail = 'admin@bolao2026.com';
  const adminPassword = 'Arosio2001';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash,
      role: 'MASTER',
      status: 'ATIVO',
    },
  });
  console.log(`✅ Admin: ${adminEmail}`);

  // Rounds (GRUPOS: 1, 2, 3)
  for (const number of [1, 2, 3]) {
    await prisma.round.upsert({
      where: { id: `grupos-rodada-${number}` },
      update: {},
      create: {
        id: `grupos-rodada-${number}`,
        phase: MatchPhase.GRUPOS,
        number,
      },
    });
  }
  console.log('✅ Rounds criados (GRUPOS 1, 2, 3)');

  // Matches
  let created = 0;
  let updated = 0;
  for (const match of matches) {
    const result = await prisma.match.upsert({
      where: { apiId: match.apiId },
      update: {
        group: match.group,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        dateTime: match.dateTime,
      },
      create: {
        apiId: match.apiId,
        group: match.group,
        phase: match.phase,
        round: match.round,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        dateTime: match.dateTime,
        status: MatchStatus.AGENDADO,
      },
    });
    if (result.homeTeam === match.homeTeam) updated++;
    else created++;
  }
  console.log(`✅ ${matches.length} jogos inseridos/atualizados (${created} novos, ${updated} atualizados)`);
  console.log(`\n🏆 Seed concluído! Copa do Mundo 2026 — ${matches.length} jogos (12 grupos, 3 rodadas)`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
