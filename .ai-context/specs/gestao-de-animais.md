# Spec: Gestão de Animais

## Summary

Especificar cadastro, consulta, edição e acompanhamento de animais do CCZ: identificação, fotos, situação, baia opcional, eventos clínicos e operacionais, observações auditadas e navegação para registros relacionados. O cadastro usa etapas curtas, adequadas à rotina e ao uso em celular. A lista abre cada animal em rota dedicada de visualização/edição.

## Problem

O animal é o centro do trabalho do CCZ, mas ainda não existe registro integrado para acompanhar acolhimento, localização, cuidados contínuos e adoção. A equipe precisa identificar cada animal, saber sua situação e histórico, registrar intervenções e corrigir prontamente animais sem baia designada.

## Goals

- Manter ficha confiável e pesquisável para cada animal.
- Simplificar cadastro diário por etapas e uso mobile.
- Mostrar claramente animais sem baia e facilitar sua readequação.
- Acompanhar vacinação, castração, exames, diagnósticos, peso, observações e mudanças de situação em histórico auditável.
- Dar acesso aos animais a todos os perfis autenticados.
- Preservar registros relacionados e arquivos referenciados quando um animal não puder ser removido.

## Non-Goals

- Cadastro de tutores ou formalização integral do processo de adoção.
- Prescrição clínica completa, prontuário detalhado ou estoque/lote de medicamentos, além dos eventos mínimos deste escopo.
- Integração com armazenamento externo de fotos.
- Aplicativo offline.

## Users

Todos os perfis autenticados do CCZ: Coordenação, veterinário, agente e recepção. Todos podem consultar, criar e editar registros de animais. Regras mais restritas para ações clínicas ou exclusão ficam descritas em permissões específicas, abaixo.

## User Stories

- Como pessoa da equipe, quero cadastrar um animal rapidamente em etapas claras, para registrar acolhimento sem formulário pesado.
- Como pessoa da equipe, quero localizar um animal por nome ou número de registro e abrir sua ficha dedicada, para consultar ou corrigir dados.
- Como pessoa responsável por baias, quero identificar animais sem baia e abrir diretamente a alocação/transferência, para readequá-los.
- Como veterinário, quero consultar no histórico os eventos clínicos do animal e, em etapas futuras, registrar vacinação e castração em módulos próprios.
- Como membro da equipe, quero registrar observações com autoria e data, para compartilhar informação operacional com rastreabilidade.
- Como Coordenação, quero consultar o histórico completo e auditável de um animal, para reconstruir acolhimento, cuidados, localização e desfecho.

## Requirements

### Ficha e identificação

