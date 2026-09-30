# Spec: Gestão de Vacinação

## Summary

Especificar o cadastro de vacinas, o registro auditável de aplicações por animal, o controle do esquema de doses (aplicadas e faltantes) com alerta, e uma agenda de vacinação com agendamentos marcáveis, remarcáveis e baixáveis. O objetivo operacional é impedir vacinação errada, duplicada ou fora do intervalo, e não deixar uma dose vencer sem ninguém ver.

Duas peças vizinhas entram no mesmo escopo porque compartilham o mecanismo de alerta e de evento do animal: o registro de reação adversa pós-vacinal como evento da ficha, com gravidade e desfecho acompanháveis, e a situação `em observação antirrábica`, com contagem regressiva de 10 dias e encerramento que exige observação final.

## Problem

O animal que chega ao CCZ vem da rua, sem carteira de vacinação e sem histórico confiável. Hoje o sistema não tem nenhum campo, formulário ou tela de vacinação: não há como saber qual vacina o animal já tomou, quantas doses faltam para fechar o esquema, nem quando a próxima dose vence. As consequências são concretas:

- O mesmo animal recebe a mesma vacina duas vezes porque ninguém sabia que já havia sido aplicada.
- Aplicam uma vacina incompatível com a espécie do animal.
- Aplicam a dose seguinte antes do intervalo mínimo, invalidando o esquema, sem ninguém avisar quem está com a seringa na mão.
- O esquema de três doses para no meio porque a segunda dose venceu sem lembrete.
- Não há lote registrado, então um problema de lote não é rastreável até os animais que o receberam.
- Uma reação adversa depois da vacina fica em conversa, não em registro ligado à aplicação que a causou.
- A observação antirrábica de 10 dias é controlada de cabeça, sem contagem visível nem aviso de encerramento.

## Goals

- Manter um catálogo único de vacinas com espécies aplicáveis, esquema de doses e janela de aviso definidos por vacina.
- Registrar cada aplicação com vacina, dose, data, lote e aplicador identificado, de forma auditável e não apagável.
- Controlar o esquema vacinal por animal: doses previstas, doses aplicadas e doses faltantes.
- Recusar aplicação incompatível com a espécie, dose duplicada e esquema já concluído.
- Avisar **antes** da aplicação quando ela cairia fora do intervalo mínimo, e registrar no histórico a decisão de aplicar mesmo assim.
- Mostrar dose faltante, dose vencida e dose a vencer como alerta na ficha do animal, na listagem de animais e na agenda.
- Manter uma agenda de vacinação com agendamentos que a equipe marca, remarca, cancela, marca como falta e baixa em aplicação.
- Registrar reação adversa pós-vacinal como evento da ficha do animal, ligada à aplicação que a originou, com gravidade, desfecho acompanhável e aviso na próxima aplicação da mesma vacina.
- Controlar a observação antirrábica como situação do animal, com contagem regressiva durante os 10 dias e encerramento que exige observação final e nova situação.
- Preservar histórico: correção de erro é anulação motivada mais novo registro, nunca exclusão silenciosa.

## Non-Goals

- Controle de estoque de vacinas: saldo de frascos, entrada de lote, baixa por aplicação e alerta de saldo baixo. Confirmado fora do MVP em 2026-09-25. Lote e validade são informados na aplicação apenas para rastreabilidade.
- Prontuário clínico completo (anamnese, diagnóstico, prescrição, temperatura). A aplicação de vacina nasce ligada ao animal e reserva ponto de ligação para o prontuário futuro.
- Vacinação em campanha: aplicar uma vacina em lote para muitos animais de uma vez, com uma folha de campanha. Confirmado fora do escopo em 2026-09-25.
- Farmacovigilância como módulo próprio: painel de reações, notificação a fabricante ou a órgão sanitário e classificação por escala formal de causalidade. A reação adversa entra como evento da ficha, com gravidade em três níveis e desfecho em quatro valores, e nada além disso.
- Fluxo completo de vigilância antirrábica: notificação compulsória, envio de material a laboratório, resultado de exame e desfecho epidemiológico. Aqui entra somente a situação do animal e o alerta de 10 dias.
- Notificação ativa fora do sistema: e-mail, push, SMS ou mensagem de lembrete. O lembrete vive na agenda, nos alertas e no painel.
- Carteira de vacinação impressa ou exportação em PDF.
- Castração, adoção e tutor, que seguem em módulos próprios.

## Users

Todos os perfis autenticados (`coordenacao`, `veterinario`, `agente`, `recepcao`) consultam vacinação: a seção de vacinação da ficha do animal, a agenda e o catálogo de vacinas.

Registrar, corrigir e operar é clínico:

- **Veterinário e Coordenação**: registram aplicação, criam e operam agendamentos, editam dados não estruturais de uma aplicação e confirmam aplicação fora do intervalo mínimo.
- **Coordenação**: mantém o catálogo de vacinas e anula uma aplicação registrada por erro, com motivo obrigatório.
- **Agente e recepção**: consulta apenas, no que é vacinação. Nenhum botão de registro, baixa, cancelamento ou edição aparece para esses perfis.
- **Reação adversa, seu desfecho e a situação do animal** seguem a regra já vigente em gestão de animais, não a regra clínica deste módulo: todos os perfis autenticados registram evento e mudam situação de animal operacional. Quem vê a reação primeiro costuma ser quem maneja o animal, não quem aplicou a vacina.

## User Stories

- Como veterinário, quero registrar a aplicação de uma vacina com dose, data, lote e minha autoria, para que a aplicação fique rastreável.
- Como veterinário, quero que o sistema recuse uma vacina incompatível com a espécie do animal, para não aplicar vacina errada.
- Como veterinário, quero que o sistema recuse a mesma dose duas vezes, para não vacinar o animal descontroladamente.
- Como veterinário, quero ser avisado antes de aplicar quando a dose está adiantada em relação ao intervalo, para decidir com certeza e deixar a decisão registrada.
- Como pessoa da equipe, quero ver na ficha do animal quais vacinas ele já tomou, em que dose está e quantas doses faltam, para saber o que ainda precisa ser feito.
- Como pessoa da equipe, quero que o animal com dose vencida ou esquema incompleto apareça marcado na listagem de animais, para não depender de abrir cada ficha.
- Como veterinário, quero abrir uma agenda com as vacinações marcadas por dia e as atrasadas em destaque, para organizar a sala de vacina.
- Como veterinário, quero que ao registrar uma aplicação o sistema já me proponha o agendamento da próxima dose na data calculada, para o esquema não parar no meio.
- Como veterinário, quero dar baixa em um agendamento e cair direto no registro da aplicação já preenchido, para não digitar duas vezes.
- Como Coordenação, quero cadastrar e manter as vacinas com seu esquema de doses, intervalos e janela de aviso, para o controle de doses funcionar sem gambiarra.
- Como Coordenação, quero anular uma aplicação registrada por engano informando o motivo, para corrigir o histórico sem apagá-lo.
- Como agente de zoonoses, quero registrar que o animal reagiu mal depois da vacina, com gravidade e ligado àquela aplicação, para a reação não se perder.
- Como veterinário, quero atualizar o desfecho de uma reação conforme o animal evolui, sem apagar o que foi registrado antes.
- Como veterinário, quero ser avisado de que aquele animal já reagiu a essa vacina antes de aplicar de novo, para decidir informado.
- Como pessoa da equipe, quero colocar o animal em observação antirrábica e ver quantos dias faltam dos 10, para não perder o prazo.
- Como pessoa da equipe, quero que o sistema me cobre a observação final quando os 10 dias terminam, para o período não fechar sem conclusão escrita.

## Requirements

### Catálogo de vacinas

