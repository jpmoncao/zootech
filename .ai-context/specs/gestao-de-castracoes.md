# Spec: Gestão de castrações

## Summary

Permitir que a equipe consulte e organize a agenda de castração e mantenha no histórico do animal os procedimentos já realizados, inclusive os anteriores à implantação do ZooTech. O status de castração deixa de ser um campo isolado e passa a refletir um registro de castração com estado, datas e observações.

## Problem

Animais do CCZ compartilham baias, então a equipe precisa identificar com confiança quais já foram castrados e planejar os procedimentos pendentes. O cadastro atual só informa um status, sem data ou contexto. Na implantação, também será necessário cadastrar animais já castrados sem confundir esses casos com uma cirurgia futura.

## Goals

- Agendar castrações futuras por animal e visualizar a agenda.
- Registrar a realização com data efetiva e observações clínicas/operacionais.
- Registrar castrações anteriores ao sistema, preservando a informação disponível sem inventar datas.
- Consultar status, histórico e observações a partir da ficha do animal.
- Evitar agendamento simultâneo duplicado para o mesmo animal.

## Non-Goals

- Controle completo de prontuário, anestesia, materiais, custos ou estoque.
- Gerenciar disponibilidade de salas, equipes, cirurgiões ou recursos hospitalares.
- Emitir lembretes externos ou integrar com calendário externo.
- Substituir protocolo clínico ou decisão veterinária.

## Users

- Coordenação: consulta e registra castrações conforme as permissões atuais de animais.
- Veterinário: consulta a agenda, agenda procedimentos e registra execução e observações.
- Agente e recepção: consultam o status na ficha do animal; podem operar conforme a política de escrita definida para animais.

## User Stories

- Como funcionário responsável pela rotina, quero agendar a castração de um animal para uma data futura e encontrá-la numa agenda, para preparar o procedimento.
- Como veterinário, quero registrar quando o procedimento aconteceu e observações, para manter um histórico clínico confiável.
- Como usuário que está migrando dados, quero marcar uma castração antiga como realizada mesmo sem saber a data exata, para representar corretamente o animal sem inventar informação.
- Como membro da equipe, quero ver de forma clara se a castração está pendente, agendada, realizada ou cancelada, para reduzir erros na convivência em baias compartilhadas.

## Requirements

1. O cadastro do animal não deve permitir alterar diretamente um booleano de castração. O status apresentado deve derivar dos registros de castração.
2. Cada registro pertence a um animal e representa uma avaliação de status ou uma tentativa de procedimento. Registros de procedimento têm estado `agendada`, `realizada` ou `cancelada`; uma avaliação pode registrar explicitamente `não castrado`.
3. Um registro `agendada` requer data e hora planejadas e pode conter observação. Deve ser possível alterar data/hora e observação antes da execução.
4. A conclusão registra data/hora efetivas e observação do procedimento. A data efetiva pode diferir da planejada.
5. Uma castração legada pode ser criada diretamente como `realizada`, sem agendamento prévio. Deve indicar origem legada e aceitar data efetiva desconhecida; quando conhecida, a data é armazenada como tal.
6. Datas desconhecidas devem permanecer nulas/desconhecidas e aparecer como “data não informada”; não inferir data a partir do acolhimento, criação do animal ou data da migração.
7. A agenda padrão lista procedimentos agendados, em ordem cronológica, e permite filtrar por período e buscar por nome ou número de registro do animal. Deve haver forma de consultar realizadas e canceladas.
8. A ficha do animal mostra status atual, próximo agendamento (se houver) e histórico de castrações com data planejada, data efetiva quando houver, observação, estado, origem e autor.
9. Alterações de agenda, conclusão e cancelamento devem ser auditáveis, com usuário autenticado e instante da operação.
10. Nenhum animal em estado terminal (adotado/óbito) pode receber novo agendamento ou alteração; o histórico existente continua consultável.
11. O sistema deve permitir correção de erro sem apagar silenciosamente o histórico. Cancelamento exige motivo; correção de registro concluído deve gerar trilha auditável.

## Acceptance Criteria

1. Dado um animal operacional sem castração agendada, quando um usuário autorizado informar data/hora futura e salvar, então o procedimento aparece na agenda e a ficha do animal passa a indicar “Agendada”.
2. Dado um agendamento existente, quando a equipe alterar a data planejada, então a agenda mostra a nova data e o histórico registra a alteração com autor e instante.
3. Dado um procedimento agendado, quando o veterinário o concluir com data efetiva e observação, então o estado passa a “Realizada”, a ficha exibe a data efetiva e a observação e o procedimento sai da lista de futuros.
4. Dado um animal já castrado antes da implantação, quando a equipe registrar uma castração legada, então pode marcá-la realizada sem criar agendamento e sem preencher data desconhecida.
5. Dada uma castração legada sem data, quando a ficha for consultada, então exibe “Realizada — data não informada” e mantém a observação disponível.
6. Dado um procedimento futuro, quando o usuário cancelar, então precisa informar motivo, o item deixa de aparecer entre os futuros e continua consultável como cancelado no histórico.
7. Dado um animal com um agendamento ativo, quando um usuário tentar criar outro agendamento ativo, então a operação é recusada com explicação e o agendamento original permanece intacto.
8. Dado um animal com um agendamento cancelado, quando a equipe precisar tentar novamente, então pode criar um novo agendamento e o cancelado permanece no histórico.
9. Dada uma data planejada anterior ao momento atual, quando for criado um novo agendamento, então o sistema recusa a data e orienta a registrar o procedimento como realizado/legado se ele já ocorreu.
10. Dado um animal adotado ou com óbito, quando um usuário tentar agendar ou alterar castração, então a API recusa a operação; o histórico permanece visível.
11. Dada qualquer mudança persistida, quando a auditoria falhar, então a operação não é confirmada.
12. Dado um animal com status de castração ainda não apurado, quando consultado, então o sistema mostra “Não informado” até que exista uma avaliação ou procedimento; não interpreta ausência de registro como “não castrado”.

