# Plano de Implementação: Gestão de Vacinação

## Objetivo

Implementar catálogo de vacinas, protocolo vacinal por animal com controle de doses aplicadas e faltantes, registro auditável de aplicações com aviso antes de aplicar adiantado, agenda de vacinação com agendamentos operáveis, reação adversa como evento acompanhável da ficha, e a situação `em observação antirrábica` com contagem de 10 dias e encerramento que cobra a observação final.

## Contexto Relevante

- Requisitos em `.ai-context/specs/gestao-de-vacinacao.md`. As quatro decisões de escopo e as doze perguntas abertas foram resolvidas pelo autor em 2026-09-25 e estão registradas em `.ai-context/decisions.md`.
- Stack: NestJS em `apps/api`, Next.js em `apps/web`, Prisma/Postgres. Autenticação JWT, `RolesGuard` e `AuditoriaEvento` já existem e funcionam.
- O módulo `apps/api/src/animais/` já tem tudo que este plano reaproveita: `$transaction` em toda escrita, helpers privados `createEvento(tx, ...)` e `createAudit(tx, ...)`, `assertEditable(animal)` para estados terminais, `alertas(animal)` devolvendo `{ tipo, mensagem }[]`, e `viewAnimal()` que injeta `alertas` e `somenteLeitura` na resposta. Os alertas de vacinação entram em `alertas()`, não num mecanismo novo.
- `apps/api/src/animais/animais.service.ts` tem 811 linhas e `animais.spec.ts` tem 790. Acrescentar vacinação inteira ali deixaria o arquivo impraticável, por isso este plano cria um módulo próprio.
- `apps/api/src/baias/` é o modelo de módulo com CRUD restrito a um perfil: `@UseGuards(JwtAuthGuard, RolesGuard)` na classe e `@Roles("coordenacao")` por rota, com consulta livre para todos os perfis autenticados. É exatamente a forma que o catálogo de vacinas precisa.
- Os testes são de integração com Supertest contra o Postgres local, com `loadLocalEnv`, usuários semeados nos quatro perfis e `MEDIA_ROOT` em `tmpdir`. Config em `apps/api/jest.config.json`. O padrão já cobre 401, 403, conflito e auditoria; os novos specs seguem a mesma forma.
- Migrations em `apps/api/prisma/migrations/`, nomeadas `<timestamp>_<nome>`. A última é `20260924220000_foto_caminho_relativo`.
- O seed roda no boot (`apps/api/src/main.ts:27-28`) e por comando (`pnpm --filter @zootech/api seed`). `seedRacasAnimais` usa `upsert` por chave composta e é o modelo de idempotência para `seedVacinas`.
- No front, `apps/web/src/lib/api.ts` (727 linhas) concentra tipos e funções com `ApiError` e refresh de sessão. `apps/web/src/lib/access.ts` tem `sectionRoles` e os helpers `canManageBaias`, `canViewAnimais` e afins.
- `apps/web/src/lib/nav.ts:36` tem o item `vacinacao` comentado. Sem descomentar, `/painel/vacinacao` cai na rota genérica `apps/web/src/app/painel/[secao]/page.tsx`.
- As páginas de animais são grandes: `page.tsx` com 1285 linhas e `[id]/page.tsx` com 1393. A seção de vacinação da ficha precisa entrar como componente próprio, não inline.
- Comandos: `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` na raiz, via Turborepo.

## Arquivos e Módulos Prováveis

### Banco

