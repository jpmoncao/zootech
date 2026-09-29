# Spec: Dashboard Operacional

## Summary

Criar a página inicial do painel ZooTech como um resumo operacional do CCZ, mostrando ocupação e distribuição de animais, situações clínicas, pendências de procedimentos e adoções concluídas no mês.

## Problem

A equipe precisa reconhecer rapidamente o volume e a situação atual do plantel e identificar pendências que exigem acompanhamento. Hoje a página `/painel` exibe apenas o componente de posto/turno, sem indicadores agregados do domínio.

## Goals

- Exibir os indicadores solicitados numa visão única, atualizada a partir dos registros persistidos.
- Mostrar separadamente o total de animais ativos e o total de animais alojados.
- Permitir sair de um número agregado para a lista ou módulo relacionado, quando houver destino operacional.
- Deixar claros período, unidade e critérios usados em cada contagem.
- Respeitar autenticação e permissões existentes.

## Non-Goals

- Criar relatórios epidemiológicos, gráficos históricos ou exportação.
- Criar calendário ou notificações push para pendências.
- Substituir as telas de gestão de animais, baias, castrações e adoções.
- Definir/implementar todo o prontuário clínico ou vacinação como parte desta dashboard.

## Users

Usuários autenticados do CCZ: Coordenação, veterinário, agente e recepção. A dashboard oferece leitura resumida e encaminha para operações já autorizadas pelo RBAC.

## User Stories

- Como pessoa da equipe, quero ver quantos animais estão alojados e a ocupação de cada baia para avaliar rapidamente a capacidade do CCZ.
- Como veterinário ou equipe operacional, quero ver animais em quarentena e em tratamento para localizar casos que requerem acompanhamento.
- Como equipe de adoção, quero saber quantos animais estão disponíveis e quantas adoções foram concluídas no mês.
- Como pessoa responsável pela rotina, quero ver vacinas e castrações pendentes para priorizar o trabalho.

## Requirements

### Indicadores

1. **Total de animais ativos:** contar animais que não estejam em situação terminal (`adotado` ou `obito`), independentemente de possuírem baia. Inclui saudáveis, em tratamento e em quarentena/observação.
2. **Total de animais alojados:** contar animais ativos atualmente atribuídos a uma baia. Este indicador é exibido separado do total de animais ativos.
3. **Animais por baia:** para cada baia ativa, mostrar ocupação atual `ocupantes/capacidade`, inclusive baias vazias. A ocupação representa os animais ativos ligados à baia. Não incluir baias inativas/interditadas nesta relação; se uma baia não ativa ainda tiver ocupantes, mostrar um alerta separado de ocupação irregular com quantidade e acesso ao detalhe/lista relacionada.
4. **Animais em quarentena:** contar animais ativos cuja situação seja `em_quarentena_observacao`.
5. **Animais em tratamento:** contar animais ativos cuja situação seja `em_tratamento`.
6. **Animais disponíveis para adoção:** contar somente animais saudáveis (`situacao = saudavel`) sem adoção ativa. Animais em tratamento ou quarentena não entram, mesmo que tenham liberação excepcional.
7. **Vacinas pendentes:** futura implementação. O indicador depende do módulo de vacinação/prontuário em desenvolvimento e não deve ser mostrado como número até existir fonte confiável para as doses pendentes.
8. **Castrações pendentes:** contar animais com um procedimento de castração em estado `agendada` que ainda não foi realizado ou cancelado. Mostrar procedimentos vencidos dentro deste total, sem duplicar um animal por registros cancelados ou avaliações. Recomenda-se expor também o subconjunto atrasado se disponível sem ampliar o escopo da métrica principal.
9. **Adoções realizadas no mês:** contar registros `Adocao` cuja `adotadaEm` esteja dentro do mês calendário corrente, no fuso `America/Sao_Paulo`; devoluções posteriores não apagam a adoção histórica desse total. Mostrar também o total do mês calendário anterior, a variação absoluta e a variação percentual. Quando o mês anterior for zero, mostrar a variação absoluta e omitir o percentual, pois ele não pode ser calculado.

### Interação e apresentação

