# Implementation Plan: Autenticação JWT, aceite de acesso e perfil

## Objective

Ligar o login e o pedido de acesso já desenhados à API, com JWT, fila de aceite e troca de tipo só para `coordenacao`, e a tela de perfil do usuário autenticado.

## Relevant Context

A spec está em `.ai-context/specs/autenticacao-jwt-rbac.md`. Só `coordenacao` aceita e troca tipo (decisão de 2026-09-24).

O que já existe:

- `apps/web`: login em `src/components/login-screen.tsx` grava `zootech.session` no navegador sem chamar a API. O pedido de acesso termina num alerta local. A casca em `src/components/shell.tsx` exige essa sessão e mostra “Servidor”. Seções vazias passam por `src/app/painel/[secao]/page.tsx`.
- `apps/api`: NestJS com `ConfigModule`, `ValidationPipe` e `GET /health`. Jest e supertest cobrem o health. Não há cliente de banco, JWT, hash de senha nem guard.
- Postgres 17 no `compose.yaml`. `DATABASE_URL` está em `apps/api/.env.example`. O front aponta a API em `NEXT_PUBLIC_API_URL`.
- Não há ORM, migração nem pacote de contratos em uso. A API não importa `packages/`.

Fora deste plano: UC02–UC10, tela de auditoria, desativar conta, editar CPF ou matrícula de outra pessoa, e-mail transacional.

## Files and Modules Likely Involved

API:

- `apps/api/package.json` — Prisma, JWT, bcrypt e tipos.
- `apps/api/prisma/schema.prisma` — usuário, funcionário, solicitação, refresh e evento de auditoria.
- `apps/api/src/main.ts` — CORS com credenciais; cookie.
- `apps/api/src/app.module.ts` — módulos de auth e usuários.
- `apps/api/src/auth/` — controller, serviço, guard JWT, guard de papel, DTOs.
- `apps/api/src/users/` — listagem e troca de tipo.
- `apps/api/src/prisma/` — cliente Prisma.
- `apps/api/src/seed.ts` — conta inicial de coordenação.
- `apps/api/.env.example` — segredo JWT e dados fictícios do seed.
- `apps/api/src/auth/*.spec.ts` — regras da spec via supertest.

Front:

- `apps/web/src/lib/api.ts` — `fetch` com `credentials: "include"` e renovação única em 401.
- `apps/web/src/lib/session.ts` — token de acesso em memória; `zootech.session` guarda só o posto.
- `apps/web/src/lib/access.ts` — quais seções cada papel vê.
- `apps/web/src/lib/nav.ts` — item “Acessos”.
- `apps/web/src/components/login-screen.tsx` — login e pedido chamam a API.
- `apps/web/src/components/shell.tsx` — nome real, menu por papel, link do perfil.
- `apps/web/src/app/painel/acessos/page.tsx` — fila e troca de tipo.
- `apps/web/src/app/painel/perfil/page.tsx` — perfil.
- `apps/web/src/components/shell.tsx` passa a aceitar `children`, para essas duas telas ocuparem o miolo. O posto do turno continua na página `/painel`.

Contexto, ao fechar a implementação: `.ai-context/architecture.md` e `.ai-context/short-term.md`.

## Proposed Approach

Prisma passa a ser o acesso ao Postgres. O esquema deste marco é só o da spec: `Usuario` e `Funcionario` em tabelas separadas, com chave estrangeira; `Solicitacao`; `RefreshToken` (só o hash); `AuditoriaEvento`. Tutor não entra.

A senha usa bcrypt. O JWT de acesso dura 15 minutos e carrega só o id do usuário. Cada rota protegida lê `perfilAcesso` no banco. O refresh fica em cookie `HttpOnly` e `SameSite=Lax`. `Secure` só quando `NODE_ENV` é `production`, para o `http://localhost` gravar o cookie. “Manter conectado” define `Max-Age` de 14 dias; sem a opção, o cookie é de sessão. O CORS de `main.ts` usa a origem já configurada e `credentials: true`.

O front guarda o JWT numa variável de módulo. No carregamento do painel, `POST /auth/refresh` reconstitui a sessão. Um 401 dispara uma única renovação e, se falhar, volta para `/`.

O seed roda no boot da API se as variáveis da coordenação existirem e aquele CPF ainda não tiver conta. Valores de exemplo são fictícios e locais.

O menu filtra seções no cliente com o papel vindo de `GET /auth/me`. Não haverá rotas de animal ou baia neste marco. A API responde 403 nas ações de acesso e de troca de tipo. A página de uma seção que o papel não pode ver mostra que ela não está disponível, sem chamar um endpoint de domínio que não existe.

