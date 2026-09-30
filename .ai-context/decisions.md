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

**Status:** Superseded

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

## 2026-09-23 — Nenhuma tela antes da identidade visual

**Status:** Accepted

**Context:** O bootstrap do monorepo é o próximo código, e o front ainda não tem direção visual.

**Decision:** O front do bootstrap não tem tela, layout, componente, estilo nem cópia de produto. A identidade visual será definida antes de qualquer interface. A API desse marco expõe somente `GET /health`.

**Rationale:** Confirmado pelo autor. A interface espera a identidade visual.

**Consequences:** A spec do bootstrap está em `.ai-context/specs/bootstrap-monorepo.md`. Biblioteca de UI, ORM e domínio ficam fora desse marco. A spec do painel ADM não começa pelas telas.

## 2026-09-23 — O guia visual do CCZ é a referência da identidade

**Status:** Accepted

**Context:** A identidade visual ainda não existia, e o autor enviou o guia HTML gerado para o protótipo do CCZ.

**Decision:** Esse guia é vinculante. A direção recomendada (saúde pública, verde-petróleo, âmbar de vacina, Bricolage Grotesque, Figtree, IBM Plex Mono) vale. As alternativas gov.br e ardósia/menta não foram escolhidas. O nome visível é só ZooTech. Não há brasão; o escudo provisório não vira brasão municipal.

**Rationale:** Confirmado pelo autor em 2026-09-23: a identidade serve a equipe do CCZ, o ADM é o primeiro usuário entregue, o nome na interface é ZooTech, e não se inventa brasão.

**Consequences:** `PRODUCT.md` guarda o contexto. `DESIGN.md` registra a direção construída no login e na casca do painel. O âmbar não é cor geral de botão: fica no escudo provisório.

## 2026-09-24 — Interface do web usa shadcn

**Status:** Superseded

**Context:** O front já tem identidade visual e controles desenhados à mão no login e na casca.

**Decision:** A interface em `apps/web` usa componentes shadcn/ui, tematizados com `DESIGN.md`. A regra está em `.cursor/rules/shadcn-components.mdc`. A API não usa essa biblioteca.

**Rationale:** Confirmado pelo autor.

**Consequences:** Substituída em 2026-09-25: o contrato passou a incluir Tailwind no `className` e a valer também em `AGENTS.md`.

## 2026-09-25 — Interface do web usa shadcn e Tailwind

**Status:** Accepted

**Context:** Telas de baias e animais ganharam classes de feature em `globals.css`. O autor pediu Tailwind no projeto todo, shadcn nos controles, e que a regra valesse fora do Cursor (Codex lê `AGENTS.md`).

**Decision:** Controles prontos vêm do shadcn em `apps/web/src/components/ui`. Layout, grid e estado visual usam Tailwind no `className`. Não criar classes de feature em `globals.css`. O tema continua `DESIGN.md`. A mesma regra está em `AGENTS.md` e em `.cursor/rules/shadcn-components.mdc`. A API não usa essa biblioteca.

**Rationale:** Confirmado pelo autor.

**Consequences:** `globals.css` fica com tokens, base e tema. Peça nova entra pelo CLI do shadcn em `apps/web`. Codex e outros agentes que seguem `AGENTS.md` recebem o mesmo contrato.

## 2026-09-23 — Reset onto the agentic workflow

**Status:** Accepted

**Context:** O repo tinha um bootstrap Speckit e o workflow agêntico foi colocado por cima.

**Decision:** Remover da árvore de trabalho o monorepo anterior, Speckit, Impeccable e as specs `001` e `002`. Manter o workflow e `.ai-context/`.

**Rationale:** O workflow novo é o ponto de partida.

**Consequences:** O histórico Git ainda contém a árvore antiga até um commit registrar o reset.

## 2026-09-24 — Só a coordenação aceita acesso e troca tipo

**Status:** Accepted

**Context:** O pedido de acesso já existe na tela de login, sem fila nem papel gravado. Faltava dizer quem aceita o servidor novo e quem pode mudar a função depois.

