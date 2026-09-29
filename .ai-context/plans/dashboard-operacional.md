# Implementation Plan: Dashboard Operacional

## Objective

Implementar a página `/painel` com indicadores agregados de animais, baias, castrações e adoções conforme `.ai-context/specs/dashboard-operacional.md`, deixando vacinação identificada como futura implementação sem exibir contagem sem fonte de dados.

## Relevant Context

- A rota atual `/painel` em `apps/web/src/app/painel/page.tsx` é um Server Component que renderiza `Shell` e o bloco `PostoTurno`; a spec determina remover esse bloco da página e usar a rota como dashboard.
- A API NestJS registra módulos em `apps/api/src/app.module.ts`. Controllers de domínio aplicam `JwtAuthGuard` e `RolesGuard`; listas de baias e dados de animais já estão disponíveis para todos os perfis autenticados.
- `Animal.situacao` distingue `em_tratamento`, `em_quarentena_observacao`, `saudavel`, `adotado` e `obito`. `Animal.baiaId` representa alocação atual e é opcional.
- `CastracaoAnimal` distingue avaliações e procedimentos, com estado `agendada`, `realizada`, `cancelada` ou `nao_castrado`. `estadoCastracaoAnimal` existe em `apps/api/src/animais/estado-castracao.ts`; a consulta global de castrações já existe.
- Adoções ficam em `Adocao.adotadaEm`; devoluções encerram o ciclo e preservam o registro. Os meses devem usar o fuso `America/Sao_Paulo`.
- O front usa `api.ts` para contratos e chamadas autenticadas, shadcn/ui para controles e Tailwind no `className`, conforme `AGENTS.md` e `DESIGN.md`.
- A especificação foi alinhada com as decisões do usuário: mostrar ativos e alojados separadamente; adoção disponível apenas para saudáveis; baias ativas com alerta separado de ocupação irregular; adoções comparadas ao mês anterior; todos os perfis autenticados veem as mesmas métricas; sem posto/turno.

## Files and Modules Likely Involved

- `apps/api/src/dashboard/dashboard.module.ts` — novo módulo de leitura agregada, se mantido como módulo dedicado.
- `apps/api/src/dashboard/dashboard.controller.ts` — endpoint autenticado `GET /dashboard`.
- `apps/api/src/dashboard/dashboard.service.ts` — contagens agregadas com Prisma e período mensal.
- `apps/api/src/dashboard/dashboard.spec.ts` — testes de integração API das regras agregadas.
- `apps/api/src/app.module.ts` — registrar o novo módulo.
- `apps/web/src/lib/api.ts` — tipos da resposta e chamada autenticada.
- `apps/web/src/app/painel/page.tsx` — remover `PostoTurno` e hospedar a nova dashboard.
- Possível `apps/web/src/app/painel/dashboard-content.tsx` — componente client-side para carregar a resposta, estados de carregamento/erro e conteúdo interativo, caso necessário pelo padrão de sessão atual.
- `.ai-context/specs/dashboard-operacional.md` — fonte funcional; já foi corrigido o critério de disponibilidade para não conflitar com “somente saudáveis”.
- `.ai-context/architecture.md` e `.ai-context/short-term.md` — atualizar após implementação, caso a estrutura de dashboard/API passe a ser durável e o foco ativo mude.

## Proposed Approach

1. Criar uma consulta agregada de leitura no backend, protegida por autenticação e sem restrição adicional de papel, retornando uma fotografia consistente com `atualizadoEm`.
2. Calcular contagens no banco, sem buscar listas paginadas para contar no cliente. Manter critérios explícitos e reutilizar os modelos/filtros atuais.
3. Para o total de animais ativos, filtrar situação não terminal (`notIn: [adotado, obito]`); para alojados, aplicar o mesmo filtro e `baiaId != null`.
4. Para animais por baia, buscar baias em estado `ativa` e agregar ocupantes ativos/capacidade. Em consulta paralela, detectar animais ativos em baias não ativas e animais terminais ainda alocados; devolver alerta separado de ocupação irregular sem expor campos sensíveis.
5. Contar saudáveis disponíveis para adoção sem adoção ativa. Como adoção concluída atualiza `Animal.situacao` para `adotado` e devolução altera situação atomicamente, a situação saudável mais ausência de adoção ativa é o critério inicial; confirmar por query relacional para proteger contra dados legados inconsistentes.
6. Contar animais em tratamento e quarentena por situação. Contar castrações pendentes como procedimentos `agendada`, sem incluir avaliações, canceladas ou realizadas; garantir ausência de duplicação no resultado.
7. Calcular adoções do mês atual e anterior com intervalos semiabertos (`>= início`, `< próximo início`) em `America/Sao_Paulo`; devolver valores, variação absoluta e percentual `(atual - anterior) / anterior * 100`. Quando o mês anterior for zero, não devolver percentual.
8. Não incluir número para vacinação. A UI apresenta cartão informativo “Futura implementação”, sem tratar isso como dado zero ou erro.
9. Criar uma página responsiva com grupos de indicadores, estados carregando/erro/vazio e links para módulos existentes. Animais disponíveis levam à lista filtrada por `situacao=saudavel`; adoções realizadas levam à lista de animais filtrada pelas datas de adoção do mês correspondente.
10. Adicionar suporte a filtro por intervalo de `Adocao.adotadaEm` à consulta/lista de animais e inicializar a tela de animais pelos parâmetros da URL, preservando a navegação direta existente. Datas do intervalo são limites mensais em `America/Sao_Paulo`; adotar uma convenção clara (`adotadaDe`/`adotadaAte`) e aplicar como relação sobre `adocoes`, incluindo adoções históricas já devolvidas.

## Implementation Steps