- Campos da vacina: nome; espécies aplicáveis (uma ou mais entre `cao` e `gato`); total de doses do esquema inicial (inteiro maior ou igual a 1); intervalo em dias entre doses do esquema (obrigatório quando o total de doses for maior que 1); intervalo em dias para revacinação periódica (opcional); **dias de aviso da próxima dose** (inteiro de 0 a 365, padrão 7); idade mínima em semanas para a primeira dose (opcional); fabricante (opcional); via de aplicação sugerida (opcional, texto); indicador `obrigatoria`; observações (opcional); estado `ativa` ou `inativa`.
- Dias de aviso da próxima dose é a antecedência com que o alerta `Dose a vencer` aparece para aquela vacina. O padrão é 7 dias e cada vacina pode ter o seu. Valor 0 desliga o aviso antecipado daquela vacina: ela passa a alertar somente quando a dose vence.
- Nome é obrigatório e único, normalizado em Unicode NFC, com `trim`, espaços consecutivos colapsados e comparação sem distinção de caixa, na mesma convenção já usada por raças e por código de baia.
- Vacina precisa de pelo menos uma espécie aplicável. Espécies seguem o enum já existente do animal.
- Vacina `inativa` não aparece na seleção de novas aplicações e de novos agendamentos, mas continua visível no catálogo, nos registros históricos e nos protocolos já iniciados. Inativar não invalida aplicação passada nem protocolo em andamento.
- Vacina nunca é excluída. O caminho é inativar. O endpoint `DELETE /vacinas/:id` não existe.
- Editar o esquema (total de doses, intervalos) vale para protocolos criados dali em diante. Protocolos já iniciados mantêm os valores que tinham no momento da criação, conforme "Protocolo vacinal por animal". A tela avisa quantos protocolos em andamento continuarão com o esquema anterior.
- Dias de aviso é exceção a essa regra: não é fotografado no protocolo. O alerta sempre usa o valor atual do catálogo, porque é preferência de operação e não parte do esquema clínico. Mudar a janela muda o aviso de todos os animais daquela vacina imediatamente.
- Somente Coordenação cria, edita, inativa e reativa vacina. Todos os perfis autenticados consultam o catálogo.

### Protocolo vacinal por animal

- Protocolo é o par animal mais vacina. Guarda a fotografia do esquema no momento da criação: total de doses previstas, intervalo entre doses e intervalo de revacinação. Isso mantém estável o cálculo de doses faltantes mesmo que o catálogo mude depois.
- Protocolo é criado automaticamente, na mesma transação, quando a primeira aplicação daquela vacina naquele animal é registrada, ou quando o primeiro agendamento daquela vacina naquele animal é criado. Não existe criação manual de protocolo solto.
- Existe no máximo um protocolo por par animal e vacina.
- Campos derivados sempre calculados a partir das aplicações não anuladas: doses aplicadas; doses faltantes (previstas menos aplicadas, mínimo zero); data da última aplicação; próxima dose prevista; **data mínima da próxima dose**, que é a última aplicação mais o intervalo do protocolo.
- A data mínima da próxima dose é devolvida na consulta do protocolo justamente para a interface avisar antes do envio, conforme "Aviso de aplicação adiantada".
- Estado do protocolo: `em_andamento` quando ainda há dose faltante; `concluido` quando as doses aplicadas alcançam as previstas; `interrompido` quando a equipe clínica registra interrupção com motivo obrigatório (por exemplo contraindicação clínica, ou animal com desfecho antes de fechar o esquema).
- Protocolo `concluido` com intervalo de revacinação definido passa a ter próxima dose prevista igual à última aplicação mais o intervalo de revacinação. A dose de revacinação é registrada como reforço: a numeração continua a partir do total previsto e não reabre o esquema inicial.
- Protocolo `concluido` sem intervalo de revacinação não gera mais dose prevista nem alerta.
- Protocolo `interrompido` não gera alerta de dose faltante nem de dose vencida, mas o motivo e o autor da interrupção ficam visíveis na ficha e no histórico. Retomar a interrupção é ação clínica e volta o protocolo para `em_andamento`.

### Registro de aplicação

- Campos da aplicação: animal; vacina; número da dose; data da aplicação; lote (texto obrigatório); validade do lote (data, opcional); aplicador; via de aplicação (opcional); observação (opcional); indicador de registro retroativo; indicador de aplicação adiantada com motivo.
- O aplicador é o usuário autenticado que registra e não é editável. Quando quem aplicou não é quem registrou, um campo textual `aplicadoPor` guarda o nome informado, mantendo os dois responsáveis distintos, na mesma convenção que animais já usa para `acolhidoPor`.
- Número da dose é atribuído pelo sistema: o menor número livre entre as aplicações não anuladas, que sem anulação é "doses aplicadas mais um" e, com uma dose do meio anulada, reocupa a lacuna em vez de colidir com a dose seguinte. A pessoa não digita o número da dose; a tela pode enviar `numeroDoseEsperada` (a dose que mostrou) e a API recusa se ela mudou no meio-tempo.
- Data da aplicação é obrigatória, tratada como data civil sem hora, e não pode ser futura.
- Data da aplicação anterior à data de acolhimento do animal é aceita apenas com o indicador de registro retroativo ligado e observação obrigatória, para o caso de vacinação informada por terceiro ou comprovada por carteira trazida com o animal. Sem esse indicador, a API recusa.
- Data da próxima dose é calculada pelo sistema: última aplicação mais o intervalo do protocolo quando ainda falta dose do esquema inicial, ou mais o intervalo de revacinação quando o esquema fechou. O campo é editável pela equipe clínica; valor editado é registrado no histórico junto do valor calculado.
- Lote é texto livre com `trim`, sem catálogo e sem saldo. A consulta por lote deve encontrar todas as aplicações daquele lote, para rastrear um problema de lote até os animais.
- Validações que **recusam** a aplicação sem alternativa, com mensagem que explica o motivo:
  1. Vacina não aplicável à espécie do animal.
  2. Vacina `inativa`.
  3. Protocolo já `concluido` e sem intervalo de revacinação definido.
  4. Dose já registrada: a tela enviou `numeroDoseEsperada` e aquele número de dose já tem aplicação não anulada (`dose_ja_registrada`); se a dose atual é outra e o número esperado não existe, `dose_divergente`. Duas pessoas na mesma dose ao mesmo tempo caem no índice único parcial (`conflito_concorrencia`).
  5. Mesma vacina já aplicada no mesmo animal na mesma data. Protege contra envio duplicado.
  6. Animal em situação `adotado` ou `obito`, conforme a regra de estado terminal já vigente em animais.
  7. Data de aplicação futura.
  8. Protocolo `interrompido`: retome o protocolo antes de aplicar (`protocolo_interrompido`). Acrescentada na implementação: interromper por contraindicação e depois aceitar aplicação anularia o propósito da interrupção.
- Validações que **avisam e pedem confirmação**, conforme "Aviso de aplicação adiantada": aplicação antes da data mínima da próxima dose, e aplicação de reforço antes de a revacinação vencer. As duas são a mesma condição de intervalo, medida sobre o esquema inicial ou sobre a revacinação.
- Reação adversa anterior àquela vacina naquele animal é aviso antes do envio, nunca recusa, conforme "Reação adversa pós-vacinal".
- Idade mínima da vacina não alcançada é aviso, nunca recusa: quando a vacina define idade mínima e o animal tem data de nascimento conhecida, a interface avisa antes do envio e a aplicação segue. Idade apenas estimada também avisa, marcando que a idade é aproximada, coerente com o alerta de idade aproximada já existente.
- Registrar uma aplicação atualiza, na mesma transação: o protocolo (doses aplicadas, estado, próxima dose), o evento na timeline do animal, o registro de auditoria e, quando o registro veio de um agendamento, o estado daquele agendamento. Falha em qualquer parte impede confirmar a aplicação.
- Ao concluir uma aplicação com próxima dose prevista, a interface propõe o agendamento da próxima dose já preenchido com a data calculada, marcado para criar por padrão. A pessoa pode desmarcar. Não há criação silenciosa sem essa etapa visível.
- Aplicação não é excluída. O endpoint `DELETE` de aplicação não existe.
- Edição de aplicação existente é limitada aos campos não estruturais: lote, validade do lote, via de aplicação, observação, `aplicadoPor` e data da próxima dose. Edita quem é clínico, com evento e auditoria de valores anterior e novo.
- Campos estruturais (animal, vacina, número da dose, data da aplicação) não são editáveis. A correção é anular e registrar de novo.
- Anular uma aplicação é exclusivo da Coordenação, exige motivo obrigatório e confirmação. A aplicação continua visível marcada como anulada, com motivo, autor e instante, deixa de contar para doses aplicadas e o protocolo é recalculado na mesma transação. Anulação gera evento e auditoria. Aplicação anulada não volta a valer; o caminho é registrar a aplicação correta.
- A aplicação reserva ligação opcional para o prontuário futuro. Enquanto o módulo de prontuário não existir, a ligação fica vazia e nada no fluxo depende dela.

