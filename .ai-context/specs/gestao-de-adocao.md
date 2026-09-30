# Spec: Gestão de Tutores e Adoção

## Summary

Registrar o tutor pessoa física no banco do CCZ e formalizar a adoção a partir da ficha do animal. A situação `adotado` passa a ser consequência de uma adoção concluída, nunca uma opção manual de cadastro ou edição.

## Problem

O estado `adotado` existe no cadastro de animais, mas ainda não representa quem levou o animal, para onde ele foi, nem o aceite dos termos de responsabilidade. Isso deixa o desfecho sem comprovação e pode tirar o animal da operação do CCZ sem um processo de adoção.

## Goals

- Identificar e consultar o tutor responsável por cada animal adotado.
- Registrar dados pessoais, endereço, documento de identificação, foto opcional do tutor e fotos opcionais da documentação.
- Registrar a ciência e a concordância do tutor sobre os termos comunicados pelo funcionário, com assinatura desenhada na tela usando mouse ou toque.
- Fazer a adoção e a mudança de situação do animal como uma única operação auditável.
- Retirar automaticamente o animal da ocupação da baia quando a saída por adoção for concluída.
- Registrar a devolução como nova movimentação, preservando a adoção e permitindo outra adoção posteriormente.

## Non-Goals

- Portal ou login do tutor.
- Inscrição de candidatos, fila de interessados ou reserva de animais.
- Acompanhamento pós-adoção contínuo ou transferência direta de guarda entre tutores.
- Validação automática de documentos em bases externas.
- Cadastrar, exibir, versionar ou armazenar o texto dos termos da CCZ no sistema. O funcionário os comunica ao tutor fora do fluxo digital.

## Users

- Todos os perfis autenticados do CCZ (Coordenação, veterinário, agente e recepção): cadastram/atualizam tutores, consultam seus dados, concluem adoções e registram devoluções. A liberação excepcional de animal não saudável segue regra própria.
- Tutor: pessoa física que fornece seus dados, apresenta documento, concorda com os termos e leva o animal para casa. Nesta versão não acessa o sistema.

## User Stories

- Como funcionário autorizado, quero localizar um tutor pelo CPF antes de cadastrá-lo, para evitar registros duplicados.
- Como funcionário autorizado, quero cadastrar os dados e o endereço do tutor, para identificar quem ficará responsável pelo animal e onde ele residirá.
- Como funcionário autorizado, quero formalizar a adoção na ficha do animal com o aceite do tutor, para concluir a saída e preservar a comprovação.
- Como equipe do CCZ, quero consultar o tutor e o registro de ciência, concordância e assinatura a partir da ficha de um animal adotado, para reconstruir o desfecho.
- Como funcionário do CCZ, quero registrar a devolução de um animal adotado, para reabrir sua gestão no centro sem apagar a adoção anterior.

## Requirements

### Cadastro do tutor

- O tutor é pessoa física. Registrar nome completo, CPF, telefone de contato, endereço residencial completo (logradouro, número, complemento opcional, bairro, município, UF e CEP), tipo e número do documento apresentado para identificação. Foto do tutor e fotos da documentação são opcionais.
- CPF válido e único identifica o cadastro do tutor no CCZ. Ao informar CPF existente, oferecer seleção/atualização do cadastro autorizado, sem criar outra pessoa. Exibir dados suficientes para conferência antes de vinculá-lo.
- Permitir cadastrar tutor antes da adoção e reutilizar o mesmo tutor em adoções posteriores. Um tutor pode ter mais de um animal; cada adoção concluída tem exatamente um tutor.
- Dados do tutor podem ser corrigidos por pessoal autorizado, com autoria e histórico. Alteração posterior do endereço não apaga os dados confirmados no momento de uma adoção anterior.
- A ausência da foto do tutor ou de fotos da documentação não impede cadastro nem adoção. Aceitar até três fotos da documentação por tutor; a foto pessoal opcional é independente desse limite. Caso sejam incluídas, aceitar apenas imagens validadas e armazenadas em mídia gerenciada, sem expor caminho de disco. Guardar as fotos documentais sem prazo de expiração e sem remoção automática.

### Formalização na ficha do animal

