# Implementation Plan: Gestão de Tutores e Adoção

## Objective

Implementar o cadastro de tutores, a adoção e a devolução pela ficha do animal, garantindo que `adotado` só seja definido por uma adoção confirmada e que uma nova adoção exija devolução registrada.

## Relevant Context

- Requisitos funcionais estão em `.ai-context/specs/gestao-de-adocao.md`.
- A API NestJS já tem módulos de animais, baias, autenticação e Prisma. `AnimaisService` mantém transações para edição, alocação, timeline e auditoria; o controller exige JWT e, sem decorador `Roles`, aceita qualquer perfil autenticado.
- `CreateAnimalDto` e `UpdateAnimalDto` já excluem `adotado` das situações aceitas. O estado terminal bloqueia edição comum, mas a revogação genérica atual permite Coordenação revogar tanto adoção quanto óbito; essa rota e sua interface precisam distinguir os estados.
- `Animal.baiaId` dirige a ocupação real das baias. A alocação valida estado, capacidade e isolamento e bloqueia a baia em transação.
- A ficha existente fica em `apps/web/src/app/painel/animais/[id]/page.tsx`; os contratos e chamadas HTTP estão em `apps/web/src/lib/api.ts`. Há shadcn `Switch`, `Dialog` e componentes de mídia. Não há biblioteca de assinatura instalada; `Pointer Events` em um canvas pode cobrir mouse e toque.
- Fotos de animais usam raiz local gerenciada e rotas autenticadas, mas o limite de 10, o crop quadrado e a tabela `FotoAnimal` são específicos da galeria do animal. Fotos pessoais/documentais e assinatura precisam de armazenamento e regras próprios.
- Prisma está na versão 6.16.2. A auditoria administrativa existente usa `AuditoriaEvento`; a timeline do animal usa eventos append-only.

## Files and Modules Likely Involved

### API e persistência

- `apps/api/prisma/schema.prisma` e uma nova migration: modelos `Tutor`, arquivos do tutor, `Adocao` e `Devolucao`; relações com animal e usuários que liberam/concluem/recebem. Um animal terá vários ciclos históricos, no máximo um ativo.
- `apps/api/src/app.module.ts`: registrar módulo(s) novos.
- Novos módulos Nest em `apps/api/src/tutores/` e `apps/api/src/adocoes/` (controllers, services e DTOs), seguindo os padrões existentes. Tutor: busca/cadastro/edição e upload/consulta de imagem. Adoção: liberação excepcional, conclusão e devolução relacionadas ao animal.
- `apps/api/src/animais/animais.service.ts` e `apps/api/src/animais/animais.controller.ts`: incluir dados do ciclo no detalhe/timeline e bloquear a revogação de `adotado`; manter a revogação de óbito existente.
- `apps/api/src/animais/animais.spec.ts` e novos testes nos módulos de tutor/adoção: manter cobertura integrada Supertest/Postgres e helpers existentes.

### Web

- `apps/web/src/lib/api.ts`: tipos e chamadas para tutores, fotos, liberação, adoção e devolução; ampliar `Animal` com ciclo atual e histórico.
- `apps/web/src/app/painel/animais/[id]/page.tsx`: ação Registrar adoção para animal elegível; ação Registrar devolução para adoção ativa; histórico de ciclos; ocultar revogação para animal adotado, mantendo-a para óbito.
- Novo componente de assinatura reutilizável em `apps/web/src/components/` usando canvas e eventos de ponteiro, com limpar/refazer, compatível com mouse e touch. Formulário de adoção usa os componentes shadcn existentes para os dois switches, diálogos e campos.
- `apps/web/src/lib/access.ts`: avaliar se é preciso ajustar acesso para veterinário na seção `adocoes`; a ficha de animais já fica disponível a todos e a spec não pede uma seção nova.

### Contexto

- Atualizar `.ai-context/architecture.md`, `.ai-context/glossary.md`, `.ai-context/decisions.md` e `.ai-context/short-term.md` após entrega e decisões técnicas.

## Proposed Approach

Separar o cadastro e os arquivos do tutor do serviço transacional que altera o ciclo do animal. Manter a tela de entrada da adoção e devolução na ficha existente. Toda operação de domínio deve gravar adoção/devolução, situação do animal, tutor atual, baia, timeline e auditoria na mesma transação do Postgres. Uploads de assinatura e fotos usam mídia local gerenciada, com caminhos internos e rotas autenticadas, sem expiração automática nem exclusão automática.

