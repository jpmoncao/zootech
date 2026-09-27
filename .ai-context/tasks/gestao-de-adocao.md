# Tarefas de Implementação: Gestão de Tutores e Adoção

## Objetivo

Entregar cadastro de tutores, adoção e devolução pela ficha do animal conforme `.ai-context/specs/gestao-de-adocao.md` e `.ai-context/plans/gestao-de-adocao.md`. Adoção confirmada define `adotado`; só uma devolução registrada reabre o ciclo.

## Premissas

- Os quatro perfis autenticados podem cadastrar, consultar e atualizar tutores, concluir adoções e registrar devoluções.
- Apenas veterinário e Coordenação liberam excepcionalmente animal em tratamento ou quarentena/observação.
- A tela não exibe nem armazena texto ou versão dos termos; registra dois switches e assinatura desenhada.
- Foto do tutor é opcional. Há até três fotos documentais opcionais por tutor, preservadas sem expiração automática.
- Não inventar tutor, consentimento ou assinatura para registros preexistentes `adotado` sem adoção.
- API continua sendo a autoridade para permissão e regras de estado; UI apenas reflete as capacidades.

## Tarefas

- [ ] 1. Modelar tutor e ciclos de adoção/devolução
  - **Goal:** Criar persistência para tutor, mídia vinculada, liberações excepcionais, adoções e devoluções com autoria e timestamps.
  - **Files:** `apps/api/prisma/schema.prisma`, nova migration em `apps/api/prisma/migrations/`.
  - **Notes:** CPF normalizado único. Um tutor tem no máximo uma foto pessoal e até três documentos. Cada animal pode ter ciclos históricos repetidos, mas apenas um ciclo ativo. Registrar os dois consentimentos, assinatura, justificativa/autor da liberação quando houver e vínculo da devolução com a adoção original. Confirmar constraint/índice parcial viável com Prisma 6.16; se necessário, usar SQL customizado na migration e cobrir risco de drift. Inspecionar dados legados `adotado` sem criar evidência falsa.
  - **Verification:** `prisma:generate`, aplicar migration no Postgres local e conferir unicidade, relações, cascade/retenção e leitura dos registros legados.

- [x] 2. Implementar cadastro, busca e edição de tutor
  - **Goal:** Permitir que os quatro perfis autenticados localizem tutor por CPF, cadastrem e corrijam dados pessoais, contato, endereço e documento.
  - **Files:** novos `apps/api/src/tutores/` (module, controller, service, DTOs e spec), `apps/api/src/app.module.ts`.
  - **Notes:** Seguir Nest/Prisma existentes; validar CPF e normalizar pontuação antes de verificar unicidade; autor da alteração vem de `CurrentUser`. Não oferecer exclusão física. Respostas autenticadas incluem os dados completos conforme a spec.
  - **Verification:** Testes API para os quatro perfis, 401 sem sessão, validação dos campos, CPF equivalente com pontuações diferentes, conflito de duplicidade e atualização auditada.

- [x] 3. Implementar mídia permanente do tutor e assinatura
  - **Goal:** Receber e servir foto pessoal, até três fotos documentais e imagem de assinatura desenhada, em mídia gerenciada autenticada.
  - **Files:** `apps/api/src/tutores/`, novos handlers/DTOs de mídia e possível utilitário local em `apps/api/src/`; schema/migration da tarefa 1.
  - **Notes:** Separar paths de `FotoAnimal`; validar conteúdo real e tamanho/tipo; documentos não precisam de crop quadrado. Não expor caminho local, criar remoção ou remover automaticamente arquivos. Compensar arquivo órfão quando persistência falhar. Assinatura fica vinculada à adoção e nunca ao perfil editável do tutor.
  - **Verification:** Testes para formatos inválidos, entrega autenticada, path traversal, falha de persistência, limite da 4ª foto documental e ausência de expiração/exclusão automática.

