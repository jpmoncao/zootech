# Glossary

## Terms

### CCZ

Centro de Controle de Zoonoses. Instituição que o ZooTech gere.

### Identidade visual

Direção visual do ZooTech, registrada em `DESIGN.md`. O guia em `/Users/jpmoncao/Downloads/Guia Visual CCZ.html` é a referência (verde-petróleo, âmbar só no escudo provisório, Bricolage Grotesque, Figtree, IBM Plex Mono). O nome visível é só ZooTech. Não há brasão municipal. A primeira superfície é o login e a casca do painel.

### Tons de informação

Cor identifica o status. Na mesma tela, cada status reconhecível tem uma cor só, para a pessoa ver a cor e saber do que se trata. O rótulo permanece. O mapa vive em `DESIGN.md` (Status). Tokens em `apps/web/src/app/globals.css`.

- Petróleo (`--primary`): identidade, navegação e ação principal. Não classifica estado.
- Verde (`--ok`): ativa, liberada, reativada, concluída.
- Azul (`--info`): higienização.
- Vermelho (`--crit`): interditada, erro.
- Cinza (`--muted`): inativa.
- Âmbar (`--warn`): pendência que ainda não tem tom próprio. Não é o âmbar do escudo.

Na baia, o estado operacional usa verde para ativa, azul para higienização, vermelho para interditada e cinza para inativa.

### ADM

Veterinário administrador. No painel, executa todas as funcionalidades do sistema, cadastra e gere usuários e funcionários, e consulta a auditoria. Não há classe própria: o acesso fica em `Usuario.perfilAcesso`. Na interface, esse papel se chama Coordenação (`coordenacao`). Só ele aceita solicitações de acesso e troca o tipo de um usuário já ativo.

### Veterinário

Ator clínico do CCZ. No diagrama, é um `Funcionario` com `crmv` e cargo, não uma subclasse separada. Needs confirmation.

### Funcionário

Pessoa do CCZ representada por `Funcionario` (`matricula`, `cargo`, `crmv`), herdeira de `Usuario`. No caso de uso, o funcionário opera cadastro, acolhimento, fila de castração, adoção e relatórios.

### Tutor

Pessoa física responsável pelo animal durante uma adoção ativa. Informa dados pessoais, endereço e documento; foto pessoal e até três fotos documentais são opcionais. O diagrama original o faz herdar de `Usuario`, mas o cadastro de tutor desta spec não pressupõe login nem perfil de acesso. O animal entra no CCZ sem tutor e perde o vínculo de guarda atual quando uma devolução é registrada.

### Animal

Animal acompanhado pelo CCZ: identificação, fotos, espécie/raça, características, situação, indicador clínico independente `emIsolamento`, cuidados e histórico auditável. Pode ocupar zero ou uma baia; sem baia deve ficar destacado para readequação. Nasce sem tutor; tutor entra na adoção. Situações: em tratamento, em quarentena/observação, em observação antirrábica, saudável, adotado e óbito.

### Foto do animal

Imagem da galeria do animal. O recorte quadrado acontece no front; a API aceita JPEG/JPG, PNG e WebP já recortados, valida o quadrado, gera saída WebP até 1200×1200 px, comprime para até 5 MB e limita a 10 fotos por animal. Arquivos ficam em `apps/api/storage/media` (ou `ZOOTECH_MEDIA_ROOT`/`MEDIA_ROOT`) com caminho relativo `animais/{id}/{uuid}.webp` e são servidos por rota controlada, sem expor o path no JSON.

### Raça do animal

Catálogo por espécie (`cao` ou `gato`) com nome de exibição e nome normalizado em Unicode NFC, trim, espaços colapsados e comparação sem distinção de caixa. O seed padrão cria 59 entradas entre cães e gatos, incluindo SRD, Outra e Não Informada, sem remover raças personalizadas.

### Baia

Local que abriga zero ou mais animais. Cada animal ocupa zero ou uma baia e pode ser alocado, transferido ou ficar sem baia durante tratamento. O cadastro persiste código único sem distinção de caixa, setor (canil, gatil ou quarentena), tipo (coletiva ou individual), capacidade, área opcional, solário, exclusividade para isolamento, última higienização opcional e estado operacional (ativa, inativa, interditada ou em higienização). A API calcula ocupantes, ocupação e vagas disponíveis a partir de `Animal.baiaId`. Regras e fluxos estão em `.ai-context/specs/gestao-de-baias.md`.

### Auditoria