### Aviso de aplicação adiantada

A dose adiantada não é tratada como erro a ser recusado e reenviado. É uma decisão clínica que o sistema precisa apresentar **antes** de a pessoa aplicar, e registrar depois.

- A interface avalia a condição enquanto a pessoa escolhe a vacina e a data, sem esperar o envio. A consulta do protocolo já devolve a data mínima da próxima dose, então o aviso aparece sem ida e volta ao servidor.
- O aviso é um bloco visível no formulário, não um toast, e diz: a data da última dose aplicada, o intervalo previsto do protocolo, a data a partir da qual a dose seria regular e quantos dias falta para lá. Texto e não só cor, no tom de pendência de `DESIGN.md`.
- Para prosseguir, a pessoa marca uma confirmação explícita de que quer aplicar adiantado e informa o motivo. A confirmação nasce desmarcada; nada é pré-aceito.
- O motivo é obrigatório. Sem motivo, o registro é recusado. Um indicador de "aplicado adiantado" sem a razão não serve para reconstruir a decisão depois, que é o propósito de gravar no histórico.
- A API não confia na interface: recebendo uma aplicação que cai antes da data mínima sem o par confirmação mais motivo, recusa com 409. Recebendo com o par, grava.
- A aplicação gravada fica marcada como adiantada, com o motivo, o autor e a quantidade de dias de antecipação. A marcação aparece na linha da dose na ficha, no evento da timeline e no registro de auditoria, e não é editável depois.
- A mesma mecânica vale para o reforço aplicado antes de a revacinação vencer.
- Quem pode confirmar: veterinário e Coordenação, os mesmos perfis que registram aplicação. Não foi restringido só ao veterinário.

### Reação adversa pós-vacinal

- A reação adversa entra como evento da ficha do animal, no mesmo mecanismo em que exame e diagnóstico já entram, e não como entidade com fluxo próprio.
- O tipo de evento `reacao_adversa` é acrescentado aos eventos do animal. Campos: data e hora; descrição do que foi observado; **gravidade**; **desfecho**; responsável autenticado; e **referência opcional à aplicação de vacina** que a originou.
- Gravidade é obrigatória, em três níveis: `leve`, `moderada` e `grave`. A escala é deliberadamente curta, para ser preenchida de luva e em pé, e precisa do aval do veterinário responsável antes de virar dado (perguntas abertas).
- Desfecho é obrigatório, em quatro valores: `em acompanhamento`, `resolvida`, `resolvida com sequela` e `óbito`. No registro inicial, o padrão é `em acompanhamento`.
- O desfecho muda com o tempo, mas o evento é imutável. A atualização é **novo evento** `reacao_adversa` que referencia o evento original, carregando o desfecho novo e a descrição da evolução. A ficha mostra o desfecho corrente, que é o do evento mais recente da cadeia, e a cadeia inteira fica visível no histórico. É a mesma mecânica que observações de animais já usam para correção.
- Desfecho `óbito` na reação **não** muda a situação do animal. São registros diferentes: um descreve a reação, o outro é a situação da ficha. Mudar a situação para `óbito` continua sendo ação explícita e separada, com sua própria trilha. A interface oferece o atalho; não executa sozinha.
- Quando a reação é registrada a partir da seção de vacinação da ficha, a referência à aplicação vem preenchida. Quando é registrada a partir da seção de eventos, a referência é opcional e a interface oferece escolher entre as aplicações recentes daquele animal.
- A referência é o que dá valor ao registro: permite listar as reações de um lote e de uma vacina. `GET /vacinacao/aplicacoes?lote=` passa a informar, por aplicação, se existe reação adversa registrada, com a gravidade e o desfecho corrente.
- O evento aparece na linha da dose na seção de vacinação e na timeline geral do animal, como qualquer outro evento, com gravidade e desfecho visíveis.
- Registrar reação adversa não muda situação do animal, não interrompe protocolo e não anula a aplicação. Se a equipe decidir interromper o protocolo por causa dela, isso é ação separada e explícita, com motivo próprio.
- **A reação registrada avisa a próxima aplicação.** Quando alguém for aplicar uma vacina para a qual aquele animal já tem reação adversa registrada, o formulário mostra o aviso antes do envio, com a gravidade, o desfecho e a data da reação, no mesmo bloco inline usado pela aplicação adiantada. É aviso, não bloqueio: contraindicação é decisão clínica e esta spec não a inventa. Sem isso, gravidade seria dado morto.
- Quem registra: todos os perfis autenticados, coerente com a regra de eventos já vigente em gestão de animais. Quem percebe o animal inchado ou prostrado no canil costuma ser o agente, não quem aplicou.
- Anular a aplicação não apaga a reação registrada. O evento permanece, marcado de que a aplicação referenciada foi anulada.

### Observação antirrábica

- A situação `em observação antirrábica` é acrescentada às situações do animal. As situações passam a ser: `em tratamento`, `em quarentena/observação`, `em observação antirrábica`, `saudável`, `adotado` e `óbito`.
- A situação nova não substitui `em quarentena/observação`. As duas coexistem: uma é observação geral, a outra é o protocolo antirrábico de 10 dias, com prazo e desfecho próprios.
- Quando a situação do animal passa a `em observação antirrábica`, o sistema grava o instante de início do período. Quando a situação sai dela, o início é limpo. Recolocar o animal em observação reinicia a contagem e grava novo início; o histórico mantém os períodos anteriores como eventos.
- O período é de **10 dias corridos fixos**, contados do início. Não é configurável por animal nem por parâmetro de sistema. Dias corridos, não úteis.
- Durante os 10 dias, o alerta é informativo e mostra **quantos dias faltam** para o fim da observação, mais a data prevista de encerramento, por exemplo "Observação antirrábica: faltam 6 dias, encerra em 05/10". No último dia, "encerra hoje". O alerta conta no indicador da listagem.
- Passados os 10 dias com o animal ainda nessa situação, o alerta muda de informativo para pendência de ação e passa a **pedir a observação final do animal**: o período terminou e a conclusão precisa ser registrada. O texto diz há quantos dias venceu. Esse alerta não some sozinho e não é dispensável; sai quando a observação é encerrada.
- A ação do alerta vencido abre **Encerrar observação antirrábica**, um `Dialog` com dois campos obrigatórios: a observação final, em texto, com a conclusão do período; e a nova situação do animal, entre as situações operacionais e `óbito`. Confirmar grava, na mesma transação, a observação final como `ObservacaoAnimal`, a mudança de situação, os eventos correspondentes na timeline e a auditoria, e limpa o início do período.
- Os dois campos são obrigatórios porque uma observação antirrábica que termina sem conclusão escrita não serve como registro sanitário, que é a razão de o CCZ controlar o prazo.
- Encerrar a observação antes dos 10 dias é permitido pelo mesmo caminho, a partir do alerta informativo. O evento registra que o encerramento foi antecipado e em que dia do período.
- A mudança para essa situação e a saída dela são eventos de `mudanca_situacao` na timeline, como qualquer outra mudança de situação, com responsável, instante e motivo opcional.
- A listagem de animais ganha a situação nova no filtro de situação e no selo de situação.
- **Nada bloqueia vacinar um animal em observação antirrábica**, inclusive com a própria antirrábica. Confirmado em 2026-09-25: não é preciso bloquear.

### Agenda de vacinação