Modelar cada adoção como um ciclo imutável, ligado a um tutor, com os dois consentimentos, assinatura desenhada, instante e autor. A devolução é um registro próprio ligado à adoção original, com motivo, situação de retorno, baia opcional, instante e quem recebeu. O vínculo de guarda atual deve refletir apenas a adoção sem devolução.

Serializar operações concorrentes por animal para impedir adoções/devoluções duplicadas. Coordenar esses locks com a alocação de baias para evitar corrida entre adoção, devolução e transferência; usar ordem de locks consistente (animal, depois baias envolvidas) em todos os fluxos que alteram a ocupação.

## Implementation Steps

1. **Preparar o domínio e migração**
   - Adicionar modelos de tutor com CPF normalizado único, endereço, contato e metadados de foto; modelar até três fotos documentais por tutor sem expiração automática.
   - Adicionar adoção com os dois switches, caminho da assinatura, autor e datas; registrar a autorização excepcional (justificativa, responsável e instante) quando necessária.
   - Adicionar devolução relacionada à adoção com motivo, situação operacional de retorno, baia opcional, autor recebedor e data.
   - Permitir vários ciclos por animal e garantir um único ciclo ativo por vez. Preferir restrição no banco compatível com PostgreSQL/Prisma 6.16; se índice parcial não for representável no schema Prisma, documentar e preservar o índice SQL customizado nas migrations. A transação também serializa o registro com lock da linha do animal.
   - Auditar dados legados em situação `adotado` sem adoção e planejar compatibilidade/migração sem criar consentimento ou assinatura fictícios.

2. **Implementar tutor e mídia pessoal/documental**
   - Criar endpoints autenticados para procurar por CPF, cadastrar e atualizar tutor; validar CPF e campos obrigatórios e normalizar CPF para evitar duplicatas.
   - Criar upload e consulta autenticados da foto pessoal opcional e de até três fotos documentais opcionais. Validar conteúdo real, tamanho e tipos permitidos; salvar em diretório gerenciado separado, sem crop quadrado obrigatório.
   - Não expor caminho de disco, não criar endpoint de exclusão e não apagar automaticamente os arquivos. Ligar inserção de metadados e auditoria do cadastro à transação; limpar arquivo órfão em erro de persistência.
   - Retornar dados completos de tutor aos quatro perfis autenticados, conforme a spec.

3. **Implementar liberação excepcional, adoção e devolução na API**
   - Criar endpoint autenticado para veterinário/Coordenação registrar liberação de animal em tratamento ou quarentena, com justificativa obrigatória; outros perfis não podem conceder liberação.
   - Criar endpoint de conclusão de adoção disponível a todos os perfis autenticados. Validar animal saudável ou liberação prévia, tutor existente, dois consentimentos verdadeiros e arquivo de assinatura não vazio; derivar autor/data da sessão/servidor.
   - Na transação de adoção, travar o animal, validar que não há ciclo ativo e que não há óbito, liberar a baia atual, criar ciclo, alterar situação para `adotado` e gravar evento de timeline e auditoria.
   - Criar endpoint de devolução para todos os perfis autenticados. Exigir adoção ativa e motivo; validar situação operacional e baia opcional pelas regras atuais de capacidade/estado/isolamento. Na transação, travar o animal e a baia escolhida, criar devolução, encerrar guarda atual, mudar situação/localização e gravar timeline/auditoria.
   - Manter adoções/devoluções anteriores imutáveis. Permitir nova adoção apenas após devolução; recusar repetição e concorrência com conflito claro.
   - Ajustar a revogação existente para recusar `adotado` na API mesmo quando chamada diretamente, mantendo a correção de óbito somente para Coordenação.
   - Estender o detalhe e a timeline do animal para apresentar tutor atual e ciclos anteriores. Não incluir assinatura binária/base64 nos payloads de listagem; usar rota controlada para consultar assinatura.

4. **Implementar cadastro e fluxos na ficha**
   - Acrescentar busca de tutor por CPF e cadastro/edição em fluxo integrado, preservando dados digitados se houver erro.
   - Criar assinatura em canvas com `Pointer Events`, captura por mouse/toque, botão de limpar/refazer e rejeição de imagem vazia. Enviar a imagem como arquivo para API; mostrar prévia antes de confirmar.
   - Mostrar apenas os dois switches definidos na spec, sem texto ou versão dos termos. A interface informa que o funcionário comunicará os termos fora do sistema.
   - Para estados operacionais não saudáveis, permitir liberação apenas ao veterinário/Coordenação e registrar justificativa antes da adoção.
   - Antes de concluir, mostrar o aviso de irreversibilidade e solicitar confirmação do operador.
   - Mostrar ações e detalhes de devolução/adotação, escolher situação de retorno e baia opcional, exigir motivo e atualizar ficha, histórico e ocupação após sucesso.
   - Não permitir editar ficha ou usar revogação genérica quando adotado; manter leitura da ficha e permitir somente a ação específica de devolução.

