# Implementation Tasks: Autenticação JWT, aceite de acesso e perfil

## Objective

Implementar `.ai-context/specs/autenticacao-jwt-rbac.md` na ordem do plano `.ai-context/plans/autenticacao-jwt-rbac.md`: pedido persistido, aceite e troca de tipo só pela coordenação, login com JWT e tela de perfil.

## Assumptions

- Prisma, menus iguais para `agente` e `recepcao`, e ausência de e-mail foram confirmados em 2026-09-24.
- Cada tarefa entrega um pedaço verificável e não antecipa a seguinte, salvo o que a dependência exige.
- UC02–UC10, tela de auditoria, desativar conta e editar CPF ou matrícula de outra pessoa ficam de fora.
- O health continua sem consultar o Postgres.

## Tasks

- [x] 1. Dependências e ambiente da API
  - Goal: A API declara Prisma, JWT, bcrypt e cookie-parser, e o exemplo de ambiente lista o que o seed e o token precisam.
  - Files: `apps/api/package.json`, `apps/api/.env.example`
  - Notes: Incluir `JWT_SECRET` e `SEED_COORDENACAO_*` (nome, CPF, matrícula, e-mail, senha, CRMV) com valores fictícios de desenvolvimento. Não criar tabelas nesta tarefa.
  - Verification: `pnpm install` na raiz termina sem erro. O exemplo não contém senha de produção.

- [x] 2. Esquema Prisma e migração
  - Goal: Existem as tabelas de usuário, funcionário, solicitação, refresh e evento de auditoria.
  - Files: `apps/api/prisma/schema.prisma`, migração gerada pelo Prisma, `apps/api/src/prisma/`
  - Notes: `Funcionario` referencia `Usuario`. Refresh guarda só o hash. CPF, e-mail e matrícula são únicos entre contas ativas. Tutor não entra. O cliente Prisma não é chamado pelo health.
  - Verification: `docker compose up -d` e a migração aplicam em `DATABASE_URL`. `GET /health` segue 200 com o banco parado.

- [x] 3. Seed da coordenação
  - Goal: O boot cria uma coordenação idempotente quando as variáveis de seed existem e aquele CPF ainda não tem conta.
  - Files: `apps/api/src/seed.ts`, `apps/api/src/main.ts`
  - Notes: Senha hasheada com bcrypt. A conta não passa pela fila. Rodar de novo não duplica.
  - Verification: Subir a API duas vezes e contar um único usuário com o CPF do exemplo.

- [x] 4. Login, sessão e pedido de acesso
  - Goal: O pedido persiste e o login só emite JWT para conta ativa.
  - Files: `apps/api/src/auth/`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
  - Notes: Endpoints `POST /auth/solicitacoes`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. JWT de 15 minutos só com o id. Refresh em cookie `HttpOnly` e `SameSite=Lax`; `Secure` só em produção; 14 dias se “manter conectado”. CORS com `credentials: true`. Pendente e recusado não recebem token e devolvem a mensagem da spec. CPF, e-mail ou matrícula já pendentes ou ativos respondem 409. Gravar eventos de pedido criado e de login, sem a senha.
  - Verification: Pedido válido retorna 201 sem token. Login da conta seed retorna 200 e o cookie. Senha errada usa a frase genérica. Health permanece 200.

- [x] 5. Fila, aceite, recusa e troca de tipo
  - Goal: Só `coordenacao` lista, aceita, recusa e troca o tipo. A função gravada é a escolhida no aceite.
  - Files: `apps/api/src/auth/`, `apps/api/src/users/`
  - Notes: `GET /auth/solicitacoes?status=pendente`, `POST /auth/solicitacoes/:id/aceitar`, `POST /auth/solicitacoes/:id/recusar`, `GET /usuarios`, `PATCH /usuarios/:id/perfil`. O guard lê `perfilAcesso` no banco. Aceite como `veterinario` exige CRMV. Troca para fora de veterinário limpa o CRMV. A coordenação não troca o próprio tipo. A última coordenação não é rebaixada. A troca invalida os refreshes da pessoa. Conflito de decisão simultânea responde que o pedido já foi decidido. Eventos de aceite, recusa, tipo alterado e senha alterada entram aqui, junto de `PATCH /auth/me` e `POST /auth/me/senha`.
  - Verification: Um papel que não é coordenação recebe 403. Aceitar um pedido de recepção como `agente` grava `agente`. Auto-troca e rebaixamento da última coordenação são recusados.

