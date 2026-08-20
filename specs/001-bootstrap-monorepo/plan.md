# Implementation Plan: Bootstrap do monorepo ZooTech

**Branch**: `001-bootstrap-monorepo` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-bootstrap-monorepo/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Inicializar o monorepo ZooTech para que um contribuidor clone, instale e suba o painel e a API em até 10 minutos, com fronteiras óbvias e um contrato compartilhado de disponibilidade.

Abordagem: pnpm workspaces com `apps/web` (Next.js App Router + Tailwind 4 + shadcn em `packages/ui`), `apps/api` (Fastify + Clean Architecture), `packages/contracts` (`HealthResponse`), `packages/config` (TypeScript `strict`). Tela inicial presentacional em 320px; caso de uso de disponibilidade fora da UI; `GET /health` na API. Sem domínio de produto, auth, persistência, CI ou deploy.

Pesquisa consolidada em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS

**Primary Dependencies**: pnpm workspaces; Fastify (API); Next.js App Router (web); Tailwind CSS 4; shadcn/ui + Lucide; `@zootech/contracts` / `@zootech/ui` / `@zootech/config`; `tsx` (dev, API)

**Storage**: N/A nesta feature (sem persistência de produto; filesystem efêmero)

**Testing**: `tsc --noEmit` em todos os pacotes (`pnpm typecheck`); ESLint compartilhado. Sem runner de testes de domínio nesta feature.

**Target Platform**: Desenvolvimento local (macOS/Linux/Windows). API bind `0.0.0.0:$PORT` (default 3333). Web default 3000.

**Project Type**: Monorepo web + HTTP API + pacotes compartilhados

**Performance Goals**: Contribuidor sobe os dois lados em ≤10 minutos (SC-001). Tela inicial utilizável imediatamente em 320px. Sem meta de throughput de API nesta feature.

**Constraints**: Constituição 1.0.0 (Mobile-First 320px, UX não-redundante, WCAG 2.2 AA, Clean Architecture, UI sem regra de negócio, TypeScript strict, só pnpm). Sem auth, banco, CI, deploy, Turborepo/Nx, libs de UI paralelas ao shadcn.

**Scale/Scope**: 2 apps + 3 packages; 1 tela (casca); 1 endpoint (`GET /health`); 1 contrato público (`HealthResponse`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-design (Phase 0)

| Gate | Princípio | Status | Como esta feature obedece |
|------|-----------|--------|---------------------------|
| G1 | I. Mobile-First | PASS | Tela inicial empilhada; conteúdo e ação primária em 320px sem scroll horizontal. Breakpoints só como aprimoramento. |
| G2 | II. UX Clara e Não-Redundante | PASS | Identidade do produto sem microcopy que repete a UI; ação “Atualizar” com ícone Lucide + rótulo. |
| G3 | III. Acessibilidade Mínima | PASS | Nome acessível em controles; `alt` em imagens; tokens shadcn/OKLCH verificados contra AA. |
| G4 | IV. Clean Architecture no Monorepo | PASS | `apps` + `packages`; API em domain/application/adapters; contratos só em `@zootech/contracts`; UI não importa domínio da API. |
| G5 | V. UI Sem Regras de Negócio | PASS | Página presentacional; fetch/mapeamento de disponibilidade em `apps/web/src/application`; sem comentários de domínio no código. |
| G6 | Stack (pnpm, Fastify, Next App Router, Tailwind 4, shadcn) | PASS | Nenhuma substituição de stack. |
| G7 | TypeScript strict; sem `any` implícito | PASS | `tsconfig` base em `@zootech/config`; contratos exportados. |
| G8 | Dependências com dono; sem lib que o stack já cobre | PASS | `tsx` justificado em research.md; sem Turborepo, ORM, CORS, estado global. |
| G9 | Sem complexidade extra injustificada | PASS | Dois runtimes, um contrato, uma tela. |

**Resultado do gate**: PASS. Seguir para Phase 0/1.

### Post-design (Phase 1)

Reavaliado após [data-model.md](./data-model.md), [contracts/](./contracts/) e [quickstart.md](./quickstart.md):

- Modelo de dados não introduz persistência nem entidades de produto — G4/G9 intactos.
- Contrato HTTP é só `GET /health` + `HealthResponse` compartilhado — G4/G7 intactos.
- Quickstart cobre clone → install → dois starts → 320px e typecheck — G1 e SC-001.
- Rewrite Next → API evita CORS extra — G8 intacto.
- Bind `0.0.0.0:$PORT` não é deploy (FR-012); só alinhamento de plataforma.

**Resultado pós-design**: PASS. Sem violações a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-bootstrap-monorepo/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── health.yaml
│   └── ui-shell.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
pnpm-workspace.yaml
pnpm-lock.yaml
package.json
README.md
.eslintrc.cjs                 # ou eslint.config.js reexportando @zootech/config

apps/
├── web/                      # @zootech/web — Next.js App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx      # presentacional (casca 320px)
│   │   │   └── globals.css   # Tailwind 4 + tokens shadcn
│   │   └── application/
│   │       └── get-availability.ts
│   ├── next.config.ts        # transpilePackages: ['@zootech/ui']; rewrite /api → API_URL
│   └── package.json
└── api/                      # @zootech/api — Fastify
    ├── src/
    │   ├── domain/           # vazio de produto (README)
    │   ├── application/
    │   │   └── get-availability.ts
    │   ├── adapters/
    │   │   ├── http/
    │   │   │   ├── server.ts
    │   │   │   └── health.route.ts
    │   │   └── persistence/  # placeholder (README)
    │   └── main.ts
    └── package.json

packages/
├── contracts/                # @zootech/contracts
│   ├── src/
│   │   ├── health.ts         # HealthResponse
│   │   └── index.ts
│   └── package.json
├── ui/                       # @zootech/ui
│   ├── src/
│   │   ├── components/ui/    # Button (shadcn) e primitivos mínimos
│   │   └── lib/utils.ts      # cn()
│   ├── components.json
│   └── package.json
└── config/                   # @zootech/config
    ├── tsconfig.base.json
    ├── eslint.config.js
    └── package.json
```

**Structure Decision**: Monorepo constitucional `apps` + `packages` (não as árvores Option 1–3 do template). Web é adapter Next; API é Fastify com domain → application → adapters; contratos, UI e config são pacotes de fronteira. `packages/ui` é o dono dos primitivos shadcn; `apps/web` só compõe telas.

## Complexity Tracking

Nenhuma violação constitucional. Tabela não se aplica.