- Campos: nome; número de registro textual; espécie; raça; sexo (`macho`, `fêmea`); porte (`pequeno`, `médio`, `grande`); cor/pelagem; situação; indicador clínico de isolamento (`em isolamento` sim/não); castrado (sim/não); peso atual opcional; data de acolhimento; data de nascimento ou idade estimada; baia opcional; criado por; acolhido por (texto livre); fotos, incluindo uma foto de identificação; observações.
- Número de registro é obrigatório e único, preservando zeros e caracteres do identificador.
- Espécies iniciais: cão e gato. Raças são valores cadastrados associados a uma espécie. O formulário oferece busca rápida e inclusão rápida de raça da espécie selecionada. A inclusão rápida cria valor reutilizável globalmente, normalizado em Unicode NFC, com `trim`, espaços consecutivos colapsados e comparação case-insensitive para evitar duplicatas; API valida correspondência da espécie. “Outra” permite informar uma raça fora do catálogo e cria uma opção reutilizável para a espécie. “Não Informada” é opção explícita quando raça é desconhecida; “SRD (Sem Raça Definida)” identifica animal sem raça definida. “Outra” e “Não Informada” são opções especiais e não contam como raça livre duplicável.
- Foto de identificação deve ser uma das fotos da galeria e fica visualmente marcada na ficha e na listagem. Uma foto pode ser definida como identificação por vez.
- Situações: `em tratamento`, `em quarentena/observação`, `saudável`, `adotado`, `óbito`. O indicador `emIsolamento` é campo clínico separado da situação. Mudanças de situação são eventos do histórico com responsável, data/hora e, opcionalmente, observação/motivo.
- Sexo pode ser `macho`, `fêmea` ou `não informado`. Quando não informado, criar alerta/pendência visível na seção “Alertas e pendências” da ficha e indicar alerta na listagem. A raça `Não Informada` também gera alerta. Idade estimada sem data de nascimento deve exibir “aprox.” e gerar alerta de dado aproximado. Castrado é sim/não; pode ficar pendente se dado ainda não foi apurado, gerando alerta.
- Data de nascimento conhecida prevalece sobre idade estimada. Quando só idade aproximada for conhecida, guardar estimativa e indicador de aproximação; mostrar “aprox.” e não inventar data exata. Se nascimento ocorrer no CCZ, informar a data. A idade pode ser atualizada pelo sistema para exibição.
- Data de acolhimento é obrigatória, exceto animal nascido no CCZ: registrar nascimento e acolhimento no mesmo evento/data quando aplicável, sem exigir uma entrada anterior.
- Criado por vem da sessão autenticada e não é editável. Acolhido por é texto livre; manter também o usuário autenticado que registrou o acolhimento no evento de auditoria.
- Peso atual é opcional e deriva do registro de pesagem mais recente; cada pesagem guarda valor, unidade (kg), instante, responsável e observação opcional. Pesagens anteriores não são sobrescritas.

### Baia e localização

- Animal pode estar sem baia, inclusive temporariamente durante tratamento. Baia atual é opcional.
- Ficha mostra alertas/pendências em seção própria, incluindo “Sem baia”, sexo não informado, raça não informada, idade aproximada e outros dados faltantes relevantes. Cada alerta tem explicação e ação quando aplicável. Listagem sempre marca animais que tenham um ou mais alertas e mostra contador/indicador acessível; ausência de baia é um alerta, embora possa ser temporária para tratamento.
- Ao alocar ou transferir, validar capacidade e estado operacional. Baia exclusiva para isolamento aceita apenas animal com indicador `emIsolamento = true`; este indicador clínico é explícito e independente da situação geral. Alocação e eventos relacionados são transacionais.
- Baia pode ficar vazia durante tratamento sem apagar registros anteriores de ocupação. O histórico do animal registra cada alocação, transferência e saída de baia, com origem/destino, instante e responsável.
- Atualizar spec de baias para remover cardinalidade obrigatória e aceitar zero ocupantes por animal; capacidades, interdição, isolamento e rastreabilidade permanecem.

### Galeria de fotos

- Aceitar até 10 fotos por animal e marcar uma como identificação. Mostrar contador (ex.: 3/10) e impedir upload excedente com mensagem clara.
- Aceitar formatos de imagem padrão: JPEG/JPG, PNG e WebP. Validar extensão e conteúdo real.
- Foto exibida deve ser quadrada: no envio, abrir editor de corte quadrado antes de salvar; manter original apenas se necessário para novo corte dentro do limite temporário definido pela implementação.
- Se arquivo enviado exceder 5 MB, comprimir no servidor para WebP, qualidade inicial 85, reduzindo progressivamente até 70 para ficar abaixo de 5 MB. Saída quadrada limitada a 1200×1200 px. Guardar somente versão processada; se não alcançar o limite até qualidade 70, informar erro e não gravar foto.
- Nesta versão, armazenar arquivos no diretório gerenciado de fotos do projeto e guardar no banco caminho absoluto controlado pelo servidor. Manter arquivo enquanto animal existir; limpar somente foto removida ou órfã, sem expiração automática. Nunca aceitar caminho arbitrário do cliente; o cliente envia arquivo e a API decide o destino.
- Remover uma foto individual exige confirmação em diálogo antes de excluir arquivo e referência. Ao remover foto de identificação, selecionar outra automaticamente se houver fotos restantes; se galeria ficar vazia, ficha passa a mostrar ausência de foto identificadora.
- Apagar arquivo somente se pertencer ao diretório gerenciado e não estiver referenciado por outro registro. Nunca aceitar caminho arbitrário do cliente. Falha de limpeza deve ser registrada e recuperável, sem deixar referência inválida na ficha.

