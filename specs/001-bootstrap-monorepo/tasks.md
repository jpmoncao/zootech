---
description: "Task list for bootstrap do monorepo ZooTech"
---

# Tasks: Bootstrap do monorepo ZooTech

**Input**: Design documents from `/specs/001-bootstrap-monorepo/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Não solicitados na spec. Validação via `pnpm typecheck`, README/quickstart e auditoria manual (320px, a11y). Sem tarefas de Vitest/Jest.

**Organization**: Tarefas agrupadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: US1–US5 conforme spec.md
- Incluir caminho de arquivo exato

## Path Conventions

Monorepo constitucional: `apps/web`, `apps/api`, `packages/contracts`, `packages/ui`, `packages/config` (ver plan.md).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Workspace pnpm e esqueleto de pastas. Sem apps executáveis ainda.

- [x] T001 Create `pnpm-workspace.yaml` at repo root listing `apps/*` and `packages/*`
- [x] T002 Create root `package.json` as private workspace named `zootech` with `packageManager` pnpm and placeholder scripts
- [x] T003 [P] Create root `.gitignore` ignoring `node_modules/`, `.next/`, `dist/`, `.turbo/`, `.env*.local`
- [x] T004 Create empty package directories `apps/web/`, `apps/api/`, `packages/contracts/`, `packages/ui/`, `packages/config/` as in plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript strict, ESLint compartilhado e `package.json` de cada pacote. BLOQUEIA todas as user stories.

**CRITICAL**: Nenhuma user story começa até esta fase terminar. Sem banco, auth, CI ou ORM (FR-012).

- [x] T005 Create `packages/config/package.json` for `@zootech/config` exporting tsconfig and eslint
- [x] T006 Create `packages/config/tsconfig.base.json` with `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`
- [x] T007 [P] Create `packages/config/eslint.config.js` with typescript-eslint for the workspace
- [x] T008 Create `packages/contracts/package.json` (`@zootech/contracts`) and `packages/contracts/tsconfig.json` extending `@zootech/config`
- [x] T009 [P] Create `packages/ui/package.json` (`@zootech/ui`) and `packages/ui/tsconfig.json` with no dependency on `@zootech/api`
- [x] T010 [P] Create `apps/api/package.json` (`@zootech/api`) with Fastify, `tsx`, `workspace:*` `@zootech/contracts`, and `apps/api/tsconfig.json` extending the base
- [x] T011 [P] Create `apps/web/package.json` (`@zootech/web`) with Next.js, Tailwind 4, `workspace:*` `@zootech/contracts` and `@zootech/ui`, and `apps/web/tsconfig.json`
- [x] T012 Create root `eslint.config.js` that re-exports `@zootech/config`
- [x] T013 Add `typecheck` script (`tsc --noEmit`) to each package and `pnpm typecheck` as `pnpm -r typecheck` in root `package.json`

**Checkpoint**: `pnpm install` gera `pnpm-lock.yaml`; cada pacote existe com `strict`; user stories podem começar.

---

## Phase 3: User Story 1 - Espaço de trabalho único e navegável (Priority: P1) MVP

**Goal**: Contribuidor localiza painel, API e pacotes compartilhados em até 5 minutos, com fronteiras óbvias e zero regra de negócio de produto.

**Independent Test**: Revisor aponta `apps/web`, `apps/api`, `packages/contracts`, `packages/ui`, `packages/config` e descreve a responsabilidade de cada um; `packages/ui` não depende da API; não há arquivos de animais/recintos/estoque.

### Implementation for User Story 1

- [x] T014 [P] [US1] Write `packages/contracts/README.md` stating it owns web↔API public types only
- [x] T015 [P] [US1] Write `packages/ui/README.md` stating presentational primitives only and confirm `packages/ui/package.json` has no `@zootech/api`
- [x] T016 [P] [US1] Write `packages/config/README.md` stating TypeScript strict and lint ownership
- [x] T017 [P] [US1] Write `apps/web/README.md` stating the panel is a delivery adapter, not the domain
- [x] T018 [P] [US1] Write `apps/api/README.md` stating Clean Architecture layers and that product domain is empty in this feature
- [x] T019 [US1] Create `apps/api/src/domain/README.md`, `apps/api/src/application/README.md`, `apps/api/src/adapters/http/README.md`, and `apps/api/src/adapters/persistence/README.md` as occupancy maps with no product entities
- [x] T020 [US1] Confirm workspace has no product-domain modules (animals, enclosures, stock) under `apps/` and `packages/`

**Checkpoint**: US1 testável só pela árvore e READMEs (SC-003). MVP da fundação.

---

## Phase 4: User Story 2 - Subir o painel e a API localmente (Priority: P1)

**Goal**: Clone + README da raiz sobem painel e API como processos independentes.

**Independent Test**: Seguir só o README da raiz: `pnpm install`, `pnpm --filter @zootech/api dev`, `pnpm --filter @zootech/web dev`. Painel em `http://127.0.0.1:3000`; API escuta `0.0.0.0:3333`. Encerrar um processo não derruba o outro.

### Implementation for User Story 2

- [x] T021 [US2] Scaffold Next.js App Router entry files `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/globals.css`
- [x] T022 [US2] Implement Fastify bootstrap in `apps/api/src/adapters/http/server.ts` listening on `0.0.0.0` and `process.env.PORT` default `3333`
- [x] T023 [US2] Create `apps/api/src/main.ts` that starts the HTTP adapter and `dev` script using `tsx watch` in `apps/api/package.json`
- [x] T024 [US2] Create `apps/web/next.config.ts` with `transpilePackages: ['@zootech/ui']` and `dev` script in `apps/web/package.json`
- [x] T025 [US2] Write root `README.md` documenting Node 22, pnpm install, start API, start web, and the package map (FR-002, FR-013)
- [x] T026 [US2] Add conveniences in root `package.json` (`dev:web`, `dev:api`) that filter `@zootech/web` and `@zootech/api` without coupling the two processes

**Checkpoint**: US2 válida pelo quickstart (setup + dois starts). Tela ainda pode ser placeholder até US4.

---

## Phase 5: User Story 3 - Contratos compartilhados entre painel e API (Priority: P2)

**Goal**: `HealthResponse` vive só em `@zootech/contracts`; API e web consomem o mesmo tipo; typecheck pega drift.

**Independent Test**: `curl http://127.0.0.1:3333/health` devolve `{ "status": "ok", "service": "api" }`. Ambos os apps importam `@zootech/contracts`. Quebrar o tipo em `packages/contracts/src/health.ts` faz `pnpm typecheck` falhar nos dois consumidores (SC-004).

### Implementation for User Story 3

- [x] T027 [US3] Export named `HealthResponse` and `HealthStatus` from `packages/contracts/src/health.ts` and `packages/contracts/src/index.ts` matching `specs/001-bootstrap-monorepo/contracts/health.yaml`
- [x] T028 [US3] Implement `get-availability` in `apps/api/src/application/get-availability.ts` returning `HealthResponse` without importing Fastify
- [x] T029 [US3] Register `GET /health` in `apps/api/src/adapters/http/health.route.ts` serializing the use case result
- [x] T030 [US3] Wire the health route in `apps/api/src/adapters/http/server.ts`
- [x] T031 [US3] Add Next.js rewrite `/api/:path*` → `API_URL` (default `http://127.0.0.1:3333`) in `apps/web/next.config.ts`
- [x] T032 [US3] Implement `apps/web/src/application/get-availability.ts` fetching `/api/health`, parsing `HealthResponse`, mapping failures to view-model `unavailable` (no false ok)
- [x] T033 [US3] Confirm `apps/web/package.json` and `apps/api/package.json` depend on `@zootech/contracts` via `workspace:*` with no local duplicate DTO

**Checkpoint**: Contrato HTTP e typecheck alinhados a US3 e health.yaml.

---

## Phase 6: User Story 4 - Casca do painel usável em 320px (Priority: P2)

**Goal**: Tela inicial presentacional em 320px, ícone+rótulo, nome acessível, contraste AA, sem copy redundante.

**Independent Test**: Viewport 320px em `http://127.0.0.1:3000`: identidade ZooTech, estado No ar/Indisponível, ação Atualizar acionável, sem scroll horizontal; controles com nome acessível; UI não interpreta HTTP (usa view-model). Ver `contracts/ui-shell.md`.

### Implementation for User Story 4

- [x] T034 [US4] Add shadcn `components.json` and `cn()` helper in `packages/ui/components.json` and `packages/ui/src/lib/utils.ts`
- [x] T035 [US4] Add shadcn Button primitive in `packages/ui/src/components/ui/button.tsx` and export it from `packages/ui/src/index.ts`
- [x] T036 [US4] Configure Tailwind 4 + shadcn CSS variables/tokens in `apps/web/src/app/globals.css` for WCAG 2.2 AA
- [x] T037 [US4] Implement presentational `apps/web/src/app/page.tsx` per `specs/001-bootstrap-monorepo/contracts/ui-shell.md` receiving resolved view-model only (FR-008)
- [x] T038 [US4] Add Lucide refresh icon plus visible label “Atualizar” with accessible name on the primary control in `apps/web/src/app/page.tsx` (min 44px touch target, stacked 320px layout)
- [x] T039 [US4] Ensure `apps/web/src/app/layout.tsx` has no redundant microcopy and decorative images use `alt=""` if any

**Checkpoint**: US4 válida em 320px (SC-002, SC-005, SC-006) sem domínio de produto.

---

## Phase 7: User Story 5 - Camadas da API localizáveis e vazias de domínio (Priority: P3)

**Goal**: Domínio / aplicação / adapters óbvios; domínio sem Fastify/Next/Tailwind; sem comentários de regra de negócio no código.

**Independent Test**: Revisor encontra as três camadas; `apps/api/src/domain` não importa entrega/I/O; grep não acha comentários de domínio de produto em `apps/` e `packages/ui` (SC-007).

### Implementation for User Story 5

- [x] T040 [P] [US5] Keep `apps/api/src/domain/` free of Fastify, Next.js, ORM, and Tailwind imports (README-only occupancy is acceptable)
- [x] T041 [P] [US5] Confirm `apps/api/src/adapters/persistence/README.md` documents that persistence is out of scope (FR-012)
- [x] T042 [US5] Confirm `apps/api/src/application/get-availability.ts` has no Fastify import and is the only application use case in this feature
- [x] T043 [US5] Confirm HTTP/I/O live only under `apps/api/src/adapters/http/` (`server.ts`, `health.route.ts`, `main.ts` bootstrap)
- [x] T044 [US5] Remove any product-business comments from `apps/` and `packages/ui` (guidance stays in spec/constitution)

**Checkpoint**: Clean Architecture visível e vazia de produto.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Aceite do quickstart e higiene do workspace.

- [x] T045 [P] Align root `README.md` package map with `apps/*` and `packages/*` (FR-013)
- [x] T046 Run `pnpm typecheck` from repo root until all packages pass
- [x] T047 Execute `specs/001-bootstrap-monorepo/quickstart.md` (install, two starts, curl `/health`, rewrite `/api/health`, 320px smoke)
- [x] T048 Verify `packages/ui` and `apps/web` do not depend on `apps/api` in their `package.json` files
- [x] T049 Confirm no auth, database, CI, or deploy config was added (FR-012)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as stories
- **User Stories (Phase 3–7)**: Dependem do Foundational
  - Sequência recomendada (um implementador): US1 → US2 → US3 → US4 → US5
  - US1 não precisa de servidores
  - US2 precisa dos apps do Foundational (+ mapa US1)
  - US3 precisa da API/web executáveis (US2)
  - US4 precisa do view-model/rewrite (US3)
  - US5 pode sobrepor US2/US3 na árvore da API, mas o aceite final é depois das rotas existirem
- **Polish (Phase 8)**: Depois das stories desejadas

### User Story Dependencies

- **US1 (P1)**: Após Phase 2 — independente
- **US2 (P1)**: Após Phase 2; usa o mapa da US1
- **US3 (P2)**: Após US2 (superfície HTTP + Next)
- **US4 (P2)**: Após US3 (contrato + get-availability no web)
- **US5 (P3)**: Após Phase 2; verificação final após US2/US3 colocarem código nas camadas

### Within Each User Story

- Contratos/tipos antes de rotas
- Caso de uso de aplicação antes do adapter HTTP
- UI presentacional depois do módulo `application/` do web
- Sem testes automatizados nesta feature

### Parallel Opportunities

- Phase 1: T003 paralelo a T001/T002
- Phase 2: T007, T009, T010, T011 em paralelo após T005–T006
- US1: T014–T018 em paralelo
- US5: T040–T041 em paralelo
- Polish: T045 paralelo a checagens T048/T049
- Com dois implementadores após Phase 2: um faz US1+US5 (mapa/camadas), outro US2 (runtimes); US3/US4 em seguida

---

## Parallel Example: User Story 1

```bash
# READMEs de fronteira em paralelo (arquivos distintos):
Task: "Write packages/contracts/README.md"
Task: "Write packages/ui/README.md"
Task: "Write packages/config/README.md"
Task: "Write apps/web/README.md"
Task: "Write apps/api/README.md"
```

## Parallel Example: User Story 5

```bash
Task: "Keep apps/api/src/domain/ free of framework imports"
Task: "Confirm apps/api/src/adapters/persistence/README.md out of scope"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1
4. **STOP**: revisor localiza os cinco pacotes em ≤5 minutos
5. Demo do mapa do monorepo (ainda sem start)

### Incremental Delivery

1. Setup + Foundational → workspace strict
2. US1 → mapa navegável (MVP)
3. US2 → dois processos + README
4. US3 → `GET /health` + typecheck compartilhado
5. US4 → casca 320px acessível
6. US5 → camadas CA auditáveis
7. Polish → quickstart.md verde

### Parallel Team Strategy

1. Setup + Foundational juntos
2. Dev A: US1 depois US5
3. Dev B: US2 depois US3 depois US4
4. Polish em conjunto

---

## Notes

- [P] = arquivos diferentes, sem depender de tarefa incompleta no mesmo arquivo
- Sem tarefas de teste automatizado (spec não pediu)
- Não adicionar Turborepo, Prisma, CORS, auth ou CI
- `tsx` só em `apps/api` (justificado em research.md)
- Bind API: `0.0.0.0:$PORT` (default 3333)
- Commit por tarefa ou por fase
- Parar em qualquer checkpoint para validar a story
