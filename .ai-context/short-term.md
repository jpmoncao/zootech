# Short-Term Context

## Current Focus

Gestão de vacinação na branch `feat/gestao-de-vacinacao`, com a ficha do animal no padrão de cartões da main (resumo, dados, galeria, baia, castração, adoção, peso, observações, exames, vacinação e histórico). Autenticação JWT concluída (tarefas 1–10). Gestão de baias concluída no escopo inicial e agora integrada à ocupação real por animais na API. Gestão de animais tem persistência, API e front operacional: CRUD autenticado, regras de domínio, timeline, observações, pesagens, eventos, auditoria, revogação terminal, alocação de baias e galeria local. Gestão de castrações está concluída no escopo inicial. Ajustes de interface antes da tarefa 10: cadastro/edição em `Dialog`, combobox de raça, crop no cliente, caminho relativo de fotos, tooltip de alertas, rascunho da ficha, histórico no padrão das baias e filtros com `Select`.

Dashboard operacional: task 9 concluída. O contrato está documentado em `.ai-context/specs/dashboard-operacional.md`; `GET /dashboard` agrega plantel, baias ativas, ocupações irregulares, situações clínicas, castrações agendadas e adoções mensais em `America/Sao_Paulo`, com comparação ao mês anterior. A lista de animais aceita `adotadaDe`/`adotadaAte` como limites inclusivos de data local e preserva ciclos históricos devolvidos.

## Active Tasks

- Gestão de vacinação: spec `.ai-context/specs/gestao-de-vacinacao.md`, plano `.ai-context/plans/gestao-de-vacinacao.md`, tarefas `.ai-context/tasks/gestao-de-vacinacao.md`. Branch `feat/gestao-de-vacinacao`.
  - Status: spec, plano técnico e 11 tarefas escritos em 2026-09-25. Tarefas 1 a 10 concluídas e a 11 parcial (tudo implementado e verificado por build, tipos, lint, 105 testes e HTTP; **falta só a validação em tela no navegador**): persistência com índices parciais e `CHECK`s, API do catálogo (`/vacinas`), API de protocolos e aplicações (`/animais/:id/vacinacao/...`, `/vacinacao/aplicacoes?lote=`) e agenda (`/vacinacao/agenda`, `/vacinacao/agendamentos/...`), com 44 testes novos; suíte da API em `--runInBand`: 78 de 78. O módulo `apps/api/src/vacinacao/` tem três services: `VacinasService` (catálogo), `VacinacaoService` (protocolos e aplicações) e `AgendaService` (agenda), com `eventos.ts` compartilhado. A tarefa 5 (situação `em_observacao_antirrabica`, campos de reação em `EventoAnimal`, `seedVacinas` com só a antirrábica) foi feita com os valores propostos dos enums `GravidadeReacaoAdversa` e `DesfechoReacaoAdversa`, **sem aval clínico**: confirmar com o veterinário responsável antes de haver dados reais. Os nove alertas estão em `alertas()` de `animais.service.ts` e contam no indicador da listagem: `sem_vacinacao_registrada`, `esquema_vacinal_incompleto`, `dose_vencida`, `dose_a_vencer`, `vacina_obrigatoria_pendente`, `protocolo_vacinal_interrompido`, `observacao_antirrabica_em_curso`, `observacao_antirrabica_vencida` e `reacao_adversa_em_acompanhamento`. Listagem medida: 9 ms → 20 ms na página de 20, custo por página e não pelo total. As tarefas 8 e 9 estão feitas: contrato tipado em `api.ts` (com `ApiError.codigo`), helpers de permissão, `sectionRoles.vacinacao` em `todos`, item de menu com ícone `Syringe`, selo âmbar da situação nova, e a seção de vacinação da ficha em `apps/web/src/components/vacinacao/`. **A validação no navegador da tarefa 9 não foi feita** (extensão do Chrome desconectada) e fica pendente junto da tarefa 11. As telas de agenda (`/painel/vacinacao`) e catálogo (`/painel/vacinacao/vacinas`) existem e o item de menu deixou de cair na rota genérica. A tarefa 11 fechou o que não depende de navegador: `pnpm typecheck`, `lint` e `build` passam na raiz pela primeira vez; contexto durável atualizado; a auditoria dos 51 critérios contra os testes achou e corrigiu 4 lacunas (proposta de agendar a próxima dose, reação na consulta por lote, aviso de idade mínima condicional, e 3 testes). **Pendente: exercitar as telas nos quatro perfis** (agrupamento por dia, faixa de atrasados, estados vazios, `?agendamento=` em refresh, proposta da próxima dose, aviso de dose adiantada e a confirmação zerando ao mudar a data). Achados abertos: `multer` sem declarar como dependência (deploy com `node dist/main.js` quebra), valores dos enums de reação sem aval clínico, e teste do critério 51 inexistente. **Atenção em testes:** data de aplicação precisa vir de `formatDataCivil(hojeCivil())`, não de `new Date().toISOString()`, porque o serviço afere "hoje" em `America/Sao_Paulo`.