**Decision:** Só o perfil `coordenacao` aceita ou recusa a solicitação e escolhe a função nesse aceite. Só `coordenacao` troca o `perfilAcesso` de um usuário já ativo. Veterinário, agente e recepção não aceitam nem trocam tipo. A pessoa não altera a própria função no perfil.

**Rationale:** Confirmado pelo autor em 2026-09-24.

**Consequences:** A fila e a troca de tipo ficam em `/painel/acessos`. A spec está em `.ai-context/specs/autenticacao-jwt-rbac.md`. Desativar conta e editar CPF ou matrícula de outra pessoa continuam fora deste marco.

## 2026-09-24 — Auth usa Prisma, menus iguais e sem e-mail

**Status:** Accepted

**Context:** O plano de autenticação deixou três assunções em aberto: o ORM, se agente e recepção veem seções diferentes, e se o aceite avisa por e-mail.

**Decision:** O acesso ao Postgres deste marco é Prisma. `agente` e `recepcao` visualizam as mesmas seções do funcionário. Não há e-mail transacional. Aceite, recusa e troca de tipo aparecem quando a pessoa entra ou usa o painel.

**Rationale:** Confirmado pelo autor em 2026-09-24. Um mapa de seções diferente, no futuro, altera só o mapa e o guard.

**Consequences:** O plano está em `.ai-context/plans/autenticacao-jwt-rbac.md`. As tarefas estão em `.ai-context/tasks/autenticacao-jwt-rbac.md`.


## 2026-09-24 — Animal pode ficar sem baia e todos os perfis gerem ficha

**Status:** Accepted

**Context:** A gestão de baias pressupunha ocupação obrigatória, mas animais podem sair temporariamente para tratamento. Faltava definir acesso ao CRUD de animais.

**Decision:** Animal ocupa zero ou uma baia. Ficha e listagem destacam “Sem baia” e oferecem ação para alocar/readequar. Todos os perfis autenticados podem consultar, criar e editar animais. Situações iniciais: em tratamento, em quarentena/observação, saudável, adotado e óbito. Espécies iniciais: cão e gato. Ações clínicas registráveis: vacinação, castração, exame e diagnóstico. Histórico do animal é auditável por perfil autorizado a ver animais.

**Rationale:** Confirmado pelo autor em 2026-09-24.

**Consequences:** Atualizar `.ai-context/specs/gestao-de-baias.md` para cardinalidade opcional. Regras de dados, fotos, cadastro e histórico ficam em `.ai-context/specs/gestao-de-animais.md`.


## 2026-09-24 — Catálogo padrão de raças

**Status:** Accepted

**Context:** Spec de gestão de animais precisava de catálogo de seed para cães e gatos.

**Decision:** Usar as listas de cães e gatos informadas pelo autor em `.ai-context/specs/gestao-de-animais.md`, incluindo SRD, Outra e Não Informada. “Outra” permite cadastrar opção personalizada reutilizável por espécie; “Não Informada” representa raça desconhecida.

**Rationale:** Lista e semântica das opções confirmadas pelo autor em 2026-09-24.

**Consequences:** Seed deve ser idempotente e preservar raças personalizadas.


## 2026-09-24 — Pendências, fotos e estados terminais de animais

**Status:** Accepted

**Context:** Revisão da spec de gestão de animais esclareceu validação de dados faltantes, tratamento de fotos e preservação dos registros.

**Decision:** Sexo pode ser não informado e gera alerta na ficha e listagem, junto de raça não informada, idade aproximada, castração não informada e ausência de baia. Cada animal aceita até 10 fotos quadradas; formatos JPEG/JPG, PNG e WebP; arquivos acima de 5 MB são comprimidos. Remoção de foto pede confirmação. Registro de animal nunca é deletado. Situações adotado/óbito são somente leitura e não aparecem na listagem padrão; Coordenação pode revogá-las por erro com motivo obrigatório e trilha auditável. CRUD de vacinação, castração e adoção ficam para módulos posteriores.

**Rationale:** Confirmado pelo autor em 2026-09-24.

