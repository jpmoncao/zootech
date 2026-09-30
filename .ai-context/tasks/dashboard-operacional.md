# Implementation Tasks: Dashboard Operacional

## Objective

Implementar a dashboard operacional em `/painel` com indicadores agregados de animais, baias, castrações e adoções, incluindo comparação mensal e links para listas filtradas, conforme `.ai-context/specs/dashboard-operacional.md` e `.ai-context/plans/dashboard-operacional.md`.

## Assumptions

- Todos os perfis autenticados consultam os mesmos indicadores; a API da dashboard exige autenticação, sem restrição adicional de perfil.
- Animais ativos são os que não estão em situação `adotado` ou `obito`; alojados são ativos com baia.
- Disponíveis para adoção são somente animais saudáveis sem adoção ativa.
- Adoções usam meses-calendário no fuso `America/Sao_Paulo`; a comparação exibe variação absoluta e percentual, omitindo percentual quando o mês anterior é zero.
- “Vacinas pendentes” aparece como cartão informativo “Futura implementação”, sem valor numérico.
- Ocupação irregular é separada por causa: animais ativos em baias não ativas e animais terminais ainda associados a uma baia.
- O filtro de adoções por data inclui registros históricos mesmo quando o animal foi devolvido; portanto, aplica-se sobre `Adocao.adotadaEm` e não somente sobre a situação corrente do animal.

## Tasks

- [x] 1. Definir e documentar o contrato da resposta da dashboard
  - **Goal:** Fixar a forma da resposta de `GET /dashboard` antes de sua implementação: totais, ocupação por baia ativa, contagens de ocupação irregular por causa, castrações pendentes, adoções dos dois meses, variações absoluta/percentual, timestamp e estado informativo futuro de vacinação.
  - **Files:** `.ai-context/specs/dashboard-operacional.md`, `.ai-context/plans/dashboard-operacional.md`; tipos futuros em `apps/web/src/lib/api.ts`.
  - **Notes:** Usar zeros para métricas válidas sem registros; vacinação é estado de roadmap, não `0`. Percentual é `(atual - anterior) / anterior * 100` quando o anterior > 0. A resposta não deve conter dados pessoais de tutores.
  - **Verification:** Conferir que cada propriedade possui fonte, regra de contagem e tratamento de indisponibilidade definidos.

- [x] 2. Implementar endpoint autenticado e serviço agregado
  - **Goal:** Criar `GET /dashboard` com consultas Prisma agregadas, sem carregar páginas de registros no cliente.
  - **Files:** novos `apps/api/src/dashboard/dashboard.module.ts`, `dashboard.controller.ts`, `dashboard.service.ts`; `apps/api/src/app.module.ts`.
  - **Notes:** Aplicar `JwtAuthGuard` e `RolesGuard` conforme padrão dos módulos existentes, sem restrição de papel. Incluir contagem de ativos, alojados, saudáveis disponíveis, tratamento, quarentena, castrações agendadas e baias ativas com capacidade/ocupação. Retornar `atualizadoEm`.
  - **Verification:** Endpoint responde 401 sem sessão e contrato consistente para cada um dos quatro perfis autenticados; indicadores sem registros retornam zero.

- [x] 3. Detectar e retornar ocupações irregulares separadas por causa
  - **Goal:** Detectar ocupantes em baias não ativas e animais terminais ainda ligados a baia sem incluí-los nos totais regulares.
  - **Files:** `apps/api/src/dashboard/dashboard.service.ts`, `apps/api/src/dashboard/dashboard.spec.ts`.
  - **Notes:** Distinguir pelo menos `animal_ativo_em_baia_nao_ativa` e `animal_terminal_alocado`. Estados de baia considerados não ativos incluem inativa, interditada e em higienização.
  - **Verification:** Fixtures de cada causa aparecem somente na categoria correspondente e não alteram total de ativos, alojados ou ocupação normal.