- A rota `/painel` apresenta os indicadores em grupos legíveis: plantel/ocupação, acompanhamento clínico, pendências e adoções.
- Cada indicador exibe nome, valor e, quando aplicável, unidade/período. Valor zero é exibido como `0`, não como ausência de dado.
- Indicadores com destino disponível são acionáveis e levam à tela correspondente com filtros apropriados, preservando permissões e usando as rotas existentes. Animais disponíveis levam à lista filtrada por situação saudável; adoções realizadas levam à lista filtrada pelo período de `adotadaEm` correspondente.
- “Animais por baia” permite abrir a baia ou a listagem de animais filtrada por ela.
- Não exibir o componente de posto/turno na dashboard; esse campo não faz parte do escopo do projeto.
- Mostrar carregamento, erro recuperável de consulta e estado sem dados sem confundir falha com valor zero.
- Atualizar dados ao abrir/recarregar a página. Não exigir atualização em tempo real nesta versão.

## Acceptance Criteria

1. Dado que existam animais com e sem baia e em situações operacionais/terminais, quando a dashboard carregar, então o total alojado conta somente os não terminais com baia.
2. Dadas baias ativas ocupadas e vazias, quando a seção por baia carregar, então todas aparecem com ocupação atual e capacidade correta.
3. Dado um animal em `em_quarentena_observacao` ou `em_tratamento`, quando os indicadores carregarem, então ele é contado apenas no indicador da situação correspondente.
4. Dado um animal saudável sem adoção ativa, quando a dashboard carregar, então ele é contado como disponível; animais em tratamento ou quarentena não são contados, mesmo que tenham liberação excepcional.
5. Dado que o módulo de vacinação ainda esteja em desenvolvimento, quando a dashboard for implementada, então “vacinas pendentes” fica marcado como futura implementação e não apresenta número fictício.
6. Dado um procedimento de castração agendado ativo, quando as pendências forem calculadas, então ele é contado uma vez; avaliações e castrações canceladas/realizadas não entram.
7. Dadas adoções concluídas antes, dentro e depois do mês corrente, quando a dashboard carregar, então apenas as adoções no mês calendário corrente em `America/Sao_Paulo` são contadas.
8. Dado que uma adoção do mês tenha sido devolvida, quando o total mensal for calculado, então o registro histórico da adoção continua contado.
9. Dado que uma consulta da dashboard falhe, quando a página for exibida, então o erro é indicado como erro e não como zero.
10. Dado um usuário autenticado, quando abrir `/painel`, então os dados agregados respeitam o escopo de acesso autenticado e links não concedem permissões adicionais.
11. Dado que uma baia inativa ou interditada possua animais alocados, quando a dashboard carregar, então a seção de baias ativas não a inclui e um alerta separado informa a ocupação irregular.
12. Dadas adoções no mês atual e no mês calendário anterior, quando a dashboard carregar, então apresenta ambos os totais, a variação absoluta e a variação percentual; omite o percentual quando o mês anterior teve zero adoções.
13. Dado um indicador acionável, quando o usuário o selecionar, então chega à tela operacional relacionada com filtro compatível, se suportado pela tela de destino.

## Edge Cases

- Animal em situação terminal ainda vinculado a uma baia por inconsistência: não contar como ativo/alojado; a seção por baia deve permitir detectar a divergência e sinalizá-la como ocupação irregular.
- Animal adotado e devolvido: a adoção antiga continua no histórico mensal do mês em que ocorreu; o estado atual do animal segue a situação registrada na devolução.
- Liberação excepcional consumida por adoção: não contar como elegibilidade atual.
- Registros de castração cancelados ou múltiplas tentativas históricas: não duplicar pendências.
- Baia inativa/interditada com ocupantes legados: não aparece na lista de baias ativas; seus ocupantes são reportados no alerta separado de ocupação irregular.
- Início/fim de mês e horário próximo à meia-noite: aplicar consistentemente o fuso `America/Sao_Paulo` ao período mensal.
- Erro parcial numa métrica: definir se a dashboard mostra as demais métricas disponíveis e sinaliza somente o bloco afetado ou falha toda a página.

## UX / API Notes