Registro consultável pelo ADM/Coordenação no escopo administrativo e pela ficha do domínio quando aplicável. Eventos de baias usam `AuditoriaEvento` com `dados.entidade = "baia"` e `dados.entidadeId`, cobrindo criação, edição, interdição/liberação, inativação/reativação e higienização. Eventos de animais usam `dados.entidade = "animal"` e `dados.entidadeId`, cobrindo criação, edição, observação, pesagem, evento simples, mudança de baia, foto adicionada/removida e revogação terminal. Eventos de vacinação usam `dados.entidade` em `vacina`, `protocolo_vacinal`, `aplicacao_vacina` e `agendamento_vacinacao`, cobrindo catálogo, aplicação, edição, anulação, interrupção/retomada de protocolo e as operações da agenda.

### Timeline do animal

Histórico cronológico reverso em `EventoAnimal`, alimentado por criação, edição, mudança de situação, mudança de baia, observação, pesagem, foto, exame, diagnóstico, castração, revogação de situação terminal, aplicação de vacina, reação adversa e sua atualização de desfecho, encerramento de observação antirrábica e as operações de agenda de vacinação. Observações e pesagens também têm tabelas append-only próprias; o evento dá a visão unificada da ficha.

### Prontuário

Registro clínico único de um animal. Campos do diagrama: data do atendimento, anamnese, diagnóstico, prescrição, peso e temperatura. Não existe no código ainda. No diagrama, o prontuário contém as vacinas, mas a decisão de 2026-09-25 liga a aplicação de vacina diretamente ao animal e deixa `AplicacaoVacina.prontuarioId` nulo e reservado para quando este módulo existir.

### Vacina

Entrada do catálogo de vacinas: nome único normalizado, espécies aplicáveis (`cao` e/ou `gato`), total de doses do esquema inicial, intervalo entre doses, intervalo de revacinação, dias de aviso da próxima dose (padrão 7, configurável por vacina, 0 desliga o aviso antecipado), idade mínima opcional, indicador `obrigatoria` e estado ativa/inativa. Não controla estoque nem saldo de frascos. Somente Coordenação mantém o catálogo; vacina não é excluída, é inativada. O seed cria apenas a antirrábica; as demais a Coordenação cadastra, porque esquema vacinal é decisão clínica.

### Protocolo vacinal

Par animal mais vacina. Guarda a fotografia do esquema no momento da criação (doses previstas, intervalo entre doses, intervalo de revacinação), para que as doses faltantes não mudem quando o catálogo mudar. Nasce automaticamente na primeira aplicação ou no primeiro agendamento daquela vacina para aquele animal. Estados: `em_andamento`, `concluido` e `interrompido`. Doses aplicadas, doses faltantes e próxima dose são derivadas das aplicações não anuladas.

### Aplicação de vacina

Registro de uma dose efetivamente aplicada, ligado ao animal e ao protocolo: número da dose atribuído pelo sistema, data da aplicação como data civil, lote obrigatório em texto, validade do lote, aplicador autenticado, `aplicadoPor` textual quando outra pessoa aplicou, e data da próxima dose calculada e editável. Reserva `prontuarioId` nulo para o módulo futuro. Nunca é excluída e não tem campo estrutural editável: a correção é anulação motivada pela Coordenação mais novo registro. Marcações possíveis: registro retroativo e aplicação adiantada com motivo, conforme o termo Aplicação adiantada. O caso de uso UC07 fala em vacinação antirrábica, a única vacina `obrigatoria` e a única criada pelo seed.

### Agendamento de vacinação

Compromisso de vacinação na agenda: animal, vacina, protocolo, dose prevista, data e hora previstas, responsável opcional. Estados `agendado`, `aplicado`, `faltou` e `cancelado`, mais remarcação, que mantém o estado `agendado` com nova data. Existe no máximo um agendamento `agendado` por par animal e vacina. `atrasado` não é estado armazenado: é o agendamento `agendado` cuja data já passou. Dar baixa cria a aplicação e fecha o agendamento na mesma transação; anular essa aplicação reabre o agendamento.

### Alertas de vacinação

Nove pendências que entram na seção "Alertas e pendências" da ficha do animal e no contador de alertas da listagem, sem mecanismo paralelo: sem vacinação registrada, esquema vacinal incompleto (com doses aplicadas sobre previstas e faltantes), dose vencida, dose a vencer dentro da janela daquela vacina, vacina obrigatória pendente, protocolo interrompido, observação antirrábica em curso (dias que faltam), observação antirrábica vencida (pede a observação final) e reação adversa em acompanhamento. Animal em situação terminal não gera nenhum deles. Regras em `.ai-context/specs/gestao-de-vacinacao.md`.

### Aplicação adiantada