- A ficha de animal elegível oferece ação **Registrar adoção**. O funcionário comunica os termos da CCZ ao tutor fora do sistema. O fluxo identifica ou cadastra o tutor, mostra animal e tutor para conferência, exige dois switches separados — confirmação de que o tutor recebeu ciência dos termos da CCZ e concordância com os termos de adoção e responsabilidade — e coleta a assinatura desenhada pelo tutor antes da conclusão. O sistema não apresenta nem armazena o texto dos termos.
- Oferecer área de assinatura que funcione com mouse e toque em dispositivo móvel, com ações para limpar e refazer o desenho. Não aceitar assinatura vazia.
- Registrar data e hora da adoção, tutor, animal, usuário que a concluiu, estado dos dois switches, data e hora da assinatura e imagem da assinatura desenhada vinculada à adoção. Não cadastrar texto, referência ou versão dos termos. Adoção sem os dois switches ativados e sem assinatura não pode ser concluída.
- Antes da confirmação final, mostrar aviso explícito: **Depois de confirmada, a adoção não pode ser revogada ou refeita. Para o animal voltar ao CCZ e poder ser adotado novamente, registre uma devolução.** Exigir confirmação específica desse aviso pelo operador.
- Ao concluir, criar o registro de adoção, vincular o tutor ao animal, definir situação `adotado`, liberar a baia ocupada e registrar histórico do animal e auditoria administrativa. Esses efeitos devem ser atômicos: falha em qualquer parte impede todos.
- Mostrar na ficha adotada o tutor, data da adoção, ciência/concordância registradas, assinatura e responsável pelo registro. A ficha permanece consultável e com as restrições de edição de estado terminal já existentes.
- A listagem de animais mantém a regra atual: adotados fora da lista padrão, acessíveis por filtro explícito.

### Elegibilidade e liberação excepcional

- Animal em situação `saudavel` é elegível para adoção. Animal em `em_tratamento` ou `em_quarentena_observacao` só pode ser adotado após liberação expressa para aquela adoção. Animal com `óbito` ou adoção ativa não é elegível.
- A liberação excepcional pode ser concedida por veterinário ou Coordenação. Exige justificativa, responsável autenticado e instante, e fica visível na revisão da adoção e no histórico do animal. Outros perfis podem concluir a adoção depois da liberação, mas não concedê-la.
- A liberação não substitui assinatura eletrônica, cadastro do tutor ou conclusão da adoção.

### Devolução

- Na ficha de animal adotado, oferecer **Registrar devolução** como única movimentação que reabre o animal para operação e futura adoção. Todos os perfis autenticados do CCZ podem concluí-la.
- Registrar adoção de origem, data e hora da devolução, motivo obrigatório, usuário que recebeu o animal, estado de saúde/situação operacional escolhida e observações de recepção opcionais. Mostrar tutor anterior e resumo da adoção na revisão.
- Ao confirmar, encerrar o vínculo de guarda atual, mudar o animal para uma situação operacional (`em_tratamento`, `em_quarentena_observacao` ou `saudavel`), atualizar a ocupação para sem baia ou para uma baia válida escolhida no fluxo, e registrar devolução no histórico e na auditoria. Todos esses efeitos são atômicos.
- A adoção original, seu tutor, declarações de ciência/concordância e assinatura permanecem imutáveis e consultáveis. A devolução gera novo registro, não modifica nem apaga a adoção. Depois dela, a ficha pode receber outra adoção completa, inclusive pelo mesmo tutor, com nova ciência, concordância e assinatura.
- Não permitir segunda devolução da mesma adoção nem devolução de animal sem adoção ativa.

### Regra da situação

- Remover `adotado` das opções manuais de situação em criação, edição e demais ações genéricas. A API também rejeita tentativa de definir `adotado` fora da operação de adoção, incluindo clientes antigos e chamadas diretas.
- Animal só pode ficar em situação `adotado` se existir adoção ativa vinculada a ele. Adoção ativa implica animal `adotado` e sem baia. Adoções devolvidas permanecem no histórico, sem manter vínculo de guarda atual.
- Animais em `óbito` ou já `adotado` não podem receber nova adoção. Animal devolvido pode receber outra adoção quando voltar a ser elegível.
- Desabilitar a revogação genérica de situação terminal para `adotado` na interface e na API. A devolução é a única transição permitida de `adotado` para situação operacional; a revogação de `óbito` mantém sua regra atual.
- Se houver registros legados em `adotado` sem adoção, identificá-los para regularização; não criar tutor, declarações ou assinatura fictícios.