### Alertas e pendências

- Ficha possui seção dedicada “Alertas e pendências”. Cada item explica o dado pendente ou condição operacional, indica quando foi detectado e oferece ação direta para resolver quando aplicável.
- Alertas iniciais: sem baia, sexo não informado, raça não informada, idade aproximada e castração não informada. Alertas são recalculados após edição e ficam também no histórico quando a condição que os gerou muda, sem apagar eventos passados.
- Todo animal com ao menos um alerta recebe indicador/contador persistente na listagem, além dos alertas individuais na ficha. Indicador deve ter texto acessível, não depender apenas de cor.

### Cadastro em etapas e navegação

- Cadastro dividido em etapas focadas: identificação; características e idade; acolhimento/localização; fotos; revisão. Campos obrigatórios aparecem cedo e erros preservam dados já preenchidos.
- Cada etapa funciona em viewport mobile, com controles de toque adequados, progresso visível, avançar/voltar e salvamento ao concluir. A operação diária deve permitir cadastro mínimo e completar dados depois.
- Cadastro mínimo recomendado: nome, número de registro, espécie, sexo ou desconhecido, situação, data de acolhimento (ou nascimento no CCZ) e usuário criador. Campos adicionais podem ser completados posteriormente.
- Listagem padrão exclui situações `adotado` e `óbito`; filtro explícito permite consultá-los. Oferece busca por nome/número e filtros por espécie, situação, sexo, porte, castração, baia/sem baia e alertas. Exibir foto identificadora, nome, registro, espécie/raça, situação, baia e indicador/contador de alertas quando existirem.
- Selecionar uma linha/card sempre navega para rota dedicada, por exemplo `/painel/animais/[id]`. A rota permite visualizar/editar e mantém o id na URL conforme convenção do projeto. Breadcrumbs levam à lista e a links dos relacionamentos (baia, eventos clínicos e adoção quando existirem).
- Histórico é acessível diretamente na ficha, em ordem cronológica reversa, com tipo, resumo, data/hora e autor. Ações vinculadas devem abrir seus detalhes.

### Ações e histórico

- CRUD de vacinação e castração não pertence a esta entrega; ficam como próximos passos em módulos próprios. Histórico do animal deve permitir integrar esses registros depois.
- Próximo módulo de vacinação deve contemplar nome da vacina, data, próxima dose opcional, lote, dose e aplicador. Próximo módulo de castração deve contemplar fila/agenda, execução e pós-operatório, além da atualização auditável do campo castrado.
- Nesta entrega, ações de exame e diagnóstico podem ser registradas como eventos auditáveis simples com tipo, data/hora, responsável autenticado e descrição/resultado. Eventos não alteram situação automaticamente.
- Ações operacionais auditadas incluem criação, edição, acolhimento, mudança de situação, alocação/transferência/saída de baia, pesagem, inclusão/remoção de foto, alteração da foto identificadora, evento clínico, observação e adoção/óbito/fuga/retorno quando aplicável.
- Cada evento é imutável e registra autor, instante, ação, resumo e mudanças relevantes (valores anterior/novo). Correções são novos eventos que referenciam o registro corrigido; não apagar silenciosamente histórico.
- Observações são registros append-only com texto, autor e instante. Todos os perfis autenticados podem ver e adicionar. Edição/remoção não é oferecida; correção é nova observação que referencia a anterior.
- Eventos de auditoria devem gravar na mesma transação da operação do domínio; falha em gravar auditoria impede confirmar a operação.
- Adoção não é implementada neste módulo: é próximo passo que deve vincular tutor e processo de adoção. Registrar animal como adotado só será possível quando fluxo de adoção existir. Óbito pode ser registrado como mudança de situação auditável. Fuga/retorno permanecem eventos auditáveis em etapas futuras.

### Alertas, estados terminais e permissões