**Consequences:** Regras completas em `.ai-context/specs/gestao-de-animais.md`; API não terá exclusão de animal. Próximos módulos de vacinação devem incluir lote, dose e aplicador.


## 2026-09-24 — Decisões técnicas para ficha e fotos de animais

**Status:** Accepted

**Context:** O plano de gestão de animais tinha decisões técnicas abertas para rota da ficha, processamento de imagens, retenção e normalização de raças.

**Decision:** Ficha usa `/painel/animais/[id]`; regra de URL será atualizada durante implementação para permitir rota segmentada dedicada. Fotos são cortadas em quadrado, limitadas a 1200×1200 px e, se fonte exceder 5 MB, convertidas para WebP com qualidade inicial 85, reduzida até 70 para caber abaixo de 5 MB. Persistir enquanto animal existir; remover apenas fotos removidas ou órfãs. Raças personalizadas são normalizadas com Unicode NFC, trim, colapso de espaços e comparação case-insensitive.

**Rationale:** Recomendações técnicas aceitas pelo autor em 2026-09-24.

**Consequences:** Detalhes estão em `.ai-context/plans/gestao-de-animais.md` e `.ai-context/specs/gestao-de-animais.md`. Critério de elegibilidade para isolamento segue pendente de esclarecimento.


## 2026-09-24 — Elegibilidade explícita para isolamento

**Status:** Accepted

**Context:** Baias exclusivas para isolamento precisam de critério verificável ao alocar animais.

**Decision:** `Animal.emIsolamento` é indicador clínico explícito, separado da situação geral do animal. Baia exclusiva aceita apenas animais com o indicador ativo. Alterações e alocações são auditáveis.

**Rationale:** Recomendação técnica aceita pelo autor em 2026-09-24.

**Consequences:** Regras alinhadas em `.ai-context/specs/gestao-de-animais.md` e `.ai-context/specs/gestao-de-baias.md`; integração valida o campo no backend em transação.


## 2026-09-24 — Modelo físico inicial de animais

**Status:** Accepted

**Context:** A task 1 de gestão de animais precisava criar persistência antes do CRUD e ainda representar dados desconhecidos sem inventar valores.

**Decision:** Usar enums Prisma para espécie, sexo, porte, situação, castração, unidade de idade e tipo de evento. `Animal` guarda número de registro textual e chave normalizada única; `baiaId`, `racaId`, datas, idade estimada e autor são opcionais para suportar pendência/importação sem dados falsos. Raças ficam em `RacaAnimal` com chave única por espécie + nome normalizado. Fotos, pesagens, observações e eventos ficam em tabelas próprias; observações e eventos são append-only no modelo da aplicação.

**Rationale:** Esse desenho acompanhou a spec inicial sem antecipar vacinação, castração ou adoção e preparou a integração com baias e timeline auditável. Castração foi posteriormente materializada em `CastracaoAnimal`.

**Consequences:** Migration `20260924180000_gestao_animais` cria as tabelas e constraints básicas. A aplicação ainda precisa validar coerência espécie/raça, obrigatoriedade de campos mínimos, estados terminais e ausência de exclusão no módulo `animais`.


## 2026-09-24 — Fotos locais de animais usam sharp e raiz gerenciada

**Status:** Accepted

**Context:** A task 5 de gestão de animais precisava escolher biblioteca de processamento e uma estratégia segura para armazenar, servir e remover arquivos locais.

**Decision:** Usar `sharp` na API para validar formato real, cortar em quadrado, limitar a 1200×1200 px e gerar WebP. A raiz de mídia é configurável por `ZOOTECH_MEDIA_ROOT` ou `MEDIA_ROOT`, com padrão `storage/media`. O servidor gera nomes aleatórios, persiste somente metadados/caminho interno em `FotoAnimal`, devolve uma URL controlada e bloqueia leitura/remoção fora da raiz gerenciada. O limite de 10 fotos por animal é verificado em transação com lock do animal.

**Rationale:** `sharp` é mantido, rápido e cobre os formatos exigidos sem serviço externo. Raiz gerenciada evita path traversal e mantém a decisão de MVP sem storage de terceiros.