- [x] 4. Calcular métricas de adoção por mês local e comparar períodos
  - **Goal:** Retornar total do mês atual e anterior, variação absoluta e percentual.
  - **Files:** `apps/api/src/dashboard/dashboard.service.ts`, `apps/api/src/dashboard/dashboard.spec.ts`.
  - **Notes:** Construir intervalos semiabertos para os meses em `America/Sao_Paulo`, convertendo limites para UTC ao consultar. Contar `Adocao.adotadaEm`, independentemente de devolução posterior. Se o mês anterior for zero, percentual deve ser `null`/omitido conforme contrato.
  - **Verification:** Testar limite anterior ao mês, primeiro instante do mês, limite exclusivo seguinte, virada de ano, mês anterior sem adoções e adoção devolvida.

- [x] 5. Adicionar filtro de lista por intervalo de datas da adoção
  - **Goal:** Permitir abrir `/painel/animais` com filtro por situação e/ou período de adoção, incluindo ciclos históricos devolvidos.
  - **Files:** `apps/api/src/animais/dto/list-animais.dto.ts`, `apps/api/src/animais/animais.service.ts`, `apps/api/src/animais/animais.controller.ts` somente se necessário; `apps/api/src/animais/animais.spec.ts`; `apps/web/src/lib/api.ts`; `apps/web/src/app/painel/animais/page.tsx`.
  - **Notes:** Usar parâmetros claros, por exemplo `adotadaDe` e `adotadaAte`, com limites inclusivos de data convertidos a intervalo semiaberto local. Filtrar por relação `adocoes.some` e preservar adoções que têm devolução. A tela deve ler query params na entrada e refletir o filtro em seus controles/consulta sem quebrar navegação ou paginação existentes. Para disponíveis, usar `situacao=saudavel`.
  - **Verification:** API filtra pelo intervalo de `Adocao.adotadaEm`; teste confirma que uma adoção devolvida permanece na lista histórica. Teste manual abre os links de disponível e de cada mês e confirma os filtros ativos.

- [x] 6. Cobrir regras agregadas da API com testes de integração
  - **Goal:** Garantir métricas corretas, ausência de vazamento e autorização.
  - **Files:** novo `apps/api/src/dashboard/dashboard.spec.ts`; `apps/api/src/animais/animais.spec.ts` para filtro por adoção.
  - **Notes:** Incluir animais saudáveis, em tratamento, quarentena, adotados, óbito, com e sem baia; baias ativas vazias/ocupadas e não ativas ocupadas; castração agendada, avaliação, cancelada e realizada; adoções dos dois meses e ciclos devolvidos.
  - **Verification:** Rodar suíte API; cobrir 401, quatro perfis autenticados, zero, limites de mês/fuso e cada critério de contagem.

- [x] 7. Conectar contrato da API e construir a página `/painel`
  - **Goal:** Substituir a tela de posto/turno pela dashboard responsiva e acessível.
  - **Files:** `apps/web/src/lib/api.ts`, `apps/web/src/app/painel/page.tsx`, provável novo `apps/web/src/app/painel/dashboard-content.tsx`.
  - **Notes:** Exibir grupos de plantel/ocupação, acompanhamento clínico, pendências e adoções. Remover o uso de `PostoTurno` nesta página. Adicionar cartão “Vacinas pendentes — Futura implementação” sem valor. Usar controles/componentes shadcn existentes, Tailwind no `className`, tokens de `DESIGN.md`; não criar classes de feature em `globals.css`.
  - **Verification:** Typecheck, lint e build web passaram. Navegador com respostas simuladas validou carregamento, erro/nova tentativa, dados sem registros, valores zero, variação negativa e percentual sem base; inspeção desktop/mobile sem transbordamento horizontal. Botões shadcn e rótulos semânticos. Integração real e links permanecem nas tasks 8–9.