- Todos os perfis autenticados podem consultar, criar e editar animais em situação operacional, registrar observações e consultar histórico. Eventos ficam atribuídos ao usuário autenticado.
- Nunca oferecer nem permitir exclusão de registro de animal, independentemente do perfil. O endpoint `DELETE /animais/:id` não deve existir; preservar dados, fotos e histórico.
- Animal em situação `adotado` ou `óbito` fica somente para consulta: bloquear edições, upload/remoção de fotos, novas observações, pesagens, alocações e eventos comuns para todos os perfis.
- Coordenação pode revogar situação `adotado` ou `óbito` somente para corrigir erro, com confirmação e motivo obrigatório. A revogação cria evento imutável com situação anterior/nova, motivo, usuário e instante. A ficha volta a ser editável após a revogação. Revogação de adoção não substitui fluxo de retorno/tutor, que fica no próximo módulo.
- A API aplica permissões e validações além da interface.

## Acceptance Criteria

1. Dado um número de registro já usado, quando qualquer perfil tentar cadastrar outro animal com esse número, então a API recusa com conflito e a ficha existente não muda.
2. Dado um cadastro novo, quando o usuário preencher apenas campos mínimos e concluir, então o animal é criado e pode receber os demais dados depois.
3. Dado um formulário aberto em celular, quando a pessoa avança/volta entre etapas, então progresso e valores permanecem e controles cabem no viewport.
4. Dado uma espécie cão ou gato, quando a pessoa buscar raça, então só aparecem raças daquela espécie; ao adicionar uma raça válida, ela fica disponível para novos animais da mesma espécie e duplicata normalizada é recusada.
5. Dado um animal sem baia, quando a ficha ou lista abrir, então aviso “Sem baia” aparece com ação de alocação.
6. Dado uma baia cheia, inativa, interditada, em higienização ou incompatível com isolamento, quando tentarem alocar/transferir animal, então operação é recusada sem alterar origem/destino e explica o motivo.
7. Dado um animal com nascimento conhecido, quando ficha mostrar idade, então calcula idade a partir da data; dado idade aproximada sem nascimento, então mostra “aprox.” sem criar data falsa.
8. Dado uma pesagem nova, quando for salva, então peso atual passa a ser o valor mais recente e histórico mantém pesagens anteriores, responsável e instante.
9. Dado uma ação clínica, observação, mudança de situação ou mudança de baia, quando salva, então histórico mostra evento, autor e instante; se gravação da auditoria falhar, mudança não é confirmada.
10. Dado uma observação já registrada, quando alguém consultar a ficha, então todos os perfis a veem com autor e instante; não existe edição ou remoção silenciosa.
11. Dada uma foto de identificação, quando ela for substituída/removida, então ficha e lista usam nova seleção; arquivos removidos só são apagados se forem gerenciados e sem outras referências.
12. Dado qualquer animal, quando qualquer usuário tentar excluí-lo, então operação não existe ou é recusada e ficha, fotos e histórico permanecem.
13. Dado um animal com sexo/raça desconhecidos, idade aproximada ou sem baia, quando ficha/listagem forem exibidas, então alertas aparecem na seção de pendências e indicador da listagem.
14. Dado upload de fotos, quando animal já tiver 10 fotos, então sistema recusa outra; foto acima de 5 MB é comprimida, e usuário pode cortar imagem em formato quadrado antes de salvar.
15. Dada solicitação para remover foto, quando confirmar no diálogo, então referência é removida e arquivo gerenciado sem referências é apagado.
16. Dado animal adotado ou com óbito, quando qualquer perfil tentar editar, então API recusa e ficha continua consultável.
17. Dado erro de situação terminal, quando Coordenação revogar com motivo, então situação é corrigida e evento de revogação aparece no histórico com autor e instante.
18. Dada uma linha/cartão de animal na listagem, quando selecionada, então abre rota dedicada com id na URL, breadcrumbs e links para relacionamentos.
19. Dado um perfil autenticado, quando consultar/criar/editar animal operacional ou observar ficha, então pode concluir as operações autorizadas; visitante sem sessão recebe 401.
20. Dado consulta sem filtro de status, quando listagem carregar, então animais adotados e com óbito não aparecem; filtro explícito permite abrir ficha somente leitura.