1. [x] Reconciliar o contrato da resposta antes de codificar: definir nomes dos campos para totais, ocupação por baia, ocupação irregular separada por causa, adoções atual/anterior/variação absoluta/percentual, timestamp e cartão futuro da vacinação.
2. [x] Implementar módulo/serviço/controller do endpoint. Usar `PrismaModule`, `AuthModule`, guards existentes e consultas agregadas, sem gravar auditoria para uma leitura.
3. Adicionar testes Supertest cobrindo todos os perfis autenticados, 401, estados terminais, animais sem baia, situações clínicas, baia ativa vazia/ocupada, ocupação irregular, castrações por estado/tipo e ciclos de adoção/devolução.
4. [x] Cobrir limites de mês e fuso: adoção imediatamente antes do início, no início e no limite superior de cada período, incluindo virada de mês/ano e mês anterior sem adoções.
5. Adicionar contrato tipado e função `obterDashboard` no `api.ts`, usando o mecanismo existente de sessão/refresh.
6. Substituir o conteúdo de `/painel` pela dashboard e remover a dependência de `PostoTurno` nessa página. Exibir “Vacinas pendentes — futura implementação” sem número.
7. Conectar links para animais, baias e castrações. O cartão de disponíveis abre animais com filtro de situação saudável; os totais de adoções atual/anterior abrem animais com intervalo de `adotadaEm` do mês correspondente. Implementar e validar os filtros de URL/API necessários.
8. Rodar testes de API, typecheck e lint/build relevantes do monorepo; revisar manualmente a página em larguras desktop e mobile e conferir a spec contra o resultado.
9. Atualizar contexto durável (`architecture.md`, `short-term.md`) se o novo módulo e endpoint forem incorporados.

## Verification Plan

- `pnpm --filter @zootech/api test -- --runInBand` (ou comando equivalente disponível no workspace) para testes de endpoint e regras de consulta.
- `pnpm --filter @zootech/api typecheck` e `pnpm --filter @zootech/api lint`.
- `pnpm --filter @zootech/web typecheck`, `pnpm --filter @zootech/web lint` e `pnpm --filter @zootech/web build`.
- Verificação manual com conjunto de dados que inclua: ativos sem baia; saudáveis, tratamento, quarentena, adotados e óbito; baia ativa vazia/ocupada; ocupação irregular numa baia interditada/inativa; agendamento de castração, cancelamento e realização; adoção devolvida e adoções em ambos os meses.
- Confirmar que todos os quatro perfis autenticados recebem o mesmo contrato e que endpoints de destino continuam protegidos pelo RBAC.
- Confirmar os estados visuais zero, carregando, erro e cartão de vacinação marcado como futura implementação.
- Confirmar navegação com filtro saudável e períodos mensal atual/anterior, incluindo adoções devolvidas no histórico.
- Confirmar variação absoluta e percentual para mês anterior positivo, e omissão do percentual quando o mês anterior for zero.

## Risks and Edge Cases

- A regra “baia ativa” e “ocupação irregular” precisa distinguir o estado `em_higienizacao` junto de inativa/interditada; a spec chama todas as baias não ativas de irregulares caso ainda tenham ocupantes.
- A ocupação irregular deve ser separada por causa: animais ativos em baias não ativas e animais terminais ainda alocados. Na interface, manter os motivos identificáveis e não somá-los à ocupação normal.
- Adoção disponível “saudável sem adoção ativa” pode encontrar conflito em dados inconsistentes (situação saudável com adoção aberta); a resposta não deve contá-lo até que a query de estado ativa seja confirmada.
- Prisma guarda timestamps em UTC; conversão incorreta para o período local pode deslocar adoções na virada de mês. Definir limites do período no backend em `America/Sao_Paulo` e testar limites. Reutilizar os mesmos limites nos filtros de lista.
- Uma resposta única do dashboard pode falhar integralmente quando uma consulta falhar. A spec ainda deixa aberto se blocos independentes devem sobreviver a falha parcial; a primeira versão recomenda falha clara do endpoint, sem zeros inventados.
- Agregação de castrações deve excluir exames/avaliações e cancelamentos mesmo quando existam múltiplas tentativas para um animal.
- A lista atual de animais filtra por `situacao`, mas não por datas de adoção. Será necessário acrescentar filtros de data na API e inicialização a partir da URL para que os cartões de adoções abram uma lista realmente filtrada. Para preservar históricos devolvidos, a filtragem deve buscar registros `Adocao` dentro do intervalo, não apenas animais atualmente em `adotado`.

## Open Questions

- Decisões resolvidas pelo usuário: mostrar vacinação como futura implementação; separar ocupação irregular por causa; exibir variação absoluta e percentual das adoções (omitir percentual quando mês anterior é zero); abrir a lista de animais filtrada por situação e datas de adoção.
- Implementar filtro `situacao=saudavel` para disponíveis e intervalo de data de adoção para os totais mensais; registros devolvidos continuam elegíveis para filtro histórico por data.

## Definition of Done

- `/painel` mostra todas as métricas implementáveis da spec e não exibe `PostoTurno`.
- Vacinação aparece como cartão de futura implementação, sem contagem fictícia.
- Totais e comparações usam os critérios aprovados, inclusive elegibilidade somente de animais saudáveis e mês em `America/Sao_Paulo`.
- Todos os perfis autenticados acessam as mesmas métricas; usuários não autenticados são bloqueados.
- Ocupações irregulares são separadas por causa e não são somadas indevidamente ao plantel alojado.
- Adoções apresentam total atual/anterior, variação absoluta e percentual quando calculável; os links aplicam os filtros de situação e datas de adoção esperados.
- Estados zero, erro, carregamento e sem dados estão claros; links encaminham para telas compatíveis.
- Testes e verificações relevantes passam, diffs revisados, e contexto atualizado conforme necessidade.
