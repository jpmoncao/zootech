# Implementation Plan: Chassis do painel administrativo

**Branch**: `002-admin-panel-shell` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-admin-panel-shell/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Transformar a casca isolada do ZooTech em chassis administrativo: identidade persistente, três destinos (Início, Animais, Recintos) e região de conteúdo. Início reusa o estado “No ar” / “Indisponível” + Atualizar. Animais e Recintos são vazios honestos. Sem auth, estoque, persistência ou dados de plantel.

Abordagem: Next.js App Router (`/`, `/animais`, `/recintos`) com layout semântico (`header` / `nav` / `main`). Mobile-first: barra inferior em 320px, trilho em `md+`. Tema shadcn new-york + Tailwind 4 com **verde folha** em `--primary` (superfície clara). UI presentacional; destinos e disponibilidade saem de `apps/web/src/application/`. `Button` existente; sem kit Sidebar. API e `HealthResponse` inalterados.

Pesquisa: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS (já no workspace)

**Primary Dependencies**: Next.js App Router; Tailwind CSS 4; shadcn/ui (new-york) + Lucide; `@zootech/ui` (`Button`); `@zootech/contracts` (`HealthResponse`, sem tipos novos); Fastify API da fundação (somente consumo de `GET /health`)

**Storage**: N/A (sem persistência de produto; filesystem efêmero)

**Testing**: `pnpm typecheck`; aceite manual via [quickstart.md](./quickstart.md) (320px, rotas, AA). Sem runner de teste nesta feature.

**Target Platform**: Painel web local (`http://127.0.0.1:3000`); viewport mínimo 320px; cenário primário escritório, mínimo constitucional estreito

**Project Type**: Feature de UI no monorepo existente (`apps/web` + tokens em `packages/ui` / `globals.css`)

**Performance Goals**: Operador identifica chassis em ≤10s (SC-001); volta ao Início em ≤15s (SC-002). Sem meta de throughput.

**Constraints**: Constituição 1.0.0 (320px, UX não-redundante, WCAG 2.2 AA, Clean Architecture, UI sem regra de negócio, TypeScript strict, só pnpm, shadcn+Tailwind 4). Pedido desta plan: verde folha, UI minimalista e semântica. FR-012: sem auth, domínio, estoque, deploy. Sem lib de UI paralela; sem Sidebar/Sheet shadcn para três links.

**Scale/Scope**: 1 layout + 3 rotas; 3 destinos de nav; 0 endpoints novos; 0 entidades persistidas; reuso de 1 contrato HTTP (`HealthResponse`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-design (Phase 0)

| Gate | Princípio | Status | Como esta feature obedece |
|------|-----------|--------|---------------------------|
| G1 | I. Mobile-First | PASS | Barra inferior com três destinos visíveis em 320px; trilho só em `md+`. Atualizar no `<main>`, não atrás de menu. |
| G2 | II. UX Clara e Não-Redundante | PASS | Rótulos só nos destinos e ações; vazio = título da área; ícone + rótulo; sem “em breve”. |
| G3 | III. Acessibilidade Mínima | PASS | `aria-current`, nomes acessíveis, landmarks, contraste AA nos tokens folha; ativo não só por cor. |
| G4 | IV. Clean Architecture no Monorepo | PASS | Sem domínio na API; nav e availability em `application/` do web; contratos HTTP inalterados. |
| G5 | V. UI Sem Regras de Negócio | PASS | Shell/páginas recebem view-models; não parseiam health nem decidem o conjunto de destinos. |
| G6 | Stack (pnpm, Next App Router, Tailwind 4, shadcn) | PASS | Tema e rotas; sem substituição de stack. Verde folha é token, não lib nova. |
| G7 | TypeScript strict; sem `any` implícito | PASS | View-models exportados; sem DTOs opacos. |
| G8 | Dependências com dono; sem lib que o stack já cobre | PASS | Sem Sidebar kit, sem estado global, sem ícones paralelos. Lucide já no web. |
| G9 | Sem complexidade extra injustificada | PASS | Três rotas, um layout, zero API nova. |

**Resultado do gate**: PASS. Seguir para Phase 0/1.

### Post-design (Phase 1)

Reavaliado após [data-model.md](./data-model.md), [contracts/ui-chassis.md](./contracts/ui-chassis.md) e [quickstart.md](./quickstart.md):

- Modelo só tem view-models de chrome e reuso de availability — G4/G9/FR-012 intactos.
- Contrato é de UI (landmarks, rotas, tokens); HTTP continua o da fundação — G4/G8 intactos.
- Quickstart cobre 320px, três URLs, vazio honesto, AA e typecheck — G1–G3, SC-001–SC-006.
- Verde folha restrito a `--primary` / ativo; fundo claro — pedido da plan sem violar G3.

**Resultado pós-design**: PASS. Sem violações a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-panel-shell/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-chassis.md    # Contrato de UI (HTTP = fundação)
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

Somente o que esta feature toca ou reusa. Sem apps/pacotes novos.

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # html + Chassis (header, nav, main)
│   │   ├── page.tsx                # Início (AvailabilityViewModel)
│   │   ├── animais/page.tsx        # EmptyAreaViewModel
│   │   ├── recintos/page.tsx       # EmptyAreaViewModel
│   │   ├── globals.css             # tokens verde folha + @theme
│   │   └── refresh-button.tsx      # reuso (Atualizar)
│   ├── application/
│   │   ├── get-availability.ts     # reuso (sem mudar política)
│   │   ├── get-nav.ts              # três destinos fechados
│   │   └── get-empty-area.ts       # título + iconKey
│   └── components/
│       └── chassis.tsx             # presentacional; props já resolvidas
├── next.config.ts                  # inalterado (rewrite /api → API)
└── package.json

packages/ui/
├── src/components/ui/button.tsx    # reuso; sem Sidebar
└── src/index.ts

apps/api/                           # sem mudança nesta feature
packages/contracts/                 # HealthResponse inalterado
```

**Structure Decision**: Continuar o monorepo constitucional `apps` + `packages`. O chassis é composição no adapter Next (`apps/web`), não um pacote novo. Primitivos shadcn continuam em `@zootech/ui`; chrome ZooTech (nav, áreas) não migra para `packages/ui` para não misturar produto com primitivo.

## Complexity Tracking

Nenhuma violação constitucional. Tabela não se aplica.