## Edge Cases

- Duas alocações simultâneas disputam última vaga: só uma conclui.
- Duas criações com mesmo registro ou raça normalizada concorrentes: restrição única no banco resolve atomicamente.
- Falha após arquivo enviado mas antes de concluir animal: arquivo órfão é limpo ou marcado para limpeza segura.
- Animal sem baia por tratamento: aviso permanece; não impedir salvar tratamento ou consulta.
- Remoção de baia atual: evento registra saída e ficha passa claramente a “Sem baia”.
- Animal adotado ou falecido não aparece na lista padrão, mas filtro explícito abre ficha somente leitura. Revogação de situação terminal por Coordenação exige motivo e cria evento auditável.
- Animal nascido no CCZ pode não ter data de acolhimento anterior; aceitar registro coerente sem data inventada.
- Raça não informada e sexo não informado são válidos, porém geram alerta de pendência visível em ficha e listagem.
- Dados legados/importados sem sexo, raça ou idade devem ser representáveis sem inventar valores.
- Arquivo em uso por mais de um animal não é apagado ao remover apenas uma referência.
- Erro de rede ou validação não perde conteúdo do formulário por etapas.
- Auditoria registra zona horária consistente (instante UTC; apresentação local) e ordenação estável para eventos simultâneos.

## UX / API Notes

- Interface em português, componentes shadcn e identidade de `DESIGN.md`.
- Rota sugerida: `/painel/animais`; detalhe: `/painel/animais/[id]`; ações do histórico podem ser subrotas ou painéis identificados pelo id do evento.
- API sugerida: `GET/POST /animais`, `GET/PATCH /animais/:id`, `GET/POST /animais/:id/eventos`, `GET/POST /animais/:id/observacoes`, `POST /animais/:id/fotos`, `DELETE /animais/:id/fotos/:fotoId` (apenas foto, com confirmação no cliente), `POST /animais/:id/alocacao`, `POST /animais/:id/revogar-situacao` (Coordenação, motivo obrigatório), `GET/POST /especies/:especie/racas` ou endpoint equivalente. Não criar DELETE de animal.
- Lista suporta paginação e filtros. API valida formato, enum, espécie/raça, capacidade e autoria.
- Operações de foto devem usar upload multipart autenticado. Caminho de arquivo nunca vem confiado do cliente.
- Listagem destaca sem baia e status de desfecho; navegação por teclado e rótulos acessíveis acompanham cores e ícones.

## Data and Permissions

- Persistir espécie/raça (raça associada à espécie), animal, foto, baia opcional, pesagens, observações, eventos simples de exame/diagnóstico e histórico no Postgres. Modelos de vacinação, castração e adoção pertencem a próximos módulos.
- Seed idempotente do catálogo padrão abaixo; opções especiais `Outra` e `Não Informada` também são semeadas para cada espécie. Inclusões personalizadas feitas pela equipe não são removidas por execução posterior do seed.
- Salvar caminhos absolutos de arquivos gerenciados pelo app, mas tratar diretório-raiz como configuração interna do servidor. Não expor path local em API pública; retornar URL de mídia servida pelo app.
- Autor de cada operação deriva do usuário autenticado; `criadoPor` não é editável.
- Todos perfis atuais autenticados (`coordenacao`, `veterinario`, `agente`, `recepcao`) consultam, criam e editam animais, adicionam observações e registram eventos segundo esta spec.
- Nenhum perfil pode excluir animais. Coordenação pode revogar situação adotado/óbito por erro, com motivo obrigatório e evento de auditoria. Fichas em estados terminais são somente leitura.
- Registro de auditoria é append-only e consultável na ficha por todos os perfis autorizados a ver animais; auditoria administrativa geral continua exclusiva da Coordenação.

## Dependencies

