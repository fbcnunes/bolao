const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY;

async function fetchOdds(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("apiKey", API_KEY ?? "");
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`The Odds API ${res.status}: ${text}`);
  }

  return res.json();
}

export type OddsEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
};

export const oddsApi = {
  getWorldCupOdds: (): Promise<OddsEvent[]> =>
    fetchOdds("/sports/soccer_fifa_world_cup/odds", {
      regions: "eu",
      markets: "h2h",
      oddsFormat: "decimal",
    }),
};

// Mapping from The Odds API team names → our DB team names (PT-BR)
// The Odds API uses English names similar to football-data.org
export const ODDS_TEAM_MAP: Record<string, string> = {
  "South Africa": "África do Sul",
  "Mexico": "México",
  "Czechia": "Tchéquia",
  "Czech Republic": "Tchéquia",
  "South Korea": "Coreia do Sul",
  "Bosnia and Herzegovina": "Bósnia-Herzegovina",
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
  "Paraguay": "Paraguai",
  "Turkey": "Turquia",
  "Türkiye": "Turquia",
  "Australia": "Austrália",
  "Germany": "Alemanha",
  "Curaçao": "Curaçao",
  "Ecuador": "Equador",
  "Ivory Coast": "Costa do Marfim",
  "Côte d'Ivoire": "Costa do Marfim",
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
  "Colombia": "Colômbia",
  "Uzbekistan": "Uzbequistão",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Panama": "Panamá",
  "Ghana": "Gana",
};

export function normalizeOddsTeamName(name: string): string {
  return ODDS_TEAM_MAP[name] ?? name;
}
