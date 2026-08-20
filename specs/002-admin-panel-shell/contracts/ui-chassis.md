# UI contract: chassis do painel

Superfície visível desta feature. A implementação em `apps/web` + tokens em `packages/ui` / `globals.css` MUST respeitar este contrato e os princípios I–III e V. HTTP de disponibilidade: inalterado — [`../001-bootstrap-monorepo/contracts/health.yaml`](../../001-bootstrap-monorepo/contracts/health.yaml).

## Viewport

- Largura mínima: **320px**. Sem scroll horizontal da página.
- Área de toque ≥ 44×44px CSS em destinos, Atualizar e qualquer controle.
- Em 320px: identidade no topo; **três destinos visíveis** na barra inferior (não hamburger); ação primária da área em `<main>` (Atualizar no início; título do vazio nas outras).
- `md+`: trilho lateral com os mesmos destinos; barra inferior ausente. Aprimoramento, não requisito do mínimo.

## Landmarks (HTML semântico)

1. `<header>` — identidade “ZooTech”. Sem logotipo, sem subtítulo que explique o nome.
2. `<nav aria-label="Principal">` — exatamente três destinos, nesta ordem:
   - Início → `/` — ícone House + rótulo “Início”
   - Animais → `/animais` — ícone PawPrint + rótulo “Animais”
   - Recintos → `/recintos` — ícone Fence + rótulo “Recintos”
3. `<main>` — área atual.

Destino ativo: `aria-current="page"` e marca visual **não só por cor** (ex.: `font-medium` + indicador).

## Início (`/`)

Herda o contrato da casca, agora dentro do chassis:

1. Estado já resolvido: ícone associativo + “No ar” | “Indisponível” (`role="status"`, `aria-live="polite"`).
2. Ação primária: `Button` shadcn default (verde folha) com ícone RefreshCw **e** rótulo “Atualizar”.
3. A página MUST NOT interpretar HTTP; só renderiza `AvailabilityViewModel`.

## Áreas vazias (`/animais`, `/recintos`)

- Título visível igual ao destino (único texto de conteúdo).
- Ícone do destino decorativo (`aria-hidden`).
- MUST NOT: lista, tabela, cadastro, quantidade, exemplo, “em breve”, estoque.

## Tema (Tailwind 4 + shadcn)

- Tokens CSS em `:root` + `@theme inline` (já o padrão 001).
- Destaque: **verde folha** em `--primary`, `--ring` e estado ativo da nav.
- Superfície **clara** (fundo alto, texto escuro). Verde não pinta a página inteira.
- Contraste WCAG 2.2 AA: 4,5:1 texto normal; 3:1 texto grande e controles essenciais. Botão primary: `primary` vs `primary-foreground` ≥ 4,5:1.
- “Indisponível” não usa o verde de destaque.

## O que a UI NÃO faz

- Não decide disponibilidade (módulo `application/get-availability`).
- Não decide o conjunto de destinos (módulo `application/get-nav`).
- Não contém auth, estoque, CRUD de plantel nem dados fabricados.
- Não usa copy que descreva o já visível (“Este é o menu de navegação”).

## Primitivos

- Reutilizar `Button` de `@zootech/ui` (links da nav via `asChild`).
- MUST NOT introduzir kit Sidebar/Sheet/NavigationMenu nesta feature.
- MUST NOT adicionar biblioteca de UI fora do ecossistema shadcn.
