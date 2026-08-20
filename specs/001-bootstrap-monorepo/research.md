# Research: Bootstrap do monorepo ZooTech

**Feature**: `001-bootstrap-monorepo`  
**Date**: 2026-08-19

Todas as ambiguidades de stack estão resolvidas pela Constituição 1.0.0. Este documento registra decisões de *como* aplicar essa stack na fundação, sem redesenhá-la.

---

## 1. Gerenciador e workspace

**Decision**: pnpm workspaces (`pnpm-workspace.yaml`) com `apps/*` e `packages/*`; lockfile único `pnpm-lock.yaml`; protocolo `workspace:*` para pacotes internos; `packageManager` no `package.json` raiz.

**Rationale**: A constituição exige pnpm como único gerenciador. Workspaces nativos + `workspace:*` impedem resolver um pacote interno no registry. Para um monorepo pequeno (`apps/web`, `apps/api`, três packages), pnpm sozinho basta.

**Alternatives considered**:

- npm/yarn workspaces — violação constitucional.
- Turborepo / Nx — orquestração e cache extras. A constituição pede o caminho mais simples; sem CI nem gargalo de build, são complexidade injustificada. Podem ser avaliados numa feature posterior.

---

## 2. Pacotes do workspace

**Decision**:

| Pacote | Nome npm | Responsabilidade |
|--------|----------|------------------|
| `apps/web` | `@zootech/web` | Painel Next.js (adapter de entrega) |
| `apps/api` | `@zootech/api` | API Fastify (adapters HTTP + camadas internas) |
| `packages/contracts` | `@zootech/contracts` | Tipos/interfaces públicos web↔API |
| `packages/ui` | `@zootech/ui` | Primitivos shadcn e tokens visuais |
| `packages/config` | `@zootech/config` | `tsconfig` base (`strict: true`) e ESLint compartilhado |

Dependências internas só via `workspace:*`. `apps/web` declara `@zootech/contracts` e `@zootech/ui`. `apps/api` declara só `@zootech/contracts` — nunca `@zootech/ui`. `packages/ui` não declara `@zootech/api` nem importa domínio da API.

**Rationale**: Espelha a seção Contratos e pastas da constituição. Nomes com escopo `@zootech/` tornam a fronteira óbvia (FR-001, SC-003).

**Alternatives considered**:

- Um único `packages/shared` — mistura contratos, UI e config; fura a separação obrigatória.
- Publicar pacotes no npm — desnecessário; o consumo é só interno.

---

## 3. TypeScript estrito e verificação

**Decision**: TypeScript 5.x em todo o workspace. `packages/config` exporta `tsconfig.base.json` com `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`. Cada app/package `extends` essa base. Scripts raiz: `pnpm typecheck` → `pnpm -r typecheck` (`tsc --noEmit`). Contratos públicos exportados em `@zootech/contracts`. Sem `any` implícito.

**Rationale**: FR-010 e seção Qualidade da constituição. `tsc --noEmit` é a prova de SC-004 sem framework de teste extra.

**Alternatives considered**:

- Inferência solta / `strict` só em um app — violação.
- Vitest nesta feature — a spec não exige testes automatizados de domínio; typecheck cobre o contrato compartilhado. Testes de integração entram em features seguintes.

---

## 4. API Fastify + Clean Architecture

**Decision**: Fastify em TypeScript. Camadas em `apps/api/src`:

- `domain/` — entidades e portas de produto; **vazia de regra de negócio nesta feature** (README de ocupação).
- `application/` — caso de uso `get-availability` que devolve `HealthResponse` de `@zootech/contracts`, sem importar Fastify.
- `adapters/http/` — bootstrap Fastify, rota `GET /health`, bind `0.0.0.0` e `process.env.PORT` (default local `3333`).
- `adapters/persistence/` — placeholder (README); sem ORM, sem banco.

Entrada de desenvolvimento: `tsx watch` no `main` que só monta adapters. Domínio e aplicação não importam `fastify`, ORM, Next.js nem Tailwind.

**Rationale**: Princípio IV. Health/availability não é domínio de zoológico; vive na aplicação como caso de uso trivial + adapter HTTP, para as três camadas já serem localizáveis (US5) sem inventar entidade de produto.

**Alternatives considered**:

- Health só no plugin Fastify, pastas de domínio/aplicação ausentes — falha US5 (camadas não localizáveis).
- NestJS / Express — stack não ratificada.
- Prisma/Postgres nesta feature — FR-012 proíbe persistência de produto.

**Dependência extra justificada**: `tsx` em `apps/api` (dev) para executar TypeScript sem passo de bundle. Alternativa (Node type stripping) ainda é irregular entre versões; `tsx` é o menor runtime extra para o bootstrap.

---

## 5. Painel Next.js + Tailwind 4 + shadcn

**Decision**: Next.js App Router (TypeScript) em `apps/web`. Tailwind CSS 4 via CSS-first (`@import "tailwindcss"`, tokens em `@theme`; `tailwind.config` vazio no `components.json`). shadcn/ui estilo `new-york`, CSS variables, primitivos em `packages/ui`. `apps/web` transpila `@zootech/ui` (`transpilePackages`) para consumir TSX sem build separado do package.

Tela inicial: Server Component presentacional. Dados de disponibilidade vêm de um módulo de aplicação em `apps/web/src/application/` (fetch do contrato), **fora** do componente de UI. Ícones Lucide (ecossistema shadcn) com rótulo na ação não universal (“Atualizar”). Viewport-first: layout empilhado, área de toque ≥ 44px, sem overflow horizontal em 320px.

**Rationale**: Constituição (painel, Tailwind 4, shadcn). Princípios I, II, III, V. Lucide já é a `iconLibrary` padrão do shadcn; não é um sistema de ícones paralelo.

**Alternatives considered**:

- Pages Router — constituição pede App Router.
- Tailwind 3 + `tailwind.config.js` — constituição pede Tailwind 4.
- shadcn copiado só em `apps/web` — o package `ui` deixaria de ter dono; a constituição pede `packages` de UI.
- Biblioteca de UI paralela (MUI, Chakra) — proibida.

---

## 6. Contrato HTTP de disponibilidade e CORS

**Decision**: `GET /health` na API. Corpo 200: `HealthResponse` (`status: "ok"`, `service: "api"`) definido **somente** em `@zootech/contracts`. Painel chama `/api/health` via *rewrite* do Next.js para `API_URL` (default `http://127.0.0.1:3333`). Sem `@fastify/cors` nesta feature.

Se a API estiver parada, o módulo de aplicação do web mapeia falha de rede para um view-model `unavailable` — sem falso “ok”.

**Rationale**: Caminho `/health` é convenção de indústria; o nome de produto na spec é “verificação de disponibilidade”. Rewrite evita pacote CORS e cookie/origem cruzada no bootstrap local. SC-001 e edge case de serviço parado.

**Alternatives considered**:

- `@fastify/cors` + `NEXT_PUBLIC_API_URL` no browser — mais superfície; útil quando houver auth/cookies. Adiar.
- GraphQL health — stack HTTP REST implícita na constituição (Fastify adapters); GraphQL seria lib extra.

---

## 7. Qualidade (lint) e o que não entra

**Decision**: ESLint (typescript-eslint) compartilhado via `@zootech/config`. Sem Prettier, Husky, CI, Docker, banco, auth, estado global (Zustand/Redux), microserviços.

**Rationale**: DevDependencies de qualidade são permitidas. Runtime e CI extras exigem barreira de necessidade; FR-012 e constituição (complexidade extra).

**Alternatives considered**: Biome no lugar de ESLint — troca o default do Next/shadcn por outra ferramenta; não vale nesta fundação.

---

## 8. Bind de porta (plataforma)

**Decision**: API escuta `0.0.0.0:$PORT` com fallback `3333`. Web usa a porta do Next (default `3000`, respeita `$PORT` se o host injetar). Filesystem tratado como efêmero: nenhum dado de produto escrito em disco.

**Rationale**: Hosts de deploy (ex.: Render) exigem bind em `0.0.0.0` e `$PORT`. Não é deploy desta feature (FR-012), mas evita retrabalho na primeira publicação.

**Alternatives considered**: Bind só em `127.0.0.1` — quebra no primeiro serviço web remoto.

---

## Resolução de NEEDS CLARIFICATION

Nenhum item do Technical Context ficou como NEEDS CLARIFICATION: linguagem, dependências, storage, testes, plataforma, tipo de projeto, performance, constraints e escopo saem da constituição + spec.