**Consequences:** Fotos são servidas por `GET /animais/:id/fotos/:fotoId/arquivo` e removidas por `DELETE /animais/:id/fotos/:fotoId`; não há exposição de caminho local na resposta. Falha de banco após escrita limpa o arquivo salvo, e remoção apaga o arquivo apenas quando não há outra referência.

## 2026-09-24 — Recorte de foto no cliente e caminho relativo na API

**Status:** Accepted

**Context:** A galeria quebrava quando a API subia de outro `cwd`, porque `FotoAnimal.caminhoAbsoluto` guardava path absoluto. O crop no servidor também recentralizava um recorte que o usuário já definia na tela.

**Decision:** O front recorta em quadrado com `react-easy-crop` antes do upload. A API valida formato e quadrado, redimensiona/comprime sem `fit: "cover"` e grava caminho relativo `animais/{id}/{uuid}.webp`, resolvido a partir de `apps/api/storage/media`. Fotos antigas com path absoluto sob essa raiz são convertidas pela migration `20260924220000_foto_caminho_relativo`.

**Rationale:** Caminho relativo sobrevive a mudanças de diretório de execução. Recusar foto não quadrada preserva o recorte escolhido pelo usuário.

**Consequences:** Clientes da API que enviarem imagem retangular recebem 400. A URL pública continua sendo a rota autenticada `/animais/:id/fotos/:fotoId/arquivo`.

## 2026-09-25 — Vacinação é módulo próprio ligado ao animal, com agenda de agendamentos

**Status:** Accepted

**Context:** O sistema não tinha nenhum campo de vacinação. O animal chega da rua sem carteira e sem histórico, e o risco operacional é vacinar errado, vacinar duas vezes com a mesma vacina ou deixar o esquema de doses parar no meio. O diagrama de classes coloca `RegistroVacina` dentro de `Prontuario`, mas prontuário ainda não existe no código.

**Decision:** Quatro escolhas confirmadas pelo autor em 2026-09-25:

1. A aplicação de vacina fica ligada diretamente ao `Animal`, em módulo autônomo, com `prontuarioId` nulo e reservado para quando o prontuário existir. Não bloquear vacinação esperando prontuário.
2. A agenda é agendamento real, com entidade `AgendamentoVacinacao` e estados `agendado`, `aplicado`, `faltou` e `cancelado`, mais remarcação. Não é só uma lista derivada de datas de próxima dose.
3. O catálogo de vacinas não controla estoque. Vacina guarda nome, espécies aplicáveis, total de doses, intervalo entre doses e intervalo de revacinação. Lote e validade são texto e data informados na aplicação, apenas para rastreabilidade.
4. Consultar vacinação é liberado a todos os perfis autenticados. Registrar, editar, agendar e operar é clínico (`coordenacao` e `veterinario`). Anular aplicação e manter o catálogo são exclusivos da `coordenacao`.

Complementos assumidos e registrados na spec: `ProtocoloVacinal` por par animal e vacina guarda a fotografia do esquema no momento da criação, para as doses faltantes não mudarem quando o catálogo mudar; aplicação nunca é excluída nem tem campo estrutural editado, a correção é anulação motivada mais novo registro; a recusa por intervalo mínimo admite exceção clínica com motivo obrigatório, marcada no registro e na auditoria.

**Rationale:** Ligar ao animal entrega o controle pedido sem arrastar o prontuário inteiro para este escopo. Agendamento real é o que dá o lembrete operacional na sala de vacina, que uma lista calculada não dá. Deixar estoque fora mantém o escopo entregável e coerente com o MVP sem integrações. A separação entre consulta ampla e escrita clínica repete o padrão já validado em baias.

**Consequences:** Spec em `.ai-context/specs/gestao-de-vacinacao.md`. Modelos novos `Vacina`, `ProtocoloVacinal`, `AplicacaoVacina` e `AgendamentoVacinacao`; enums `StatusProtocoloVacinal` e `StatusAgendamentoVacinacao`; `TipoEventoAnimal` ganha os eventos de vacinação e de agenda. A migration precisa de dois índices únicos parciais em SQL, porque Prisma não os declara. `sectionRoles.vacinacao` em `apps/web/src/lib/access.ts` passa de `clinico` para `todos`, com a escrita restrita por `canManageVacinacao`. O item `vacinacao` de `nav.ts` é descomentado. Campanha de vacinação, estoque com saldo e reação adversa como entidade própria ficam fora e seguem como próximos passos. O catálogo inicial de vacinas é proposta e precisa do aval do veterinário responsável antes de virar seed.