- [x] 4. Registrar liberação clínica excepcional
  - **Goal:** Permitir liberação expressa para adoção de animal em tratamento/quarentena somente a veterinário ou Coordenação.
  - **Files:** novos `apps/api/src/adocoes/` (module, controller, service, DTOs e spec), `apps/api/src/app.module.ts`, modelos da tarefa 1.
  - **Notes:** Exigir justificativa e salvar animal, autorizador e instante. Outros perfis recebem 403. Liberação deve aplicar ao ciclo de adoção correspondente e não servir como permissão reutilizável indefinidamente.
  - **Verification:** Testes de autorização, justificativa obrigatória, elegibilidade operacional e uso/consumo correto da liberação.

- [x] 5. Concluir adoção de forma transacional
  - **Goal:** Criar adoção somente com tutor, os dois switches ativos e assinatura não vazia; mudar animal para `adotado` e liberar sua baia atomicamente.
  - **Files:** `apps/api/src/adocoes/`, `apps/api/src/animais/animais.service.ts`, `apps/api/src/animais/animais.controller.ts`, tests de adoção e animais.
  - **Notes:** Todos os perfis autenticados podem concluir. Exigir animal saudável ou liberação válida; impedir óbito, ciclo ativo e repetição. Derivar responsável/data da sessão/servidor. Gravar adoção, alteração de animal/baia, evento de timeline e `AuditoriaEvento` na mesma transação. Serializar por linha do animal.
  - **Verification:** Testes para campos/consentimento/assinatura faltando, saudável e liberação excepcional, baia removida da ocupação, rollback ao falhar auditoria e conflito em duas adoções concorrentes.

- [x] 6. Registrar devolução e reabertura operacional
  - **Goal:** Encerrar adoção ativa por nova movimentação com motivo e situação operacional, mantendo adoção e assinatura originais intactas.
  - **Files:** `apps/api/src/adocoes/`, `apps/api/src/animais/animais.service.ts`, `apps/api/src/animais/animais.controller.ts`, `apps/api/src/animais/animais.spec.ts` e specs de adoção.
  - **Notes:** Todos os perfis autenticados podem devolver. Baia pode ser nula ou selecionada; quando selecionada, reutilizar validações de estado, capacidade e isolamento. Harmonizar locks de animal/baia com `alocar()` para evitar corrida. Depois da devolução, permitir novo ciclo; negar devolução sem ciclo ativo ou em duplicidade.
  - **Verification:** Testes para devolução sem baia, com baia válida/inválida/cheia, rollback, concorrência, situação operacional, encerramento do vínculo e preservação do histórico anterior.

- [x] 7. Impedir adoção manual e expor histórico no contrato animal
  - **Goal:** Fazer a API tratar adoção como estado derivado de ciclo ativo e retornar adoção atual e ciclos anteriores sem incluir bytes de assinatura em listagens.
  - **Files:** `apps/api/src/animais/animais.service.ts`, `apps/api/src/animais/animais.controller.ts`, DTOs existentes, specs de animais e adoção.
  - **Notes:** `CreateAnimalDto` e `UpdateAnimalDto` já excluem `adotado`; preservar essa regra. Bloquear `revogar-situacao` para `adotado` mesmo em requisição direta e manter revogação de óbito somente para Coordenação. Servir assinatura e mídias em rotas autenticadas controladas.
  - **Verification:** Testes API comprovam rejeição de `adotado` manual e revogação, revogação de óbito ainda permitida conforme regra, histórico completo e ausência de conteúdo binário nos payloads de animal.

- [x] 8. Adicionar contratos web e componente de assinatura
  - **Goal:** Expor tipos/helpers para tutor, mídia, liberação, adoção e devolução; permitir assinatura desenhada por mouse e touch.
  - **Files:** `apps/web/src/lib/api.ts`, novo componente sob `apps/web/src/components/`, possivelmente tipos auxiliares próximos ao componente.
  - **Notes:** Canvas usa Pointer Events, permite limpar/refazer, sinaliza assinatura vazia e exporta arquivo para API. Usar fetch autenticado existente para arquivos/blobs. Sem dependência nova se a implementação com APIs do browser for suficiente.
  - **Verification:** Web typecheck; validar conversão de assinatura em upload autenticado e interação do componente com mouse, touch, limpar, refazer e estado vazio.

