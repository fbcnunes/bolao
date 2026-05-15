# Plano de Desenvolvimento — Bolão Copa do Mundo 2026 (Docker Edition)

## Contexto

Sistema web responsivo (PWA) para gerenciar um bolão da Copa 2026 entre um grupo fechado. Stack: **Next.js fullstack + MySQL (Host) + API-Football**. O servidor já roda outros apps, então o bolão será isolado em um **container Docker** expondo a **porta 4000**. MySQL compartilhado no host (3306) com novo banco `bolao`.

---

## Fase 0 — Infraestrutura e Dockerização (Dia 1)

### 0.1 Ambiente de desenvolvimento
- Criar diretório do projeto: `/var/www/html/bolao/app`
- Inicializar projeto Next.js 14+ com App Router: `npx create-next-app@latest ./app`
  - TypeScript: sim | Tailwind CSS: sim | App Router: sim
- Criar `.env` com variáveis de ambiente:
  ```
  PORT=3000
  DATABASE_URL=mysql://root:root@host.docker.internal:3306/bolao
  API_FOOTBALL_KEY=<chave>
  NEXTAUTH_SECRET=<secret>
  NEXTAUTH_URL=http://95.111.255.60:4000
  ```

### 0.2 Dockerização
- Criar `Dockerfile`: Multi-stage build (deps, builder, runner) otimizado para Next.js.
- Criar `docker-compose.yml`:
  ```yaml
  services:
    app:
      build: .
      ports:
        - "4000:3000"
      extra_hosts:
        - "host.docker.internal:host-gateway"
      restart: always
      env_file: .env
  ```

### 0.3 Banco de dados
- Criar banco no MySQL do Host: `CREATE DATABASE bolao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
- Instalar **Prisma ORM** e criar schema com as tabelas do SDD:
  - `users`, `matches`, `odds`, `predictions`, `rounds`, `scores`
- Rodar migrations (via script ou container temporário).

### 0.4 Nginx (Reverse Proxy no Host)
- Criar `/etc/nginx/sites-available/bolao` apontando para `http://127.0.0.1:4000`.
- Habilitar com symlink e recarregar nginx.

---

## Fase 1 — Banco de Dados e Schema (Dia 1–2)

Arquivo crítico: `prisma/schema.prisma`

Tabelas conforme SDD:
- `users` — id, nome, email, senha_hash, perfil (PARTICIPANTE | ADMIN), status (PENDENTE | ATIVO | RECUSADO)
- `matches` — id, api_id, fase, rodada, times, data_hora, resultado, status
- `odds` — id, match_id, odds, favorito, timestamp
- `predictions` — id, user_id, match_id, palpite, odd_id, acertou
- `rounds` — id, fase, numero, bonus_calculado
- `scores` — id, user_id, round_id, pontos_rodada, pontos_acumulados

---

## Fase 2 — Autenticação (Dia 2–3)

- NextAuth com Credentials Provider (bcrypt).
- Middleware para proteção de rotas.
- Fluxo de aprovação: Usuários novos entram como `PENDENTE` e precisam de aprovação admin para acessar o sistema.

---

## Fase 3 — Integração API-Football (Dia 3–4)

- Implementar `lib/api-football.ts`.
- Jobs de sincronização (API Routes):
  - `sync-matches`: Atualiza calendário.
  - `sync-results`: Atualiza placares e dispara cálculo de pontos.
  - `sync-odds`: Atualiza cotações antes dos jogos.
- Configurar **Crontab** no host ou container para disparar os jobs via `curl`.

---

## Fase 4 — APIs e Backend (Dia 4–5)

- Endpoints para listagem de jogos, envio de palpites (individual e batch) e consulta de ranking.
- Lógica de cálculo de pontos:
  - Acerto do resultado: Ganha pontos baseados na Odd do time escolhido (ex: se a odd era 2.5, ganha 25 pontos).
  - Bônus de Rodada: Pontos extras para os 3 primeiros de cada rodada.

---

## Fase 5 — Interface UI/UX Pro Max (Dia 5–9)

- **Mobile-first Design**: Navegação inferior, botões grandes.
- **Home**: Jogos do dia com countdown.
- **Batch Screen**: Interface rápida para marcar todos os jogos da rodada.
- **Ranking Animado**: Transições suaves e destaque para o líder.

---

## Fase 6 — PWA e Finalização (Dia 9–10)

- Configuração de Manifest e Service Workers.
- Testes de fluxo: Cadastro -> Aprovação -> Palpite -> Resultado -> Ranking.
- Build final e `docker-compose up -d --build`.

---

## Arquivos Críticos

| Arquivo | Responsabilidade |
|---|---|
| `Dockerfile` / `docker-compose.yml` | Infraestrutura e Isolamento |
| `prisma/schema.prisma` | Estrutura de dados |
| `app/api/auth/[...nextauth]/route.ts` | Autenticação |
| `lib/api-football.ts` | Sincronização externa |
| `app/(app)/palpites/page.tsx` | UI Principal de Palpites |

---

## Verificação Final

- [ ] Container rodando e saudável (`docker ps`).
- [ ] Conexão com MySQL do host funcional.
- [ ] Sincronização de dados da API importando jogos.
- [ ] Fluxo de aprovação de usuários bloqueando acessos indevidos.
- [ ] Interface fluida e "premium" no mobile.
