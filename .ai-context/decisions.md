# Decisions

## 2026-09-23 — ZooTech é a gestão do CCZ

**Status:** Accepted

**Context:** O repositório tinha sido zerado e o produto ainda não estava definido.

**Decision:** ZooTech é o sistema de gestão do Centro de Controle de Zoonoses. Atores: veterinário, funcionário do CCZ e tutor. Termos de domínio citados: animais, baias, veterinários, funcionários e tutores.

**Rationale:** Confirmado pelo autor do projeto.

**Consequences:** O bootstrap anterior deixa de valer como direção de produto. Baia entrou depois, na decisão de ocupação e transferência.

## 2026-09-23 — MVP é login e painel do veterinário ADM

**Status:** Superseded

**Context:** O domínio completo já tem dez casos de uso.

**Decision:** O primeiro marco é login e o painel do ator ADM (veterinário), com persistência em Postgres.

**Rationale:** Confirmado como marco essencial do MVP.

**Consequences:** Substituída pela decisão seguinte. A leitura antiga, de deixar o clínico fora do painel, não vale mais.

## 2026-09-23 — O painel ADM cobre o sistema inteiro

**Status:** Accepted

**Context:** Faltava dizer o que o veterinário administrador faz depois do login.

**Decision:** O painel tem todas as funcionalidades do sistema (UC02–UC10), mais cadastro e gestão de usuários e funcionários, mais consulta ao registro de auditoria. Funcionário e veterinário não administrador permanecem limitados ao diagrama de casos de uso.

**Rationale:** Confirmado pelo autor.

**Consequences:** A spec do MVP não é uma casca de login. Gestão de usuários e auditoria são exclusivas do ADM.

## 2026-09-23 — Animal ocupa uma baia e nasce sem tutor

**Status:** Accepted

**Context:** O diagrama de classes exigia um tutor por animal e não tinha baia. O acolhimento contradizia isso.

**Decision:** Todo animal ocupa exatamente uma baia e pode ser transferido. O animal entra sem tutor. O tutor é vinculado quando o animal é atribuído a uma adoção.

**Rationale:** Confirmado pelo autor.

**Consequences:** A cardinalidade tutor–animal do diagrama original fica `0..1`. Atributos da baia, além da identidade, continuam em aberto. A transferência troca a baia atual; um histórico próprio de baias, separado da auditoria, não foi pedido.

## 2026-09-23 — Stack do monorepo

**Status:** Accepted

**Context:** Era preciso escolher a base técnica antes de criar o repositório de código.

**Decision:** Monorepo Node.js e TypeScript. Front em Next.js, API em NestJS, banco Postgres. pnpm para pacotes e Turborepo para o build.

**Rationale:** Confirmado pelo autor do projeto.

**Consequences:** O monorepo ainda não foi criado. Herança de `Usuario` no Postgres continua em aberto.

## 2026-09-23 — Diagrama de classes é a referência de domínio

**Status:** Accepted

**Context:** O autor enviou o diagrama de classes como esquema do backend.

**Decision:** Tratar esse diagrama como a referência de domínio. Não criar classe `Veterinario` separada enquanto o diagrama representar o veterinário como `Funcionario`.

**Rationale:** O diagrama é a fonte enviada para o esquema.

**Consequences:** Tutor obrigatório e a ausência de baia foram corrigidos na decisão de ocupação e adoção. Continuam em aberto: `idTutor` além da herança de `Usuario`, e a cardinalidade 0..1 de castração e adoção. Includes do diagrama de casos de uso: só UC06 e UC08 incluem UC01.

## 2026-09-23 — Reset onto the agentic workflow

**Status:** Accepted

**Context:** O repo tinha um bootstrap Speckit e o workflow agêntico foi colocado por cima.

**Decision:** Remover da árvore de trabalho o monorepo anterior, Speckit, Impeccable e as specs `001` e `002`. Manter o workflow e `.ai-context/`.

**Rationale:** O workflow novo é o ponto de partida.

**Consequences:** O histórico Git ainda contém a árvore antiga até um commit registrar o reset.