## Edge Cases

- Agendamento vencido e não concluído: continua pendente na agenda, com indicador de atraso; não se converte automaticamente em realizada nem cancelada.
- Alteração de data planejada para antes de hoje: recusar como agendamento futuro e orientar conclusão retroativa se compatível com o caso.
- Procedimento realizado sem hora conhecida: admitir data efetiva sem hora, se a implementação suportar precisão por campo; nunca preencher hora fictícia.
- Duplicidade concorrente: restrição transacional garante no máximo um agendamento ativo e no máximo um procedimento realizado por animal; tentativas canceladas permanecem no histórico.
- Castração legada já registrada e necessidade de correção: manter trilha e exigir justificativa; não excluir silenciosamente.
- Animal terminal com agendamento existente: manter o item no histórico e permitir cancelamento por qualquer usuário autenticado com motivo, sem novo agendamento.
- Castração marcada como realizada por engano: correção auditável deve permitir restabelecer estado coerente sem apagar evento anterior.
- Falha de rede ou validação no formulário: manter valores digitados.
- Fuso horário: persistir instantes em UTC e exibir no fuso local da aplicação.

## UX / API Notes

- Criar seção “Castrações” na navegação do painel com agenda futura e acesso ao histórico.
- Na ficha do animal, apresentar status conciso e ação para agendar ou registrar castração anterior, conforme permissão.
- No formulário de legado, destacar que a data é opcional quando desconhecida e oferecer observação contextual.
- Na conclusão, diferenciar data planejada de data efetiva.
- Rotas implementadas: `GET /animais/castracoes` com filtros globais; `GET /animais/:id/castracoes`; `POST /animais/:id/castracoes/avaliacao`; `POST /animais/:id/castracoes/legado`; `POST /animais/:id/castracoes/agendamento`; `PATCH /animais/:id/castracoes/:castracaoId/reagendar`; `PATCH /animais/:id/castracoes/:castracaoId/concluir`; `PATCH /animais/:id/castracoes/:castracaoId/cancelar`. A API valida estado e permissão, sem confiar no status derivado enviado pelo cliente.
- Exibir na agenda nome, número de registro, espécie, baia atual (quando houver), data/hora planejada e status. Permitir abrir a ficha do animal.
- Interface em português, usando controles shadcn e identidade descrita em `DESIGN.md`.

## Data and Permissions

- Registro: animal, tipo (avaliação ou procedimento), estado, origem (`fluxo` ou `legada`), data/hora planejada opcional, data efetiva com hora opcional, data de avaliação opcional, observação, motivo de cancelamento quando aplicável, autor e instantes de criação/atualização.
- Restrições: `agendada` requer data e hora planejadas futuras; `realizada` requer data efetiva ou origem legada com data desconhecida explicitamente aceita; `cancelada` requer motivo. Permitir várias tentativas canceladas, no máximo um agendamento ativo e no máximo um procedimento realizado por animal.
- Migração de `castrado = não`: criar avaliação legada “Não castrado”, sem representar uma cirurgia; conservar data desconhecida como nula e permitir registrar observação. `nao_informado` permanece sem avaliação/procedimento.
- Estado derivado no animal: agendada quando há agendamento ativo; realizada quando há procedimento concluído; não castrado quando há avaliação correspondente e nenhuma cirurgia realizada; não informado quando não há informação. Cancelado não equivale a não castrado.
- Todos os perfis autenticados podem consultar, agendar, reagendar, concluir, cancelar e corrigir registros de castração. Autoria sempre deriva da sessão autenticada; a API rejeita visitantes sem sessão.
- Auditoria append-only para criação, reagendamento, observação alterada, conclusão, cancelamento e correção.

## Dependencies

- Autenticação JWT, usuários/perfis e auditoria existentes.
- Cadastro e ficha de animais, incluindo estados terminais e links de navegação.
- Definição de permissões de escrita do módulo de animais.

## Open Questions

1. ~~A data de castração deve registrar apenas o dia ou também hora/minuto?~~ Respondida: data e hora para agendamentos; data efetiva com hora opcional.
2. ~~Quem pode agendar, concluir e cancelar?~~ Respondida: todos os usuários autenticados podem consultar e operar castrações.
3. ~~A agenda deve incluir local, veterinário responsável ou recursos?~~ Respondida: não nesta primeira versão.
4. ~~Um animal pode ter mais de uma castração?~~ Respondida: não pode passar por mais de um procedimento realizado. Pode ter novas tentativas de agendamento depois de cancelar; cada cancelamento fica no histórico e existe no máximo um agendamento ativo.
5. ~~Como classificar animais sem registro na implantação?~~ Respondida: “Não informado”; a equipe registra legado como realizada ou agenda após apuração.

## Implementation Handoff

- Atualizar a spec de gestão de animais para remover o select/enum independente de castração e substituir os alertas e filtros por estado derivado do módulo.
- Implementar primeiro modelo, validações transacionais e auditoria; depois API, agenda e integração com ficha/listagem.
- Para dados existentes, migrar `castrado = sim` para um registro legado realizado com data desconhecida; `não informado` permanece sem registro. Migrar `castrado = não` para uma avaliação legada “Não castrado”, sem criar registro de procedimento. Agendamentos cancelados são inativados e mantidos no histórico; nova tentativa cria novo agendamento.
- Atualizar arquitetura, decisões e glossário quando as perguntas em aberto forem resolvidas e a implementação começar.