- A tela segue os tokens e componentes existentes em `DESIGN.md` e `apps/web`; usar controles shadcn e Tailwind para layout.
- Preferir uma consulta agregada dedicada no backend, evitando carregar todas as páginas de animais/castrações para contar no cliente.
- Resposta da API deve distinguir valor válido zero, indisponibilidade por dependência não implementada e erro de consulta.
- O contrato de `GET /dashboard` é:
  - `atualizadoEm`: instante ISO-8601 da fotografia;
  - `plantel`: `{ animaisAtivos, animaisAlojados, disponiveisAdocao }`, todos inteiros não negativos;
  - `acompanhamentoClinico`: `{ emTratamento, emQuarentena }`;
  - `ocupacao.baiasAtivas`: lista `{ baiaId, codigo, ocupantes, capacidade, estado }`, incluindo baias ativas vazias;
  - `ocupacao.irregulares`: `{ animalAtivoEmBaiaNaoAtiva, animalTerminalAlocado }`, contagens independentes e não somadas ao plantel regular;
  - `pendencias.castracoesAgendadas`: quantidade de procedimentos agendados;
  - `pendencias.vacinas`: `{ estado: "futura_implementacao", mensagem }`, sem campo numérico;
  - `adocoes`: `mesAtual` e `mesAnterior` com `{ inicio, fim, total }`, além de `variacaoAbsoluta` e `variacaoPercentual` (`null` quando o mês anterior for zero).
- As métricas válidas sem registros retornam `0` e listas vazias. Falha da consulta retorna erro HTTP, nunca zeros inventados.
- O endpoint não devolve dados pessoais de tutores e exige apenas autenticação; a autorização das telas acessadas pelos links continua sendo aplicada nos destinos.
- A resposta deve incluir instante de referência (`atualizadoEm`) para comunicar que os totais são uma fotografia da consulta.
- Links devem usar destinos existentes: `/painel/animais`, `/painel/baias`, `/painel/castracoes` e fluxo de adoção na ficha; filtros devem ser adicionados apenas se a tela oferecer suporte real.

## Data and Permissions

- Fontes atuais: `Animal.situacao`, `Animal.baiaId`, `Baia.capacidade/estado`, `CastracaoAnimal.estado/tipo`, `Adocao.adotadaEm/encerradaEm` e `LiberacaoAdocao.consumidaEm`.
- Vacinas pendentes dependem de prontuário/doses com data prevista e estado de aplicação, que não existem no schema atual; ficam para futura implementação após conclusão do módulo correspondente.
- Acesso ao endpoint da dashboard exige autenticação. Todos os perfis autenticados veem os mesmos indicadores; permissões das ações e telas de destino continuam respeitando o RBAC. Métricas não devem expor dados pessoais de tutores.
- Datas devem ser tratadas com a política de fuso da aplicação; para adoções mensais a regra de produto é `America/Sao_Paulo`.

## Dependencies

- Domínio atual de animais, baias, castrações e adoções.
- Decisão sobre quais perfis veem quais métricas.
- Definição/modelagem do módulo de prontuário e vacinação para habilitar contagem de vacinas pendentes.
- Contrato de filtros nas telas destino para navegação a partir dos cartões.

## Open Questions

1. ~~Animais ativos e animais alojados são totais distintos?~~ Respondido: mostrar os dois; ativos inclui todo animal não terminal e alojados inclui somente os ativos com baia.
2. ~~Quais animais contam como disponíveis para adoção?~~ Respondido: somente saudáveis.
3. ~~Como calcular vacinas pendentes?~~ Respondido: futura implementação, dependente do módulo de vacinação em desenvolvimento.
4. ~~Como exibir baias inativas/interditadas ocupadas?~~ Respondido: listar apenas baias ativas e mostrar alerta separado de ocupação irregular.
5. ~~Comparar adoções com período anterior?~~ Respondido: comparar com o mês calendário anterior e mostrar também percentual (exceto quando não houver base anterior).
6. ~~O componente “Posto/Turno” deve continuar na página inicial?~~ Respondido: não; o campo não faz parte do escopo do projeto.
7. ~~Há perfis com métricas restritas?~~ Respondido: não; todos os perfis autenticados veem todos os indicadores.

## Implementation Handoff

- Implementar a navegação com filtros de situação e datas de adoção; incluir filtros por `adotadaEm` na lista de animais se necessário.
- Detalhar vacinação quando o módulo correspondente estiver pronto.
- Implementar endpoint agregado usando consultas no banco, com critérios de contagem compartilhados com os módulos de origem.
- Não lançar contagem de vacinas até existir fonte de dados confiável.
- Construir a página inicial `/painel` e verificar valores zero, erro, conjunto misto de estados, mês/fuso e links.
- Atualizar arquitetura/contexto quando a dashboard e seu endpoint forem implementados.
