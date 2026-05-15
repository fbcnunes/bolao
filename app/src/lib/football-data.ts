const BASE_URL = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_KEY;

async function fetchFD(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { "X-Auth-Token": API_KEY ?? "" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org ${res.status}: ${text}`);
  }

  return res.json();
}

export const footballData = {
  getFinishedMatches: () =>
    fetchFD("/competitions/WC/matches", { status: "FINISHED" }),

  getLiveMatches: () =>
    fetchFD("/competitions/WC/matches", { status: "IN_PLAY,PAUSED" }),

  getAllMatches: () =>
    fetchFD("/competitions/WC/matches"),
};

// Mapping from football-data.org team names → our DB team names (PT-BR)
export const TEAM_NAME_MAP: Record<string, string> = {
  "South Africa": "África do Sul",
  "Mexico": "México",
  "Czechia": "Tchéquia",
  "Czech Republic": "Tchéquia",
  "South Korea": "Coreia do Sul",
  "Korea Republic": "Coreia do Sul",
  "Bosnia and Herzegovina": "Bósnia-Herzegovina",
  "Bosnia-Herzegovina": "Bósnia-Herzegovina",
  "Bosnia & Herzegovina": "Bósnia-Herzegovina",
  "Canada": "Canadá",
  "Switzerland": "Suíça",
  "Qatar": "Catar",
  "Brazil": "Brasil",
  "Morocco": "Marrocos",
  "Scotland": "Escócia",
  "Haiti": "Haiti",
  "USA": "EUA",
  "United States": "EUA",
  "United States of America": "EUA",
  "Paraguay": "Paraguai",
  "Turkey": "Turquia",
  "Türkiye": "Turquia",
  "Australia": "Austrália",
  "Germany": "Alemanha",
  "Curaçao": "Curaçao",
  "Ecuador": "Equador",
  "Côte d'Ivoire": "Costa do Marfim",
  "Ivory Coast": "Costa do Marfim",
  "Netherlands": "Países Baixos",
  "Japan": "Japão",
  "Sweden": "Suécia",
  "Tunisia": "Tunísia",
  "Belgium": "Bélgica",
  "Egypt": "Egito",
  "Iran": "Irã",
  "New Zealand": "Nova Zelândia",
  "Spain": "Espanha",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arábia Saudita",
  "Uruguay": "Uruguai",
  "France": "França",
  "Senegal": "Senegal",
  "Norway": "Noruega",
  "Iraq": "Iraque",
  "Argentina": "Argentina",
  "Algeria": "Argélia",
  "Austria": "Áustria",
  "Jordan": "Jordânia",
  "Portugal": "Portugal",
  "DR Congo": "Congo DR",
  "Congo DR": "Congo DR",
  "Colombia": "Colômbia",
  "Uzbekistan": "Uzbequistão",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Panama": "Panamá",
  "Ghana": "Gana",
};

export function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name;
}