- Campos do agendamento: animal; vacina; protocolo; número da dose prevista; data e hora previstas; responsável previsto (usuário, opcional); observação (opcional); estado; motivo de cancelamento; aplicação resultante; criado por.
- Estados: `agendado`, `aplicado`, `faltou`, `cancelado`. Transições permitidas a partir de `agendado`: baixa em aplicação (`aplicado`), marcação de falta (`faltou`), cancelamento com motivo obrigatório (`cancelado`) e remarcação, que mantém o agendamento em `agendado` com nova data e grava evento com a data anterior e a nova. Estados `aplicado`, `faltou` e `cancelado` são finais; a partir deles, a ação é criar um novo agendamento.
- `atrasado` não é estado armazenado. É condição derivada: agendamento `agendado` cuja data e hora previstas já passaram. A agenda destaca atrasados no topo.
- Existe no máximo um agendamento em estado `agendado` por par animal e vacina. Tentar criar um segundo devolve conflito e aponta o agendamento existente, com ação de remarcar.
- Agendamento é validado na criação pelas mesmas regras de compatibilidade de espécie, vacina ativa e estado terminal do animal. A condição de intervalo aparece na criação como aviso, e de novo, no momento da baixa, porque o intervalo é aferido pela data real de aplicação.
- Data e hora previstas podem ser futuras ou passadas. Passado é o caso de lançar um atraso que já existia.
- Dar baixa abre o registro de aplicação com animal, vacina, dose e observação já preenchidos e a data de aplicação sugerida como hoje. O aviso de aplicação adiantada, quando cabe, aparece nesse mesmo formulário antes da confirmação. Confirmar grava a aplicação e move o agendamento para `aplicado`, ligado àquela aplicação, na mesma transação.
- Anular a aplicação que baixou um agendamento devolve aquele agendamento para `agendado`, mantendo a data prevista original e gravando evento de reabertura. Isso evita que a anulação apague o lembrete.
- A agenda é uma tela própria em `/painel/vacinacao`, agrupada por dia, com faixa de atrasados. Filtros: período, vacina, espécie, responsável previsto, estado e animal. Busca por nome ou número de registro do animal. Cada linha mostra animal, vacina, dose prevista sobre o total, data e hora, responsável e as ações permitidas ao perfil.
- A agenda oferece visão de lista por padrão. Agrupamento por dia com cabeçalho de data é obrigatório; calendário mensal não faz parte deste escopo.
- A seção de vacinação da ficha do animal mostra o agendamento em aberto do animal junto de cada protocolo.

### Alertas e visibilidade

- A vacinação alimenta a seção "Alertas e pendências" já existente na ficha do animal e o contador de alertas já existente na listagem de animais, sem criar um segundo mecanismo de alerta.
- Alertas de vacinação:
  1. `Sem vacinação registrada`: animal operacional sem nenhuma aplicação não anulada. Relevante porque o animal chega da rua sem histórico.
  2. `Esquema vacinal incompleto`: protocolo `em_andamento` com dose faltante. O texto diz a vacina, doses aplicadas sobre previstas e quantas faltam, por exemplo "Antirrábica: 1 de 3 doses, faltam 2".
  3. `Dose vencida`: próxima dose prevista anterior a hoje. O texto diz há quantos dias venceu.
  4. `Dose a vencer`: próxima dose prevista dentro da janela de aviso **daquela vacina**, que é 7 dias por padrão e configurável no catálogo. Vacina com janela 0 não gera este alerta.
  5. `Vacina obrigatória pendente`: existe vacina ativa, aplicável à espécie do animal, marcada `obrigatoria`, sem nenhuma aplicação para aquele animal.
  6. `Protocolo interrompido`: informativo, com o motivo registrado.
- Alertas de observação antirrábica:
  7. `Observação antirrábica em curso`: informativo, com quantos dias faltam para o fim e a data de encerramento.
  8. `Observação antirrábica vencida`: pendência de ação, quando os 10 dias passaram e a observação não foi encerrada. A ação abre Encerrar observação antirrábica, que pede a observação final e a nova situação.
- Alerta de reação adversa:
  9. `Reação adversa em acompanhamento`: existe reação adversa cujo desfecho corrente ainda é `em acompanhamento`. O texto diz a vacina, a gravidade e há quantos dias foi registrada. Sai quando um evento posterior da cadeia fecha o desfecho.
- Nenhum alerta depende só de cor, e todos têm texto acessível, conforme a regra já vigente. Pendência usa o tom de pendência de `DESIGN.md`.
- Cada alerta oferece ação direta quando o perfil permite: registrar aplicação, agendar próxima dose, abrir o protocolo, encerrar a observação antirrábica ou atualizar o desfecho da reação adversa. Para agente e recepção, os alertas de vacinação aparecem sem ação de escrita; os de observação antirrábica e de reação adversa têm ação, porque mudar situação e registrar evento de animal operacional são liberados a todos os perfis.
- Animal em situação `adotado` ou `obito` não gera alerta de vacinação, de observação antirrábica nem de reação adversa. As seções continuam consultáveis em somente leitura.
- O painel inicial recebe um indicador com a contagem de doses vencidas e de doses a vencer, com link para a agenda filtrada. O desenho do painel fica no escopo do módulo de painel; aqui vale o contrato do número e do link.

### Histórico e auditoria

- Toda operação de vacinação grava evento na timeline do animal (`EventoAnimal`) e registro em `AuditoriaEvento`, na mesma transação da operação. Falha em gravar histórico ou auditoria impede confirmar a operação, na mesma regra já vigente em animais e baias.
- Tipos de evento do animal a acrescentar: aplicação de vacina; anulação de aplicação; edição de aplicação; criação de agendamento; remarcação; cancelamento; falta; interrupção de protocolo; retomada de protocolo; reação adversa, incluindo as atualizações de desfecho, que são eventos novos referenciando o original; e encerramento de observação antirrábica.
- O evento de aplicação registra, quando houver, a marcação de adiantada com o motivo e os dias de antecipação, e a marcação de retroativa.
- Auditoria usa o padrão existente, com `dados.entidade` em `vacina`, `protocolo_vacinal`, `aplicacao_vacina` e `agendamento_vacinacao`, mais `dados.entidadeId`. Operações de catálogo de vacina não pertencem a um animal e entram apenas na auditoria administrativa.
- Eventos são imutáveis. Correção é sempre novo evento que referencia o registro corrigido.
- A seção de vacinação da ficha mostra, por protocolo, a linha do tempo das doses: dose, data, lote, aplicador, reação adversa quando houver e as marcações de retroativo, adiantado e anulado.

## Acceptance Criteria