## 2026-09-25 — Perguntas abertas da vacinação resolvidas

**Status:** Accepted

**Context:** A spec de vacinação nasceu com sete perguntas abertas. O autor respondeu todas na mesma data. Três respostas mudaram mecanismo, não só configuração.

**Decision:**

1. **Catálogo inicial:** o seed entra somente com a antirrábica. As demais vacinas são cadastradas pela Coordenação na tela, porque doses, intervalos e idades mínimas são decisão clínica e não entram como dado semeado sem aval do veterinário responsável.
2. **Janela de "dose a vencer":** configurável por vacina, em `Vacina.diasAvisoProximaDose`, com padrão 7 dias e valor 0 desligando o aviso antecipado. Esse campo não é fotografado no protocolo: mudar a janela muda o aviso de todos os animais daquela vacina na hora, porque é preferência de operação e não parte do esquema clínico.
3. **Dose adiantada deixa de ser recusa e reenvio.** O sistema avisa **antes** de aplicar, com bloco inline no formulário que mostra a data da última dose, o intervalo previsto, a data a partir da qual a dose seria regular e os dias faltantes. A pessoa marca confirmação explícita e informa motivo; a decisão fica gravada na aplicação, no evento e na auditoria, com os dias de antecipação. A API continua recusando com 409 quando recebe aplicação adiantada sem o par confirmação mais motivo, porque não confia na interface. Para isso, a consulta do protocolo passa a devolver a data mínima da próxima dose, permitindo o aviso sem ida e volta ao servidor. Segue liberado a veterinário e Coordenação, sem restringir só ao veterinário.
4. **Campanha de vacinação:** fora do escopo, confirmado.
5. **Estoque com saldo de lote:** fora do MVP, confirmado.
6. **Reação adversa pós-vacinal:** entra como evento da ficha do animal, junto de exame e diagnóstico, com `TipoEventoAnimal.reacao_adversa` e `EventoAnimal.aplicacaoVacinaId` como referência opcional à aplicação que a originou. Sem entidade nem fluxo próprio. Registrável por todos os perfis autenticados, coerente com a regra de eventos de animais, porque quem percebe a reação no canil costuma ser o agente. A consulta por lote informa presença de reação por aplicação.
7. **Observação antirrábica:** `SituacaoAnimal` recebe `em_observacao_antirrabica`, coexistindo com `em_quarentena_observacao`. `Animal.observacaoAntirrabicaInicioEm` grava o início na entrada e é limpo na saída; recolocar o animal reinicia a contagem. Durante os 10 dias corridos, alerta informativo com dia decorrido sobre 10 e data de encerramento. Passados os 10 dias sem mudança de situação, o alerta vira pendência de ação e não expira sozinho.

**Rationale:** Avisar antes de aplicar é o que resolve o problema real: quem está com a seringa na mão precisa decidir informado, não descobrir o bloqueio depois de enviar. Manter o motivo obrigatório preserva o valor do histórico, que era o propósito de gravar a decisão. Reação adversa como evento reaproveita um mecanismo que já existe e já é auditável, em vez de criar farmacovigilância inteira. A situação antirrábica separada da observação geral dá prazo e desfecho próprios ao protocolo de 10 dias, que hoje é controlado de cabeça.

