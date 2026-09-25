# Plano de Implementação: Gestão de Animais

## Objetivo

Implementar cadastro, listagem e ficha de animais em fluxo mobile, com vínculo opcional a baia, alertas de pendências, fotos geridas localmente, observações e eventos auditáveis, estados terminais somente para consulta e sem exclusão de animais.

## Contexto Relevante

- Requisitos de produto estão em `.ai-context/specs/gestao-de-animais.md`; decisões foram confirmadas pelo autor e perguntas estão marcadas como respondidas.
- Stack: Next.js em `apps/web`, NestJS em `apps/api`, Prisma/Postgres. Autenticação JWT e `AuditoriaEvento` já existem.
- Baias implementadas no backend em `apps/api/src/baias/`; serviço hoje retorna ocupação simulada como zero e contém comentário indicando integração futura com Animal.
- Menu já inclui `/painel/animais`, mas ainda cai na rota genérica `apps/web/src/app/painel/[secao]/page.tsx`. Contratos web ficam em `apps/web/src/lib/api.ts`; acesso a seções em `apps/web/src/lib/access.ts`.
- Rotas de registro existentes leem id da URL. `.cursor/rules/front-url-recurso.mdc` recomenda query string na coleção; para Animais foi aprovada a rota dedicada `/painel/animais/[id]`. Durante implementação, atualizar a regra para permitir rota segmentada quando o recurso exigir página própria.
- Não há dependência instalada para corte/compressão de imagem. Front usa componentes shadcn e `lucide-react`.
- Migrações ficam em `apps/api/prisma/migrations/`; seed atual roda no boot e também tem comando próprio.

## Arquivos e Módulos Prováveis

### API e banco

- `apps/api/prisma/schema.prisma` — enums e modelos de animal, raça, foto, observação, pesagem/eventos; relação opcional Animal–Baia.
- `apps/api/prisma/migrations/<timestamp>_gestao_animais/migration.sql` — schema relacional e índices/constraints.
- `apps/api/src/animais/` — novo módulo Nest com controller, service, DTOs e testes, seguindo organização de `apps/api/src/baias/`.
- `apps/api/src/app.module.ts` — registrar `AnimaisModule`.
- `apps/api/src/baias/baias.service.ts` e `apps/api/src/baias/baias.spec.ts` — ocupação real, consulta de ocupantes, validação de capacidade/estado e auditoria de alocação.
- `apps/api/src/seed.ts` — seed idempotente de raças cão/gato sem remover raças adicionadas pela equipe.
- `apps/api/src/main.ts` ou módulo dedicado de mídia — configurar upload, diretório privado/gerenciado e entrega controlada das fotos, sem expor caminhos de disco.

### Web

- `apps/web/src/lib/api.ts` — tipos e funções para lista, ficha, CRUD permitido, fotos, alocação, histórico, observações e revogação de situação.
- `apps/web/src/lib/access.ts` — acesso a Animais para os quatro perfis; helpers só se necessários para regras de ação.
- `apps/web/src/app/painel/animais/page.tsx` — lista, filtros, indicadores de alerta e entrada para cadastro.
- `apps/web/src/app/painel/animais/[id]/page.tsx` (ou consulta por `?animal=id`, conforme decisão de URL) — ficha e edição dedicada, alertas, galeria, histórico, observações e breadcrumbs.
- `apps/web/src/components/ui/` — instalar via CLI shadcn qualquer peça necessária de diálogo, combobox, progresso ou corte/upload; preservar tema existente.
- `apps/web/src/app/globals.css` — estilos responsivos próprios apenas onde tokens/componentes existentes não bastem.

### Contexto

- Ao concluir cada fase: atualizar `.ai-context/architecture.md`, `.ai-context/glossary.md` e `.ai-context/short-term.md` conforme estrutura e dados realmente implementados.

## Abordagem Proposta

1. Modelar Animal com `baiaId` opcional; Raça vinculada a espécie; galeria separada; pesagens/observações/eventos append-only; auditoria genérica imutável para ações e alterações.
2. Implementar regras e transações no backend primeiro. Todos os perfis autenticados consultam, criam e editam animais operacionais; nenhum endpoint exclui animal. Animal `adotado` ou `óbito` é somente leitura, com revogação por Coordenação e motivo obrigatório.
3. Integrar baia com ocupação real: alocação/transferência/saída atômica, capacidade, estado operacional, isolamento e histórico. Remover suposições de ocupação zero nos serviços das baias.
4. Implementar upload autenticado com limite de 10 fotos, formatos JPEG/JPG/PNG/WebP, corte quadrado e compressão server-side para arquivos acima de 5 MB. O servidor escolhe nome e destino; clientes nunca informam caminho.
5. Criar contrato web, listagem filtrável com adotados/óbitos ocultos por padrão, formulário em etapas e ficha que centraliza alertas/pendências, galeria e histórico.
6. Manter vacinação, castração e adoção fora deste escopo. Preparar histórico e navegação para integrar esses módulos depois, sem construir seus CRUDs.

