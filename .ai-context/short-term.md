# Short-Term Context

## Current Focus

Autenticação JWT concluída (tarefas 1–10). Login, aceite, menu por papel, Acessos e perfil estão ligados à API. Especificação de gestão de baias criada; próximo passo é revisar decisões abertas e implementar o domínio. Domínio do MVP ainda sem cadastro de animais.

## Active Tasks

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

- Decisões operacionais da gestão de baias ainda precisam de confirmação (perfis, motivos, higienização e isolamento).
  - Impact: regras de autorização e alguns fluxos dependem dessas decisões.
  - Next action: revisar a seção “Open Questions” da spec antes da implementação.
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