1. Dada uma vacina cadastrada só para `gato`, quando alguém tentar registrar a aplicação em um animal `cao`, então a API recusa por incompatibilidade de espécie, nenhuma aplicação é criada e a mensagem nomeia a espécie da vacina e a do animal.
2. Dada uma vacina com esquema de 3 doses e intervalo de 21 dias, quando a primeira dose é registrada, então o protocolo é criado com 3 doses previstas, 1 aplicada, 2 faltantes, estado `em_andamento`, próxima dose prevista e data mínima da próxima dose 21 dias após a aplicação.
3. Dado um protocolo com a dose 2 já registrada e não anulada, quando alguém tentar registrar novamente a dose 2, então a API recusa por dose já registrada e o total de doses aplicadas não muda.
4. Dada a última dose aplicada há 5 dias em um protocolo de intervalo 21, quando o veterinário escolher a vacina e a data no formulário, então **antes de enviar** aparece bloco de aviso com a data da última dose, o intervalo previsto, a data a partir da qual a dose seria regular e os dias faltantes, e a confirmação nasce desmarcada.
5. Dado esse aviso, quando o veterinário marcar a confirmação e informar o motivo, então a aplicação é gravada marcada como adiantada, com motivo, autor e dias de antecipação, e a marcação aparece na linha da dose, no evento da timeline e na auditoria.
6. Dado esse aviso, quando o envio chegar à API antes da data mínima sem confirmação ou sem motivo, então a API recusa com 409, mesmo que a interface tenha deixado passar.
7. Dada uma aplicação marcada como adiantada, quando alguém tentar editá-la, então a marcação, o motivo e os dias de antecipação não são editáveis.
8. Dado um protocolo de 3 doses com 3 aplicadas e revacinação de 365 dias, quando a ficha for aberta, então o protocolo aparece `concluido`, sem alerta de dose faltante, com próxima dose prevista 365 dias após a última aplicação.
9. Dado um protocolo `concluido` com revacinação ainda não vencida, quando alguém registrar o reforço, então o aviso de adiantada aparece antes do envio e o registro exige confirmação e motivo.
10. Dado um protocolo `concluido` sem intervalo de revacinação, quando alguém tentar registrar outra dose, então a API recusa e a ficha não mostra dose prevista nem alerta.
11. Dada uma vacina com dias de aviso 7 e outra com 30, quando cada uma tiver próxima dose em 20 dias, então só a de 30 gera `Dose a vencer`; dada uma vacina com dias de aviso 0, então ela nunca gera `Dose a vencer` e alerta somente quando vence.
12. Dada a alteração dos dias de aviso de uma vacina, quando a ficha e a listagem recarregarem, então o alerta dos animais daquela vacina usa imediatamente o valor novo, sem depender da data de criação do protocolo.
13. Dado um animal operacional sem nenhuma aplicação, quando a ficha e a listagem de animais carregarem, então o alerta `Sem vacinação registrada` aparece na seção de pendências e soma no contador de alertas da listagem.
14. Dado um protocolo com 1 de 3 doses, quando a ficha e a listagem carregarem, então o alerta de esquema incompleto informa a vacina, 1 de 3 e 2 faltantes, com texto legível sem depender de cor.
15. Dada uma próxima dose prevista anterior a hoje, quando a agenda carregar, então aquele item aparece na faixa de atrasados, com a quantidade de dias de atraso, acima dos agendamentos futuros.
16. Dada uma aplicação registrada com próxima dose prevista, quando a pessoa concluir o registro, então a interface propõe o agendamento da próxima dose já preenchido com a data calculada e marcado para criar; ao desmarcar, nenhum agendamento é criado.
17. Dado um agendamento `agendado`, quando a pessoa der baixa, então o formulário de aplicação abre preenchido com animal, vacina e dose, o aviso de adiantada aparece se couber, e ao confirmar a aplicação é gravada e o agendamento passa a `aplicado` ligado a ela, na mesma transação.
18. Dado um agendamento `agendado` para um par animal e vacina, quando alguém tentar criar outro agendamento para o mesmo par, então a API recusa com conflito, aponta o agendamento existente e oferece remarcar.
19. Dado um agendamento `agendado`, quando for remarcado, então a nova data vale, o estado permanece `agendado` e o histórico guarda a data anterior, a nova, o autor e o instante.
20. Dado um agendamento `agendado`, quando for cancelado sem motivo, então a API recusa; com motivo, o estado passa a `cancelado` e o motivo fica no histórico.
21. Dada uma aplicação registrada por engano, quando a Coordenação anular com motivo, então a aplicação continua visível marcada como anulada, deixa de contar nas doses aplicadas, o protocolo é recalculado e o evento de anulação aparece no histórico com autor e instante.
22. Dada a anulação de uma aplicação que havia baixado um agendamento, quando a anulação for confirmada, então aquele agendamento volta a `agendado` com a data prevista original e um evento de reabertura.
23. Dada uma aplicação recém-registrada, quando qualquer perfil autenticado registrar reação adversa a partir da seção de vacinação, então o evento é criado com a referência àquela aplicação, gravidade e desfecho, e aparece na linha da dose e na timeline do animal.
24. Dado o registro de uma reação adversa sem gravidade ou sem desfecho, quando for enviado, então a API recusa; no formulário, o desfecho vem pré-selecionado como `em acompanhamento`.
25. Dada uma reação adversa com desfecho `em acompanhamento`, quando a evolução for registrada como `resolvida`, então é criado **novo evento** referenciando o original, a ficha passa a mostrar `resolvida` como desfecho corrente e a cadeia inteira continua visível no histórico.
26. Dada uma reação adversa com desfecho corrente `em acompanhamento`, quando a ficha e a listagem carregarem, então o alerta `Reação adversa em acompanhamento` aparece com vacina, gravidade e dias desde o registro, e some quando a cadeia fecha o desfecho.
27. Dada uma reação adversa com desfecho `óbito`, quando for registrada, então a situação do animal **não** muda sozinha; a interface oferece o atalho para mudar a situação, que continua sendo ação explícita e separada.
28. Dado um animal com reação adversa registrada para uma vacina, quando alguém preencher nova aplicação daquela mesma vacina, então o aviso aparece antes do envio com gravidade, desfecho e data da reação, e a aplicação não é recusada por isso.
29. Dada uma reação adversa registrada a partir da seção de eventos sem escolher aplicação, então o evento é criado sem referência e continua visível na timeline.
30. Dada uma reação adversa ligada a uma aplicação, quando aquela aplicação for anulada, então o evento de reação permanece, marcado de que a aplicação referenciada foi anulada.
31. Dada a consulta por lote, quando aplicações daquele lote tiverem reação adversa registrada, então a resposta informa isso por aplicação, com gravidade e desfecho corrente.
32. Dado um animal operacional, quando a situação mudar para `em observação antirrábica`, então o início do período é gravado, o evento de mudança de situação entra na timeline e o alerta informativo passa a mostrar quantos dias faltam e a data de encerramento.
33. Dado um animal no dia 4 dos 10, quando a ficha e a listagem carregarem, então o alerta diz "faltam 6 dias" com a data prevista de encerramento e conta no indicador de alertas; no décimo dia, diz "encerra hoje".
34. Dado um animal cujos 10 dias passaram sem encerramento, quando a ficha e a listagem carregarem, então o alerta passa a pendência de ação pedindo a observação final, diz há quantos dias venceu, não desaparece sozinho e não é dispensável.
35. Dado o alerta vencido, quando a pessoa acionar Encerrar observação antirrábica sem a observação final ou sem a nova situação, então a API recusa; com os dois campos, a observação final, a mudança de situação, os eventos e a auditoria são gravados na mesma transação, o início do período é limpo e os alertas somem.
36. Dado um animal ainda dentro dos 10 dias, quando a observação for encerrada pelo mesmo caminho, então o encerramento conclui e o evento registra que foi antecipado e em que dia do período.
37. Dado um animal recolocado em observação antirrábica, quando a situação mudar de novo para ela, então a contagem reinicia do zero com novo início, e o período anterior continua no histórico.
38. Dada a listagem de animais, quando a pessoa filtrar por situação, então `em observação antirrábica` está disponível no filtro e o selo de situação a distingue de `em quarentena/observação`.
39. Dado um animal `em observação antirrábica`, quando alguém aplicar qualquer vacina, inclusive a antirrábica, então a aplicação conclui sem bloqueio por causa da situação.
40. Dado um perfil `agente` ou `recepcao`, quando abrir a agenda e a seção de vacinação da ficha, então vê os dados e nenhuma ação de registrar, editar, baixar, remarcar, cancelar ou anular aplicação; a API recusa essas operações com 403 mesmo se chamadas direto.
41. Dado um perfil `agente` ou `recepcao`, quando registrar reação adversa ou mudar a situação de um animal operacional para observação antirrábica, então a operação conclui, porque essas seguem a regra de eventos e situação de gestão de animais.
42. Dado um perfil `veterinario`, quando tentar criar, editar ou inativar uma vacina do catálogo, então a API recusa com 403; para a Coordenação, a operação conclui.
43. Dado um animal em situação `adotado` ou `obito`, quando qualquer perfil tentar registrar aplicação ou criar agendamento, então a API recusa, as seções continuam consultáveis e nenhum alerta de vacinação, de observação antirrábica ou de reação adversa é gerado para aquele animal.
44. Dada uma data de aplicação futura, quando o registro for enviado, então a API recusa; dada uma data anterior ao acolhimento sem o indicador de registro retroativo, então a API recusa; com o indicador e observação, o registro é aceito e fica marcado como retroativo.
45. Dada uma vacina com idade mínima de 12 semanas e um animal de 8 semanas com nascimento conhecido, quando a pessoa preencher o formulário, então aparece aviso antes do envio e a aplicação não é recusada por isso.
46. Dada uma vacina com 3 doses e protocolos em andamento, quando a Coordenação alterar o esquema para 4 doses, então os protocolos existentes continuam com 3 doses previstas, novos protocolos usam 4, e a tela avisou quantos protocolos seguiriam com o esquema anterior.
47. Dado um lote informado em várias aplicações, quando a equipe consultar por aquele lote, então todas as aplicações daquele lote aparecem com animal, dose, data e presença de reação adversa.
48. Dadas duas pessoas registrando a mesma dose do mesmo protocolo ao mesmo tempo, quando ambas confirmarem, então apenas uma aplicação é gravada e a outra recebe conflito, garantido por restrição única no banco.
49. Dada uma vacina `inativa`, quando alguém abrir a seleção de nova aplicação ou de novo agendamento, então aquela vacina não aparece, e os registros e protocolos que já a usam continuam visíveis e íntegros.
50. Dado qualquer usuário sem sessão, quando chamar qualquer endpoint de vacinação, então recebe 401.
51. Dada uma operação de vacinação cuja gravação de evento ou de auditoria falhe, quando a transação for concluída, então a operação de domínio não é confirmada e o estado anterior permanece.