- `apps/api/prisma/schema.prisma` — modelos `Vacina`, `ProtocoloVacinal`, `AplicacaoVacina`, `AgendamentoVacinacao`; enums `StatusProtocoloVacinal`, `StatusAgendamentoVacinacao`, `GravidadeReacaoAdversa`, `DesfechoReacaoAdversa`; valor novo em `SituacaoAnimal` (linha 69) e valores novos em `TipoEventoAnimal`; campos novos em `Animal` e `EventoAnimal`.
- `apps/api/prisma/migrations/<timestamp>_gestao_vacinacao/migration.sql` — tabelas, enums e os dois índices únicos parciais, que Prisma não declara.
- `apps/api/prisma/migrations/<timestamp>_situacao_observacao_antirrabica/migration.sql` — migration separada para os `ALTER TYPE ... ADD VALUE` e os campos novos de `Animal` e `EventoAnimal`. Separada por legibilidade de revisão, não por exigência do banco; ver Riscos.
- `apps/api/src/seed.ts` — `seedVacinas(prisma)` idempotente com a antirrábica, no molde de `seedRacasAnimais`.
- `apps/api/src/main.ts` — chamar `seedVacinas` junto das outras duas.

### API

- `apps/api/src/vacinacao/` — módulo novo: `vacinacao.module.ts`, `vacinas.controller.ts`, `vacinas.service.ts`, `vacinacao.controller.ts`, `vacinacao.service.ts`, `dto/`, e specs `vacinas.spec.ts`, `aplicacoes.spec.ts`, `agenda.spec.ts`.
- `apps/api/src/app.module.ts` — registrar `VacinacaoModule`.
- `apps/api/src/animais/animais.service.ts` — `alertas()` ganha os alertas de vacinação e de observação antirrábica; `criar`/`atualizar` gravam e limpam `observacaoAntirrabicaInicioEm`; `registrarEvento` aceita gravidade, desfecho, `aplicacaoVacinaId` e `eventoOrigemId`; método novo `encerrarObservacaoAntirrabica`.
- `apps/api/src/animais/animais.controller.ts` — rota nova `POST :id/encerrar-observacao-antirrabica`.
- `apps/api/src/animais/dto/` — `create-evento-animal.dto.ts` estendido; `encerrar-observacao-antirrabica.dto.ts` novo; `create-animal.dto.ts`, `update-animal.dto.ts`, `list-animais.dto.ts` e `revogar-situacao.dto.ts` com o valor novo de situação nos `@IsIn`.
- `apps/api/src/animais/animais.spec.ts` — casos de observação antirrábica e de reação adversa.

### Web

- `apps/web/src/lib/api.ts` — tipos e funções de vacina, protocolo, aplicação, agenda, encerramento e reação adversa.
- `apps/web/src/lib/access.ts` — `sectionRoles.vacinacao` de `clinico` para `todos`; helpers `canViewVacinacao`, `canManageVacinacao`, `canManageCatalogoVacinas`, `canAnularAplicacaoVacina`.
- `apps/web/src/lib/nav.ts` — descomentar `vacinacao` com ícone de `lucide-react`.
- `apps/web/src/app/painel/vacinacao/page.tsx` — agenda.
- `apps/web/src/app/painel/vacinacao/vacinas/page.tsx` — catálogo.
- `apps/web/src/components/vacinacao/` — componentes reutilizados pela ficha e pela agenda: seção de vacinação do animal, diálogo de aplicação com o bloco de avisos, diálogo de agendamento, diálogo de encerramento da observação. Mantém as duas páginas de animais fora de mais mil linhas.
- `apps/web/src/app/painel/animais/[id]/page.tsx` e `page.tsx` — montar a seção de vacinação, o filtro e o selo da situação nova, e os tokens `data-[estado=em_observacao_antirrabica]` nos `className` dos selos.

### Contexto

- Ao concluir: `.ai-context/architecture.md` (tabelas, endpoints, fluxo), `.ai-context/short-term.md`, e a lista de situações em `.ai-context/specs/gestao-de-animais.md`.

## Proposta de Abordagem