- [x] 9. Integrar cadastro do tutor e adoção à ficha
  - **Goal:** Oferecer busca/cadastro de tutor, os dois switches, assinatura, liberação excepcional e confirmação de irreversibilidade na ficha do animal.
  - **Files:** `apps/web/src/app/painel/animais/[id]/page.tsx`, componentes em `apps/web/src/components/`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/access.ts` se necessário.
  - **Notes:** Manter textos dos termos fora da interface; explicar que funcionário os comunica. Mostrar os switches e canvas. Veterinário/Coordenação podem liberar estado excepcional; todos podem concluir adoção. Após sucesso, atualizar ficha e ocupação sem perder dados digitados em falhas.
  - **Verification:** Navegador: cadastro e tutor existente, bloqueios por dados faltantes, saudável, liberação por papéis autorizados, aviso final, ficha adotada e consulta do tutor/assinatura pelos quatro perfis.

- [x] 10. Integrar devolução e ciclos anteriores à ficha
  - **Goal:** Permitir devolução em ficha adotada, mostrar tutor/ciclo ativo e timeline de adoções/devoluções, e habilitar nova adoção após o retorno.
  - **Files:** `apps/web/src/app/painel/animais/[id]/page.tsx`, componentes de histórico, `apps/web/src/lib/api.ts`, specs web/API relacionadas.
  - **Notes:** Exigir motivo, situação de retorno e baia opcional; adoção confirmada não tem botão de revogação. Manter a revogação existente para óbito. Mostrar aviso se voltar sem baia e manter acesso somente leitura para outras ações enquanto adotado.
  - **Verification:** Navegador: ciclo adoção → devolução → segunda adoção, baia atualizada, histórico preservado, negação sem motivo/ciclo ativo e revogação de óbito ainda disponível para Coordenação.

- [ ] 11. Validar ponta a ponta e atualizar contexto
  - **Goal:** Confirmar critérios de aceitação, corrigir integração e registrar arquitetura, dados e fluxo entregues.
  - **Files:** testes nos módulos `tutores`, `adocoes` e `animais`; `.ai-context/architecture.md`, `.ai-context/glossary.md`, `.ai-context/decisions.md`, `.ai-context/short-term.md`.
  - **Notes:** Cobrir upload não transacional e migrations/índice para adoção ativa. Registrar limites de mídia escolhidos e resultados de teste manual.
  - **Verification:** `pnpm --filter @zootech/api prisma:generate`, `pnpm --filter @zootech/api test -- --runInBand`, typecheck API/Web, lint, build e jornada manual em desktop e viewport touch.

## Checklist de Validação

- [ ] Quatro perfis autenticados cadastram/consultam/atualizam tutores e concluem adoção/devolução.
- [ ] Liberação excepcional fica limitada a veterinário e Coordenação e exige justificativa.
- [ ] Tutor aceita os dois switches e assina com mouse ou touch; nenhum texto/versão dos termos é armazenado.
- [ ] Fotos de documento respeitam limite 3 e ficam em mídia autenticada sem expiração automática.
- [ ] API bloqueia `adotado` manual, revogação de adoção, adoção duplicada e devolução sem ciclo ativo.
- [ ] Adoção/devolução atualizam situação, baia, timeline e auditoria atomicamente.
- [ ] É possível re-adotar somente após devolução; ciclos anteriores permanecem consultáveis.
- [ ] Testes, typecheck, lint, build e validação manual passam.
- [ ] `.ai-context/` descreve o comportamento implementado e a lista de tarefas registra status final.

## Bloqueios / Decisões Necessárias

- Nenhum bloqueio funcional pendente na spec.
- Na tarefa 1, confirmar o mecanismo robusto para impedir mais de uma adoção ativa por animal com Prisma 6.16/Postgres; a implementação pode usar índice SQL parcial com migration customizada e lock transacional.
- Definir limites máximos de upload para fotos documentais e assinatura conforme os padrões operacionais de mídia local, sem crop quadrado.

## Execução parcial

- Tasks 2 e 3 implementadas na API: CRUD autenticado de tutor, CPF validado/normalizado, auditoria de alterações, upload permanente de foto e até três fotos documentais como WebP, validação real com Sharp, limite de 5 MB, entrega autenticada e remoção de arquivo órfão em falha de persistência. Assinaturas ainda não são persistidas isoladamente: serão gravadas apenas no registro definitivo de adoção, conforme a regra de vínculo da spec.
- Tasks 4 e 5 implementadas na API: liberação excepcional autenticada, restrita a veterinário/Coordenação e consumida uma vez; conclusão de adoção multipart com consentimentos obrigatórios, assinatura validada e não vazia, lock serializável do animal, tutor e assinatura associados, mudança para `adotado`, remoção da baia, timeline e auditoria na mesma transação. Falha de persistência remove o arquivo de assinatura órfão. Edição e alocação também travam a linha do animal para coordenar com a adoção.
- Verificação desta etapa: `prisma:generate`, typecheck API e `git diff --check` passaram. Testes integrados não executados porque o estado local de migrations descrito abaixo continua sem recuperação segura.
- Campos de tipo e número do documento de identificação foram acrescentados ao modelo e migration incremental.
- Validação local de migrations pendente: `20260926100000_gestao_adocao` falhou porque tabelas dessa migração já existiam sem registro concluído. A inspeção encontrou migrations locais de castração não presentes no checkout; não foi feita limpeza ou recriação de dados.
- Typecheck e build da API passam. Lint da API continua falhando em import `Logger` preexistente e não relacionado em `animais.controller.ts`. Testes de integração não foram executados enquanto o banco estiver nesse estado de migration.
- Task 6 implementada na API: `POST /animais/:animalId/adocoes/devolucao` exige motivo e situação operacional (`em_tratamento`, `em_quarentena_observacao` ou `saudavel`), aceita baia opcional, serializa por animal/baia, valida estado/capacidade/isolamento e grava devolução, encerramento do ciclo, situação/localização do animal, timeline e auditoria em transação serializável. Conflitos de duplicidade/concorrência retornam 409; adoção e assinatura originais não são alteradas.
- Verificação task 6: typecheck e build da API passaram; lint permanece bloqueado pelo import `Logger` não usado preexistente em `animais.controller.ts`; testes integrados seguem sem execução até recuperação segura da migration local.
- Task 7 implementada: revogação terminal agora recusa explicitamente `adotado` e orienta registrar devolução; detalhe autenticado do animal inclui ciclos de adoção, tutor, autor, liberação e devolução, expondo a assinatura só por URL autenticada e omitindo caminho/nome/MIME/tamanho internos.
- Verificação task 7: typecheck, build da API e `git diff --check` passaram. O teste integrado foi tentado, mas o banco local falha antes dos cenários porque a coluna `animais.castrado` está ausente; nenhuma migration ou dado local foi reparado.
- Task 8 implementada no web: contratos e chamadas autenticadas para busca/CRUD de tutores, mídia, liberação, conclusão de adoção multipart, assinatura, devolução e consulta de arquivos via blob. `SignaturePad` usa Pointer Events, adapta coordenadas ao tamanho visível, exporta PNG e permite limpar/refazer.
- Verificação task 8: typecheck web e `git diff --check` passaram. Lint web ainda aponta dois ícones não usados preexistentes em `apps/web/src/app/painel/animais/[id]/page.tsx`; não foram alterados nesta tarefa. A interação física por mouse/toque será validada junto à integração da ficha (task 9).
- Task 10 implementada na ficha: animal adotado mostra tutor/ciclo ativo, motivo/situação/baia opcional para devolução e histórico cronológico de adoções e devoluções. O retorno sem baia recebe aviso; após atualização da ficha, um novo ciclo pode ser iniciado. A revogação permanece restrita ao óbito. Validação manual do ciclo completo segue pendente até recuperação segura das migrations locais.