## Edge Cases

- Duas aplicações concorrentes para a mesma dose do mesmo protocolo: a restrição única entre protocolo e número de dose, considerando apenas aplicações não anuladas, resolve atomicamente.
- Duas criações concorrentes de protocolo para o mesmo par animal e vacina: restrição única entre animal e vacina resolve atomicamente; o segundo fluxo reaproveita o protocolo existente.
- Duas criações concorrentes de agendamento para o mesmo par: restrição única sobre o agendamento em estado `agendado` resolve; a segunda recebe conflito.
- Aviso de adiantada calculado na interface e data mudada depois, no próprio formulário: o aviso é recalculado a cada mudança de vacina ou de data, e a confirmação marcada é zerada quando a condição deixa de existir, para ninguém confirmar adiantamento que não está mais acontecendo.
- Aplicação que deixa de ser adiantada entre o preenchimento e o envio, por virada de dia: a API grava sem a marcação, porque a condição é aferida no servidor no momento do envio, e a interface informa que o aviso deixou de valer.
- Espécie do animal alterada depois de haver aplicações: a alteração é recusada quando existir aplicação não anulada de vacina incompatível com a nova espécie. A mensagem lista as aplicações conflitantes. O caminho é a Coordenação anular o que estiver errado antes de corrigir a espécie.
- Animal sem data de nascimento, só idade estimada, e vacina com idade mínima: não bloqueia; gera aviso de idade aproximada.
- Aplicação com data anterior à última aplicação registrada: o número da dose passa a não refletir a ordem cronológica. A aplicação é aceita apenas como registro retroativo, a ficha ordena as doses por data e o histórico mostra a ordem de registro.
- Animal recebe desfecho `adotado` ou `obito` com protocolo em andamento ou em observação antirrábica: alertas param, os registros permanecem consultáveis, e a revogação do estado terminal pela Coordenação devolve os alertas, incluindo o recálculo dos dias de observação.
- Agendamento em aberto quando o animal recebe desfecho terminal: o agendamento continua `agendado` e sai da agenda operacional, aparecendo apenas com filtro explícito, na mesma lógica da listagem de animais.
- Última aplicação do protocolo é anulada: o protocolo volta de `concluido` para `em_andamento`, a próxima dose prevista e a data mínima são recalculadas e o alerta reaparece.
- Todas as aplicações de um protocolo são anuladas: o protocolo permanece com zero doses aplicadas e o animal volta a acumular `Sem vacinação registrada` se não tiver nenhuma outra aplicação.
- Reação adversa registrada e depois a aplicação anulada: a reação continua, marcada; a decisão de interromper o protocolo por causa dela é ação separada.
- Reação adversa sem referência a aplicação: válida, aparece na timeline e não entra nas estatísticas por lote.
- Cadeia de desfecho da reação adversa com dois eventos no mesmo instante: o desfecho corrente é o do evento de maior identificador, pela mesma regra de ordenação estável dos demais eventos.
- Reação adversa cujo desfecho nunca é fechado: o alerta `Reação adversa em acompanhamento` não expira, de propósito, para a reacão não ficar esquecida em aberto.
- Reação adversa com desfecho `óbito` e animal que permanece operacional: estado legítimo, porque os dois registros são independentes. A ficha mostra os dois, e o alerta de reação some, porque o desfecho foi fechado.
- Vacina de dose única ou intervalo de doses igual a zero: o esquema fecha na primeira dose; a condição de intervalo não se aplica, mas a recusa de mesma vacina na mesma data continua valendo.
- Vacina inativada com agendamentos em aberto: os agendamentos continuam e podem ser baixados, porque a vacina já fazia parte do plano do animal. Novos agendamentos daquela vacina não são aceitos.
- Data prevista de agendamento em fim de semana ou feriado: o sistema não move a data. A equipe remarca se precisar.
- Observação antirrábica com situação mudada duas vezes no mesmo dia: cada mudança gera evento; o início que vale é o da última entrada na situação.
- Observação antirrábica vencida há muito tempo: o alerta de pendência não expira e não é dispensável; só sai quando a observação é encerrada com observação final e nova situação.
- Situação alterada por fora do fluxo de encerramento, pela edição comum da ficha: o início do período também é limpo e os alertas somem, mas nenhuma observação final é exigida. O caminho recomendado é o encerramento; a edição direta continua válida para corrigir situação lançada por engano.
- Animal em observação antirrábica que recebe desfecho terminal direto: os alertas param, e o período interrompido fica no histórico sem observação final.
- Fuso horário: data de aplicação, validade de lote e próxima dose são datas civis sem hora, gravadas como data, para não escorregarem um dia na conversão. O início da observação antirrábica, a data e hora previstas do agendamento e os instantes de evento são armazenados em UTC e apresentados no horário local. A contagem de dias de observação e de atraso é feita sobre a data local, para "dia 4 de 10" bater com o calendário da parede.
- Ordenação estável de eventos simultâneos, pelo instante e, em empate, pelo identificador, como já ocorre na timeline de animais.
- Lote digitado com espaços ou caixas diferentes: a busca por lote normaliza `trim`, espaços consecutivos e caixa, para não fragmentar a rastreabilidade.

## UX / API Notes

- Interface em português, controles shadcn de `apps/web/src/components/ui`, layout em utilitários Tailwind no `className` e tokens de `DESIGN.md`. Nenhuma classe de feature em `globals.css`.
- Rotas do front: `/painel/vacinacao` para a agenda; `/painel/vacinacao/vacinas` para o catálogo, visível a todos e editável pela Coordenação; a seção de vacinação dentro de `/painel/animais/[id]`. O item `vacinacao`, hoje comentado em `apps/web/src/lib/nav.ts:36`, é descomentado e recebe ícone SVG de biblioteca já presente, sem emoji.
- Registrar aplicação, agendar, remarcar, cancelar e anular acontecem em `Dialog`, no padrão já adotado por animais e baias. Anulações e cancelamentos usam `AlertDialog` com motivo obrigatório.
- O aviso de aplicação adiantada é bloco inline no `Dialog` de registro, acima do botão de confirmar, com `Checkbox` de confirmação e campo de motivo que só aparece quando a confirmação é marcada. Não é `AlertDialog` empilhado: o objetivo é a pessoa ler antes de decidir, não fechar um modal em cima do outro.
- Estados de carregamento usam skeleton, na convenção já registrada em `DESIGN.md`. A agenda tem estado vazio próprio, distinto entre "nada agendado no período" e "nenhum resultado para os filtros".
- O identificador do recurso aberto fica na URL, conforme `.cursor/rules/front-url-recurso.mdc`: `/painel/vacinacao?agendamento=<id>` para o agendamento aberto.
- API sugerida, sob os guards de autenticação e perfil já existentes:
  - `GET /vacinas`, `POST /vacinas`, `GET /vacinas/:id`, `PATCH /vacinas/:id`, `POST /vacinas/:id/inativar`, `POST /vacinas/:id/reativar`. Sem `DELETE`.
  - `GET /animais/:id/vacinacao` devolve os protocolos do animal com doses aplicadas, faltantes, estado, próxima dose, **data mínima da próxima dose**, dias de aviso da vacina, aplicações e agendamento em aberto. A data mínima é o que permite o aviso antes do envio.
  - `POST /animais/:id/vacinacao/aplicacoes` registra aplicação, aceitando `confirmaAdiantada` e `motivoAdiantada`. `PATCH /animais/:id/vacinacao/aplicacoes/:aplicacaoId` edita campos não estruturais. `POST /animais/:id/vacinacao/aplicacoes/:aplicacaoId/anular` anula, exclusivo da Coordenação. Sem `DELETE`.
  - `POST /animais/:id/vacinacao/protocolos/:protocoloId/interromper` e `.../retomar`, com motivo obrigatório na interrupção.
  - `GET /vacinacao/agenda` com filtros de período, vacina, espécie, responsável, estado, `atrasados`, `incluirTerminais` e busca por animal, paginado, devolvendo também a contagem de atrasados. `GET /vacinacao/agendamentos/:id` para a tela abrir pelo id da URL. `POST /vacinacao/agendamentos`, `PATCH /vacinacao/agendamentos/:id` para remarcar, `POST /vacinacao/agendamentos/:id/cancelar`, `POST /vacinacao/agendamentos/:id/falta` e `POST /vacinacao/agendamentos/:id/baixa`, que cria a aplicação e fecha o agendamento na mesma transação.
  - `GET /vacinacao/aplicacoes?lote=` para a rastreabilidade por lote, informando presença de reação adversa por aplicação.
  - Reação adversa usa o endpoint de eventos já existente, `POST /animais/:id/eventos`, com o tipo novo, gravidade, desfecho e a referência opcional à aplicação. A atualização de desfecho é outra chamada ao mesmo endpoint, informando `eventoOrigemId`. Não há endpoint próprio de reação.
  - Entrar em observação antirrábica usa o fluxo de situação já existente, `PATCH /animais/:id`, com o valor novo do enum. Encerrar usa `POST /animais/:id/encerrar-observacao-antirrabica`, que exige observação final e nova situação e grava tudo em uma transação. O endpoint próprio existe porque são três escritas que precisam suceder juntas.
