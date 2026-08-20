---
description: "Task list for chassis do painel administrativo ZooTech"
---

# Tasks: Chassis do painel administrativo

**Input**: Design documents from `/specs/002-admin-panel-shell/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Não solicitados na spec. Validação via `pnpm typecheck`, [quickstart.md](./quickstart.md) e auditoria manual (320px, a11y, contraste AA). Sem tarefas de Vitest/Jest/Playwright.

**Organization**: Tarefas agrupadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: US1–US4 conforme spec.md
- Incluir caminho de arquivo exato

## Path Conventions

Monorepo constitucional. Esta feature toca sobretudo `apps/web` e tokens em `apps/web/src/app/globals.css`. Primitivo `Button` em `packages/ui`. Sem apps/pacotes novos (ver plan.md).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar a fundação 001 e o lugar do chassis. Sem pacotes novos.

- [x] T001 Confirm `apps/web/package.json` still depends on `@zootech/ui`, `@zootech/contracts`, Next, Tailwind 4, and `lucide-react` with no extra UI library
- [x] T002 Create `apps/web/src/components/` for presentational chassis (no domain modules)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens verde folha e view-model de navegação. BLOQUEIA todas as user stories.

**CRITICAL**: Nenhuma user story começa até esta fase terminar. Sem banco, auth, Sidebar shadcn, endpoints novos ou dados de plantel (FR-012).

- [x] T003 Replace casca tokens with leaf-green `--primary`, `--primary-foreground`, `--ring`, `--accent`, `--accent-foreground`, `--muted`, and `--muted-foreground` in `apps/web/src/app/globals.css` (`:root` + `@theme inline`), keeping a light page background
- [x] T004 Export closed `NavDestination` types and `getNav()` returning exactly Início `/`, Animais `/animais`, Recintos `/recintos` with `iconKey` `house` | `paw` | `fence` from `apps/web/src/application/get-nav.ts`
- [x] T005 Create presentational `Chassis` props (`identity`, `destinations`, `children`) and landmark skeleton in `apps/web/src/components/chassis.tsx` with no fetch and no health parsing
- [x] T006 Confirm `packages/ui/src/index.ts` still exports only `Button` / `buttonVariants` / `cn` and that `packages/ui/package.json` has no `@zootech/api`

**Checkpoint**: Tema folha no CSS; destinos tipados; chassis existe sem política. Stories podem começar.

---

## Phase 3: User Story 1 - Reconhecer o chassis (Priority: P1) MVP

**Goal**: Operador abre o painel e vê identidade, navegação e região de conteúdo; destino atual distinguível.

**Independent Test**: Abrir `http://127.0.0.1:3000` e apontar, sem ajuda, “ZooTech”, os três destinos e o `<main>`. DevTools: `header`, `nav`, `main`; `aria-current="page"` no Início. Ver [contracts/ui-chassis.md](./contracts/ui-chassis.md).

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `Chassis` landmarks (`<header>`, `<nav aria-label="Principal">`, `<main>`) and identity “ZooTech” without subtitle in `apps/web/src/components/chassis.tsx`
- [x] T008 [P] [US1] Implement `apps/web/src/components/nav-links.tsx` as a client presentational list: `Button asChild` + Next `Link`, Lucide `House` / `PawPrint` / `Fence` plus visible labels from destination props
- [x] T009 [US1] Wire `getNav()` + `Chassis` around `{children}` in `apps/web/src/app/layout.tsx` (`lang="pt-BR"`)
- [x] T010 [US1] Mark the active destination with `aria-current="page"` and a non-color cue (font weight and/or indicator) in `apps/web/src/components/nav-links.tsx`

**Checkpoint**: US1 testável só com o layout no `/` (SC-001). MVP do chassis.

---

## Phase 4: User Story 2 - Início com estado do sistema (Priority: P1)

**Goal**: `<main>` do Início mostra “No ar” / “Indisponível” e Atualizar; UI não interpreta HTTP.

**Independent Test**: API no ar → “No ar” + Atualizar. API parada + Atualizar → “Indisponível”; chassis permanece. Página não importa `HealthResponse`.

