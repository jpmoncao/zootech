# Spec: Gestão de Baias

## Summary

Especificar o cadastro, consulta, edição e gestão operacional das baias do CCZ, incluindo ocupantes, visualizações em lista e mapa, interdição, inativação, higienização e histórico de auditoria.

## Problem

A equipe precisa saber onde cada animal está, qual é a capacidade e condição de cada baia e quais ações foram realizadas nela. Sem um cadastro e histórico consistentes, alocação, higienização e interdição ficam difíceis de acompanhar.

## Goals

- Manter cadastro confiável das baias e seus atributos físicos/operacionais.
- Consultar baias em lista ou mapa e identificar rapidamente disponibilidade e condição.
- Impedir alocações que violem capacidade, tipo ou estado operacional.
- Registrar as ações da baia em histórico rastreável.

## Non-Goals

- Definir cadastro clínico ou ciclo de vida do animal.
- Implementar transferência como fluxo completo nesta especificação; ela aparece apenas como dependência para manter os ocupantes consistentes.
- Desenhar planta baixa em escala ou configurar coordenadas físicas de cada baia.
- Usar os exemplos de espécie, subtipo de setor, números e nomes da captura como dados obrigatórios.

## Users

- Coordenação: administra baias e consulta a auditoria do CCZ.
- Veterinário e equipe operacional: consultam disponibilidade e ocupação; executam ações conforme autorização definida pelo RBAC.

## User Stories

- Como pessoa da equipe, quero cadastrar e editar uma baia para manter sua identificação, capacidade e características corretas.
- Como pessoa da equipe, quero ver baias em lista ou mapa e filtrar por setor e estado para localizar uma vaga adequada.
- Como pessoa responsável pela alocação, quero ver os animais ocupantes e a capacidade restante para evitar exceder limites.
- Como pessoa responsável pela operação, quero interditar, inativar ou registrar higienização para refletir a condição real da baia.
- Como Coordenação, quero consultar todas as ações de uma baia para rastrear alterações e eventos operacionais.

## Requirements

### Cadastro e edição

- Cada baia possui: código, setor (`canil`, `gatil` ou `quarentena`), tipo (`coletiva` ou `individual`), capacidade, área opcional, indicador de solário, indicador de uso exclusivo para isolamento e data/hora da última higienização opcional.
- Código é obrigatório e único.
- Capacidade é inteiro maior ou igual a 1. Baia individual tem capacidade exatamente 1; baia coletiva tem capacidade de pelo menos 1, sem máximo global definido nesta spec.
- A baia também possui um estado operacional: ativa (padrão), inativa, interditada ou em higienização. Estados e transições são mantidos pelo sistema, não definidos como campos livremente editáveis no formulário.
- Exclusividade para isolamento restringe alocação a animais cujo campo clínico explícito `emIsolamento` esteja ativo. Esse indicador é independente da situação geral do animal.
- Baia inativa, interditada ou em higienização não aceita novos ocupantes.
- Exclusão física não é permitida quando houver histórico ou ocupantes; o registro deve ser inativado para preservar rastreabilidade.
- Alterar a capacidade para valor inferior ao número de ocupantes é recusado.

### Lista e mapa

- Disponibilizar visualização em lista e visualização em mapa esquemático. A visualização de mapa organiza cartões por setor; não representa escala nem posição geográfica real.
- Cada item mostra pelo menos código, setor, estado, ocupação/capacidade e ocupantes (ou indicação de vazio).
- Permitir filtrar por setor e estado operacional e buscar pelo código.
- A lista e o mapa refletem atualizações após cadastro, edição, ocupação e ações operacionais.
- Indicadores agregados podem resumir ocupadas, livres, em higienização e interditadas; “livre” significa ativa, sem ocupantes e sem ação operacional em curso.

### Ações operacionais

- **Interditar:** muda o estado para interditada e registra evento. Uma baia ocupada não pode ser interditada até que os animais sejam transferidos.
- **Inativar:** retira a baia da operação e impede novas ocupações. Uma baia ocupada não pode ser inativada até que os animais sejam transferidos.
- **Higienizar:** inicia uma ação de higienização, muda o estado para em higienização e impede alocação; ao concluir, registra data/hora e responsável, atualiza última higienização e retorna ao estado ativa.
- Interdição e inativação são ações explícitas com confirmação. Para reativar ou liberar uma interdição, usuário autorizado executa a ação correspondente e o evento também é auditado.
- Ações devem capturar responsável e instante. Motivo/observação é opcional nesta versão, sujeito às decisões abertas.

### Ocupantes

- Exibir a relação dos animais atualmente alocados à baia.
- A aplicação de uma alocação deve validar capacidade, estado operacional e regra de isolamento de forma atômica.
- Um animal pode não ocupar baia, inclusive temporariamente durante tratamento; quando alocado, ocupa no máximo uma baia por vez. Alocação/transferência/saída atualiza origem e destino sem duplicidade e registra o evento do animal.
- A gestão completa de transferências entre baias pertence ao fluxo de animais; este módulo deve atualizar sua exibição e gerar eventos de auditoria da baia de origem e destino.

### Auditoria

- Cada baia tem histórico cronológico, do mais recente para o mais antigo, contendo eventos de criação, edição, alocação/saída de animal, interdição/liberação, inativação/reativação e higienização. O animal sem baia continua visível no módulo de animais com alerta e ação de alocação.
- Cada evento inclui data/hora, usuário responsável, tipo de ação e resumo dos dados alterados. Para edição, registrar campos alterados e valores anterior/novo relevantes.
- Eventos de auditoria são imutáveis e não podem ser removidos pela interface.
- A trilha deve ser consultável pela Coordenação e respeitar autorização de auditoria já definida no sistema.

