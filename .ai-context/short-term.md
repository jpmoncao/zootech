# Short-Term Context

## Current Focus

Autenticação JWT concluída (tarefas 1–10). Gestão de baias concluída no escopo inicial e agora integrada à ocupação real por animais na API. Gestão de animais tem persistência, API e front operacional: CRUD autenticado, regras de domínio, timeline, observações, pesagens, eventos, auditoria, revogação terminal, alocação de baias e galeria local. Ajustes de interface antes da tarefa 10: cadastro/edição em `Dialog`, combobox de raça, crop no cliente, caminho relativo de fotos, tooltip de alertas, rascunho da ficha, histórico no padrão das baias e filtros com `Select`.

## Active Tasks

- Gestão de animais: spec `.ai-context/specs/gestao-de-animais.md`, plano `.ai-context/plans/gestao-de-animais.md`, tarefas `.ai-context/tasks/gestao-de-animais.md`.
  - Status: tasks 1, 2, 3, 4, 5, 6, 7, 8 e 9 concluídas; ajustes de interface antes da task 10 concluídos; task 10 é o próximo passo.
  - Notes: cadastro/edição em `Dialog` largo com etapas; raça em combobox (`Não informada`, SRD, catálogo, `Outra`); fotos com botão “Adicionar fotos”, crop quadrado no cliente (`react-easy-crop`) e `AlertDialog` para remoção. `FotoAnimal.caminhoAbsoluto` é relativo (`animais/{id}/{uuid}.webp`) e a API ancora `storage/media` em `apps/api`. Lista mostra só a quantidade de alertas, com descrição no `Tooltip`. Ficha tem baia/localização lado a lado, peso em destaque, rascunho com confirmação ao sair e histórico no padrão `history-list`. Filtros de animais e baias usam `Select`; baia filtra pelo código. Migration `20260924220000_foto_caminho_relativo` converte paths absolutos antigos.

- Gestão de baias em `.ai-context/tasks/gestao-de-baias.md`.
  - Status: concluído no escopo aprovado
  - Notes: a migration `gestao_baias` foi aplicada ao Postgres local. A página `/painel/baias` alterna lista/mapa usando os mesmos filtros e indicadores, permite cadastro/edição, detalhe, ações operacionais e histórico para Coordenação. Todos os perfis autenticados consultam baias; somente Coordenação faz CRUD, ações e histórico/auditoria. Validação manual feita em `http://localhost:3002/painel/baias` com login seed, cadastro de baia, busca, mapa, higienização e histórico. A API já retorna ocupantes reais a partir de `Animal.baiaId`; o front de baias ainda precisa consumir animais reais quando a tela de animais chegar.

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

- 2026-09-25
  - Change: Fotos de animais passam a ser buscadas com o JWT da sessão e exibidas por blob URL. A tag `img` não enviava `Authorization` e a rota autenticada respondia 401.
  - Reason: A galeria e a miniatura da lista apareciam quebradas mesmo com o arquivo salvo.
- 2026-09-24
  - Change: Ajustes de interface de animais antes da tarefa 10: modal de cadastro/edição, combobox de raça, crop no cliente, caminho relativo de fotos, tooltip de alertas, rascunho da ficha, histórico no padrão das baias e filtros com Select.
  - Reason: Alinhar a operação de animais ao padrão visual das baias e evitar galeria quebrada quando a API sobe de outro diretório.
- 2026-09-24
  - Change: Task 9 de gestão de animais concluída com ficha dedicada operacional em `/painel/animais/[id]`: resumo, alertas acionáveis, edição inline dos dados que resolvem pendências, baia com link para `/painel/baias?baia=<id>`, galeria, pesagens, observações, exames/diagnósticos, histórico auditável e revogação terminal somente para Coordenação.
  - Reason: Completar a consulta e acompanhamento operacional do animal antes da validação integrada.
