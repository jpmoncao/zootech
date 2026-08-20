# Quickstart: Chassis do painel administrativo

Guia de validação ponta a ponta do chassis. Instalação e start dos dois processos: [README da raiz](../../README.md). Contratos: [ui-chassis.md](./contracts/ui-chassis.md), [data-model.md](./data-model.md). HTTP: [health.yaml da fundação](../001-bootstrap-monorepo/contracts/health.yaml).

## Prerequisites

- Node.js 22 LTS
- pnpm
- Fundação `001-bootstrap-monorepo` já executável no mesmo repo

## Setup

```bash
pnpm install
pnpm --filter @zootech/api dev
pnpm --filter @zootech/web dev
```

Esperado: API em `0.0.0.0:3333`; painel em `http://127.0.0.1:3000`.

## Validar o chassis (US1)

1. Abrir `http://127.0.0.1:3000`.
2. Apontar, sem ajuda: “ZooTech”, a navegação (Início, Animais, Recintos) e a região de conteúdo.
3. Destino Início distinguível (`aria-current="page"` no DevTools).
4. Landmarks: `header`, `nav`, `main`.

## Validar o início (US2)

1. Com a API no ar: conteúdo mostra “No ar”; Atualizar visível (ícone + rótulo).
2. Parar a API e acionar Atualizar: “Indisponível”; nav e identidade permanecem.
3. Subir a API e Atualizar de novo: “No ar”.

Rewrite: `http://127.0.0.1:3000/api/health` continua a devolver `{"status":"ok","service":"api"}` com a API no ar.

## Validar navegação e vazio (US3)

1. Ir a `/animais` e `/recintos` pela nav (e recarregar cada URL).
2. Destino ativo muda; chassis não some.
3. Nessas áreas: zero lista, id, quantidade ou exemplo. Só o título da área (+ ícone decorativo).
4. Voltar a Início pela nav em ≤15s.
5. Confirmar que estoque e login **não** aparecem na nav.

## Validar 320px (US4)

1. Viewport 320px de largura em `/`, `/animais` e `/recintos`.
2. Sem scroll horizontal da página.
3. Identidade visível; três destinos visíveis na barra inferior; no início, Atualizar acionável sem abrir menu.
4. Ampliar o viewport: trilho lateral pode aparecer; as rotas e ações das histórias 1–3 continuam válidas.

## Validar tema e a11y

1. Destaque verde folha no botão Atualizar e no destino ativo; fundo da página claro (não verde chapado).
2. Checker de contraste: pares primary / primary-foreground e texto / fundo passam AA.
3. Todo controle com nome acessível; ícones de estado vazio `aria-hidden`.

## Tipos

```bash
pnpm typecheck
```

Esperado: `tsc --noEmit` verde. `packages/ui` continua sem depender de `@zootech/api`. Páginas do chassis não importam Fastify nem interpretam `HealthResponse` diretamente.
