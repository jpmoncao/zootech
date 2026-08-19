<!--
Sync Impact Report
- Version change: (unversioned template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Mobile-First (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. UX Clara e Não-Redundante
  - [PRINCIPLE_3_NAME] → III. Acessibilidade Mínima
  - [PRINCIPLE_4_NAME] → IV. Clean Architecture no Monorepo
  - [PRINCIPLE_5_NAME] → V. UI Sem Regras de Negócio
- Added sections:
  - Stack e Arquitetura (substitui [SECTION_2_NAME])
  - Qualidade e Conformidade (substitui [SECTION_3_NAME])
  - Governance (preenchida)
- Removed sections: none (placeholders substituídos; hierarquia do template preservada)
- Follow-up TODOs: none
-->

# ZooTech Constitution

## Core Principles

### I. Mobile-First (NON-NEGOTIABLE)

Toda tela, layout e funcionalidade interativa MUST permanecer utilizável
em viewport de **320px** de largura. O design MUST ser concebido
mobile-first; layouts maiores são aprimoramentos progressivos, nunca o
ponto de partida. Um PR que quebra usabilidade, leitura ou ação primária
em 320px MUST NOT ser mesclado.

Critérios verificáveis:

- Conteúdo e ações primárias permanecem visíveis e acionáveis em 320px,
  sem scroll horizontal da página.
- Controles interativos têm área de toque adequada; overscroll e
  overflow MUST ser intencionais, nunca acidentais.
- Breakpoints Tailwind existem para ampliar a experiência, não para
  tornar o layout mínimo funcional.

Rationale: o produto é usado em campo e em dispositivos estreitos; desktop
não pode ditar a informação nem a hierarquia visual.

### II. UX Clara e Não-Redundante

A interface MUST ser simples, autoexplicativa e focada na tarefa atual.
Copy MUST NOT descrever informação já visível na tela, nem conteúdo
irrelevante à ação em curso. Toda ação MUST usar ícone associativo
(ícone reconhecível + rótulo quando o significado não for universal).
Textos decorativos, microcopy de preenchimento e legendas que repetem o
próprio componente são proibidos.

Critérios verificáveis:

- Remover o texto auxiliar não impede o usuário de entender a tela.
- Ícones de ação (salvar, excluir, filtrar, voltar, adicionar) são
  consistentes em todo o painel e mapeiam o mesmo significado.
- Hierarquia visual vem de tipografia, espaço e ícones — não de
  parágrafos explicativos.

Rationale: ruído textual compete com a decisão; ícones estáveis reduzem
carga cognitiva em fluxos repetitivos.

### III. Acessibilidade Mínima

Componentes interativos MUST expor nome acessível: `aria-label` quando
não houver texto visível equivalente. Imagens MUST ter `alt`
descritivo; imagens puramente decorativas MUST usar `alt=""`. Combinações
de cor MUST atender contraste WCAG 2.2 AA (4.5:1 para texto normal;
3:1 para texto grande e elementos de interface essenciais).

Critérios verificáveis:

- Botões, ícones clicáveis, inputs e controles customizados têm nome
  acessível no DevTools / leitor de tela.
- Nenhuma imagem de conteúdo sem `alt`.
- Tokens de cor do tema passam em verificação de contraste AA.

Rationale: acessibilidade mínima é porta de entrada, não polish posterior;
sem nome acessível e contraste, o painel exclui operadores e falha em
auditoria básica.

### IV. Clean Architecture no Monorepo

A API (Fastify) MUST seguir Clean Architecture: domínio independente de
frameworks e I/O; casos de uso na camada de aplicação; HTTP, banco e
serviços externos apenas em adapters. O painel web (Next.js) é um
adapter de entrega, não o lugar do domínio. Contratos (tipos e
interfaces) compartilhados entre API e web MUST viver em pacote
dedicado do monorepo. A árvore de pastas MUST tornar camadas e
contextos óbvios; um arquivo MUST ser localizável pela responsabilidade,
não por conveniência.

Critérios verificáveis:

- Regras de negócio não importam Fastify, Next.js, ORM ou Tailwind.
- Web e API consomem os mesmos tipos de contrato; não há DTOs
  duplicados e divergentes sem justificativa documentada.
- Pacotes do workspace têm fronteiras claras (`apps/*`, `packages/*` ou
  equivalente) e dependências só apontam para dentro das camadas
  permitidas.

Rationale: o monorepo só é sólido se as camadas forem rígidas; misturar
domínio com UI ou HTTP torna cada feature um acoplamento permanente.

### V. UI Sem Regras de Negócio

Componentes de UI (páginas, layouts e primitivos shadcn) MUST NOT
conter regras de negócio, cálculos de domínio, autorização ou
orquestração de casos de uso. Essa lógica MUST residir nas camadas de
domínio/aplicação da API ou, no cliente, em módulos/hooks de aplicação
fora dos componentes presentacionais. Comentários que explicam regras de
negócio MUST NOT aparecer no código-fonte; pertencem à documentação do
projeto (specs, constitution, ADRs).

Critérios verificáveis:

- Componentes de UI recebem dados já resolvidos e emitem intenções
  (eventos/callbacks); não decidem políticas.
- `grep` por comentários de regra de negócio em `apps/` e `packages/`
  de UI não encontra explicações de domínio — só, se necessário,
  notas técnicas pontuais de implementação.
- Novas dependências exigem justificativa; bibliotecas que duplicam
  o que o stack já cobre MUST NOT ser adicionadas.

Rationale: UI acoplada a domínio impede reuso, testes e evolução da
API; comentários de negócio no código envelhecem e contradizem a spec.

## Stack e Arquitetura

O ZooTech é um monorepo TypeScript com dois runtimes e contratos
compartilhados. Desvios MUST ser aprovados por emenda a esta constitution.

**Gerenciador de pacotes**

- pnpm é o único gerenciador permitido.
- Lockfile MUST ser `pnpm-lock.yaml`.
- Workspaces MUST declarar os apps e pacotes compartilhados.

**API**

- Runtime: Fastify em TypeScript.
- Organização: Clean Architecture (domínio → aplicação → adapters).
- Entrada HTTP, persistência e integrações externas permanecem na
  borda (adapters/infra).

**Painel web**

- Runtime: Next.js (App Router) em TypeScript.
- Estilização: Tailwind CSS 4. Estilos ad hoc fora do sistema de
  tokens/utilitários MUST ser exceção justificada.
- Componentização: shadcn/ui e dependências oficiais do ecossistema
  shadcn. Primitivos visuais novos MUST reutilizar ou estender shadcn
  antes de criar um sistema paralelo.

**Contratos e pastas**

- Tipos e interfaces de contrato entre web e API MUST ser
  versionados no monorepo (pacote compartilhado).
- Separação obrigatória, no mínimo: `apps` (web, api), `packages`
  (contratos, ui, config) — nomes equivalentes são aceitos se a
  responsabilidade permanecer óbvia.
- Importações cruzadas que furam camadas (UI → domínio de API,
  domínio → Fastify/Next) são violação constitucional.

## Qualidade e Conformidade

**TypeScript estrito**

- `strict` MUST estar habilitado em todos os `tsconfig` do workspace.
- `any` implícito é proibido. `any` explícito MUST ter justificativa
  no PR e plano de remoção, ou estar isolado em boundary de I/O.
- Contratos públicos (handlers, props, DTOs) MUST ser tipados por
  interface/type exportado — não por inferência opaca em call sites.

**Dependências**

- Cada dependência MUST ter dono de uso (qual pacote, para quê).
- MUST NOT adicionar lib que o stack já cobre (Tailwind, shadcn,
  Fastify plugins já presentes, utilitários nativos de TypeScript).
- DevDependencies de qualidade (lint, types) são permitidas; runtime
  extra exige barreira de necessidade.

**Revisão**

Todo PR MUST ser conferido contra esta constitution, no mínimo:

1. Usável em 320px, sem copy redundante, com ícones associativos.
2. `aria-label` / `alt` / contraste AA nos componentes tocados.
3. Camadas de Clean Architecture e contratos compartilhados intactos.
4. TypeScript strict; UI sem regra de negócio; sem comentário de
   domínio no código.
5. Nenhuma dependência nova sem justificativa.

Complexidade extra (estado global, microserviços, libs de UI paralelas
ao shadcn) MUST ser justificada no PR; o default é o caminho mais
simples que obedece aos princípios.

## Governance

Esta constitution prevalece sobre convenções locais, snippets e
preferências de ferramenta. Em conflito, vence o texto ratificado aqui.

**Emendas**

1. Propor a mudança com o princípio/seção afetado, a motivação e o
   impacto em specs, planos e código existente.
2. Atualizar `.specify/memory/constitution.md` via fluxo Spec Kit
   (`/speckit-constitution`).
3. Incrementar a versão (semântica abaixo) e `Last Amended` (ISO
   `YYYY-MM-DD`).
4. Se a emenda quebrar prática vigente, incluir plano de migração
   (o que deixa de ser válido e até quando).

**Versionamento**

- MAJOR: remoção ou redefinição incompatível de princípio/governança.
- MINOR: princípio ou seção nova, ou expansão material de orientação.
- PATCH: esclarecimento, correção de texto, ajuste não semântico.

**Conformidade**

- Specs, plans e tasks MUST citar ou respeitar os princípios
  aplicáveis; um plano que ignore Mobile-First, Clean Architecture ou
  TypeScript strict está incompleto.
- Reviews MUST rejeitar violações; exceções temporárias exigem prazo
  de correção registrado.
- Guidance operacional de implementação permanece nas specs e no
  plano da feature — não em comentários de negócio no código.

**Version**: 1.0.0 | **Ratified**: 2026-08-19 | **Last Amended**: 2026-08-19
