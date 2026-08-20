# ZooTech

Monorepo do painel e da API. Node.js 22+ e pnpm.

## Instalar

```bash
pnpm install
```

## Subir (dois processos independentes)

API (`0.0.0.0:3333`):

```bash
pnpm --filter @zootech/api dev
```

ou `pnpm dev:api`.

Painel (`http://127.0.0.1:3000`):

```bash
pnpm --filter @zootech/web dev
```

ou `pnpm dev:web`.

Encerrar um lado não derruba o outro.

## Pacotes

| Caminho | Nome | Responsabilidade |
|---------|------|------------------|
| `apps/web` | `@zootech/web` | Painel (entrega) |
| `apps/api` | `@zootech/api` | API HTTP (Clean Architecture) |
| `packages/contracts` | `@zootech/contracts` | Tipos públicos web↔API |
| `packages/ui` | `@zootech/ui` | Primitivos visuais |
| `packages/config` | `@zootech/config` | TypeScript strict e ESLint |

## Checagem de tipos

```bash
pnpm typecheck
```