5. **Testar integração e fechar contexto**
   - Adicionar testes de integração de autorização, unicidade CPF, limite de fotos, consentimentos, assinatura obrigatória, liberação excepcional, elegibilidade, transações, ciclo readoção/devolução, baia e auditoria.
   - Executar comandos de verificação listados abaixo e validar manualmente ficha, desenho da assinatura em mouse e touch, uploads e ciclo completo de duas adoções separadas por devolução.
   - Atualizar os documentos de arquitetura, decisão, glossário e foco de curto prazo para refletir o fluxo entregue e eventuais limitações.

## Verification Plan

- API: `pnpm --filter @zootech/api prisma:generate`, aplicar migration no Postgres local, `pnpm --filter @zootech/api test -- --runInBand` e `pnpm --filter @zootech/api typecheck`.
- Web: `pnpm --filter @zootech/web typecheck`, `pnpm --filter @zootech/web lint` e `pnpm --filter @zootech/web build`.
- Raiz: `pnpm lint` e `pnpm build` se os checks por pacote passarem.
- Casos críticos automatizados: todos os quatro perfis autenticados podem operar adoção/devolução e ver os dados; apenas veterinário/Coordenação podem liberar exceção; sem sessão recebe 401; CPF duplicado recebe conflito; falta de consentimento/assinatura bloqueia; situação adotado não pode ser manual/revogada; transação falha sem estado parcial; apenas um ciclo ativo sob concorrência; devolução preserva a adoção anterior; ocupação nunca excede capacidade.
- Validação manual: mouse e touch desenham/limpam assinatura; tutor pode ser reutilizado; 4ª foto documental é recusada; tela mostra apenas switches e desenho; ciclo adoção → devolução → nova adoção atualiza histórico e baia corretamente.

## Risks and Edge Cases

- Prisma pode não representar índice parcial no schema usado; confirmar abordagem de constraint para um único ciclo ativo e proteger migration contra drift.
- O filesystem e o Postgres não compartilham transação. Uploads de assinatura/fotos precisam de compensação segura se a gravação no banco falhar.
- Adoção e alocação de baia podem correr ao mesmo tempo. Todos os caminhos que alteram ocupação precisam usar uma estratégia de lock compatível para não alocar um animal que acabou de ser adotado.
- Preservação sem expiração aumenta o volume de imagens; definir limite por arquivo e política de cópia/backup operacional sem apagar automaticamente.
- A spec guarda a assinatura e os switches, mas não o texto comunicado; o registro não consegue demonstrar qual conteúdo foi apresentado fora do sistema.
- Animais atualmente `adotado` sem adoção formal precisam permanecer identificáveis e não receber dados inventados durante a migration.
- Falha de baia inválida/cheia durante devolução deve deixar adoção ativa até o operador escolher uma situação sem baia ou uma baia elegível.

## Open Questions

- Nenhuma questão funcional pendente na spec. Detalhes de limite de arquivo, formatos de imagem e política de backup podem seguir os padrões operacionais já usados para mídia local, ajustados aos documentos e assinaturas sem corte quadrado.

## Definition of Done

- Tutor pode ser cadastrado, localizado e atualizado; fotos opcionais respeitam limite de três documentos e ficam sem expiração automática.
- Todos os perfis autenticados podem concluir adoção e devolução; liberação excepcional fica restrita a veterinário/Coordenação.
- A adoção registra os dois switches e assinatura desenhada, altera situação e libera baia atomicamente; o texto dos termos não é exibido nem armazenado.
- Adoção confirmada não pode ser revogada nem duplicada; devolução preserva o histórico, restaura operação e permite nova adoção.
- API impede `adotado` manualmente e protege contra chamadas diretas e operações concorrentes.
- Ficha mostra estado/ciclo atual e histórico de adoções e devoluções, com assinatura e fotos servidas por rotas autenticadas.
- Testes automatizados, typecheck, lint e build aplicáveis passam; jornadas de mouse/touch e operação do CCZ foram verificadas.
- Contexto do projeto reflete os modelos e comportamentos entregues.
