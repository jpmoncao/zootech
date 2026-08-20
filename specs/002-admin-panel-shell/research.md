# Research: Chassis do painel administrativo

**Feature**: `002-admin-panel-shell`  
**Date**: 2026-08-19

Stack já ratificada (Constituição 1.0.0 + fundação `001-bootstrap-monorepo`). Este documento registra *como* aplicar shadcn + Tailwind 4 ao chassis, com UX moderna, verde folha como destaque, UI minimalista e semântica — sem redesenhar o monorepo nem antecipar domínio.

---

## 1. Superfície: só o painel web

**Decision**: Implementar o chassis apenas em `apps/web` + tokens/primitivos em `packages/ui`. A API, `@zootech/contracts` (`HealthResponse`) e `GET /health` permanecem como na fundação. Nenhum endpoint, entidade de domínio ou persistência nova.

**Rationale**: FR-012 e FR-013. O valor desta feature é orientação (navegação + áreas), não dados. Alterar a API seria complexidade extra injustificada.

**Alternatives considered**:

- Contratos novos em `@zootech/contracts` para destinos de nav — a nav não cruza a fronteira web↔API; poluiria o pacote compartilhado.
- BFF ou rotas Fastify para “áreas” — não há recurso de servidor a expor.

---

## 2. Navegação mobile-first (barra inferior + trilho)

**Decision**: Três destinos sempre visíveis.

- **320px (ponto de partida)**: barra de navegação inferior (`<nav>`), três destinos iguais, área de toque ≥ 44×44px. Identidade “ZooTech” no topo. Conteúdo em `<main>` com espaço inferior para não ficar sob a barra.
- **Aprimoramento (`md+`)**: trilho lateral persistente (mesmos três destinos + identidade). A barra inferior some. O início mínimo **não** depende desse trilho.

Destino ativo: `aria-current="page"` **e** marca visual que não seja só cor (peso tipográfico ou indicador). Ícones Lucide + rótulo em todos os destinos (significado de “Recintos” / “Animais” não é universal).

**Rationale**: Constituição I (mobile-first; breakpoints só aprimoram). FR-007 / US4: identidade, acesso à navegação e ação primária da área visíveis em 320px sem scroll horizontal. Barra inferior evita hamburger que esconde destinos. Padrão moderno de painel (tab bar + rail), não dashboard desktop-first.

**Alternatives considered**:

- **Hamburger + Sheet shadcn** — permitido pela spec (“ou o controle que a abre”), mas esconde destinos e adiciona um toque extra para a tarefa primária de US3. Rejeitado como ponto de partida.
- **Sidebar shadcn completo** (`SidebarProvider`, collapsible, atalhos) — kit desktop-first, várias dependências Radix extras para três links. Constituição: caminho mais simples; primitivos novos só se o stack não cobrir. Três `Link` + `Button` (`asChild`) bastam.
- **Só sidebar, hamburger no estreito** — viola o espírito mobile-first (layout mínimo nasceria do desktop).

---

## 3. Rotas App Router

**Decision**: File-based routes em `apps/web/src/app`:

| Destino   | Rota        | Conteúdo                                      |
|-----------|-------------|-----------------------------------------------|
| Início    | `/`         | Estado de disponibilidade + Atualizar (001)   |
| Animais   | `/animais`  | Estado vazio honesto                          |
| Recintos  | `/recintos` | Estado vazio honesto                          |

O chassis vive no `layout.tsx` raiz (identidade + nav + `children`). Recarregar em `/animais` ou `/recintos` restaura essa área (edge case da spec). Destino inexistente: Next 404 padrão; não inventar páginas de estoque.

**Rationale**: FR-001–FR-003, FR-006. URLs estáveis permitem o edge case de reload. App Router já é o runtime constitucional.

**Alternatives considered**:

- Query `?area=` numa única página — recarregar e compartilhar área ficam frágeis; foge do App Router.
- Rotas `/animals` em inglês — interface e produto são `pt-BR` (FR-011).

---

## 4. Camadas no web (UI sem política)

**Decision**:

- `apps/web/src/application/get-availability.ts` — inalterado na política; continua o único lugar que interpreta HTTP → view-model.
- `apps/web/src/application/get-nav.ts` — lista fechada dos três destinos (id, href, rótulo, chave de ícone). A UI não decide o conjunto de áreas.
- Páginas e shell: presentacionais; recebem view-models e emitem intenções (`Link`, refresh). Sem fetch de health dentro do componente de UI.

**Rationale**: Princípios IV e V. FR-010. A nav é configuração de produto, não regra de zoológico, mas também não deve viver espalhada em JSX.

**Alternatives considered**:

- Destinos hardcoded só no JSX do layout — a UI passaria a “conhecer” o mapa; pior para teste e para FR-002 (conjunto fechado).
- Estado global (Zustand) para área ativa — a URL já é a fonte; lib extra proibida sem necessidade.

