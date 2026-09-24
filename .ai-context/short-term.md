# Short-Term Context

## Current Focus

Autenticação JWT concluída (tarefas 1–10). Gestão de baias concluída no escopo sem Animal: persistência, migração, API autenticada, contrato tipado no front, página de baias com lista/mapa, filtros, indicadores, formulário, detalhe, ocupantes vazios, ações, histórico, autorização por perfil, testes e validação manual. O domínio Animal/ocupação real ainda não existe.

## Active Tasks

- Gestão de baias em `.ai-context/tasks/gestao-de-baias.md`.
  - Status: concluído no escopo aprovado
  - Notes: a migration `gestao_baias` foi aplicada ao Postgres local. A página `/painel/baias` alterna lista/mapa usando os mesmos filtros e indicadores, permite cadastro/edição, detalhe, ações operacionais e histórico para Coordenação. Todos os perfis autenticados consultam baias; somente Coordenação faz CRUD, ações e histórico/auditoria. Validação manual feita em `http://localhost:3002/painel/baias` com login seed, cadastro de baia, busca, mapa, higienização e histórico. Ocupantes, isolamento real e bloqueios por ocupação dependem do modelo Animal.

- Autenticação em `.ai-context/tasks/autenticacao-jwt-rbac.md`.
  - Status: concluído
  - Notes: Casca restaura sessão pelo refresh; Acessos e perfil no front; typecheck e lint na raiz passam; fluxo exercido no navegador.
- Bootstrap em `.ai-context/tasks/bootstrap-monorepo.md`.
  - Status: concluído
  - Notes: sem telas, sem ORM, sem domínio; Postgres só como Compose e `DATABASE_URL`
- Escrever a spec do MVP (painel ADM).
  - Status: em andamento
  - Notes: spec de baias registrada em `.ai-context/specs/gestao-de-baias.md`; demais funcionalidades do painel ADM ainda precisam ser especificadas.

## Recent Changes

- 2026-09-24
  - Change: Baias, perfil e acessos usam skeleton no carregamento. A baia aberta fica em `/painel/baias?baia=<id>` e o detalhe consulta `obterBaia` com esse id. Skeleton e tons de informação estão em `DESIGN.md`. O id na URL continua em `.cursor/rules/front-url-recurso.mdc`.
  - Reason: Convenção de front para espera visual e consulta pelo id da URL.
- 2026-09-24
  - Change: Task 8 de baias concluída com ampliação dos testes de integração para duplicidade normalizada, capacidade, filtros, estados, higienização e auditoria; validação manual no navegador confirmou cadastro, lista/mapa, busca, detalhe, ações e histórico.
  - Reason: Validação integrada de gestão de baias.
- 2026-09-24
  - Change: Autorização de baias consolidada ponta a ponta: helpers `canManageBaias`/`canViewBaiasAudit` no front e spec Supertest cobrindo consulta para todos os perfis, bloqueio de CRUD/ações/histórico para não Coordenação e fluxo permitido para Coordenação.
  - Reason: Tarefa 7 de gestão de baias.
- 2026-09-24
  - Change: Página `/painel/baias` ganhou formulário lateral de cadastro/edição, painel de detalhe com ocupantes, ações permitidas por estado, mensagens de conflito da API e histórico de auditoria para Coordenação.
  - Reason: Tarefa 6 de gestão de baias.
- 2026-09-24
  - Change: Página `/painel/baias` ganhou lista/mapa responsivos, busca por código, filtros por setor/estado, indicadores e estados de carregamento/vazio/erro. Estilos específicos de baias foram adicionados em `globals.css`.
  - Reason: Tarefa 5 de gestão de baias.
- 2026-09-24
  - Change: Front ganhou contrato tipado de baias em `api.ts`: tipos de domínio, filtros, CRUD sem exclusão física, ações operacionais e histórico usando `ApiError`/refresh existentes.
  - Reason: Tarefa 4 de gestão de baias.
- 2026-09-24
  - Change: Casca com refresh de sessão, menu por papel, `/painel/acessos` e `/painel/perfil`. Contexto de arquitetura atualizado com tabelas, JWT e cookie.
  - Reason: Tarefas 8–10 da autenticação.
- 2026-09-24
  - Change: Testes Jest/supertest das regras de auth. Login e pedido no front chamam a API, com JWT em memória. A última coordenação recebe o aviso de rebaixamento antes da recusa de auto-troca.
  - Reason: Tarefas 6 e 7 da autenticação.
- 2026-09-24
  - Change: Fila `GET /auth/solicitacoes`, aceite/recusa, `GET /usuarios`, `PATCH /usuarios/:id/perfil` (só coordenação), `PATCH /auth/me` e `POST /auth/me/senha`. RolesGuard lê `perfilAcesso` no banco.
  - Reason: Tarefa 5 da autenticação.
- 2026-09-24
  - Change: Endpoints `POST /auth/solicitacoes`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` e `GET /auth/me`. Cookie de refresh HttpOnly; CORS com credentials; eventos de pedido e login.
  - Reason: Tarefa 4 da autenticação.
- 2026-09-24
  - Change: API com Prisma, migração `auth_core` (usuário, funcionário, solicitação, refresh, auditoria) e seed de coordenação no boot. Dependências JWT, bcrypt e cookie-parser declaradas.
  - Reason: Tarefas 1–3 da autenticação.
- 2026-09-23
  - Change: Login e casca do painel no front, com a identidade do guia. Sem cadastro de animais.
  - Reason: A identidade precisava existir antes das telas de domínio.
- 2026-09-23
  - Change: Monorepo criado com `apps/web` sem tela, `apps/api` só com `GET /health` e Postgres local sem esquema.
  - Reason: Bootstrap autorizado depois da spec e das tarefas.
- 2026-09-23
  - Change: Painel ADM cobre todas as funcionalidades, mais usuários/funcionários e auditoria. Animal sempre em uma baia e pode ser transferido. Tutor só depois da adoção. Includes confirmados: UC06 e UC08 incluem UC01.
  - Reason: Respostas do autor sobre o corte do painel e o modelo.
- 2026-09-23
  - Change: Removidos o monorepo anterior, Speckit, Impeccable e as specs `001` e `002`.
  - Reason: Recomeçar pelo workflow agêntico.

## Blockers

- Definir elegibilidade de isolamento e vínculo/fluxo de ocupantes antes do módulo Animal.
  - Impact: a API atual não pode verificar compatibilidade de ocupantes nem recusar ações por baia ocupada enquanto não existe modelo Animal.
  - Next action: definir essas regras no início do cadastro/acolhimento de animais.
- Nenhum bloqueio na autenticação. Agente e recepção veem as mesmas seções, de propósito, até um mapa novo ser pedido.

## Next Steps

1. Escrever a spec do painel ADM (UC02–UC10 e auditoria) em cima da identidade já registrada.
2. Implementar o domínio a partir dessa spec.

## Things To Remember

- Não restaurar o bootstrap apagado.
- O veterinário ADM enxerga todas as funcionalidades. Funcionário e veterinário continuam com os casos de uso do diagrama.
- Interface em `apps/web` usa shadcn, no tema de `DESIGN.md`. Login, casca, Acessos e perfil usam esses componentes.
- Persistência é Postgres. Não há fila externa, storage nem serviço de terceiros neste momento.
- Conta seed local: ver `apps/api/.env.example` (`SEED_COORDENACAO_*`). Sem `.env`, o seed não cria a conta.