- [x] 8. Ligar cartões às telas operacionais com filtros coerentes
  - **Goal:** Permitir ir dos indicadores para os registros que os compõem.
  - **Files:** `apps/web/src/app/painel/dashboard-content.tsx`, `apps/web/src/app/painel/animais/page.tsx`; links de baias/castrações conforme destinos existentes.
  - **Notes:** Disponíveis abrem animais saudáveis; adoções atuais/anteriores abrem a lista filtrada pelos limites mensais correspondentes. Animais por baia levam à baia ou à lista por `baiaId`. Não simular filtros que as telas destino não aplicam.
  - **Verification:** Clicar nos cartões mantém os parâmetros na URL e exibe os filtros corretos; destinos continuam respeitando RBAC.

- [x] 9. Validar integração, responsividade e atualizar contexto
  - **Goal:** Fechar a entrega com verificações técnicas e revisão da spec contra o comportamento.
  - **Files:** `apps/api/src/dashboard/dashboard.spec.ts`, testes existentes de animais; `.ai-context/architecture.md`, `.ai-context/short-term.md`, `.ai-context/specs/dashboard-operacional.md` quando aplicável.
  - **Notes:** Revisar diff e conferir que não foi adicionada migration sem necessidade, não existe número fictício de vacinas e adoções devolvidas continuam na comparação histórica. Atualizar arquitetura/contexto apenas com os fatos implementados.
  - **Verification:** Rodar testes API, `typecheck`/`lint` da API e web, build web; testar visualmente `/painel` em desktop/mobile com os cenários e filtros descritos nas tarefas anteriores.

## Validation Checklist

- [x] Testes de integração da dashboard e filtros de adoção passam.
- [ ] Typecheck, lint e build relevantes passam.
- [x] Totais distinguem animais ativos e alojados; animais terminais não entram.
- [x] Baias ativas incluem vagas; ocupação irregular é separada por causa.
- [x] Castrações pendentes incluem somente procedimentos agendados ativos.
- [x] Adoções usam `America/Sao_Paulo`, mostram mês atual/anterior, variação absoluta e percentual quando calculável.
- [x] Lista usa filtro por situação para disponíveis e datas de adoção para os totais mensais; históricos devolvidos continuam pesquisáveis.
- [x] Vacinação aparece como futura implementação sem contagem.
- [x] A página não exibe Posto/Turno e tem estados de carregamento, erro, zero e responsividade.
- [x] Contexto durável atualizado se a arquitetura ou foco ativo mudou.
- [x] Resumo final inclui verificações e exemplos concretos de validação manual.

## Blockers / Decisions Needed

- Nenhum bloqueio de produto conhecido. Contrato de resposta e nomes exatos dos parâmetros de data podem ser definidos durante a tarefa 1, respeitando as regras acima.
- A futura implementação de vacinação permanece fora desta entrega; sua contagem depende do módulo clínico.

## Validation Result (2026-09-28)

- [x] Postgres local alcançável; `prisma migrate deploy` confirmou que não há migrations pendentes.
- [x] `src/dashboard/dashboard.spec.ts`: 5 testes passaram com integração real, incluindo autenticação, quatro perfis, métricas incrementais, estados clínicos/terminais, baias, castrações e adoções históricas.
- [x] O teste isolado do filtro de adoção em `animais.spec.ts` passou; adoção devolvida permanece pesquisável pelo intervalo histórico.
- [x] Typecheck da API e web, lint da web, build da web e `git diff --check` passaram.
- [x] Revisão manual no navegador local confirmou a dashboard em viewport estreito, estado autenticado, zeros/valores reais, cartão de vacinação sem contagem, ocupação por baia, comparação mensal e filtros `adotadaDe`/`adotadaAte` na tela de destino.
- [ ] A suíte completa da API ainda falha em um cenário preexistente de adoção por conflito 409 ao reutilizar CPF de tutor gerado a partir dos quatro últimos dígitos de `Date.now()`; o caso não toca o dashboard. O lint da API também mantém quatro parâmetros de assinatura não usados em `animais.service.ts`.