## Acceptance Criteria

1. Dado CPF ainda não cadastrado, quando qualquer perfil autenticado salva nome, contato, endereço e documento válidos sem foto pessoal nem fotos da documentação, então o tutor é criado e pode ser selecionado na adoção.
2. Dado CPF já cadastrado, quando se tenta cadastrar outro tutor com o mesmo CPF, então o sistema indica o cadastro existente e não cria duplicata.
3. Dado tutor cadastrado, quando uma adoção posterior o seleciona, então os dois animais podem ficar vinculados a ele sem duplicar o tutor.
4. Dado animal saudável, quando qualquer perfil autenticado conclui a adoção com tutor, dois switches ativados e assinatura desenhada, então a ficha mostra `adotado`, tutor, data, ciência/concordância, assinatura e autor; a baia deixa de contabilizar o animal.
5. Dado formulário sem tutor ou dados obrigatórios do documento, com algum dos dois switches desligado, sem assinatura desenhada ou sem confirmação do aviso de irreversibilidade, quando se tenta concluir, então a adoção não é gravada e situação, tutor e baia do animal permanecem inalterados.
6. Dada falha ao gravar adoção, histórico ou auditoria, quando a conclusão é tentada, então nenhuma das mudanças de situação, vínculo ou ocupação é confirmada.
7. Dado cadastro/edição comum de animal, quando se abrem as opções de situação, então `adotado` não aparece; se cliente enviar esse valor diretamente à API, ela rejeita a mudança.
8. Dado animal adotado ou com óbito, quando se tenta registrar outra adoção, então o sistema recusa sem duplicar registros nem alterar a ficha.
9. Dado animal adotado, quando a equipe filtra explicitamente por adotados e abre sua ficha, então todos os perfis autenticados consultam os dados da adoção e do tutor, inclusive endereço e documento, sem poder editar o animal por ação comum.
10. Dadas duas tentativas simultâneas de adotar o mesmo animal, então no máximo uma conclui; a outra recebe conflito e não altera tutor, situação nem baia.
11. Dado animal em tratamento ou quarentena/observação, quando se tenta concluir adoção sem liberação expressa de veterinário ou Coordenação, então a operação é recusada; com liberação válida, sua justificativa, autor e instante ficam no histórico da adoção.
12. Dado animal adotado, quando se tenta usar a revogação genérica de situação, então interface e API impedem a ação e orientam a registrar devolução.
13. Dado animal adotado, quando qualquer perfil autenticado registra devolução com motivo e situação operacional, então a adoção original, suas declarações e assinatura permanecem consultáveis, o vínculo de guarda atual se encerra e a ficha mostra a nova situação, localização e evento de devolução.
14. Dado animal devolvido e novamente elegível, quando outra adoção é concluída, então nasce um novo registro de adoção com nova assinatura, preservando todas as adoções e devoluções anteriores.
15. Dado animal sem adoção ativa ou adoção já devolvida, quando se tenta registrar devolução, então o sistema recusa sem alterar a ficha.
16. Dada falha ou disputa concorrente ao registrar devolução, então no máximo uma devolução conclui e nenhuma mudança parcial de situação, vínculo, baia ou auditoria é mantida.
17. Dado uso por mouse ou toque, quando o tutor desenha, limpa e refaz a assinatura, então o traço atualizado aparece na tela e somente a versão confirmada é vinculada à adoção.
18. Dado tutor com três fotos documentais, quando se tenta adicionar outra, então o sistema recusa sem afetar a foto pessoal; após o armazenamento, as fotos não expiram automaticamente.

## Edge Cases