- Recusa de regra de domínio responde 409 com código estável e mensagem em português que explica o motivo e, quando aplicável, a data a partir da qual a operação é permitida. Falta de permissão responde 403; ausência de sessão, 401. O front consome os códigos, não o texto.
- O contrato tipado do front entra em `apps/web/src/lib/api.ts`, no padrão de baias e animais, reaproveitando `ApiError` e o refresh de sessão existentes.

## Data and Permissions

Persistência em Postgres, via Prisma, no esquema já existente em `apps/api/prisma/schema.prisma`.

Modelos novos:

- `Vacina`: `nome`, `nomeNormalizado` único, `especies` como lista de `EspecieAnimal`, `totalDoses`, `intervaloDosesDias`, `revacinacaoDias`, `diasAvisoProximaDose` com padrão 7, `idadeMinimaSemanas`, `fabricante`, `viaAplicacaoSugerida`, `obrigatoria`, `observacoes`, `ativa`, timestamps.
- `ProtocoloVacinal`: `animalId`, `vacinaId`, fotografia do esquema (`dosesPrevistas`, `intervaloDosesDias`, `revacinacaoDias`), `status`, `motivoInterrupcao`, `interrompidoPorId`, `interrompidoEm`, timestamps. Único por `animalId` e `vacinaId`. `diasAvisoProximaDose` **não** é fotografado aqui, por decisão explícita.
- `AplicacaoVacina`: `animalId`, `vacinaId`, `protocoloId`, `numeroDose`, `dataAplicacao` como data, `lote`, `loteNormalizado`, `validadeLote` como data, `viaAplicacao`, `observacao`, `registradoPorId`, `aplicadoPor`, `registroRetroativo`, `aplicadaAdiantada`, `motivoAdiantada`, `diasAntecipacao`, `dataProximaDose` como data, `dataProximaDoseCalculada`, `prontuarioId` nulo e reservado, `anuladaEm`, `anuladaPorId`, `motivoAnulacao`, timestamps.
- `AgendamentoVacinacao`: `animalId`, `vacinaId`, `protocoloId`, `numeroDosePrevista`, `dataHoraPrevista`, `responsavelId`, `observacao`, `status`, `motivoCancelamento`, `aplicacaoId`, `criadoPorId`, timestamps.

Enums novos: `StatusProtocoloVacinal` (`em_andamento`, `concluido`, `interrompido`) e `StatusAgendamentoVacinacao` (`agendado`, `aplicado`, `faltou`, `cancelado`).

Alterações em modelos e enums existentes, que são a parte desta spec que sai do módulo de vacinação:

- `SituacaoAnimal` recebe `em_observacao_antirrabica`. Em Postgres, acrescentar valor a enum é `ALTER TYPE ... ADD VALUE`, que não roda dentro de bloco transacional em versões mais antigas; a migration precisa isolar esse passo.
- `Animal` recebe `observacaoAntirrabicaInicioEm` (`DateTime?`), gravado na entrada na situação e limpo na saída. O início é campo próprio, e não derivado dos eventos, para o alerta ser uma consulta simples e sobreviver a edição de histórico.
- `TipoEventoAnimal` recebe os valores de vacinação e de agenda descritos em "Histórico e auditoria", mais `reacao_adversa` e `encerramento_observacao_antirrabica`.
- `EventoAnimal` recebe `aplicacaoVacinaId` (`Int?`), a referência opcional da reação adversa à aplicação que a originou; `eventoOrigemId` (`Int?`), auto-relação que liga a atualização de desfecho ao evento de reação original, na mesma forma que `ObservacaoAnimal.observacaoOrigemId` já usa; e `gravidadeReacao` e `desfechoReacao`, preenchidos somente em eventos `reacao_adversa`.
- Enums novos para a reação: `GravidadeReacaoAdversa` (`leve`, `moderada`, `grave`) e `DesfechoReacaoAdversa` (`em_acompanhamento`, `resolvida`, `resolvida_com_sequela`, `obito`).

Restrições de integridade que a migration precisa criar:

- Único em `Vacina.nomeNormalizado`.
- Único em `ProtocoloVacinal` por `animalId` e `vacinaId`.
- Único parcial em `AplicacaoVacina` por `protocoloId` e `numeroDose` apenas quando `anuladaEm` é nulo. Prisma não declara índice único parcial; a migration acrescenta o índice com `WHERE "anuladaEm" IS NULL` em SQL.
- Único parcial em `AgendamentoVacinacao` por `animalId` e `vacinaId` apenas quando `status` é `agendado`, também em SQL na migration.
- Índices de consulta: `AplicacaoVacina` por `animalId` e `dataAplicacao`, por `protocoloId` e por `loteNormalizado`; `AgendamentoVacinacao` por `status` e `dataHoraPrevista`, e por `animalId`; `Animal` por `situacao` e `observacaoAntirrabicaInicioEm`, para o alerta de 10 dias não varrer a tabela; `EventoAnimal` por `tipo` e `aplicacaoVacinaId`, e por `eventoOrigemId`, para a cadeia de desfecho e o alerta de reação em acompanhamento serem consulta indexada.

Permissões, aplicadas na API e refletidas na interface:

| Operação | coordenacao | veterinario | agente | recepcao |
| --- | --- | --- | --- | --- |
| Consultar catálogo, protocolos, aplicações e agenda | sim | sim | sim | sim |
| Criar, editar, inativar e reativar vacina | sim | não | não | não |
| Registrar aplicação | sim | sim | não | não |
| Confirmar aplicação adiantada com motivo | sim | sim | não | não |
| Editar campos não estruturais da aplicação | sim | sim | não | não |
| Anular aplicação | sim | não | não | não |
| Interromper e retomar protocolo | sim | sim | não | não |
| Criar, remarcar, cancelar, marcar falta e dar baixa em agendamento | sim | sim | não | não |
| Registrar reação adversa e atualizar seu desfecho | sim | sim | sim | sim |
| Mudar situação para observação antirrábica | sim | sim | sim | sim |
| Encerrar observação antirrábica com observação final | sim | sim | sim | sim |

As duas últimas linhas seguem a regra de eventos e de situação já vigente em gestão de animais, não a regra clínica deste módulo.

No front, `apps/web/src/lib/access.ts` ganha `canViewVacinacao`, `canManageVacinacao`, `canManageCatalogoVacinas` e `canAnularAplicacaoVacina`, no padrão dos helpers já existentes de baias e animais.