1. **Módulo próprio, não extensão de `animais`.** Vacinação tem quatro entidades e três superfícies. O serviço de animais já está em 811 linhas. `apps/api/src/vacinacao/` importa `PrismaModule` e `AuthModule` como `animais` faz, e o que é do animal (alertas, eventos, situação) continua em `animais`.
2. **Dois controllers no módulo.** `vacinas.controller.ts` para o catálogo administrativo (`/vacinas`, escrita só `coordenacao`) e `vacinacao.controller.ts` para protocolos, aplicações e agenda (escrita `coordenacao` e `veterinario`). Separar evita um controller com dois regimes de permissão misturados.
3. **Protocolo derivado na leitura, materializado na escrita.** `dosesAplicadas`, `dosesFaltantes`, `dataProximaDose` e `dataMinimaProximaDose` são calculados a partir das aplicações não anuladas, e não guardados como contador que pode dessincronizar. `status` é persistido, porque `interrompido` não é derivável. Toda escrita que mexe em aplicação recalcula o status na mesma transação.
4. **Aplicação adiantada é aviso no front e validação no back.** A resposta de `GET /animais/:id/vacinacao` inclui `dataMinimaProximaDose`, o front avisa sem round-trip, e a API recusa 409 quando recebe aplicação abaixo da data mínima sem `confirmaAdiantada` e `motivoAdiantada`. A regra vive num único lugar no serviço, consultado tanto no registro direto quanto na baixa de agendamento.
5. **Alertas centralizados em `animais`.** `alertas()` em `animais.service.ts` passa a receber os dados de vacinação já carregados e devolve os nove tipos. Isso mantém um só contador na listagem e uma só seção de pendências, como a spec exige. O custo é `animais` passar a depender de dados de vacinação na consulta: resolvido com `include` dos protocolos e eventos na query existente, medido no passo 7.
6. **Reação adversa reaproveita `EventoAnimal`.** Sem tabela nova. A cadeia de desfecho usa `eventoOrigemId` como auto-relação, no mesmo padrão de `ObservacaoAnimal.observacaoOrigemId`, e o desfecho corrente é o evento mais recente da cadeia.
7. **Encerramento da observação antirrábica é endpoint próprio.** São três escritas que precisam suceder juntas: `ObservacaoAnimal`, mudança de situação e limpeza de `observacaoAntirrabicaInicioEm`, mais eventos e auditoria. Fica em `animais`, porque opera o animal.
8. **Ordem: banco, API, alertas, front.** Cada etapa termina com `pnpm typecheck` e o spec da etapa passando, para o erro aparecer perto de onde nasceu.

## Etapas de Implementação

### 1. Persistência de vacinação

- Em `schema.prisma`, criar `Vacina` (`nome`, `nomeNormalizado` único, `especies EspecieAnimal[]`, `totalDoses`, `intervaloDosesDias`, `revacinacaoDias`, `diasAvisoProximaDose` default 7, `idadeMinimaSemanas`, `fabricante`, `viaAplicacaoSugerida`, `obrigatoria`, `observacoes`, `ativa`), `ProtocoloVacinal`, `AplicacaoVacina` e `AgendamentoVacinacao`, com os campos da spec e as relações inversas em `Animal` e `Usuario`.
- Criar `StatusProtocoloVacinal` e `StatusAgendamentoVacinacao`.
- Gerar a migration `gestao_vacinacao` e acrescentar à mão os dois índices únicos parciais:
  - `CREATE UNIQUE INDEX ... ON "aplicacoes_vacinas"("protocoloId", "numeroDose") WHERE "anuladaEm" IS NULL;`
  - `CREATE UNIQUE INDEX ... ON "agendamentos_vacinacao"("animalId", "vacinaId") WHERE "status" = 'agendado';`
- Datas civis (`dataAplicacao`, `validadeLote`, `dataProximaDose`) com `@db.Date`. `dataHoraPrevista` e instantes permanecem `DateTime`.
- Índices de consulta da spec.
- Verificação: `pnpm --filter @zootech/api prisma:migrate`, `prisma generate`, `pnpm --filter @zootech/api typecheck`.

### 2. Persistência das alterações em animais

