# Implementation Tasks: Gestão de Baias

## Objective

Entregar cadastro e edição de baias, consulta em lista e mapa esquemático, ocupantes, ações operacionais e histórico de auditoria, seguindo `.ai-context/specs/gestao-de-baias.md` e `.ai-context/plans/gestao-de-baias.md`.

## Assumptions

- As decisões listadas em **Blockers / Decisions Needed** serão resolvidas antes das tarefas que dependem delas.
- Persistência será implementada com Prisma/Postgres; auditoria será gravada na mesma transação da alteração operacional.
- O mapa é uma grade agrupada por setor, sem coordenadas ou escala física.
- Não será criado um modelo provisório de Animal sem acordo explícito sobre sua relação com o futuro domínio.

## Tasks

- [x] 1. Modelar e migrar baia e auditoria
  - Goal: Criar persistência para setor, tipo, estado operacional, atributos, ocupação conforme contrato aprovado, unicidade do código e eventos de auditoria.
  - Files: `apps/api/prisma/schema.prisma`, nova migration em `apps/api/prisma/migrations/`.
  - Notes: Definir normalização do código e convenção de `AuditoriaEvento.dados` para identificar baia e ação. Não armazenar total de ocupantes como fonte de verdade.
  - Verification: `pnpm --filter @zootech/api prisma:generate` e aplicação da migration em Postgres local; confirmar constraints/índices necessários.

- [x] 2. Implementar API de leitura, criação e edição
  - Goal: Expor listagem filtrável, detalhe, criação e edição de baias autenticadas.
  - Files: novo `apps/api/src/baias/` (controller, service, DTOs e specs), `apps/api/src/app.module.ts`.
  - Notes: Aplicar unicidade case-insensitive; validar capacidade inteira >= 1, individual = 1, ocupação atual, ocupantes compatíveis e impedir exclusão física.
  - Verification: Testes de códigos duplicados/normalizados, validação de capacidade, edição incompatível, filtros e detalhe com ocupantes.

- [x] 3. Implementar ações operacionais e trilha de auditoria
  - Goal: Adicionar interdição/liberação, inativação/reativação e início/conclusão de higienização segundo as regras e permissões aprovadas.
  - Files: `apps/api/src/baias/` e, se necessário, ajustes localizados em guards/decorators existentes.
  - Notes: Alteração de estado e evento de auditoria devem confirmar ou reverter juntos; operação concorrente não pode ultrapassar capacidade nem interditar uma baia que acabou de ser ocupada.
  - Verification: Testes para estados inválidos, baia ocupada, autorização por perfil, higienização incompleta, auditoria atômica e concorrência.

- [x] 4. Expor contrato de baias ao front
  - Goal: Adicionar tipos e funções tipadas para consultas, CRUD, ações, ocupantes e histórico.
  - Files: `apps/web/src/lib/api.ts`.
  - Notes: Padronizar tratamento de erros usando `ApiError` e o mecanismo atual de sessão JWT/refresh.
  - Verification: Typecheck do web e revisão de payloads/respostas contra DTOs e endpoints da API.

- [x] 5. Construir página de lista e mapa
  - Goal: Substituir a seção genérica por uma página que permita alternar lista/mapa, filtrar por setor/estado, buscar por código e ver indicadores e ocupação.
  - Files: novo `apps/web/src/app/painel/baias/page.tsx`, componentes de domínio sob `apps/web/src/components/`, `apps/web/src/app/globals.css` somente se necessário.
  - Notes: Reusar tema, componentes shadcn e padrões responsivos existentes; ambas as visualizações usam os mesmos filtros e conjunto de resultados.
  - Verification: Navegador: alternância lista/mapa, filtros combinados, busca, estados vazios/carregando/erro e layout responsivo.

- [x] 6. Construir formulário, detalhes, ocupantes e ações
  - Goal: Permitir cadastro/edição e abrir detalhes com ocupantes, higienização e histórico; apresentar ações permitidas e confirmações.
  - Files: componentes da página de baias sob `apps/web/src/components/` e rota `/painel/baias`.
  - Notes: Preservar dados preenchidos após erro; exibir mensagens de conflito vindas da API; não oferecer ação proibida pelo perfil.
  - Verification: Navegador: criar/editar, falha de validação, visualizar ocupantes e histórico, confirmar ação e conferir estado atualizado.

- [x] 7. Aplicar e validar autorização ponta a ponta
  - Goal: Garantir que capacidades de CRUD, ações e auditoria correspondam à matriz de papéis aprovada.
  - Files: `apps/api/src/baias/`, `apps/web/src/lib/access.ts`, `apps/web/src/components/shell.tsx` ou menu apenas se a decisão exigir ajustes.
  - Notes: API é autoridade; todos os perfis autenticados consultam baias, e Coordenação concentra CRUD, ações operacionais e histórico/auditoria. O front usa helpers de capacidade em `access.ts` para ocultar controles equivalentes.
  - Verification: `pnpm --filter @zootech/api test -- baias.spec.ts`, `pnpm --filter @zootech/api typecheck`, `pnpm --filter @zootech/api lint`, `pnpm --filter @zootech/web typecheck`, `pnpm --filter @zootech/web lint`.

- [x] 8. Rodar validação integrada e atualizar contexto
  - Goal: Confirmar comportamento da jornada e registrar o modelo realmente entregue.
  - Files: testes de `apps/api/src/baias/`; `.ai-context/architecture.md`, `.ai-context/glossary.md`, `.ai-context/short-term.md`.
  - Notes: Não há harness automatizado existente para UI; registrar verificação manual da página.
  - Verification: `pnpm --filter @zootech/api test`, `pnpm --filter @zootech/api test -- baias.spec.ts`, typecheck/lint da API e web, build web, `pnpm lint` e `pnpm typecheck` na raiz; validado no navegador em `http://localhost:3002/painel/baias` com login seed, cadastro, lista/mapa, busca, detalhe, ocupantes vazios, higienização e histórico.

## Validation Checklist

- [x] Testes cobrem duplicidade, capacidade, estados, autorização e auditoria. Concorrência e ocupação real ficam para o domínio Animal.
- [x] API e web passam typecheck e lint; build aplicável passa.
- [x] Lista e mapa retornam os mesmos registros para os mesmos filtros.
- [ ] Regras de ocupação e isolamento dependem do modelo Animal. Estados operacionais são impostos pela API.
- [x] Alterações e ações aparecem no histórico com responsável e horário.
- [x] `.ai-context/` reflete modelo, permissões e fluxo implementados.
- [x] Resumo final informa verificações e exemplos de teste manual.

## Blockers / Decisions Needed

- Escolher se o cadastro de animais será implementado junto e aprovar o modelo mínimo necessário para ocupantes, ou agendar baias após esse domínio.
- Definir o campo/estado oficial de isolamento do animal.
- Definir quem pode cadastrar/editar, higienizar, interditar/liberar, inativar/reativar e consultar auditoria.
- Confirmar pré-condições: baia vazia para higienizar/interditar/inativar; processo para reativar/liberar; motivo obrigatório ou opcional.
- Definir se transferência entre baias integra este marco.
- Aprovar a convenção de auditoria (`AuditoriaEvento.dados` com entidade/ID ou modelo dedicado) e a estratégia de unicidade case-insensitive do código.