### Implementation for User Story 2

- [x] T011 [US2] Keep policy in `apps/web/src/application/get-availability.ts` unchanged (200 + `HealthResponse` → available; any failure → unavailable)
- [x] T012 [US2] Render only resolved status (`role="status"` `aria-live="polite"`) and `RefreshButton` in `apps/web/src/app/page.tsx`; do not repeat “ZooTech” as a content heading (identity stays in the chassis header)
- [x] T013 [US2] Keep icon `RefreshCw` plus visible label “Atualizar” on `Button` default (primary leaf green, ≥44px) in `apps/web/src/app/refresh-button.tsx`
- [x] T014 [US2] Style “Indisponível” without `--primary` leaf green in `apps/web/src/app/page.tsx` (icon + resolved label remain the source of meaning)

**Checkpoint**: US2 válida no Início dentro do chassis (FR-004, FR-005, FR-013).

---

## Phase 5: User Story 3 - Navegar entre áreas (Priority: P2)

**Goal**: Rotas `/animais` e `/recintos` existem, vazias e honestas; nav marca o destino; reload restaura a área.

**Independent Test**: Percorrer Início → Animais → Recintos → Início. Ativo muda. Áreas de plantel sem lista, id, quantidade ou exemplo. Estoque/login ausentes da nav. Recarregar `/animais` permanece lá.

### Implementation for User Story 3

- [x] T015 [US3] Export `EmptyAreaViewModel` and `getEmptyArea(id)` (`title` + `iconKey` only) from `apps/web/src/application/get-empty-area.ts`
- [x] T016 [P] [US3] Create presentational `apps/web/src/app/animais/page.tsx` using `getEmptyArea('animals')`: area title + decorative Lucide icon (`aria-hidden`), no list or copy explaining the name
- [x] T017 [P] [US3] Create presentational `apps/web/src/app/recintos/page.tsx` using `getEmptyArea('enclosures')` with the same empty rules as Animais
- [x] T018 [US3] Resolve `aria-current` from the App Router pathname for `/`, `/animais`, and `/recintos` in `apps/web/src/components/nav-links.tsx`
- [x] T019 [US3] Confirm `apps/web/src/application/get-nav.ts` still has exactly three destinations and no stock or auth hrefs (FR-002)

**Checkpoint**: US3 válida pelas três URLs (SC-002, SC-006, SC-007).

---

## Phase 6: User Story 4 - Chassis utilizável em 320px (Priority: P2)

**Goal**: Em 320px, identidade, três destinos (barra inferior) e ação primária da área cabem sem scroll horizontal; `md+` ganha trilho.

**Independent Test**: Viewport 320px em `/`, `/animais`, `/recintos`: sem overflow-x da página; destinos visíveis na barra inferior; no Início, Atualizar acionável sem menu. Ampliar: trilho lateral, mesmas rotas.

### Implementation for User Story 4

- [x] T020 [US4] Implement mobile-first bottom nav (three equal tabs, ≥44px) and `main` padding so content is not hidden in `apps/web/src/components/chassis.tsx` and `apps/web/src/components/nav-links.tsx`
- [x] T021 [US4] Add `md+` persistent side rail and hide the bottom bar using Tailwind in `apps/web/src/components/chassis.tsx` (enhancement only)
- [x] T022 [US4] Prevent page horizontal scroll (`overflow-x`) at 320px in `apps/web/src/app/globals.css` and/or `apps/web/src/components/chassis.tsx`
- [x] T023 [US4] Confirm Atualizar stays in `<main>` (not inside the bottom nav) in `apps/web/src/app/page.tsx` and `apps/web/src/app/refresh-button.tsx`

**Checkpoint**: US4 válida em 320px (SC-003) sem depender do trilho.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Aceite do quickstart, typecheck, AA e fronteiras.