`/painel/acessos` e `/painel/perfil` são rotas próprias. No App Router elas prevalecem sobre `painel/[secao]`. “Acessos” entra na navegação só para `coordenacao`. O perfil abre pelo nome no cabeçalho.

## Implementation Steps

1. Acrescentar Prisma, `@nestjs/jwt`, `bcrypt` e `cookie-parser` na API. Documentar `JWT_SECRET` e as variáveis `SEED_COORDENACAO_*` em `apps/api/.env.example`, com senha fictícia.
2. Modelar e migrar as cinco tabelas. Índices únicos de CPF, e-mail e matrícula em usuários ativos e a unicidade de solicitação `pendente` ficam na aplicação, com transação no aceite e no pedido.
3. Subir o seed da coordenação no boot, idempotente pelo CPF.
4. Implementar `POST /auth/solicitacoes`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` e `GET /auth/me`. Login distingue conta ativa, pedido pendente e pedido recusado. Hash e refresh não vão para log.
5. Implementar a fila, o aceite, a recusa, `GET /usuarios` e `PATCH /usuarios/:id/perfil`, com guard de `coordenacao`. Aceite grava a função escolhida. Troca para `veterinario` exige CRMV. A coordenação não altera o próprio tipo. A última coordenação não é rebaixada. A troca invalida os refreshes da pessoa afetada.
6. Gravar os eventos mínimos (pedido criado, aceito, recusado, tipo alterado, login, senha alterada) sem tela.
7. Cobrir com Jest e supertest os critérios da spec que são regra de API: pedido, pendente sem token, 403 fora de coordenação, aceite com função diferente da pretendida, CRMV obrigatório, troca de tipo, auto-troca recusada, última coordenação, perfil sem campo de função. O health continua 200 sem consultar o banco.
8. No front, criar o cliente HTTP e trocar o submit do login e o envio do pedido. Remover o aviso de que a senha não é conferida. Mensagens de erro vêm do corpo da API.
9. Fazer a casca restaurar sessão pelo refresh, mostrar o nome, esconder “Acessos” e as seções fora do papel, e ligar o nome a `/painel/perfil`. O posto permanece em `zootech.session`.
10. Construir a tela de Acessos (fila e lista de usuários com troca de tipo) e a tela de perfil (telefone, e-mail, senha; função somente leitura), com os componentes shadcn e o tema já usados.
11. Atualizar `architecture.md` e `short-term.md` com o fluxo de auth e o esquema mínimo.

## Verification Plan

- `pnpm --filter @zootech/api test` — health e os fluxos de auth acima.
- `pnpm typecheck` e `pnpm lint` na raiz.
- Com Postgres no ar (`docker compose up -d`), API e front locais: pedir acesso, entrar com a conta seed, aceitar escolhendo outra função, entrar com o usuário novo, abrir o perfil, trocar o telefone, sair. Repetir com um papel que não é coordenação e confirmar que Acessos não aparece e a API responde 403.
- Conferir no navegador, desktop e largura de tablet: login, fila, troca de tipo e perfil. O alvo dos controles continua o dos componentes já usados.

## Risks and Edge Cases

- O teste de health sobe `AppModule`. O Prisma não pode derrubar esse teste se o Postgres estiver parado. O health segue sem consultar o banco; os testes de auth usam `DATABASE_URL` e falham com mensagem clara se o banco não estiver acessível.
- Cookie entre `localhost:3000` e `localhost:3001` exige origem explícita no CORS e `credentials: "include"`. Sem `Secure` no desenvolvimento local.
- Dois pedidos com o mesmo CPF, e aceite contra recusa do mesmo id, dependem de transação e de releitura do status. A segunda operação responde que o pedido já foi decidido.
- Troca de tipo no meio da sessão: a próxima chamada lê o papel novo; o refresh antigo deixa de valer.
- O seed com senha no exemplo é só para a máquina local. Não copiar esse valor para produção.

## Open Questions

Nenhuma. Em 2026-09-24 o autor confirmou as três assunções: agente e recepção veem as mesmas seções; não há e-mail; Prisma é o acesso ao Postgres. Um mapa de seções diferente, no futuro, mexe só em `access.ts` e no guard.

## Definition of Done

- O pedido de acesso persiste e a coordenação aceita, recusa e troca tipo. Os outros papéis recebem 403.
- O login confere a senha, emite JWT e o painel abre com o nome e o menu do papel.
- `/painel/perfil` altera telefone, e-mail e senha, e não altera a função.
- A conta seed de coordenação existe no ambiente local.
- Testes da API, typecheck e lint passam. O fluxo foi exercido no navegador.
- `architecture.md` descreve auth, tabelas e o cookie de refresh.
