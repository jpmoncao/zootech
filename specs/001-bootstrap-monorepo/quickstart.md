# Quickstart: Bootstrap do monorepo ZooTech

Guia de validação ponta a ponta da fundação. Não substitui o README da raiz (FR-013); o README MUST repetir instalação e start. Detalhes de contrato: [health.yaml](./contracts/health.yaml), [ui-shell.md](./contracts/ui-shell.md), [data-model.md](./data-model.md).

## Prerequisites

- Node.js 22 LTS
- pnpm (único gerenciador; ver `packageManager` na raiz)
- Git

## Setup

```bash
git clone <repo>
cd zootech
pnpm install
```

Esperado: lockfile `pnpm-lock.yaml` na raiz; workspaces `apps/*` e `packages/*` ligados.

## Subir os dois lados

Terminal A — API (default `3333`, bind `0.0.0.0`):

```bash
pnpm --filter @zootech/api dev
```

Esperado: processo escutando; log de listen.

Terminal B — painel (default `3000`):

```bash
pnpm --filter @zootech/web dev
```

Esperado: painel em `http://127.0.0.1:3000`.

Os dois processos são independentes: encerrar um não derruba o outro.

## Validar o contrato HTTP

Com a API no ar:

```bash
curl -sS http://127.0.0.1:3333/health
```

Esperado: JSON `{"status":"ok","service":"api"}` (schema em [health.yaml](./contracts/health.yaml)).

Com a API parada, o mesmo `curl` falha de conexão — nunca um 200 falso.

Via painel (rewrite): `http://127.0.0.1:3000/api/health` MUST devolver o mesmo corpo quando a API está no ar.

## Validar a casca (320px)

1. Abrir `http://127.0.0.1:3000` com viewport 320px de largura.
2. Identidade “ZooTech” visível; ação “Atualizar” visível e acionável; sem scroll horizontal da página.
3. Com API no ar: rótulo de disponibilidade “No ar”.
4. Com API parada (e refresh): “Indisponível”, sem falso “ok”.
5. DevTools / leitor: controles com nome acessível; contraste AA nos tokens.

Critério: [ui-shell.md](./contracts/ui-shell.md).

## Validar tipos compartilhados

```bash
pnpm typecheck
```

Esperado: `tsc --noEmit` verde em todos os pacotes.

Prova de SC-004 (manual): alterar `HealthResponse` em `@zootech/contracts` (ex.: tornar `service` um literal incompatível) e rerrodar `pnpm typecheck` — `@zootech/web` e `@zootech/api` MUST falhar. Reverter depois.

## Validar fronteiras

Em até 5 minutos, um revisor aponta:

- `apps/web` — painel
- `apps/api` — API (pastas `domain`, `application`, `adapters`)
- `packages/contracts`, `packages/ui`, `packages/config`

`packages/ui` e `apps/web` MUST NOT depender de `apps/api`. `apps/api/src/domain` MUST NOT importar Fastify, Next.js ou Tailwind.

## README

A raiz MUST documentar os mesmos comandos (`pnpm install`, start web, start API) e o mapa de pacotes. Este quickstart é o roteiro de aceite; o README é o guia do contribuidor (FR-002, FR-013, SC-001).