- 2026-09-24
  - Change: Task 8 de gestão de animais concluída com assistente mobile de cadastro/edição em cinco etapas, criação mínima, edição de animais operacionais, seleção/busca de raça, inclusão rápida de raça personalizada, alocação opcional em baia e galeria com limite de 10 fotos e confirmação de remoção.
  - Reason: Completar o fluxo operacional de entrada e complementação de animais antes da ficha dedicada.
- 2026-09-24
  - Change: Task 7 de gestão de animais concluída com listagem paginada, busca por nome/registro, filtros por espécie/situação/sexo/porte/castração/baia/sem baia/alertas/terminais, indicador textual de alertas e navegação para ficha dedicada.
  - Reason: Completar a consulta operacional de animais antes do fluxo de cadastro/edição em etapas.
- 2026-09-24
  - Change: Task 6 de gestão de animais concluída com contrato web tipado para API `animais`, helpers `canViewAnimais`/`canManageAnimais`, lista inicial `/painel/animais`, ficha direta `/painel/animais/[id]`, estilos responsivos mínimos e regra de URL atualizada para rota segmentada de animais.
  - Reason: Estabelecer navegação real e API client-side antes da listagem completa, cadastro e ficha operacional.
- 2026-09-24
  - Change: Task 5 de gestão de animais concluída com upload autenticado de fotos, crop quadrado até 1200 px, saída WebP até 5 MB, limite transacional de 10 fotos, rota controlada de entrega, remoção segura e limpeza de arquivo órfão. `sharp` foi adicionado à API e `ZOOTECH_MEDIA_ROOT` documenta a raiz gerenciada de mídia.
  - Reason: Armazenamento local auditável e seguro para a galeria de animais antes das telas.
- 2026-09-24
  - Change: Task 4 de gestão de animais concluída com ocupação real entre animais e baias. `POST /animais/:id/alocacao` aloca, transfere ou retira animal; valida baia ativa, capacidade, exclusividade de isolamento e concorrência pela última vaga. Baias retornam ocupantes reais e bloqueiam redução de capacidade, exclusividade incompatível e ações em baia ocupada.
  - Reason: Localização real e auditável do animal, substituindo ocupação simulada.
- 2026-09-24
  - Change: Tasks 2 e 3 de gestão de animais concluídas com módulo Nest `animais`, endpoints autenticados de CRUD/lista/detalhe/raças, observações, pesagens, eventos simples, timeline e revogação terminal por Coordenação. Testes Supertest cobrem quatro perfis, 401, duplicidade de registro, coerência espécie/raça, criação mínima, ausência de DELETE, estados terminais, autoria, histórico e auditoria.
  - Reason: API inicial e timeline auditável para cadastro/acompanhamento de animais.
- 2026-09-24
  - Change: Task 1 de gestão de animais concluída com modelo Prisma, migration `gestao_animais` e seed idempotente de raças. A migration foi aplicada localmente; `prisma generate`, typecheck API e seed duplo passaram, incluindo verificação temporária de preservação de raça personalizada.
  - Reason: Base de persistência para o CRUD de animais.
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


- Nenhum bloqueio na autenticação. Agente e recepção veem as mesmas seções, de propósito, até um mapa novo ser pedido.

## Next Steps

1. Implementar task 10 de gestão de animais: validação integrada, ajustes finais e atualização de contexto durável.
2. Especificar demais funcionalidades do painel ADM (UC02–UC10 e auditoria) que ainda não têm spec.

## Things To Remember

- Não restaurar o bootstrap apagado.
- O veterinário ADM enxerga todas as funcionalidades. Funcionário e veterinário continuam com os casos de uso do diagrama.
- Interface em `apps/web` usa shadcn, no tema de `DESIGN.md`. Login, casca, Acessos e perfil usam esses componentes.
- Persistência é Postgres. Não há fila externa, storage nem serviço de terceiros neste momento.
- Conta seed local: ver `apps/api/.env.example` (`SEED_COORDENACAO_*`). Sem `.env`, o seed não cria a conta.
