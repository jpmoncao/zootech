# UI contract: casca do painel (320px)

Superfície visível desta feature. Não é código; a implementação em `apps/web` + `packages/ui` MUST respeitar este contrato e os princípios I–III e V.

## Viewport

- Largura mínima suportada: **320px**.
- Sem scroll horizontal da página.
- Ação primária e identidade do produto permanecem visíveis sem abrir menu oculto.
- Área de toque dos controles ≥ 44×44px CSS.

## Hierarquia (uma tela)

1. **Identidade**: nome “ZooTech”. Sem subtítulo que explique o que o nome já diz.
2. **Estado de disponibilidade**: ícone associativo + rótulo já resolvido (`No ar` | `Indisponível`). A página não interpreta HTTP.
3. **Ação primária**: atualizar o estado. Ícone Lucide de atualização **e** rótulo “Atualizar” (significado não universal). `aria-label` equivalente se o rótulo visível for omitido em algum breakpoint — nesta casca o rótulo permanece visível em 320px.

## Acessibilidade

- Todo controle interativo tem nome acessível (texto visível ou `aria-label`).
- Imagem de conteúdo: `alt` descritivo. Decorativa: `alt=""`.
- Contraste WCAG 2.2 AA nos tokens do tema (texto 4,5:1; texto grande e controles essenciais 3:1).

## O que a UI NÃO faz

- Não decide se a API está saudável (isso é o módulo `application/get-availability`).
- Não contém cadastro, lista de animais, auth ou navegação de domínio.
- Não usa copy que descreva informação já visível (ex.: “Este é o nome do sistema: ZooTech”).

## Consumo do contrato HTTP

O módulo de aplicação do web chama `GET /api/health` (rewrite para o `GET /health` da API; ver [health.yaml](./health.yaml)). Parseia `HealthResponse` de `@zootech/contracts`. Qualquer falha vira view-model `unavailable`.