---

## 5. Visual: Tailwind 4 + shadcn, verde folha, minimalista

**Decision**: Continuar shadcn **new-york**, CSS variables, Tailwind 4 `@theme inline` em `apps/web/src/app/globals.css`. Sem biblioteca de UI paralela.

**Tokens (destaque verde folha; superfície clara)**:

- Fundo e texto permanecem neutros (painel claro). O verde é **destaque**, não um fundo de página.
- `--primary` / `--ring`: verde folha escuro o bastante para texto claro cumprir WCAG 2.2 AA (4,5:1) em botão preenchido (`Button` default = Atualizar).
- `--primary-foreground`: quase branco.
- `--accent` / `--accent-foreground`: lavagem verde para hover e destino ativo no `ghost`/`secondary` — contraste do texto do acento ≥ 4,5:1 com o fundo do acento; indicador ativo também por peso/borda, não só por cor.
- `--muted` / `--muted-foreground`: para ícone decorativo do estado vazio (não para parágrafos explicativos).
- **Indisponível** não usa o verde de destaque (semântica oposta). Ícone + rótulo já resolvidos; cor auxiliar distinta (foreground ou tom neutro/vermelho só se AA passar).

Valores OKLCH concretos na implementação; **gate**: medir contraste AA nos pares usados (G3). Referência de partida (ajustável se o checker falhar):

- primary ≈ `oklch(0.40 0.12 148)`
- primary-foreground ≈ `oklch(0.99 0.01 148)`
- accent ≈ `oklch(0.95 0.03 148)`
- fundo ≈ `oklch(0.99 0.005 148)` (branco com leve matiz folha, não verde pastel carregado)

**UI semântica e enxuta**:

- HTML: `<header>` (identidade), `<nav>` (destinos), `<main>` (área). Landmark, não div soup.
- Copy: só rótulos de destino, “ZooTech”, “No ar” / “Indisponível”, “Atualizar”. Proibido subtítulo que explique o nome da área.
- Estado vazio: título da área (o mesmo da nav) + ícone Lucide decorativo (`aria-hidden`). Sem “em breve”, sem números, sem lista falsa. Não adicionar o primitivo shadcn Empty nesta feature — exigiria microcopy extra e um componente para dois ecrãs iguais.
- Primitivo reutilizado: `Button` existente (`asChild` nos links; default no Atualizar). Não adicionar Sidebar/Sheet/NavigationMenu.

**Rationale**: Pedido desta plan (`verde folha`, minimalista, semântica) + constituição II/III + FR-005/FR-006/FR-009/FR-011. shadcn + Tailwind 4 já são o stack; o tema muda, o sistema não.

**Alternatives considered**:

- Verde como fundo de página inteiro — pesado, piora clareza e risco de contraste.
- Paleta slate da casca 001 — contradiz o destaque folha pedido nesta plan.
- shadcn Empty + texto “Nenhum animal” — copy que descreve a ausência óbvia; FR-006 e princípio II.

---

## 6. Ícones (Lucide, já no web)

**Decision**: Continuar `lucide-react` em `@zootech/web` (já é `iconLibrary` do shadcn). Mapa fechado:

| Destino / ação | Ícone     |
|----------------|-----------|
| Início         | `House`   |
| Animais        | `PawPrint`|
| Recintos       | `Fence`   |
| Atualizar      | `RefreshCw` (já na casca) |
| No ar          | `Activity` (já na casca) |
| Indisponível   | `Activity` (mesmo ícone; o rótulo diferencia) **ou** `Unplug` se o rótulo permanecer visível |

Ícone + rótulo sempre juntos na nav e no Atualizar.

**Rationale**: Constituição II. Sem segunda lib de ícones.

**Alternatives considered**: Heroicons / radix icons — sistema paralelo. Ícone só sem rótulo na barra inferior — falha “significado não universal”.

---

## 7. Testes e o que não entra

**Decision**: Sem runner de teste automatizado (a spec não pede TDD). Aceite via [quickstart.md](./quickstart.md): viewport 320px, três rotas, estado vazio, typecheck, contraste. Sem auth, estoque, dados mockados de plantel, CI, deploy.

**Rationale**: FR-012. Qualidade: `pnpm typecheck` + auditoria manual AA (como 001).

**Alternatives considered**: Playwright nesta feature — útil depois; não está na spec; seria dependência nova.

---

## Resolução de NEEDS CLARIFICATION

Nenhum item do Technical Context ficou em aberto: linguagem, stack, storage (N/A), testes, plataforma, tipo de projeto, performance, constraints e escopo saem da constituição + spec + decisões acima. O pedido de verde folha / UI minimalista / shadcn+Tailwind 4 está fechado na seção 5.