Mudança necessária no mapa de acesso: hoje `sectionRoles.vacinacao` é `clinico` (`apps/web/src/lib/access.ts:29`), o que esconderia a seção de agente e recepção. Como a consulta da agenda é liberada a todos os perfis autenticados e só a escrita é clínica, `sectionRoles.vacinacao` passa a `todos` e a restrição de escrita fica em `canManageVacinacao`. É a mesma separação já usada em baias, onde todos consultam e só a Coordenação opera.

Nenhum registro de vacinação é excluído. Correção é anulação motivada mais novo registro. A auditoria é append-only.

## Dependencies

- Autenticação JWT e perfis existentes, com os guards de papel já em uso.
- Gestão de animais, em três pontos que esta spec **altera**, não apenas consome:
  - A lista de situações ganha `em observação antirrábica`. A spec de animais, em `.ai-context/specs/gestao-de-animais.md`, enumera as situações e precisa ser atualizada quando isto for implementado.
  - Os eventos simples da ficha, hoje exame e diagnóstico, ganham reação adversa com referência opcional a uma aplicação.
  - A seção de alertas e pendências e o contador da listagem recebem oito alertas novos.
- Pontos de código que a situação nova toca, já mapeados: `apps/api/prisma/schema.prisma:69`; os DTOs `create-animal`, `update-animal`, `list-animais` e `revogar-situacao` em `apps/api/src/animais/dto/`; `apps/web/src/lib/api.ts:97` e `:293`; `apps/web/src/app/painel/animais/page.tsx:69` e `:93`; `apps/web/src/app/painel/animais/[id]/page.tsx:93`, `:586` e `:1117`. Os selos de situação usam variantes Tailwind `data-[estado=...]` nos `className` das duas páginas, então o valor novo precisa de par de tokens próprio ali.
- Serviço de auditoria existente, ampliado para as entidades de vacinação.
- Convenções de front já firmadas: shadcn, Tailwind, `DESIGN.md`, skeleton de carregamento e identificador do recurso na URL.
- Módulo de prontuário futuro, para preencher a ligação reservada em `AplicacaoVacina.prontuarioId`.
- Módulo de painel, para exibir o indicador de doses vencidas e a vencer.

## Catálogo inicial de vacinas

Decisão de 2026-09-25: o seed entra **somente com a antirrábica**, e o restante do catálogo é cadastrado pela Coordenação na tela. Números de esquema vacinal são decisão clínica e não entram no sistema como dado semeado sem aval do veterinário responsável.

Seed idempotente, uma entrada:

| Vacina | Espécies | Doses | Intervalo (dias) | Revacinação (dias) | Aviso (dias) | Idade mínima (semanas) | Obrigatória |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Antirrábica | cao, gato | 1 | — | 365 | 7 | 12 | sim |

A antirrábica é a única obrigatória, por ser o caso de uso UC07 e a razão sanitária do CCZ.

Lista de partida sugerida para a Coordenação cadastrar, **sem valores de esquema preenchidos por este documento**, porque cada um depende de bula e de protocolo local: V8 e V10 (polivalente canina), V3, V4 e V5 (polivalente felina), gripe canina / Bordetella, giárdia e leishmaniose. A tela de cadastro é o lugar onde esses números entram, com quem tem responsabilidade clínica para informá-los.

Como já ocorre no seed de raças, o seed de vacinas não remove nem sobrescreve vacinas cadastradas pela equipe.

## Open Questions

Todas as doze perguntas foram resolvidas pelo autor em 2026-09-25. Registro do que valeu:

1. ~~Aval do catálogo inicial~~ → seed só com a antirrábica; o resto a Coordenação cadastra.
2. ~~Janela de "dose a vencer"~~ → configurável por vacina, padrão 7 dias.
3. ~~Exceção de intervalo mínimo~~ → não é recusa e reenvio: é aviso antes de aplicar, com confirmação e motivo gravados no histórico. Segue liberada a veterinário e Coordenação.
4. ~~Vacinação em campanha~~ → fora do escopo.
5. ~~Controle de estoque~~ → fora do MVP.
6. ~~Reação adversa~~ → evento da ficha do animal, junto de exame e diagnóstico, com referência opcional à aplicação.
7. ~~Observação antirrábica~~ → situação nova `em observação antirrábica`, com alerta durante 10 dias.
8. ~~Bloquear antirrábica durante observação antirrábica~~ → não bloquear. Nenhuma situação do animal impede aplicar vacina.
9. ~~10 dias fixos ou configuráveis~~ → fixos no código. Não há parâmetro de sistema nem variação por animal.
10. ~~Desfechos no alerta vencido~~ → durante o período, o alerta mostra quantos dias faltam; ao vencer, passa a pedir a observação final, e a ação abre Encerrar observação antirrábica com observação final e nova situação, ambas obrigatórias.
11. ~~Gravidade e desfecho na reação adversa~~ → precisa dos dois. Gravidade em `leve`/`moderada`/`grave`; desfecho em `em acompanhamento`/`resolvida`/`resolvida com sequela`/`óbito`, atualizável por novo evento que referencia o original.
12. ~~Alcance do indicador do painel~~ → CCZ inteiro.

Pendências que restam, nenhuma bloqueante para começar a implementar:

- Os valores de gravidade e de desfecho da reação adversa são proposta deste documento. Precisam do aval do veterinário responsável antes de virarem enum no banco, porque enum em Postgres é caro de mudar depois. É a mesma cautela aplicada ao catálogo de vacinas.
- O catálogo de vacinas além da antirrábica continua dependendo de quem tem responsabilidade clínica para informar doses, intervalos e idades mínimas na tela.

## Implementation Handoff

Ordem sugerida, cada etapa verificável de ponta a ponta:

1. Persistência de vacinação: modelos novos, enums novos, migration com os dois índices únicos parciais em SQL e seed idempotente da antirrábica.
2. Persistência das alterações em animais: valor novo de `SituacaoAnimal` em passo isolado da migration, `Animal.observacaoAntirrabicaInicioEm`, valores novos de `TipoEventoAnimal`, enums de gravidade e desfecho da reação, e os campos `aplicacaoVacinaId`, `eventoOrigemId`, `gravidadeReacao` e `desfechoReacao` em `EventoAnimal`.
3. API do catálogo: CRUD sem exclusão, inativar e reativar, restrito à Coordenação, com testes Supertest cobrindo os quatro perfis, 401, 403, duplicidade normalizada e validação de `diasAvisoProximaDose`.
4. API de protocolos e aplicações: registro com as sete recusas e a condição de adiantamento, confirmação com motivo, data mínima da próxima dose na resposta, edição de campos não estruturais, anulação pela Coordenação, interromper e retomar, com recálculo do protocolo e gravação transacional de evento e auditoria.
5. API da agenda: criação, remarcação, cancelamento, falta, baixa transacional e reabertura na anulação, mais consulta paginada e filtrada e consulta por lote com presença de reação adversa.
6. Reação adversa e observação antirrábica na API de animais: evento com gravidade, desfecho e referência à aplicação; atualização de desfecho por evento novo que referencia o original, com o desfecho corrente derivado da cadeia; situação nova com gravação e limpeza do início do período; `POST /animais/:id/encerrar-observacao-antirrabica` transacional; e os DTOs atualizados.
7. Alertas: os nove alertas integrados à seção de pendências e ao contador da listagem de animais, com a janela por vacina, a contagem regressiva da observação em data local e o desfecho corrente da reação adversa.
8. Contrato tipado no front e helpers de permissão, com o ajuste de `sectionRoles.vacinacao` e os tokens de selo da situação nova.
9. Seção de vacinação na ficha do animal: protocolos, doses, aviso de adiantada, aviso de reação anterior à mesma vacina, reação adversa com gravidade e desfecho, agendamento em aberto e ações por perfil.
10. Tela da agenda em `/painel/vacinacao` e catálogo em `/painel/vacinacao/vacinas`.
11. Validação integrada no navegador, ajustes finais e atualização de `.ai-context/`, incluindo a lista de situações em `.ai-context/specs/gestao-de-animais.md`.

Antes de codar, passar por `implementation-plan` para fechar o caminho técnico e por `implementation-tasks` para o rastreio das etapas, como foi feito em baias e animais.