## Etapas de Implementação

### 1. Fechar contratos técnicos e modelo

- Resolver convenção de rota para ficha (segmento `/[id]` ou query `?animal=id`) frente à regra atual.
- Definir estados/enum e validação para sexo, situação, castrado e representação de “Outra”/“Não Informada”. Seed de raças deve ter chave normalizada composta por espécie e nome.
- Modelar `Animal` com número de registro único, dados básicos, datas/estimativa, usuário criador, acolhido por (texto), situação e FK opcional para `Baia`.
- Modelar galeria e foto identificadora; registrar pesagens separadas; observações append-only; eventos simples de exame/diagnóstico; usar auditoria existente para alterações, alocação e transições.
- Criar migration, gerar cliente Prisma e implementar seed idempotente com catálogo completo da spec.

### 2. Backend de animais, histórico e permissões

- Criar `AnimaisModule`, DTOs com validação e controller autenticado.
- Implementar lista paginada/filtros, ficha, criação, atualização sem `DELETE`, observações, pesagens, exames/diagnósticos, timeline/auditoria e endpoint de revogação de estado terminal.
- Buscar autor da sessão para todo evento; gravar dados e auditoria na mesma transação.
- Recusar mutações em `adotado`/`óbito`; permitir só a Coordenação revogar com motivo obrigatório e guardar situação anterior para corrigir erro com evento próprio.
- Ocultar adotados/óbitos por padrão na listagem; expô-los apenas com filtro explícito e devolver indicador `somenteLeitura`/equivalente.
- Expor alertas calculados para sem baia, sexo/raça/castração desconhecidos e idade aproximada, e atualizar situação de alerta ao corrigir dados.

### 3. Ocupação real e integração de baias

- Criar relação `Baia.animais` e `Animal.baiaId?`; adaptar detalhes/lista das baias para contagem e ocupantes reais.
- Adicionar fluxo de alocar, transferir e retirar animal da baia. Validar capacidade/estado e executar com trilha na mesma transação; concorrência pela última vaga deve permitir só uma alocação.
- Impedir inativar/interditar/iniciar higienização de baia ocupada, conforme spec de baias. Impedir reduzir capacidade abaixo da ocupação.
- Validar baias exclusivas para isolamento pelo campo clínico explícito `Animal.emIsolamento`, independente da situação geral.

### 4. Upload, processamento e ciclo de vida de fotos

- Definir diretório interno de armazenamento e rota autenticada/controlada de entrega. Persistir caminho absoluto gerado pelo servidor; não retornar caminho local na API.
- Adicionar upload multipart com validação real de formato, contagem máxima sob concorrência, nome aleatório e proteção contra traversal.
- Incluir corte quadrado no front antes de confirmar upload; saída quadrada com lado máximo de 1200 px. Comprimir no servidor apenas fontes acima de 5 MB e gerar WebP com qualidade inicial 85, mantendo saída abaixo de 5 MB. Se ainda exceder, reduzir qualidade progressivamente até piso 70; abaixo disso, recusar com mensagem clara. Guardar arquivo processado, não o original.
- Remover foto individual somente por ação explícita confirmada em diálogo; promover outra foto a identificadora quando necessário.
- Limpar arquivos órfãos com segurança se persistência falhar; remover arquivo somente dentro do diretório gerenciado e sem outra referência.

### 5. Web: listagem e cadastro

- Trocar placeholder da seção Animais por lista com busca nome/registro, filtros de espécie, situação, sexo, porte, castração, baia e alertas.
- Ocultar adotados/óbitos por padrão; permitir filtro para consulta somente leitura.
- Mostrar foto de identificação, identidade do animal, baia/“Sem baia” e indicador textual acessível quando houver alerta.
- Implementar cadastro responsivo em etapas: identificação; características/idade; acolhimento/localização; fotos; revisão. Preservar valores ao navegar etapas e erros; cadastro permite dados mínimos e complementação posterior.
- Combobox de raça busca valores da espécie selecionada; “Outra” abre campo de inclusão rápida reutilizável sem duplicatas; “Não Informada” e SRD mantêm semânticas próprias.

### 6. Web: ficha e ações

- Implementar rota dedicada e breadcrumbs para lista, baia e eventos relacionados.
- Apresentar leitura/edição, seção “Alertas e pendências”, fotos, pesagens, observações e histórico cronológico com autor/data.
- Permitir ações para alocar/transferir/remover da baia e resolver alertas.
- Em situação terminal, bloquear controles de edição e exibir histórico em modo consulta. Só Coordenação recebe ação de revogação; usar diálogo de confirmação e exigir motivo.
- Remoção de foto usa componente Dialog shadcn e explica que somente aquela foto será removida.