## Acceptance Criteria

1. Dado um código já cadastrado, quando alguém tentar criar outra baia com o mesmo código, então o sistema recusa e informa o conflito.
2. Dada uma baia individual, quando capacidade for enviada diferente de 1, então cadastro/edição é recusado.
3. Dado que a capacidade seja menor que 1, quando salvar, então o sistema recusa e indica o intervalo válido.
4. Dada uma baia com `n` ocupantes, quando a capacidade for alterada para valor menor que `n`, então a alteração é recusada sem modificar os dados.
5. Dada uma baia inativa, interditada ou em higienização, quando um usuário tentar alocar um animal, então a operação é recusada e a causa é apresentada.
6. Dada uma baia exclusiva para isolamento, quando um animal não elegível para isolamento for alocado, então a operação é recusada.
7. Dada uma baia ocupada, quando alguém solicitar interdição ou inativação, então o sistema não efetiva a ação e informa que os ocupantes precisam ser transferidos.
8. Dada uma baia ativa e desocupada, quando higienização for iniciada e concluída, então seu estado passa por “em higienização”, a data da última higienização é atualizada ao concluir e ambos os eventos aparecem na auditoria.
9. Dado um usuário autorizado, quando criar ou editar uma baia, então o evento correspondente aparece no histórico com responsável, instante e resumo das mudanças.
10. Dado um evento de auditoria registrado, quando alguém tentar removê-lo pela interface, então nenhuma operação de remoção é oferecida.
11. Dada qualquer combinação de filtros de setor, estado e busca por código, quando aplicada na lista ou mapa, então ambas as visualizações exibem o mesmo conjunto de baias correspondente.
12. Dada uma alocação ou transferência válida, quando concluída, então o animal aparece apenas na baia de destino; uma saída sem destino deixa-o sem baia. Totais de ocupação atualizam e baias/animal registram eventos relacionados.
13. Dado um usuário sem autorização para administrar baias ou ver auditoria, quando tentar acessar a operação, então o acesso é negado conforme RBAC.

## Edge Cases

- Duas tentativas concorrentes de ocupar a última vaga: apenas uma pode concluir.
- Alteração de setor/tipo/exclusividade que torne os ocupantes atuais incompatíveis: recusar enquanto houver ocupantes incompatíveis.
- Higienização iniciada mas não concluída: manter estado em higienização e permitir retomar/concluir conforme autorização; não atualizar última higienização antes da conclusão.
- Interdição ou inativação concorrente com alocação: validar estado e ocupação na mesma transação.
- Código com espaços ou diferenças apenas de caixa: normalizar antes de verificar unicidade (recomendação: trim e comparação case-insensitive).
- Baia sem data de higienização: mostrar “não registrada”, sem inferir que nunca foi higienizada.
- Falha na gravação do evento de auditoria: a operação correspondente não pode ser confirmada sem trilha de auditoria.

## UX / API Notes

- A captura de tela serve de referência para mapa/lista, cards por baia, indicadores de ocupação e painel de detalhes/edição.
- O mapa é uma grade agrupada por setor, com legenda persistente para estados e seleção do cartão para abrir detalhes.
- O cadastro pode abrir em página ou painel lateral; deve apresentar validação junto ao campo e preservar dados em caso de erro.
- A confirmação de ações deve explicar o impacto e, quando bloqueada por ocupantes, oferecer acesso ao fluxo de transferência.
- API deve impor as mesmas regras do cliente e usar transações para capacidade, alocação e auditoria.

## Data and Permissions

- Persistir baias, ocupação corrente e eventos no Postgres.
- Usar relação entre baia e animal para representar ocupação; a regra do domínio garante no máximo uma baia corrente por animal.
- Usar identificadores e timestamps consistentes com o modelo atual e associar cada evento ao usuário autenticado.
- O RBAC atual tem `coordenacao`, `veterinario`, `agente` e `recepcao`; permissões específicas de escrita por perfil devem ser confirmadas antes da implementação. A auditoria permanece consultável pela Coordenação.

## Dependencies

- Cadastro de animais e seus estados de acolhimento/isolamento.
- Fluxo de alocação e transferência entre baias.
- Autenticação e RBAC existentes.
- Serviço/tabela de auditoria existente, com capacidade de identificar entidade e eventos do domínio.

## Open Questions

1. Quais perfis podem criar/editar baias e executar higienização, interdição e inativação? Recomendação: Coordenação administra cadastro e libera interdição/inativação; equipe operacional e veterinários podem registrar higienização.
2. Interdição exige motivo obrigatório, previsão de liberação ou ambos?
3. Inativação e interdição devem permitir ocupantes após confirmação, ou transferir continua pré-condição? Esta spec recomenda exigir baia vazia.
4. Higienização pode começar com animais presentes? Recomendação: não, exigir baia vazia.
5. Uma baia inativa/interditada pode ser reativada diretamente ou há fluxo de inspeção/liberação?
6. Existe máximo de capacidade para baias coletivas ou limite configurável por setor/espécie?
7. ~~Como determinar elegibilidade para baia exclusiva para isolamento?~~ Respondida: campo clínico explícito `emIsolamento`, independente da situação geral do animal.
8. Área usa qual unidade e precisão (m² recomendado)?
9. Auditoria deve permitir filtros por período, ação e responsável, além da consulta por baia?

## Implementation Handoff

- Confirmar as decisões abertas de permissões, motivos e regras de higienização antes de implementar ações operacionais.
- Alinhar os estados de isolamento do animal com a regra de exclusividade.
- Implementar persistência e validação no backend antes de conectar formulário, lista e mapa.
- Tratar transferência como operação transacional integrada à ocupação e à auditoria.
