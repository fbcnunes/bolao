# Bolão "Cachorrada" — Cenário hipotético: pontuação ponderada por odd

> **Exercício hipotético, calculado em memória.** Nada foi alterado no banco de dados nem na aplicação.

## Regra aplicada

- **Pontos por acerto** = `PHASE_POINTS[fase] × odd do resultado acertado`.
  - Valores de fase: GRUPOS 10 · PLAYOFFS 15 · OITAVAS 20 · QUARTAS 30 · SEMI 40 · FINAL 50.
  - Odd = a do resultado que a pessoa acertou (CASA→oddHome, EMPATE→oddDraw, FORA→oddAway).
  - Fonte da odd: snapshot do palpite (`Prediction.oddId`); *fallback* para a odd mais recente da partida quando não há snapshot.
- **Bônus de rodada (+10)**: recalculado sobre a pontuação ponderada. Vai ao(s) maior(es) `roundPoints` hipotético(s) **por rodada completa** (todos os jogos ENCERRADO); empates → todos ganham.
- **Champion pick (+100)**: não aplicado (só vale ao fim da Copa), conforme combinado.

## (a) + (b) Ranking hipotético — com acertos, odd média e bônus recalculado

| Pos | Integrante | Acertos | Odd média | Palpites (odd) | Bônus recalc. | **Total hipotético** | Total atual | Pos atual |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1º | Narciso Mendes de Assis Júnior | 50 | 1.70 | 903.9 | 10 | **913.9** | 535 | 2º |
| 2º | Rafael Mendes Freitas Zanforlin Barbosa | 49 | 1.76 | 908.8 | 0 | **908.8** | 510 | 6º |
| 3º | Ronan Zanforlin Barbosa | 49 | 1.72 | 895.5 | 0 | **895.5** | 515 | 5º |
| 4º | Felipe Barros Teixeira de Freitas | 50 | 1.66 | 863.2 | 10 | **873.2** | 530 | 3º |
| 5º | Auro Jr | 51 | 1.62 | 857.8 | 0 | **857.8** | 540 | 1º |
| 6º | VITOR FREITAS DE SOUZA | 47 | 1.71 | 855.3 | 0 | **855.3** | 495 | 8º |
| 7º | Jota Wilson | 44 | 1.74 | 820.0 | 10 | **830.0** | 465 | 11º |
| 8º | Fernando Nunes (fbcnunes@gmail.com) *(ADMIN)* | 48 | 1.69 | 823.9 | 0 | **823.9** | 490 | 10º |
| 9º | DIOGO FREITAS LIMA | 50 | 1.58 | 823.0 | 0 | **823.0** | 530 | 4º |
| 10º | Mário Arthur de Freitas Seiffert | 49 | 1.61 | 812.8 | 0 | **812.8** | 505 | 7º |
| 11º | Antonio Nieto | 47 | 1.58 | 794.4 | 0 | **794.4** | 495 | 9º |
| 12º | Fernando Nunes (ftfnunes@gmail.com) | 41 | 1.61 | 685.8 | 0 | **685.8** | 425 | 12º |

## Detalhe do bônus de rodada recalculado (rodadas completas)

| Fase | Rodada | Maior roundPoints (odd) | Vencedor(es) do bônus |
|---|---:|---:|---|
| GRUPOS | 1 | 264.0 | Narciso Mendes de Assis Júnior |
| GRUPOS | 2 | 279.7 | Jota Wilson |
| GRUPOS | 3 | 318.4 | Felipe Barros Teixeira de Freitas |

**Rodadas incompletas (sem bônus atribuído):**
- PLAYOFFS rodada 1: 6/16 jogos encerrados
- OITAVAS rodada 1: 0/3 jogos encerrados

## Notas metodológicas

- Base: 575 acertos entre os 12 integrantes ativos; 5 acerto(s) usaram odd de *fallback* (sem snapshot).
- Comparação de bônus usa `roundPoints` hipotéticos da rodada (não o acumulado), replicando a lógica de `recalculateScoresAndRoundBonuses`.
- Só há partidas encerradas em GRUPOS, PLAYOFFS e OITAVAS; demais fases ainda não pontuam.