- Autenticação JWT e perfis existentes.
- Gestão de baias existente; ajustar ocupação para baia opcional e eventos de alocação.
- Tabela/serviço atual de auditoria, ampliada para eventos do domínio animal e consulta na ficha.
- Diretório gerenciado de fotos, política de servir mídia e rotinas para limpar arquivos órfãos.
- Módulos futuros de tutor/adoção, prontuário e clínica, para ligações e breadcrumbs reais.

## Catálogo padrão de raças

Seed inicial, confirmado pelo autor em 2026-09-24. Raças associadas à espécie; manter acentuação e nomes de exibição. Seed deve ser idempotente.

### Cães

- SRD (Sem Raça Definida)
- Akita
- Basset Hound
- Beagle
- Border Collie
- Boxer
- Buldogue Francês
- Buldogue Inglês
- Bull Terrier
- Cane Corso
- Chihuahua
- Chow Chow
- Cocker Spaniel
- Dachshund
- Dálmata
- Doberman
- Dogo Argentino
- Fila Brasileiro
- Golden Retriever
- Husky Siberiano
- Labrador Retriever
- Lhasa Apso
- Maltês
- Mastim Napolitano
- Pastor Alemão
- Pastor Belga
- Pinscher
- Pit Bull (American Pit Bull Terrier)
- Poodle
- Pug
- Rottweiler
- Schnauzer
- Shih Tzu
- Spitz Alemão (Lulu da Pomerânia)
- Staffordshire Bull Terrier
- Yorkshire Terrier
- Outra (opção especial; abre campo de texto e adiciona raça personalizada reutilizável para cães)
- Não Informada (opção especial para raça desconhecida)

### Gatos

- SRD (Sem Raça Definida)
- Abissínio
- Angorá
- Azul Russo
- Bengal
- Bobtail
- British Shorthair (Pelo Curto Inglês)
- Burmês
- Exótico
- Himalaio
- Maine Coon
- Munchkin
- Persa
- Ragdoll
- Savannah
- Scottish Fold
- Siamês
- Siberiano
- Sphynx
- Outra (opção especial; abre campo de texto e adiciona raça personalizada reutilizável para gatos)
- Não Informada (opção especial para raça desconhecida)

## Open Questions

1. ~~Catálogo exato de raças padrão.~~ Respondida: catálogo acima fornecido pelo autor.
2. ~~Permitir animais sem sexo conhecido?~~ Respondida: permitir e exibir alerta na ficha e listagem.
3. ~~Exclusão física e fotos.~~ Respondida: animal nunca é deletado; foto individual pode ser removida após confirmação.
4. ~~Limites de fotos.~~ Respondida: máximo 10 por animal, corte quadrado, formatos JPEG/JPG, PNG, WebP; comprimir arquivos acima de 5 MB.
5. ~~Campos de vacinação.~~ Respondida: além de vacina/data/próxima dose, incluir lote, dose e aplicador; CRUD de vacinação fica para próximos passos.
6. ~~Escopo de castração.~~ Respondida: módulo de castração fica para próximos passos.
7. ~~Adoção.~~ Respondida: módulo fica para próximos passos; estado adotado só após existir fluxo integrado.
8. ~~Estados terminais.~~ Respondida: adotado/óbito somente leitura; Coordenação pode revogar com motivo auditado; listagem padrão exclui ambos e filtro permite consulta.

## Implementation Handoff

- Alinhar cardinalidade opcional da baia com `.ai-context/specs/gestao-de-baias.md` antes da implementação.
- Implementar alertas para sexo/raça desconhecidos, idade aproximada e ausência de baia.
- Aplicar política de não exclusão, remoção confirmada de fotos, limite/compressão/corte e bloqueio de edição de estados terminais.
- Usar catálogo de raças e limites de fotos confirmados nesta spec.
- Implementar primeiro persistência, validação transacional, eventos auditáveis e upload seguro; depois contrato web, cadastro por etapas, listagem e ficha dedicada. Manter vacinação, castração e adoção no backlog de módulos seguintes, com campos e dependências descritos nesta spec.
- Atualizar arquitetura de baias e glossário durante implementação, não antes: esta entrega é somente especificação.
