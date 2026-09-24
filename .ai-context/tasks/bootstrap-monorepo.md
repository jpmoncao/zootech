# Implementation Tasks: Bootstrap do monorepo

## Objective

Criar o monorepo ZooTech executável, com `apps/web` sem tela e `apps/api` só com `GET /health`, a partir de `.ai-context/specs/bootstrap-monorepo.md`. Cada tarefa abaixo é um chat de implementação separado, na ordem.

## Assumptions

- Não há plano de implementação. As tarefas saem da spec.
- Versões estáveis atuais de Next.js, NestJS, TypeScript, pnpm e Turborepo, fixadas no lockfile na tarefa que instala dependências.
- Um arquivo vazio exigido pelo Next.js não é tela.
- O health não consulta o Postgres.
- ORM, biblioteca de UI, autenticação e domínio ficam de fora.
- Cada chat implementa só a tarefa indicada e não antecipa as seguintes.

## Tasks

- [x] 1. Criar a raiz do workspace
  - Goal: O repositório vira um workspace pnpm com Turborepo, sem apps ainda.
  - Files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc` se a versão de Node for fixada
  - Notes: Workspaces em `apps/*`. Scripts de raiz para `lint`, `typecheck` e `build` via Turbo. `.gitignore` ignora `node_modules`, `.env`, `.env.*` local e mantém exemplos. Não criar `apps/web` nem `apps/api`. Não instalar UI, ORM nem cliente de banco.
  - Verification: `pnpm install` na raiz termina sem erro. `pnpm-workspace.yaml` declara `apps/*`.

- [x] 2. Compartilhar o TypeScript estrito
  - Goal: Os apps futuros compilam com a mesma base estrita.
  - Files: `tsconfig.base.json`, referência na raiz se precisar
  - Notes: `strict` ligado. Sem path de domínio e sem pacote de contratos. A base ainda não é estendida por app nenhum.
  - Verification: O JSON da base é válido e `strict` está ativo.

- [x] 3. Configurar ESLint na raiz
  - Goal: Lint existe para os apps que forem adicionados, sem regra visual.
  - Files: `eslint.config.js` ou `.eslintrc` no formato estável do ESLint escolhido, `package.json`
  - Notes: TypeScript nos dois runtimes futuros (Next e Nest). Prettier só se entrar no mesmo ferramental, sem opinião de UI. Não lintar `.ai-context/`.
  - Verification: O comando de lint da raiz executa e não falha por config ausente. Sem apps, a saída pode ser vazia.

- [x] 4. Subir a API com configuração e `GET /health`
  - Goal: `apps/api` sobe em NestJS, escuta em `0.0.0.0` e `PORT`, e responde só no health.
  - Files: `apps/api/**`, `apps/api/.env.example`
  - Notes: `GET /health` retorna 200 e `{ "status": "ok" }`. Qualquer outro caminho é rota inexistente. Health não abre conexão com o banco. `PORT` ausente usa o padrão documentado no exemplo. Config lê `PORT`, origem CORS e `DATABASE_URL`. Pipe global de validação registrado, sem rota com corpo. Falha de porta ocupada permanece o erro do processo, sem porta alternativa. Estender `tsconfig.base.json` e o ESLint da raiz. Sem módulo de domínio, ORM ou auth.
  - Verification: Com a API no ar, `GET /health` retorna 200 e `{ "status": "ok" }` com o Postgres parado. Outro caminho não retorna 200.

- [x] 5. Cobrir o health com teste automatizado
  - Goal: O contrato do health fica protegido por um teste do app Nest.
  - Files: `apps/api/**/*.spec.ts` ou o padrão de teste do Nest no app
  - Notes: Caso de sucesso: 200 e `status` igual a `ok`. O teste não exige Postgres. Não adicionar testes de domínio.
  - Verification: O teste do health passa no runner do `apps/api`.

- [x] 6. Criar o front sem tela
  - Goal: `apps/web` é um pacote Next.js no workspace, sem interface.
  - Files: `apps/web/**`, `apps/web/.env.example`
  - Notes: Dependências, config do Next, TypeScript estendendo a base, script de typecheck e lint. Nenhuma biblioteca de UI. Sem página de produto, layout com conteúdo, componente, stylesheet, fonte, paleta ou texto do CCZ. Arquivo obrigatório do framework fica sem texto visível, sem estilo e sem metadata de marca. `.env.example` declara a URL base da API. O app não chama a API. Não subir tela placeholder.
  - Verification: `pnpm --filter` do web instala e o typecheck do pacote passa. Busca no pacote não acha tela, componente, stylesheet nem token de cor.

- [x] 7. Configurar o Postgres local sem esquema
  - Goal: O Compose sobe um Postgres de desenvolvimento e a URL está documentada.
  - Files: `compose.yaml` ou `docker-compose.yml`, `apps/api/.env.example`
  - Notes: Usuário, senha e nome de banco só de exemplo local. `DATABASE_URL` aponta para esse serviço. Sem migração, tabela, seed ou cliente de banco. A API continua sem abrir conexão.
  - Verification: O arquivo de Compose declara o serviço Postgres. `.env.example` da API contém `DATABASE_URL` com valor local fictício. Nenhum arquivo de migração existe.

- [x] 8. Documentar instalação, API e Postgres no README
  - Goal: Quem clona o repo instala, sobe a API, chama o health e sobe o Postgres seguindo o README.
  - Files: `README.md`
  - Notes: Manter a descrição do ZooTech já existente. Acrescentar os comandos deste marco. Afirmar que o front não tem tela porque a identidade visual ainda será definida. Não documentar login, painel nem domínio.
  - Verification: O README cita instalação, subida da API, `GET /health` e Compose do Postgres, e afirma a ausência de telas.

- [x] 9. Validar o marco inteiro
  - Goal: Os critérios de aceite da spec passam no workspace completo.
  - Files: nenhum arquivo novo, salvo correção mínima de falha encontrada nesta validação
  - Notes: Rodar typecheck, lint e build dos dois apps. Chamar `GET /health` com o Postgres parado. Confirmar que outro caminho não é 200. Confirmar ausência de UI, ORM, migração e módulo de domínio. Corrigir só falha que impeça esses critérios.
  - Verification: Typecheck, lint e build passam. Health retorna 200 e `{ "status": "ok" }` sem banco. O restante da spec de ausência de tela e de domínio se confirma.

- [x] 10. Atualizar o contexto do projeto
  - Goal: `.ai-context/` descreve o monorepo que passou a existir.
  - Files: `.ai-context/architecture.md`, `.ai-context/short-term.md`, `.ai-context/overview.md` se o estágio deixar de ser "sem aplicação"
  - Notes: Registrar `apps/web`, `apps/api`, Compose, health e a ausência de telas. Não marcar o painel ADM como implementado. Marcar as tarefas concluídas neste arquivo.
  - Verification: `architecture.md` e `short-term.md` batem com os arquivos criados nas tarefas 1 a 9.

## Validation Checklist

- [x] Testes do health passam
- [x] Lint, typecheck e build passam
- [x] `GET /health` retorna 200 e `{ "status": "ok" }` com o Postgres parado
- [x] `apps/web` não tem tela nem identidade visual
- [x] Não há ORM, migração, UI kit nem módulo de domínio
- [x] README permite instalar, subir a API e chamar o health
- [x] `.ai-context/` atualizado
- [x] O resumo final de cada chat inclui verificação e um exemplo concreto de teste

## Blockers / Decisions Needed

- Nenhum bloqueio de produto. Identidade visual continua fora deste marco.
- Tarefas executadas em 2026-09-23.