**Risco do banco de desenvolvimento:** `auth.spec.ts` (`recusa rebaixar a última coordenação`) rebaixa **todas** as coordenações ativas do banco durante o teste e as restaura no `finally`. Se a suíte for interrompida ou rodar em paralelo e falhar, a restauração não acontece e o banco fica **sem nenhuma coordenação** — a conta do seed vira `agente` e o painel perde as funções de coordenação. Aconteceu em 2026-09-26 e foi corrigido à mão. Para checar: contar `Usuario` com `perfilAcesso: coordenacao` e `ativo: true`. Reforça o uso de `--runInBand`. `pnpm test` em paralelo é intermitente por causa de `auth.spec.ts`, que rebaixa todas as coordenações do banco; usar `--runInBand`.
  - Notes: quatro decisões de escopo e as doze perguntas abertas fechadas pelo autor em 2026-09-25. Escopo: aplicação ligada direto ao `Animal` com `prontuarioId` reservado; agenda é agendamento real (`agendado`/`aplicado`/`faltou`/`cancelado` mais remarcação); catálogo sem estoque, lote como texto; consulta para todos e escrita clínica, com anulação e catálogo só para `coordenacao`. Três respostas mudaram mecanismo: (a) dose adiantada não é recusa e reenvio — a interface avisa **antes** de aplicar, com confirmação e motivo gravados, e a API ainda recusa 409 sem esse par; (b) reação adversa é evento da ficha do animal (`TipoEventoAnimal.reacao_adversa` + `EventoAnimal.aplicacaoVacinaId`), não entidade própria; (c) `SituacaoAnimal` ganha `em_observacao_antirrabica` com `Animal.observacaoAntirrabicaInicioEm` e alerta de 10 dias que vira pendência ao vencer. Janela de "dose a vencer" é `Vacina.diasAvisoProximaDose`, padrão 7, e não é fotografada no protocolo. Seed só com a antirrábica; as demais a Coordenação cadastra. **Esta spec sai do módulo de vacinação**: altera situações, eventos e alertas de gestão de animais, com pontos de código já mapeados na spec, e a migration precisa isolar o `ALTER TYPE ... ADD VALUE` do enum de situação e criar dois índices únicos parciais em SQL puro. `sectionRoles.vacinacao` passa de `clinico` para `todos` em `apps/web/src/lib/access.ts:29`. Fora do escopo: campanha, estoque com saldo, farmacovigilância e notificação externa. Segunda rodada de respostas fechou as cinco restantes: não bloquear vacina por situação do animal; 10 dias fixos no código; o alerta mostra os dias que faltam e, ao vencer, cobra a observação final por `POST /animais/:id/encerrar-observacao-antirrabica`, que exige texto e nova situação em uma transação; reação adversa ganha gravidade e desfecho, com atualização por evento novo referenciando o original (`EventoAnimal.eventoOrigemId`), porque evento é imutável; indicador do painel conta o CCZ inteiro. `EventoAnimal` passa a ter `aplicacaoVacinaId`, `eventoOrigemId`, `gravidadeReacao` e `desfechoReacao`, mais os enums `GravidadeReacaoAdversa` e `DesfechoReacaoAdversa`. **Pendência real:** os valores desses dois enums são proposta da spec e precisam do aval do veterinário responsável antes de ir ao banco, porque enum em Postgres é caro de alterar depois. Isso bloqueia apenas a etapa 2 do plano. Decisões técnicas do plano: módulo próprio em `apps/api/src/vacinacao/` com dois controllers, porque `animais.service.ts` já tem 811 linhas; protocolo com doses derivadas na leitura e `status` persistido; alertas centralizados em `alertas()` de `animais`, o que obriga medir o peso da listagem paginada na etapa 7; componentes em `apps/web/src/components/vacinacao/`, porque `animais/[id]/page.tsx` já tem 1393 linhas. `compose.yaml` usa `postgres:17`, então `ALTER TYPE ... ADD VALUE` roda em transação; o cuidado que resta é não referenciar o valor novo na mesma migration.

- Gestão de tutores e adoção: spec/plano e tasks em `.ai-context/{specs,plans,tasks}/gestao-de-adocao.md`. Tasks 2–10 implementadas; API cobre CRUD/mídia de tutor, liberação excepcional de uso único, adoção/devolução transacionais e histórico do ciclo. A ficha oferece cadastro de tutor, adoção, devolução com motivo/situação/baia opcional e ciclos anteriores. Próximo passo: task 11 (validação integrada e contexto durável). Testes integrados e jornada manual aguardam recuperação segura das migrations locais. Fotos tutor são WebP até 5 MB; até três documentos; sem remoção/expiração. Assinatura fica vinculada apenas à adoção definitiva.