- Migration separada `situacao_observacao_antirrabica` com os `ALTER TYPE ... ADD VALUE` de `SituacaoAnimal` e `TipoEventoAnimal`, e a criação dos enums de reação. **Nenhum valor de enum novo pode ser referenciado na mesma migration que o acrescenta** — sem `DEFAULT` nem `INSERT` usando esses valores ali.
- `Animal.observacaoAntirrabicaInicioEm DateTime?` com índice por `situacao` e esse campo.
- `EventoAnimal`: `aplicacaoVacinaId Int?`, `eventoOrigemId Int?` (auto-relação nomeada, no molde de `CorrecoesObservacaoAnimal`), `gravidadeReacao`, `desfechoReacao`; índices por `tipo` + `aplicacaoVacinaId` e por `eventoOrigemId`.
- `seedVacinas(prisma)` em `seed.ts` com a antirrábica por `upsert` em `nomeNormalizado`, chamado em `main()` e em `main.ts`.
- Verificação: migrate, generate, typecheck, e `pnpm --filter @zootech/api seed` duas vezes seguidas conferindo que não duplica.

### 3. API do catálogo de vacinas

- `vacinas.controller.ts`: `GET /vacinas`, `GET /vacinas/:id` livres para autenticados; `POST`, `PATCH`, `POST :id/inativar`, `POST :id/reativar` com `@Roles("coordenacao")`. Sem `DELETE`.
- `vacinas.service.ts`: normalização NFC/trim/espaços/caixa igual a `normalizeLookup` de `animais`; validação de pelo menos uma espécie; `intervaloDosesDias` obrigatório quando `totalDoses > 1`; `diasAvisoProximaDose` entre 0 e 365; conflito em nome duplicado; na edição de esquema, devolver a contagem de protocolos em andamento que seguirão com o esquema anterior.
- Auditoria administrativa com `dados.entidade = "vacina"`.
- `vacinas.spec.ts`: quatro perfis, 401, 403 para não-coordenação, duplicidade normalizada, validações numéricas, inativar e reativar, e vacina inativa fora da seleção.
- Verificação: `pnpm --filter @zootech/api test -- vacinas`.

### 4. API de protocolos e aplicações

- `GET /animais/:id/vacinacao`: protocolos com doses aplicadas, faltantes, status, `dataProximaDose`, `dataMinimaProximaDose`, `diasAvisoProximaDose` da vacina, aplicações e agendamento em aberto.
- `POST /animais/:id/vacinacao/aplicacoes`: as sete recusas da spec, mais a condição de adiantamento com `confirmaAdiantada` e `motivoAdiantada`, e os avisos não bloqueantes (idade mínima, reação anterior) devolvidos como dados, não como erro. Cria o protocolo quando não existe, atribui `numeroDose`, calcula `dataProximaDose`, grava evento e auditoria, tudo em uma `$transaction`.
- `PATCH .../aplicacoes/:id` só campos não estruturais. `POST .../aplicacoes/:id/anular` com `@Roles("coordenacao")` e motivo obrigatório, recalculando o protocolo e reabrindo o agendamento de origem.
- `POST .../protocolos/:id/interromper` e `/retomar`.
- `GET /vacinacao/aplicacoes?lote=` com `loteNormalizado` e presença de reação adversa por aplicação.
- Concorrência: capturar a violação do índice único parcial e devolver 409, como `animais` já faz com número de registro.
- `aplicacoes.spec.ts`: espécie incompatível, vacina inativa, dose duplicada, esquema concluído, mesma vacina no mesmo dia, animal terminal, data futura, retroativo com e sem indicador, adiantada sem confirmação (409) e com confirmação (gravada e marcada), reforço adiantado, anulação recalculando protocolo, 403 para agente e recepção, 401, e consulta por lote.
- Verificação: `pnpm --filter @zootech/api test -- aplicacoes`.

### 5. API da agenda

