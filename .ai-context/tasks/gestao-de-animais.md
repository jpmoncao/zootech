# Tarefas de Implementação: Gestão de Animais

## Objetivo

Entregar cadastro, consulta e acompanhamento auditável de animais, com ficha mobile, ocupação opcional de baias, alertas, fotos locais e regras de estado terminal, conforme `.ai-context/specs/gestao-de-animais.md` e `.ai-context/plans/gestao-de-animais.md`.

## Premissas

- Todos os perfis autenticados consultam, criam e editam animais operacionais.
- Animal nunca é excluído. `adotado` e `óbito` ficam somente para consulta; adoção só será habilitada pelo futuro módulo de adoção. Coordenação pode revogar estado terminal incorreto com motivo auditado.
- `Animal.emIsolamento` é campo clínico explícito independente da situação geral.
- Foto quadrada até 1200×1200; formatos JPEG/JPG, PNG e WebP; fontes acima de 5 MB comprimidas para WebP, qualidade inicial 85 até mínimo 70; máximo de 10 fotos.
- Ficha usa `/painel/animais/[id]`; atualizar regra compartilhada de URL durante implementação.
- CRUDs de vacinação, castração e adoção não fazem parte destas tarefas.

## Tarefas

- [x] 1. Criar modelo de dados, migration e seed de raças
  - **Goal:** Criar modelos Prisma para animal, raça por espécie, fotos, pesagens e observações/eventos necessários; suportar `baiaId` opcional, `emIsolamento`, datas/idade estimada e autor. Número de registro único. Seed idempotente com catálogo aprovado, preservando raças personalizadas.
  - **Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<timestamp>_gestao_animais/`, `apps/api/src/seed.ts`.
  - **Notes:** Definir enums/constraints de modo que desconhecido seja representável sem inventar dado. Não criar modelos/CRUD completos de vacina, castração ou adoção.
  - **Verification:** `pnpm --filter @zootech/api prisma:generate`; aplicar migration em banco de desenvolvimento; executar seed duas vezes e confirmar ausência de duplicatas e preservação de raças personalizadas.

- [x] 2. Implementar CRUD autenticado e regras de domínio da API
  - **Goal:** Criar módulo Nest de animais com lista/filtros, detalhe, criação e edição, sem endpoint de exclusão. Todos os perfis autenticados acessam animais operacionais; API bloqueia alterações em `adotado`/`óbito`.
  - **Files:** `apps/api/src/animais/` (novo), `apps/api/src/app.module.ts`, testes correspondentes em `apps/api/src/animais/`.
  - **Notes:** Validar registro único, espécie/raça coerente, sexo desconhecido, nascimento/idade aproximada, nascimento no CCZ, `criadoPor` da sessão, e inclusão rápida de raça normalizada em Unicode NFC. Situação `adotado` só será aceita futuramente pelo módulo de adoção.
  - **Verification:** Testar os quatro perfis, 401 sem sessão, 409 para número duplicado, raça incompatível/duplicada, criação mínima e ausência de rota `DELETE /animais/:id`.

- [x] 3. Gravar timeline, observações, pesagens e desfechos auditáveis
  - **Goal:** Implementar timeline cronológica e registros append-only para observações, pesagens e eventos simples de exame/diagnóstico; auditar criação, edição, acolhimento, mudança de situação, mudança de `emIsolamento` e demais ações do domínio.
  - **Files:** `apps/api/src/animais/`, `apps/api/src/animais/dto/`, testes do módulo.
  - **Notes:** Operação e `AuditoriaEvento` devem compartilhar transação. Guardar responsável autenticado e valores anterior/novo. Não implementar vacinação ou castração neste escopo.
  - **Verification:** Testar autoria, ordenação estável, preservação das pesagens anteriores, imutabilidade de observações e rollback da operação quando auditoria falhar.

- [x] 4. Integrar ocupação real entre animais e baias
  - **Goal:** Substituir ocupação simulada por relação real; permitir alocar, transferir e retirar animal, mantendo animal sem baia como estado válido.
  - **Files:** `apps/api/prisma/schema.prisma`, migration de animais, `apps/api/src/baias/baias.service.ts`, `apps/api/src/baias/baias.spec.ts`, `apps/api/src/animais/`.
  - **Notes:** Operações atômicas validam capacidade, estado da baia e `emIsolamento` para baia exclusiva. Recusar redução de capacidade abaixo da ocupação e ações incompatíveis em baia ocupada. Auditar saída, origem e destino.
  - **Verification:** Testes Supertest cobrem animal sem baia, alocação, transferência, retirada, baia cheia/inativa, incompatibilidade de isolamento, disputa concorrente pela última vaga, ocupantes reais na API de baias, bloqueio de redução de capacidade abaixo da ocupação e bloqueio de ações incompatíveis em baia ocupada.

- [x] 5. Implementar armazenamento e processamento de fotos
  - **Goal:** Upload autenticado, corte quadrado, compressão e remoção segura de fotos, limitando galeria a 10 itens.
  - **Files:** `apps/api/src/animais/` ou módulo de mídia dedicado; dependências/configuração da API; testes de upload; configuração da mídia no front.
  - **Notes:** Escolher biblioteca mantida para crop/processamento. Saída até 1200×1200; fontes acima de 5 MB viram WebP qualidade inicial 85, reduzindo até 70 para ficar abaixo de 5 MB; falhar claramente se limite não for atingido. Servidor escolhe nome/caminho, restringe operações à raiz gerenciada e serve arquivos por rota controlada. Serializar limite de 10 fotos por animal. Apagar só foto removida/órfã sem referências.
  - **Verification:** Testar formatos aceitos/rejeitados, arquivos abaixo/acima de 5 MB, dimensão/crop, compressão, 10ª/11ª foto, colisão concorrente, arquivo órfão, remoção sem confirmação e tentativa de path traversal.

- [x] 6. Adicionar contrato web e rotas de animais
  - **Goal:** Expor tipos e funções tipadas para API de animais, configurar acesso dos quatro perfis e estabelecer coleção `/painel/animais` com ficha `/painel/animais/[id]`.
  - **Files:** `apps/web/src/lib/api.ts`, `apps/web/src/lib/access.ts`, `apps/web/src/app/painel/animais/page.tsx`, `apps/web/src/app/painel/animais/[id]/page.tsx`, `.cursor/rules/front-url-recurso.mdc`.
  - **Notes:** Substituir comportamento genérico da seção Animais. A rota segmentada precisa carregar recurso pelo id da URL e sobreviver a refresh/link direto. Links futuros de adoção/vacinação/castração só aparecem quando módulos existirem.
  - **Verification:** Typecheck web; validar acesso de cada perfil e abrir/atualizar URL de lista e ficha sem estado local prévio.

- [x] 7. Construir listagem e filtros
  - **Goal:** Criar listagem paginada com busca por nome/registro, filtros da spec, indicador de alertas e acesso à ficha.
  - **Files:** `apps/web/src/app/painel/animais/page.tsx`, componentes específicos sob `apps/web/src/components/`, `apps/web/src/app/globals.css` se necessário.
  - **Notes:** Ocultar adotados/óbitos por padrão; filtro explícito permite consulta somente leitura. Mostrar foto identificadora, situação, raça, baia/“Sem baia” e alerta acessível que não dependa só de cor.
  - **Verification:** Verificar filtros combinados, estados de carregamento/erro/vazio, indicação de alerta, ocultação padrão de estados terminais e navegação por teclado/mobile.

- [x] 8. Construir cadastro e edição em etapas
  - **Goal:** Formulário mobile com identificação, características/idade, acolhimento/localização, fotos e revisão; permitir criar com dados mínimos e completar depois.
  - **Files:** `apps/web/src/app/painel/animais/page.tsx`, componentes do formulário em `apps/web/src/components/`, componentes shadcn usados pelo fluxo.
  - **Notes:** Busca de raça filtrada por espécie; `Outra` abre campo livre reutilizável, `Não Informada` e SRD mantêm significado. Preservar valores entre etapas e após erro. Upload inclui crop quadrado, contador e confirmação para remover foto.
  - **Verification:** Testar avanço/retorno sem perda, validação de campos, inclusão rápida de raça, 10 fotos, confirmação cancelar/remover e layout em viewport móvel.

- [x] 9. Construir ficha dedicada, alertas e ações
  - **Goal:** Mostrar/editar ficha, seção “Alertas e pendências”, galeria, baia, peso, observações e histórico auditável; apresentar somente leitura para adotado/óbito.
  - **Files:** `apps/web/src/app/painel/animais/[id]/page.tsx`, componentes de ficha/histórico em `apps/web/src/components/`, `apps/web/src/lib/api.ts`.
  - **Notes:** Resolver alertas de baia ausente, sexo/raça/castração não informados e idade aproximada. Ações de alocação/transferência refletem ocupação real. Apenas Coordenação pode revogar terminal, com confirmação e motivo obrigatório. Não incluir forms de vacinação/castração/adoção.
  - **Verification:** Testar breadcrumbs, links de baia, alerta com ação, histórico com autor/instante, bloqueio de mutações por estado terminal e revogação auditada.

- [ ] 10. Executar validação integrada e atualizar contexto
  - **Goal:** Confirmar critérios de aceitação ponta a ponta, corrigir falhas e registrar arquitetura implementada.
  - **Files:** suítes API/Web relevantes; `.ai-context/architecture.md`, `.ai-context/glossary.md`, `.ai-context/short-term.md`, `.cursor/rules/front-url-recurso.mdc`.
  - **Notes:** Incluir smoke test manual em desktop e celular. Atualizar `gestao-de-baias.md`/contexto se o comportamento de ocupação real diferir do plano.
  - **Verification:** `pnpm --filter @zootech/api test -- --runInBand`, typecheck API/Web, lint e build; conferir testes manuais de upload, rota direta, estados terminais, alertas e transferência. Registrar resultados e limitações.

## Checklist de Validação

- [x] Migration e seed idempotente aplicados; catálogo de raças validado.
- [x] Quatro perfis autenticados consultam/criam/editam animais operacionais; visitante recebe 401.
- [x] Número de registro único; raça sempre pertence à espécie escolhida.
- [x] Baia opcional e ocupação real respeitam capacidade, estado e `emIsolamento`.
- [x] Timeline, observações, fotos, pesagens, alterações e alocações têm autoria e auditoria.
- [x] Nenhum animal pode ser excluído; adotado/óbito ficam ocultos por padrão e somente leitura.
- [x] Revogação terminal só por Coordenação, com motivo auditado.
- [x] Galeria limita 10 fotos, aplica corte quadrado e compressão, remoção confirmada e limpeza segura.
- [ ] Lista, fluxo por etapas e ficha funcionam em desktop/mobile e URL direta.
- [ ] Testes, lint, typecheck, build e validação manual passam; `.ai-context/` atualizado.

## Bloqueios / Decisões Necessárias

- Nenhum bloqueio de produto conhecido. Elegibilidade de isolamento, URL, processamento e retenção de fotos foram decididos e registrados na spec/plano.
- Seleção da biblioteca de processamento de imagens é decisão técnica da implementação; conferir compatibilidade com runtime e licença antes de adicionar dependência.
- CRUD de vacinação, módulo de castração e módulo de adoção são próximos passos, fora deste checklist.