**Consequences:** Esta spec deixa de ser contida no módulo de vacinação. Ela altera gestão de animais em três pontos: lista de situações, eventos simples da ficha e seção de alertas. Pontos de código mapeados: `apps/api/prisma/schema.prisma:69`, os quatro DTOs em `apps/api/src/animais/dto/`, `apps/web/src/lib/api.ts:97` e `:293`, `apps/web/src/app/painel/animais/page.tsx:69` e `:93`, e `apps/web/src/app/painel/animais/[id]/page.tsx:93`, `:586` e `:1117`. Os selos de situação usam variantes Tailwind `data-[estado=...]` nos `className` dessas páginas, então o valor novo precisa de par de tokens próprio. A migration precisa isolar o `ALTER TYPE ... ADD VALUE` do enum de situação, que não roda dentro de bloco transacional em Postgres mais antigo. A lista de situações em `.ai-context/specs/gestao-de-animais.md` precisa ser atualizada quando isto for implementado. Cinco perguntas novas ficaram abertas, a mais relevante sendo se aplicar antirrábica em animal sob observação antirrábica deve ser bloqueado — a spec não bloqueia, por ser regra clínica.

## 2026-09-25 — Reação adversa acompanhável e encerramento obrigatório da observação antirrábica

**Status:** Accepted

**Context:** As cinco perguntas que restaram da spec de vacinação foram respondidas no mesmo dia. Duas mudaram conteúdo; três confirmaram o que já estava escrito.

**Decision:**

1. **Bloquear antirrábica durante observação antirrábica: não.** Nenhuma situação do animal impede aplicar vacina. A spec nunca bloqueou; fica confirmado que não deve bloquear.
2. **Os 10 dias são fixos no código.** Sem parâmetro de sistema e sem variação por animal.
3. **Alerta da observação antirrábica:** durante o período, mostra **quantos dias faltam** para o fim, mais a data de encerramento, e no último dia diz "encerra hoje". Ao vencer, deixa de ser informativo e passa a pedir a observação final. A ação abre `Encerrar observação antirrábica`, um diálogo com dois campos obrigatórios: a observação final em texto e a nova situação do animal. Confirmar grava observação, mudança de situação, eventos e auditoria em uma transação, e limpa o início do período. Novo endpoint `POST /animais/:id/encerrar-observacao-antirrabica`, justificado por serem três escritas que precisam suceder juntas. Encerrar antes dos 10 dias é permitido pelo mesmo caminho e o evento registra que foi antecipado.
4. **Reação adversa ganha gravidade e desfecho.** Gravidade obrigatória em `leve`, `moderada` e `grave`. Desfecho obrigatório em `em acompanhamento`, `resolvida`, `resolvida com sequela` e `óbito`, começando em `em acompanhamento`. Como o evento é imutável, a atualização de desfecho é **novo evento** `reacao_adversa` que referencia o original por `EventoAnimal.eventoOrigemId`, na mesma forma que `ObservacaoAnimal.observacaoOrigemId` já usa para correção. O desfecho corrente é o do evento mais recente da cadeia.
5. **Indicador do painel conta o CCZ inteiro**, não só os animais de quem está logado.

Assumido e registrado na spec, para a gravidade não virar dado morto: uma reação adversa com desfecho ainda `em acompanhamento` gera alerta próprio na ficha e na listagem; e ao preencher nova aplicação de uma vacina para a qual aquele animal já tem reação registrada, o formulário avisa antes do envio, com gravidade, desfecho e data. É aviso, nunca bloqueio, pelo mesmo princípio da aplicação adiantada. Desfecho `óbito` na reação não muda a situação do animal: a interface oferece o atalho, a mudança continua explícita e separada.

**Rationale:** Cobrar a observação final ao vencer o prazo é o que faz o controle dos 10 dias valer como registro sanitário; um período que termina sem conclusão escrita não serve para nada depois. Atualizar desfecho por evento novo preserva a imutabilidade do histórico que o projeto já adota em toda parte, em vez de abrir exceção. Avisar na próxima aplicação é o que transforma gravidade em informação útil no momento da decisão, seguindo o padrão de "avise antes, não bloqueie" que o autor estabeleceu para a dose adiantada.