- `GET /vacinacao/agenda` paginada, com filtros de período, vacina, espécie, responsável, estado e busca por animal; atrasados computados na resposta.
- `POST /vacinacao/agendamentos` com o único parcial resolvendo corrida; `PATCH :id` remarca; `POST :id/cancelar` com motivo; `POST :id/falta`; `POST :id/baixa` criando a aplicação e fechando o agendamento na mesma transação, passando pela mesma validação de adiantamento.
- `agenda.spec.ts`: transições válidas e inválidas, duplicidade de agendamento em aberto, remarcação preservando estado, cancelamento sem motivo recusado, baixa transacional, reabertura na anulação, e permissões.
- Verificação: `pnpm --filter @zootech/api test -- agenda`.

### 6. Reação adversa e observação antirrábica em animais

- `create-evento-animal.dto.ts` aceita `reacao_adversa` com `gravidadeReacao` e `desfechoReacao` obrigatórios, `aplicacaoVacinaId` e `eventoOrigemId` opcionais, validando que a aplicação e o evento de origem pertencem àquele animal — o mesmo cuidado que `observar()` já faz com `observacaoOrigemId`.
- Desfecho corrente derivado da cadeia por `eventoOrigemId`, com empate resolvido pelo maior id.
- `criar` e `atualizar` gravam `observacaoAntirrabicaInicioEm` ao entrar na situação e limpam ao sair, inclusive na edição comum e na revogação de estado terminal.
- `POST /animais/:id/encerrar-observacao-antirrabica` com observação final e nova situação obrigatórias, gravando observação, situação, eventos, auditoria e limpeza numa transação, e marcando encerramento antecipado quando dentro dos 10 dias.
- Os quatro DTOs de animais recebem o valor novo de situação nos `@IsIn`.
- Casos em `animais.spec.ts`: entrada e saída da situação, reinício de contagem, encerramento sem campos (recusado) e com campos, encerramento antecipado, reação com e sem aplicação, cadeia de desfecho, reação preservada após anulação da aplicação, e todos os perfis podendo registrar.
- Verificação: `pnpm --filter @zootech/api test -- animais`.

### 7. Alertas

- `alertas()` em `animais.service.ts` ganha os nove tipos, com as mensagens da spec, incluindo a contagem regressiva da observação em data local e a janela de aviso por vacina.
- As queries de `listar` e `obter` passam a carregar protocolos, vacinas e eventos de reação necessários. Medir o custo na listagem paginada antes de fechar a etapa; se o `include` pesar, trocar por consulta agregada separada dentro da mesma transação de leitura.
- Verificação: casos em `animais.spec.ts` cobrindo cada alerta aparecendo e saindo, e conferência manual do tempo da listagem com dados semeados.

### 8. Contrato tipado e permissões no front

- Tipos e funções em `api.ts` no padrão de baias e animais. `SituacaoAnimal` (`api.ts:97` e `:293`) recebe o valor novo.
- `access.ts`: `sectionRoles.vacinacao` para `todos` e os quatro helpers novos.
- `nav.ts`: descomentar `vacinacao` com o ícone `Syringe` de `lucide-react`, conferido como disponível na versão instalada.
- Selo da situação nova: acrescentar o par de tokens `data-[estado=em_observacao_antirrabica]` nos `className` de `animais/page.tsx` e `animais/[id]/page.tsx`, e o rótulo nos mapas `situacaoLabel` das duas páginas, mais o valor nas listas de filtro e nos `Select` de situação.
- Verificação: `pnpm typecheck` e `pnpm lint` na raiz.

### 9. Seção de vacinação na ficha

- Componentes em `components/vacinacao/`: lista de protocolos com doses e estado; diálogo de aplicação com o bloco de avisos (adiantada com `Checkbox` e motivo, idade mínima, reação anterior); reação adversa com gravidade, desfecho e atualização de desfecho; agendamento em aberto; ações por perfil.
- Montar na ficha sem inflar `[id]/page.tsx`.
- Alerta de observação antirrábica com ação abrindo o diálogo de encerramento.
- Verificação: navegador, nos quatro perfis.