### 7. Testes e atualização de contexto

- API: testes unitários/integrados de autorização por perfil, validações, conflito de registro/raça, seed idempotente, alertas, estados terminais/revogação, não exclusão, upload/limite/foto e regras transacionais de baia/auditoria.
- Web: `typecheck`, `lint`, `build` e validação manual de cadastro/listagem/ficha em viewport móvel e desktop; confirmar navegação por URL, estados loading/erro/vazio e diálogos.
- Atualizar docs de contexto e registrar limitações ou módulos seguintes na spec/plano.

## Plano de Verificação

- Comandos após implementação (não executados nesta etapa de planejamento):
  - `pnpm --filter @zootech/api prisma:generate`
  - `pnpm --filter @zootech/api test -- --runInBand`
  - `pnpm --filter @zootech/api typecheck`
  - `pnpm --filter @zootech/web typecheck`
  - `pnpm lint` e `pnpm build`
- Testes de integração devem provar: quatro perfis autenticados podem operar animais ativos; sem sessão recebe 401; conflito de registro recebe 409; nenhuma rota apaga animal; mutação terminal recebe 409; só Coordenação revoga e motivo é obrigatório; falha na auditoria reverte operação; última vaga não excede capacidade.
- Teste manual de fotos: arquivo válido abaixo/acima de 5 MB, conversão/compressão, crop quadrado, formatos inválidos, 10ª/11ª foto, remoção cancelada/confirmada e falha de upload sem arquivo órfão.
- Teste manual responsivo: cadastro em celular, ida/volta entre steps, lista com/sem alertas, seleção de raça, ficha reaberta pela URL e estado terminal.

## Riscos e Casos de Borda

- Alterações no indicador `emIsolamento` precisam ser auditadas e avaliadas na mesma transação da alocação para baias exclusivas.
- Persistência e sistema de arquivos não compartilham transação. Estratégia de compensação/limpeza de órfãos é necessária.
- Contagem concorrente de fotos pode ultrapassar 10 sem serialização por animal ou mecanismo equivalente.
- Arquivo de saída pode continuar acima de 5 MB após compressão; estabelecer qualidade mínima, dimensão máxima e erro claro.
- Guardar caminhos absolutos acopla deployment ao disco. Usar base-dir configurável pelo servidor, limitar escrita/remoção a essa raiz e servir mídia por rota controlada.
- Proteger coerência entre remover foto de identificação, trocar foto principal e galeria vazia.
- Eventos de baia e animal precisam ser gravados juntos; se qualquer auditoria falhar, reverter ambos.
- Situação “adotado” está no vocabulário, mas não pode ser definida pelo CRUD enquanto adoção não existir; deixar mudança terminal atrás do módulo de adoção.
- A rota segmentada para Animal difere da convenção atual de query string; atualizar `.cursor/rules/front-url-recurso.mdc` para documentar essa exceção e manter URLs reabríveis.
- APIs devem tratar animal terminal mesmo em chamadas diretas, não confiar em botões ocultos no front.

## Questões Técnicas Abertas

1. ~~Convenção de URL.~~ Respondida: usar `/painel/animais/[id]` e atualizar regra compartilhada durante implementação.
2. ~~Elegibilidade para isolamento.~~ Respondida: campo clínico explícito `emIsolamento`, independente da situação geral.
3. ~~Dimensão e compressão de fotos.~~ Respondida: crop quadrado; saída máxima 1200×1200 px; WebP qualidade inicial 85, baixar até 70 para ficar abaixo de 5 MB; recusar se ainda exceder.
4. ~~Persistência e limpeza de fotos.~~ Respondida: manter enquanto animal existir; remover arquivos removidos ou órfãos, sem expiração automática.
5. ~~Normalização de raças personalizadas.~~ Respondida: Unicode NFC, trim, colapsar espaços e comparar sem distinção de caixa; preservar acentos e exibição original.

## Definição de Pronto

- Modelo/migração/seed de animal e raças prontos; baia é opcional e ocupação real substitui placeholders.
- API autenticada aplica permissões, validações, auditoria, não exclusão e bloqueio terminal com revogação exclusiva da Coordenação.
- Fotos cumprem limite, crop, formatos, compressão, confirmação de remoção e proteção de arquivos.
- Lista, cadastro mobile em etapas e ficha dedicada atendem critérios de aceitação da spec.
- Verificações automatizadas e validação manual planejadas passam; arquitetura/contexto refletem sistema entregue.
- CRUD de vacinação, módulo de castração e módulo de adoção permanecem explicitamente fora desta implementação.