- Gestão de animais: spec `.ai-context/specs/gestao-de-animais.md`, plano `.ai-context/plans/gestao-de-animais.md`, tarefas `.ai-context/tasks/gestao-de-animais.md`.
  - Status: tasks 1, 2, 3, 4, 5, 6, 7, 8 e 9 concluídas; ajustes de interface antes da task 10 concluídos; task 10 é o próximo passo.
  - Notes: cadastro/edição em `Dialog` largo com etapas; raça em combobox (`Não informada`, SRD, catálogo, `Outra`); fotos com botão “Adicionar fotos”, crop quadrado no cliente (`react-easy-crop`) e `AlertDialog` para remoção. `FotoAnimal.caminhoAbsoluto` é relativo (`animais/{id}/{uuid}.webp`) e a API ancora `storage/media` em `apps/api`. Lista mostra só a quantidade de alertas, com descrição no `Tooltip`. Ficha tem baia/localização lado a lado, peso em destaque, rascunho com confirmação ao sair e histórico no padrão `history-list`. Filtros de animais e baias usam `Select`; baia filtra pelo código. Migration `20260924220000_foto_caminho_relativo` converte paths absolutos antigos.

- Gestão de castrações: spec `.ai-context/specs/gestao-de-castracoes.md`, plano `.ai-context/plans/gestao-de-castracoes.md`, tarefas `.ai-context/tasks/gestao-de-castracoes.md`.
  - Status: tasks 1–9 concluídas.
  - Notes: `Animal.castrado` foi removido do schema e substituído por `CastracaoAnimal`. As migrations `20260925120000_gestao_castracoes_modelo` e `20260925133000_evento_castracao` foram aplicadas no Postgres local. API de animais mantém compatibilidade temporária derivando `castrado` dos registros e aceitando `sim`/`nao` para criar registros legados. Rotas `/animais/:id/castracoes` consultam, avaliam “não castrado”, registram realizado legado, agendam, reagendam, concluem e cancelam. `GET /animais/castracoes` lista procedimentos globalmente por estado, período e animal com paginação. Mudanças gravam `EventoAnimal` do tipo `castracao` e `AuditoriaEvento` na mesma transação. A página `/painel/castracoes` exibe agenda, atrasados, histórico e operações. Front possui contrato tipado de castrações no `api.ts`, helpers `canViewCastracoes`/`canManageCastracoes` e item `/painel/castracoes` visível para todos os perfis. A lista e a ficha de animais exibem `estadoCastracao` derivado; a ficha oferece ações e histórico com datas, observações, cancelamentos e autor. O campo/filtro/alerta legado `castrado` saiu dos formulários e contratos de animais. A suíte da API passou com 40 testes, incluindo consulta global, permissões, transições, duplicidades e rollback. Validação visual no navegador integrado ficou limitada porque ele bloqueou a API local na porta 3001.

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

## Future Implementations

Backlog solicitado pelo autor em 2026-09-29. Vacinação permanece fora desta lista porque já está em implementação.

- Cadastro e origem do animal:
  - forma de ingresso: recolhimento, resgate, entrega voluntária, apreensão ou transferência;
  - situação `transferido`;
  - situação `eutanásia`, com protocolo, responsável, data e justificativa.
- Controle sanitário:
  - controle de ectoparasitas;
  - consulta clínica estruturada com queixa, diagnóstico, conduta, evolução e veterinário responsável;
  - medicamentos com dose, via, frequência, data de início e data de término;
  - procedimentos: curativos, cirurgias, internações e outros;
  - exames com tipo, data, resultado e anexos.
- Adoção:
  - campo de observações da adoção;
  - tela/menu próprio de adoções, sem depender apenas da ficha do animal.
- Funcionalidades adicionais:
  - leitura de QR Code da ficha do animal;
  - alertas automáticos para vermifugação, ectoparasitas, tratamentos, vacinas e ocupação máxima das baias.

## Recent Changes

- 2026-09-28
  - Change: Task 8 do dashboard concluída com links para plantel e situações, agenda de castrações, detalhe/lista por baia e períodos mensais de adoção; a lista de animais agora restaura `baiaId` da URL e abre os filtros recebidos.
  - Reason: Permitir navegar de cada agregado apenas para destinos que reproduzem a contagem com filtros suportados.
- 2026-09-25
  - Change: Task 9 de gestão de castrações concluída com documentação alinhada ao modelo `CastracaoAnimal`, spec de animais atualizada para remover castração como backlog, arquitetura sem duplicidade/desatualização e checklist final fechado.
  - Reason: Encerrar a entrega de castrações com contexto durável coerente e validação integrada.