### 10. Telas de agenda e catálogo

- `/painel/vacinacao`: lista agrupada por dia, faixa de atrasados, filtros com `Select`, busca, skeleton, dois estados vazios distintos, `?agendamento=<id>` na URL.
- `/painel/vacinacao/vacinas`: catálogo com cadastro e edição para Coordenação, consulta para os demais.
- Verificação: navegador, nos quatro perfis.

### 11. Validação integrada e contexto

- Fluxo completo no navegador: cadastrar vacina, aplicar primeira dose, ver alerta de esquema incompleto, aceitar o agendamento proposto, dar baixa adiantado com motivo, conferir a marcação, registrar reação adversa e atualizar desfecho, anular uma aplicação e ver o agendamento reabrir, colocar animal em observação antirrábica e encerrar com observação final.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` na raiz.
- Atualizar `architecture.md`, `short-term.md` e a lista de situações em `specs/gestao-de-animais.md`.

## Plano de Verificação

- **Por etapa:** o spec de integração da etapa mais `pnpm typecheck`. Nenhuma etapa fecha com teste vermelho.
- **Suíte:** `pnpm test` na raiz. Os specs novos seguem o harness de `animais.spec.ts`: `loadLocalEnv`, Postgres local, usuários nos quatro perfis, dados com sufixo próprio para não colidir entre arquivos.
- **Cobertura mínima exigida:** cada uma das sete recusas da aplicação; adiantada sem e com confirmação; cada transição de agendamento, válida e inválida; anulação recalculando protocolo e reabrindo agendamento; cadeia de desfecho da reação; contagem e encerramento da observação antirrábica; os nove alertas aparecendo e saindo; 401 em todos os endpoints e 403 por perfil em cada operação restrita.
- **Concorrência:** teste disparando duas aplicações da mesma dose em paralelo e dois agendamentos do mesmo par, confirmando uma gravação e um 409.
- **Idempotência do seed:** rodar duas vezes e conferir que não duplica nem sobrescreve vacina cadastrada à mão.
- **Manual:** o fluxo da etapa 11, nos quatro perfis, em viewport de desktop e de tablet.
- **Regressão:** a suíte de animais e de baias precisa continuar verde depois das mudanças em `alertas()` e nos DTOs.

## Riscos e Casos de Borda

- **Valor de enum novo usado na mesma migration.** `compose.yaml` fixa `postgres:17`, então `ALTER TYPE ... ADD VALUE` roda dentro da transação que o Prisma abre, e a migration separada é escolha de revisão, não necessidade. O que continua valendo em qualquer versão: o valor acrescentado **não pode ser referenciado antes do commit**. Uma migration que acrescente `em_observacao_antirrabica` e no mesmo arquivo crie coluna com `DEFAULT` nesse valor falha. Manter os `ALTER TYPE` sem uso no mesmo arquivo resolve.
- **Índice único parcial escrito à mão.** Prisma não o declara, então `prisma migrate dev` não o recria se alguém regenerar a migration. Documentar no arquivo SQL com comentário e cobrir com o teste de concorrência, que falha alto se o índice desaparecer.
- **Peso da listagem de animais.** Os alertas de vacinação obrigam carregar protocolos na listagem paginada. É o risco de performance mais provável deste plano. Medir na etapa 7 com volume semeado; se pesar, agregar por consulta separada em vez de `include`.
- **Regressão nos alertas existentes.** `alertas()` alimenta o contador da listagem, que já tem teste. Acrescentar tipos sem quebrar os cinco existentes exige rodar a suíte de animais a cada mudança.
- **Enums de gravidade e desfecho sem aval clínico.** Alterar valor de enum em Postgres depois é caro. Os valores são proposta da spec. Pendência aberta; ver Open Questions.
- **Data civil versus instante.** Misturar `@db.Date` e `DateTime` é fonte clássica de erro de um dia. A contagem de dias da observação e do atraso é feita em data local, deliberadamente, para "faltam 6 dias" bater com o calendário. Cobrir com teste em torno da virada de dia.
- **Tamanho das páginas de animais.** `[id]/page.tsx` já tem 1393 linhas. Se a seção de vacinação entrar inline, o arquivo fica inviável. Os componentes em `components/vacinacao/` não são preferência de estilo, são condição para a etapa 9 não travar.
- **Selos de situação por variante Tailwind.** Os `data-[estado=...]` são escritos à mão em `className` longos nas duas páginas. Esquecer um par de tokens deixa o selo sem cor e sem erro de compilação. Conferir visualmente nas duas telas.
- **Aviso recalculado no cliente.** A confirmação de adiantada precisa ser zerada quando a pessoa muda vacina ou data e a condição deixa de valer, senão alguém confirma um adiantamento que não existe mais. A API não aceita a marcação quando a condição não se aplica.
- **Vacina inativada com agendamento em aberto.** A baixa continua permitida e a criação de novo agendamento não. Caso fácil de implementar errado nos dois sentidos.

## Perguntas Técnicas Abertas

1. **Valores de `GravidadeReacaoAdversa` e `DesfechoReacaoAdversa`** são proposta da spec e precisam do aval do veterinário responsável antes da etapa 2. Não bloqueia as etapas 1, 3, 4 e 5. Se o aval demorar, a alternativa é começar por elas e fechar os enums depois.
2. **`especies EspecieAnimal[]` como lista escalar** é suportado em Postgres pelo Prisma, mas não permite restrição de integridade nem consulta indexada por espécie. A alternativa é tabela de junção `VacinaEspecie`. Assumido lista escalar por simplicidade, dado que o catálogo é pequeno e a filtragem por espécie acontece sobre poucas linhas. Revisar se o catálogo crescer.
3. **`GET /animais/:id/vacinacao` separado ou embutido** no detalhe do animal. Assumido separado, para não engordar mais a resposta de `obter`. Confirmar na etapa 4 se o front acaba pedindo os dois sempre juntos; nesse caso vale embutir.
4. **Rota do catálogo como subrota de vacinação** (`/painel/vacinacao/vacinas`) ou seção administrativa própria. Assumido subrota, mas isso a coloca sob o item de menu de vacinação, que é operacional. Decidir na etapa 10.

## Definição de Pronto

- As quatro entidades de vacinação persistidas, com os dois índices únicos parciais aplicados e cobertos por teste de concorrência.
- `SituacaoAnimal` com `em_observacao_antirrabica` propagado por schema, DTOs, contrato do front, filtros, rótulos e selos.
- As sete recusas da aplicação e o fluxo de adiantada com confirmação e motivo implementados na API e cobertos por teste, incluindo o 409 quando a interface é ignorada.
- Agenda com as quatro transições, remarcação, baixa transacional e reabertura na anulação, coberta por teste.
- Reação adversa com gravidade, desfecho, cadeia de atualização e aviso na aplicação seguinte.
- Observação antirrábica com contagem regressiva, alerta que vira pendência ao vencer e encerramento transacional exigindo observação final e nova situação.
- Os nove alertas na seção de pendências e no contador da listagem, sem mecanismo paralelo.
- Nenhum endpoint de exclusão de vacina, aplicação ou animal.
- Escrita restrita conforme a tabela de permissões da spec, verificada na API e refletida na interface; consulta liberada aos quatro perfis.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passando na raiz.
- Fluxo da etapa 11 exercido no navegador nos quatro perfis.
- `.ai-context/architecture.md`, `.ai-context/short-term.md` e a lista de situações em `.ai-context/specs/gestao-de-animais.md` atualizados.
