# ZooTech

Sistema de gestão do Centro de Controle de Zoonoses.

O primeiro marco de produto é o login e o painel do veterinário administrador. Este repositório já tem o monorepo (pnpm, Turborepo, Next.js, NestJS e Postgres local). O front não tem tela: a identidade visual será definida antes de qualquer interface. A API expõe somente `GET /health`.

- `AGENTS.md` — contrato de cada tarefa
- `DEVELOPMENT_WORKFLOW.md` — fluxo de desenvolvimento
- `.ai-context/` — produto, domínio e decisões

## Instalação

Requer Node.js 22 ou superior e pnpm 11.

```bash
pnpm install
```

## API

```bash
pnpm dev:api
```

A API escuta em `0.0.0.0:3001` quando `PORT` não está definido. Confira o health:

```bash
curl http://localhost:3001/health
```

A resposta esperada é `{"status":"ok"}`. O health não usa o banco.

Variáveis de exemplo: `apps/api/.env.example`.

## Postgres local

```bash
docker compose up -d
```

O serviço usa usuário, senha e banco `zootech`, na porta `5432`. A URL correspondente está em `DATABASE_URL` no exemplo da API. Não há migração nem esquema de domínio.

## Front

`apps/web` está no workspace e não tem tela. A URL da API fica em `apps/web/.env.example` para uso futuro.