- 2026-09-25
  - Change: Task 8 de castrações concluída: estado derivado em lista/ficha, histórico e ações na ficha; removidos campo, filtro, alerta e entrada legados `castrado` dos contratos de animais. Reagendamento em estado terminal agora é bloqueado.
  - Reason: Fazer da castração um registro operacional com datas e autoria, sem edição direta do status no cadastro do animal.
- 2026-09-25
  - Change: Task 7 de gestão de castrações concluída com `/painel/castracoes`, agenda paginada, filtros de período/nome/registro, atrasados, histórico e ações de agendar, reagendar, concluir e cancelar. A API ganhou `GET /animais/castracoes` para consulta global.
  - Reason: Permitir operação e consulta das castrações no painel sem percorrer fichas de animais individualmente. Após iniciar o Postgres, as migrações foram aplicadas e 39 testes da API passaram; typecheck, lint e build também passaram.
- 2026-09-25
  - Change: Tasks 3–5 de gestão de castrações concluídas com endpoints em `/animais/:id/castracoes`, regras de agenda/conclusão/cancelamento, timeline `castracao`, auditoria transacional e cobertura de testes de integração para permissões, transições, constraints e rollback.
  - Reason: Completar a camada de API antes de expor contratos e navegação no front.
- 2026-09-25
  - Change: Tasks 1 e 2 de gestão de castrações concluídas com modelo `CastracaoAnimal`, constraints SQL, índices parciais para agendamento ativo/procedimento realizado únicos por animal e migration de status legado sem datas inventadas.
  - Reason: Substituir o campo isolado `Animal.castrado` pela base persistente do módulo de agenda e histórico de castrações.
- 2026-09-25
  - Change: Plano técnico e tarefas de vacinação criados em `.ai-context/plans/gestao-de-vacinacao.md` e `.ai-context/tasks/gestao-de-vacinacao.md`, em 11 etapas, com plano de verificação, riscos e checklist. Spec de gestão de vacinação criada em `.ai-context/specs/gestao-de-vacinacao.md`, com catálogo de vacinas, protocolo por animal, registro de aplicação auditado, alertas de dose faltante/vencida e agenda com agendamentos. No mesmo dia, as sete perguntas abertas foram respondidas e incorporadas: aviso de dose adiantada antes de aplicar, reação adversa como evento da ficha com gravidade e desfecho acompanhável, e situação `em observação antirrábica` com contagem regressiva de 10 dias e encerramento que cobra a observação final. Decisão correspondente em `decisions.md`; glossário ganhou Vacina, Protocolo vacinal, Aplicação de vacina, Agendamento de vacinação e Alertas de vacinação, e Prontuário passou a registrar que a vacina não depende dele.
  - Reason: O sistema não tinha nenhum campo de vacinação e o risco operacional era vacinar errado, repetir a mesma vacina ou deixar o esquema de doses parar no meio.
- 2026-09-25
  - Change: `globals.css` ficou só com tokens, reset, tipografia base e tema. Layout das telas passou para utilitários Tailwind no `className`.
  - Reason: Evitar CSS de feature no arquivo global.
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

1. Confirmar com o veterinário responsável os valores de gravidade e desfecho da reação adversa (já no banco desde 2026-09-25, com valores propostos) e o catálogo de vacinas além da antirrábica.
2. Validar as telas de vacinação no navegador, nos quatro perfis, em desktop e tablet (falta da tarefa 11), já na ficha em cartões.
3. Declarar `multer` como dependência de `apps/api`, antes de qualquer deploy.
4. Implementar task 10 de gestão de animais: validação integrada, ajustes finais e atualização de contexto durável.
5. Recuperar/alinhar migrations de adoção, executar a jornada integrada de adoção → devolução → nova adoção e concluir a task 11 de adoção.
6. Corrigir a fragilidade do CPF gerado nos testes de adoção e os parâmetros de assinatura não usados quando esse fluxo voltar ao escopo.
7. Especificar demais funcionalidades do painel ADM (UC02–UC10 e auditoria) que ainda não têm spec.
8. Planejar e implementar os itens registrados em `Future Implementations`, priorizando prontuário sanitário estruturado, estados/desfechos do animal e dashboard/alertas.

## Things To Remember

- Não restaurar o bootstrap apagado.
- O veterinário ADM enxerga todas as funcionalidades. Funcionário e veterinário continuam com os casos de uso do diagrama.
- Interface em `apps/web` usa shadcn nos controles e Tailwind no `className`, no tema de `DESIGN.md`. Sem classes de feature em `globals.css`. O contrato está em `AGENTS.md`.
- Persistência é Postgres. Não há fila externa, storage nem serviço de terceiros neste momento.
- Conta seed local: ver `apps/api/.env.example` (`SEED_COORDENACAO_*`). Sem `.env`, o seed não cria a conta.