**Consequences:** `EventoAnimal` passa a ter `aplicacaoVacinaId`, `eventoOrigemId` (auto-relação), `gravidadeReacao` e `desfechoReacao`. Enums novos `GravidadeReacaoAdversa` e `DesfechoReacaoAdversa`. `TipoEventoAnimal` ganha `reacao_adversa` e `encerramento_observacao_antirrabica`. Índices por `tipo` e `aplicacaoVacinaId` e por `eventoOrigemId`, para a cadeia de desfecho e o alerta não varrerem a tabela. Os alertas passam de oito para nove, e a spec tem 51 critérios de aceitação. Os valores dos dois enums novos são proposta deste documento e precisam do aval do veterinário responsável antes de ir ao banco, porque enum em Postgres é caro de alterar depois — mesma cautela já aplicada ao catálogo de vacinas. Todas as doze perguntas abertas estão resolvidas; nada bloqueia começar o plano técnico.

## 2026-09-26 — Situação `adotado` vinculada ao registro de adoção

**Context:** A situação `adotado` já existe no cadastro de animais, mas o módulo de tutores e adoção ainda não existe. O CCZ precisa identificar a pessoa física que leva o animal e registrar seu aceite dos termos.

**Decision:** `adotado` sai da opção manual de situação. A ficha do animal inicia o registro de adoção; somente sua conclusão com tutor cadastrado, dois switches de ciência/concordância ativados e assinatura desenhada pelo tutor com mouse ou toque altera a situação para `adotado`. O funcionário comunica os termos ao tutor fora do sistema; o sistema não cadastra, exibe nem versiona seu texto, apenas registra as declarações e a assinatura. O tutor informa dados pessoais, endereço e documento de identificação; foto pessoal e até três fotos da documentação são opcionais. Fotos documentais ficam guardadas sem prazo de expiração. Animal saudável é elegível; outros estados operacionais exigem liberação expressa por veterinário ou Coordenação. Todos os perfis autenticados do CCZ podem cadastrar e consultar tutores, concluir adoções e registrar devoluções. Adoção confirmada não pode ser revogada; para retornar o animal ao CCZ e permitir outra adoção, é obrigatório registrar devolução. A conclusão mostra aviso explícito dessa regra.

**Consequences:** Cadastro/edição genéricos de animais e API devem impedir a transição manual e a revogação genérica de `adotado`. Adoção e devolução precisam atualizar vínculo de guarda, situação, baia e auditoria de forma atômica. O animal pode ter várias adoções históricas, mas apenas uma ativa. Registros antigos `adotado` sem adoção precisam de tratamento antes de impor a nova regra. O registro comprova a declaração de ciência/concordância feita no sistema, sem identificar qual texto foi comunicado pelo funcionário.

## 2026-09-25 — Castração sai do campo isolado e vira histórico

**Status:** Accepted

**Context:** O módulo de castrações precisa preservar status legados sem inventar datas e permitir agenda, cancelamentos preservados e histórico por animal.

**Decision:** Remover `Animal.castrado` do schema e representar o status por registros em `CastracaoAnimal`. O registro pode ser avaliação (`nao_castrado`) ou procedimento (`agendada`, `realizada`, `cancelada`), com origem `fluxo` ou `legada`, data/hora planejada opcional, data efetiva opcional com indicador de hora conhecida, data de avaliação, observação, motivo de cancelamento e autor. A migration converte `sim` em procedimento legado realizado sem data, `nao` em avaliação legada “Não castrado” e `nao_informado` em ausência de registro.

**Rationale:** Ausência de informação não deve significar “não castrado”, e dados legados não devem criar cirurgias ou datas fictícias. Tentativas canceladas precisam permanecer no histórico.

**Consequences:** Índices parciais PostgreSQL garantem no máximo um agendamento ativo e no máximo um procedimento realizado por animal. A API de animais expõe rotas de castração para consulta, avaliação “não castrado”, registro realizado legado, agendamento, reagendamento, conclusão e cancelamento; cada mudança grava timeline `castracao` e `AuditoriaEvento` atomicamente. A API de animais expõe `estadoCastracao` derivado com precedência realizada → agendada → não castrado → cancelada → não informado. A criação, edição e listagem de animais não aceitam mais o enum `castrado`; a migração preserva seus valores anteriores em registros históricos. A ficha permite operar o módulo e consultar autoria, datas e observações.