Aplicação registrada antes da data mínima da próxima dose do protocolo. Não é recusada e reenviada: a interface avisa antes do envio, com a data da última dose, o intervalo previsto e a data a partir da qual a dose seria regular; a pessoa marca confirmação explícita e informa motivo. A aplicação fica marcada com o motivo, o autor e os dias de antecipação, na ficha, no evento e na auditoria, e essa marcação não é editável. A API recusa com 409 quando recebe aplicação adiantada sem confirmação e motivo. Confirmam veterinário e Coordenação.

### Reação adversa pós-vacinal

Evento da ficha do animal, no mesmo mecanismo de exame e diagnóstico, com tipo `reacao_adversa` e referência opcional à `AplicacaoVacina` que a originou. Guarda gravidade obrigatória (`leve`, `moderada`, `grave`) e desfecho obrigatório (`em acompanhamento`, `resolvida`, `resolvida com sequela`, `óbito`), começando em `em acompanhamento`. Como o evento é imutável, atualizar o desfecho é criar novo evento que referencia o original por `EventoAnimal.eventoOrigemId`; o desfecho corrente é o do evento mais recente da cadeia. Registrável por todos os perfis autenticados. Não muda situação, não interrompe protocolo e não anula a aplicação — desfecho `óbito` na reação não mexe na situação do animal. Anular a aplicação não apaga a reação. Enquanto o desfecho corrente for `em acompanhamento`, gera alerta; e nova aplicação da mesma vacina naquele animal mostra aviso antes do envio, nunca bloqueio.

### Observação antirrábica

Situação do animal (`em_observacao_antirrabica`), distinta de `em_quarentena_observacao` e coexistindo com ela. `Animal.observacaoAntirrabicaInicioEm` grava o instante de entrada e é limpo na saída; recolocar o animal reinicia a contagem e o histórico guarda os períodos anteriores. O período é de 10 dias corridos fixos, não configuráveis. Durante os 10 dias, o alerta é informativo e mostra quantos dias faltam mais a data de encerramento. Ao vencer, vira pendência de ação e passa a pedir a observação final; a ação abre `Encerrar observação antirrábica`, que exige observação final em texto e nova situação, e grava as duas com eventos e auditoria em uma transação, via `POST /animais/:id/encerrar-observacao-antirrabica`. Encerrar antes dos 10 dias usa o mesmo caminho e fica marcado como antecipado. Nenhuma situação do animal bloqueia vacinar, inclusive com a antirrábica.

### Castração

Avaliação ou tentativa de procedimento de um animal. No banco, `CastracaoAnimal` guarda origem (`fluxo` ou `legada`), tipo (`avaliacao` ou `procedimento`), estado (`nao_castrado`, `agendada`, `realizada`, `cancelada`), datas conhecidas, observação, motivo de cancelamento e autor. O campo de resposta `estadoCastracao` é derivado desses registros: realizada prevalece sobre agendada, avaliação de não castrado e cancelamento; ausência de registro significa “Não informado”, não “Não castrado”. Pode haver várias tentativas canceladas, mas só um agendamento ativo e só um procedimento realizado por animal.

### Adoção

Registro imutável da entrega de um animal a um tutor. O funcionário comunica os termos fora do sistema; a confirmação registra dois switches de ciência/concordância e assinatura desenhada com mouse ou toque, sem texto ou versão dos termos. Torna o animal `adotado` e libera sua baia. Um animal pode ter várias adoções históricas, mas apenas uma ativa; nova adoção exige devolução da anterior. Adoção confirmada não pode ser revogada.

### Devolução

Movimentação que registra o retorno de animal adotado ao CCZ, preserva a adoção, as declarações e a assinatura anteriores, encerra o vínculo de guarda atual e devolve o animal a uma situação operacional. É pré-requisito para uma nova adoção do mesmo animal.

### Acolhimento

Entrada e triagem do animal (UC04), feita pelo funcionário. `Animal.statusAcolhimento` guarda o estado. O animal já ocupa uma baia e ainda não tem tutor.

### CRMV

Registro profissional do veterinário, campo `crmv` em `Funcionario`.

### perfilAcesso

Campo em `Usuario` que distingue o tipo de acesso e alimenta o RBAC. A spec `.ai-context/specs/autenticacao-jwt-rbac.md` usa quatro valores: `coordenacao`, `veterinario`, `agente` e `recepcao`. A função que vale é a escolhida no aceite. Depois disso, só `coordenacao` troca o tipo. O próprio usuário não troca.

### Solicitação de acesso

Pedido de um servidor ainda sem conta ativa. Nasce no login, fica `pendente` até o veterinário administrador aceitar ou recusar, e só vira `Usuario` e `Funcionario` no aceite.