- [x] 6. Testes de API
  - Goal: Os critérios de regra da spec ficam cobertos por Jest e supertest.
  - Files: `apps/api/src/auth/*.spec.ts`, `apps/api/src/health.controller.spec.ts`
  - Notes: Cobrir pedido, login pendente sem token, 403, aceite com função diferente da pretendida, CRMV obrigatório, troca de tipo, auto-troca, última coordenação e perfil sem campo de função. Se `DATABASE_URL` não alcançar o Postgres, o teste de auth falha com mensagem clara. O teste de health não abre o banco.
  - Verification: `pnpm --filter @zootech/api test` passa com o Postgres no ar.

- [x] 7. Cliente HTTP, login e pedido no front
  - Goal: A tela de entrar deixa de gravar sessão local como autenticação.
  - Files: `apps/web/src/lib/api.ts`, `apps/web/src/lib/session.ts`, `apps/web/src/components/login-screen.tsx`
  - Notes: `fetch` com `credentials: "include"`. JWT de acesso em memória. `zootech.session` guarda só o posto. Remover o aviso de que a senha não é conferida. Mostrar as mensagens da API para pendente, recusado e conflito.
  - Verification: Enviar um pedido e ver a confirmação sem abrir `/painel`. Entrar com a senha do pedido pendente mostra a espera. Entrar com a conta seed abre o painel.

- [x] 8. Casca com sessão real e menu por papel
  - Goal: O painel restaura a sessão pelo refresh, mostra o nome e esconde o que o papel não vê.
  - Files: `apps/web/src/lib/access.ts`, `apps/web/src/lib/nav.ts`, `apps/web/src/components/shell.tsx`, `apps/web/src/app/painel/page.tsx`
  - Notes: `Shell` aceita `children`. O posto do turno continua em `/painel`. “Acessos” só para `coordenacao`. `agente` e `recepcao` veem as mesmas seções do funcionário; `veterinario` vê o recorte clínico da spec. URL de seção fora do papel mostra que não está disponível. Um 401 tenta um único refresh e, se falhar, volta para `/` sem apagar o posto. O nome no cabeçalho aponta para `/painel/perfil`.
  - Verification: Recarregar `/painel` com “manter conectado” mantém a sessão. Sem a opção, fechar o navegador volta ao login. Coordenação vê Acessos; veterinário não.

- [x] 9. Telas de Acessos e de perfil
  - Goal: A coordenação decide pedidos e troca tipo; qualquer papel edita o próprio perfil sem mudar a função.
  - Files: `apps/web/src/app/painel/acessos/page.tsx`, `apps/web/src/app/painel/perfil/page.tsx`, componentes shadcn já em `apps/web/src/components/ui`
  - Notes: Rotas próprias, para prevalecerem sobre `painel/[secao]`. Acessos lista pendentes e usuários ativos. Troca para veterinário pede CRMV. Perfil: nome, CPF mascarado, matrícula, função e CRMV em somente leitura; telefone, e-mail `.gov.br` e senha em envios separados. Tema de `DESIGN.md`.
  - Verification: Aceitar um pedido escolhendo outra função, entrar com esse usuário e ver o menu do papel novo. Trocar o telefone no perfil e ver a confirmação. A função no perfil não tem controle de edição.

- [x] 10. Verificação final e contexto
  - Goal: O fluxo da spec passa no navegador e o contexto do repositório descreve a auth de verdade.
  - Files: `.ai-context/architecture.md`, `.ai-context/short-term.md`
  - Notes: Exercitar desktop e largura de tablet: pedido, aceite, login, perfil, saída, e 403 para quem não é coordenação. Atualizar a arquitetura com tabelas, JWT, cookie de refresh e o seed.
  - Verification: `pnpm typecheck` e `pnpm lint` na raiz passam. O resumo final diz o que foi verificado e como repetir o fluxo.

## Validation Checklist

- [x] Tests pass
- [x] Lint/typecheck/build pass where applicable
- [x] User-facing behavior matches acceptance criteria
- [x] Relevant `.ai-context/` files are updated if project knowledge changed
- [x] Final summary includes verification and concrete examples of how to test

## Blockers / Decisions Needed

Nenhum. As assunções do plano foram confirmadas. A implementação pode começar pela tarefa 1.