- Falha de rede durante envio: evitar segunda adoção ao repetir a solicitação; mostrar o resultado efetivo ao recarregar a ficha.
- CPF e documento digitados com pontuação diferente: normalizar para busca e unicidade sem perder formato legível.
- Tutor muda de endereço depois da adoção: preservar o endereço confirmado no registro da adoção e mostrar o endereço atual no cadastro do tutor.
- Animal está sem baia: a adoção pode concluir e registra que não havia baia a liberar.
- Foto pessoal ou da documentação inválida/indisponível: informar o erro sem criar referência quebrada; permitir continuar sem essas imagens.
- Registro de adoção feito por engano: não revogar nem apagar; o operador deve registrar devolução com motivo que descreva a correção, mantendo ambos os registros na trilha.
- Animal devolvido sem baia disponível: permitir retorno como “Sem baia”, com pendência de alocação visível na ficha. Se uma baia for escolhida, validar capacidade, estado e isolamento pelas regras existentes.

## UX / API Notes

- Iniciar o fluxo em `/painel/animais/[id]` com identificação clara do animal. Buscar tutor por CPF e permitir cadastro sem perder o andamento da adoção.
- Mostrar resumo dos dados do tutor, endereço e documento antes da confirmação. Na etapa de consentimento, mostrar apenas os dois switches com rótulos claros e a área de assinatura desenhada, sem texto dos termos ou campo de versão. O aviso de irreversibilidade aparece imediatamente antes de confirmar a adoção.
- Após concluir, mostrar confirmação e atualizar ficha, histórico, situação e ocupação de baia. Erros preservam os dados preenchidos e indicam o campo ou conflito correspondente.
- A ficha adotada oferece **Registrar devolução**, com motivo e situação de retorno obrigatórios; o histórico exibe cada ciclo de adoção e devolução em ordem cronológica.
- A implementação deve validar as regras na API, independentemente da interface. Rotas concretas ficam para o plano técnico.

## Data and Permissions

- Persistir `Tutor` separadamente da conta de acesso dos funcionários. A herança conceitual `Usuario` → `Tutor` no diagrama não obriga login, senha nem `perfilAcesso` para o tutor nesta versão.
- Persistir cada adoção e devolução como eventos relacionados ao animal, com vínculo de guarda atual derivado do ciclo ainda não devolvido. Um animal pode ter várias adoções ao longo do tempo, mas no máximo uma adoção ativa. Cada adoção tem exatamente um tutor, os dois consentimentos e uma assinatura desenhada.
- Persistir dados confirmados na ocasião, valores dos dois switches, imagem da assinatura desenhada, instantes, autores e trilha de auditoria. O sistema registra a declaração de ciência/concordância, sem comprovar qual texto foi comunicado pelo funcionário. Até três fotos opcionais da documentação ficam vinculadas ao tutor, são servidas por rota autenticada e não têm expiração automática.
- Todos os perfis autenticados (`coordenacao`, `veterinario`, `agente`, `recepcao`) podem cadastrar/atualizar tutores, concluir adoções, registrar devoluções e consultar dados completos do tutor e da adoção. Listas e eventos devem evitar divulgação desnecessária de CPF e documento; a ficha autenticada dá acesso ao detalhe.
- Não excluir adoção ou devolução nem revogar adoção confirmada. Correções de dados do tutor são auditadas; correções no ciclo do animal são novas movimentações com autoria, preservando os registros originais.

## Dependencies

- Ficha, situação terminal, histórico e auditoria de animais existentes.
- Ocupação de baias integrada ao animal.
- Comunicação dos termos da CCZ pelo funcionário ao tutor fora do sistema, antes dos switches e da assinatura.
- Armazenamento gerenciado da assinatura desenhada e das fotos documentais, mantidas por prazo indeterminado.

## Open Questions

- Nenhuma decisão funcional pendente para este escopo.

## Implementation Handoff

- Planejar o cadastro/busca de tutor, a captura da assinatura desenhada por mouse/toque, os dois switches, a operação transacional de adoção, a devolução e as alterações de API/UI que impedem `adotado` manual e revogação genérica da adoção.
- O modelo anterior de zero ou uma adoção por animal deve passar a histórico de múltiplos ciclos, com no máximo uma adoção ativa por animal.
- Incluir liberação excepcional restrita a veterinário e Coordenação, três fotos documentais opcionais por tutor e armazenamento sem expiração automática.
- Revisar os dados atuais em situação `adotado` antes de impor invariantes de persistência.