- [x] T024 Run `pnpm typecheck` from repo root until all packages pass
- [x] T025 Execute `specs/002-admin-panel-shell/quickstart.md` (two processes, three routes, empty areas, 320px, `/api/health`)
- [x] T026 Verify WCAG 2.2 AA on leaf-green pairs in `apps/web/src/app/globals.css` (primary vs primary-foreground; text vs background; accent text vs accent fill)
- [x] T027 Confirm no plantel mock data, auth, inventory destination, or Sidebar/Sheet package in `apps/web/src/`, `apps/web/package.json`, and `packages/ui/package.json` (FR-012)
- [x] T028 [P] Update `apps/web/README.md` stating the panel is a delivery chassis (Início / Animais / Recintos) with no product domain in the UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — fundação 001 já existe
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as stories
- **User Stories (Phase 3–6)**: Dependem do Foundational
  - Sequência recomendada (um implementador): US1 → US2 → US3 → US4
  - US1 não precisa das rotas de plantel
  - US2 precisa do chassis da US1 para o Início viver no `<main>`
  - US3 precisa do layout da US1 (nav + `children`)
  - US4 ajusta o mesmo chassis para 320px / `md+`
- **Polish (Phase 7)**: Depois das stories desejadas

### User Story Dependencies

- **US1 (P1)**: Após Phase 2 — independente; MVP
- **US2 (P1)**: Após US1 (reusa `Chassis` / `layout.tsx`); `get-availability.ts` já existe
- **US3 (P2)**: Após US1 (rotas novas no mesmo layout); não depende do conteúdo do Início
- **US4 (P2)**: Após US1 (layout responsivo no chassis); melhor depois de US2/US3 para validar Atualizar e vazios em 320px

### Within Each User Story

- View-models de aplicação antes das páginas presentacionais
- Landmarks e nav antes das rotas extras
- Barra inferior (mínimo) antes do trilho `md+`
- Sem testes automatizados nesta feature

### Parallel Opportunities

- Phase 2: T005 paralelo a T006 após T003/T004 (arquivos distintos)
- US1: T007 e T008 em paralelo; T009 depois dos dois; T010 depois de T008
- US3: T016 e T017 em paralelo após T015
- Polish: T028 paralelo a T026/T027 depois do typecheck
- Com dois implementadores após US1: um faz US2 (Início), outro US3 (rotas vazias); US4 no chassis em seguida (arquivo compartilhado — um dono)

---

## Parallel Example: User Story 1

```bash
# Landmarks e links em arquivos distintos:
Task: "Implement Chassis landmarks in apps/web/src/components/chassis.tsx"
Task: "Implement nav-links.tsx with Button asChild and Lucide icons"
```

## Parallel Example: User Story 3

```bash
# Páginas vazias em paralelo após get-empty-area.ts:
Task: "Create apps/web/src/app/animais/page.tsx"
Task: "Create apps/web/src/app/recintos/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (tokens + `getNav`)
3. Phase 3: US1 (chassis visível)
4. **STOP**: operador identifica produto, nav e conteúdo em ≤10s
5. Demo do mapa do painel (Início ainda pode ser a casca antiga no `<main>`)

### Incremental Delivery

1. Setup + Foundational → tema folha + destinos tipados
2. US1 → chassis reconhecível (MVP)
3. US2 → Início operacional no `<main>`
4. US3 → Animais/Recintos vazios + URLs estáveis
5. US4 → 320px + trilho `md+`
6. Polish → quickstart.md verde

### Parallel Team Strategy

1. Setup + Foundational juntos
2. Dev A: US1 depois US2 depois US4 (mesmo chassis)
3. Dev B: após US1, US3 (páginas de área)
4. Polish em conjunto

---

## Notes

- [P] = arquivos diferentes, sem depender de tarefa incompleta no mesmo arquivo
- Sem tarefas de teste automatizado (spec não pediu)
- Não adicionar Sidebar, Sheet, NavigationMenu, Zustand, auth, mock de plantel ou destino de estoque
- `Button` de `@zootech/ui` é o único primitivo novo-ou-reusado; Lucide já está em `@zootech/web`
- HTTP permanece `GET /health` / `HealthResponse` da fundação
- Commit por tarefa ou por fase
- Parar em qualquer checkpoint para validar a story
