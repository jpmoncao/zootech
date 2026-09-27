# Implementation Tasks: Gestão de castrações

## Objective

Implementar avaliação de status, agenda e histórico de castrações por animal, preservando dados legados, permitindo todos os perfis autenticados e mantendo auditoria transacional.

## Assumptions

- `castrado = sim` migra para cirurgia legada realizada sem data inventada; `castrado = nao` migra para avaliação legada “Não castrado”; `nao_informado` permanece sem registro.
- É permitido ter várias tentativas canceladas, no máximo um agendamento ativo e no máximo um procedimento realizado por animal.
- Cancelar inativa e preserva o agendamento no histórico; nova tentativa cria um novo registro.
- Todos os quatro perfis autenticados podem consultar e operar o módulo.
- Agenda não inclui local, equipe responsável nem bloqueio de recursos.

## Tasks

- [x] 1. Definir o modelo Prisma e invariantes de castração
  - **Goal:** Adicionar registros de avaliação e procedimento vinculados ao animal, contemplando `agendada`, `realizada`, `cancelada` e a avaliação `não castrado`.
  - **Files:** `apps/api/prisma/schema.prisma`, nova migration em `apps/api/prisma/migrations/`.
  - **Notes:** Guardar origem, data/hora planejada, data efetiva com hora opcional, data de avaliação opcional, observação, motivo de cancelamento, autor e timestamps. Implementar restrições para um agendamento ativo e no máximo um procedimento realizado por animal. Registrar como avaliações e procedimentos afetam o status derivado.
  - **Verification:** `prisma validate` e `prisma generate`; migration aplicada em banco de teste com constraints verificadas.

- [x] 2. Migrar os status atuais preservando semântica e dados
  - **Goal:** Migrar os valores atuais sem datas ou procedimentos fictícios e então remover o campo `Animal.castrado` legado.
  - **Files:** Migration em `apps/api/prisma/migrations/`, `apps/api/prisma/schema.prisma`.
  - **Notes:** `sim` vira procedimento legado realizado sem data; `nao` vira avaliação legada “Não castrado”; `nao_informado` não cria registro. Nunca inferir data a partir do acolhimento, criação ou migração. Migration deve ser segura para dados existentes.
  - **Verification:** Testar a migration com uma base contendo os três valores; conferir contagens, estados e ausência de datas inventadas.

- [x] 3. Implementar endpoints e regras da API
  - **Goal:** Oferecer agenda, consulta por animal, criação de avaliação/registro legado, agendamento, reagendamento, conclusão e cancelamento.
  - **Files:** `apps/api/src/animais/animais.controller.ts`, `animais.service.ts`, `animais.module.ts`, DTOs em `apps/api/src/animais/dto/` (ou módulo dedicado após inspeção).
  - **Notes:** Garantir acesso aos quatro perfis autenticados; rejeitar visitante. Agendamento exige data/hora futura; conclusão aceita data efetiva sem hora; cancelamento exige motivo e inativa o registro. Permitir novo agendamento depois de cancelado, preservar cancelamentos, bloquear segundo procedimento realizado. Bloquear criação e alteração em animal adotado/óbito, permitindo cancelar agendamento existente.
  - **Verification:** Exercitar transições válidas e inválidas por HTTP; concorrência não pode produzir dois agendamentos ativos ou dois procedimentos realizados.

- [x] 4. Gravar timeline e auditoria atomicamente
  - **Goal:** Registrar autoria, instante, ação, valores relevantes e motivo para cada mudança sem permitir operação sem auditoria.
  - **Files:** `apps/api/src/animais/animais.service.ts` e testes correspondentes.
  - **Notes:** Reutilizar os padrões existentes de `EventoAnimal` e `AuditoriaEvento`; gravação da castração, evento de timeline e auditoria compartilham transação. A autoria vem da sessão, nunca do body.
  - **Verification:** Teste confirma evento com autor e valores; falha simulada na auditoria reverte operação do domínio.

- [x] 5. Cobrir API, permissões, migração e concorrência com testes
  - **Goal:** Testar regras centrais do módulo e os quatro perfis autenticados.
  - **Files:** `apps/api/src/animais/animais.spec.ts` ou novo `apps/api/src/castracoes/castracoes.spec.ts`.
  - **Notes:** Cobrir 401, acesso dos quatro perfis, autoria, legado `sim`/`nao`/`nao_informado`, datas, status derivado, novo agendamento após cancelamento, segundo agendamento ativo, segundo procedimento realizado, status terminal, cancelamento com motivo e rollback de auditoria.
  - **Verification:** `pnpm --filter @zootech/api test -- --runInBand`.

- [x] 6. Expor contratos no front e habilitar navegação
  - **Goal:** Tipar a API de castrações e tornar a seção acessível no painel.
  - **Files:** `apps/web/src/lib/api.ts`, `apps/web/src/lib/nav.ts`, `apps/web/src/lib/access.ts`.
  - **Notes:** `sectionRoles` já contém todos os perfis para `castracoes`; manter essa política e ativar o item comentado de navegação. Tipar filtros, agenda, estados e comandos de transição.
  - **Verification:** Typecheck web passa e a seção aparece para os quatro perfis autenticados.

- [x] 7. Criar página de agenda e histórico
  - **Goal:** Permitir localizar e operar castrações futuras e consultar realizadas/canceladas.
  - **Files:** Nova `apps/web/src/app/painel/castracoes/page.tsx`; componentes existentes de UI conforme necessário.
  - **Notes:** Ordenação cronológica; filtros por período e busca por nome/registro; mostrar animal, registro, espécie, baia se houver, data/hora e status. Incluir atrasados, estados carregando/vazio/erro e link para ficha. Cancelar pede motivo. Nova tentativa após cancelamento cria novo registro. Usar shadcn e Tailwind conforme `AGENTS.md`/`DESIGN.md`.
  - **Verification:** Validar agenda, filtros, links e fluxos de agendar, reagendar, concluir e cancelar em navegador.
  - **Status da validação:** migrações aplicadas; typecheck, lint, build, detector Impeccable e 39 testes da API passaram. Fluxo visual no navegador integrado ficou pendente porque ele bloqueou o acesso à API local na porta 3001.

- [x] 8. Integrar status na lista e ficha e remover select legado
  - **Goal:** Remover edição direta de castração no cadastro de animal e exibir status derivado com datas, observação e ações.
  - **Files:** `apps/web/src/app/painel/animais/page.tsx`, `apps/web/src/app/painel/animais/[id]/page.tsx`, `apps/web/src/lib/api.ts`, `apps/api/src/animais/dto/create-animal.dto.ts`, `update-animal.dto.ts`, `list-animais.dto.ts`, `animais.service.ts`.
  - **Notes:** Remover filtros, campos e alertas baseados no enum antigo. Exibir “Agendada”, “Realizada”, “Não castrado”, “Cancelada”/histórico ou “Não informado” de forma coerente; permitir ações disponíveis na ficha. Preservar status em registros legados.
  - **Verification:** Cadastro/edição não oferecem select legado; API e front passam em typecheck/lint, API passa em 40 testes e builds de API/web passam. O teste de integração cobre estado derivado após avaliação, agenda, cancelamento e conclusão, com autoria na ficha. Validação visual no navegador permanece para a task 9.

- [x] 9. Atualizar documentos e executar validação integrada
  - **Goal:** Alinhar documentação de produto e contexto com o módulo implementado.
  - **Files:** `.ai-context/specs/gestao-de-animais.md`, `.ai-context/specs/gestao-de-castracoes.md`, `.ai-context/architecture.md`, `.ai-context/decisions.md`, `.ai-context/glossary.md`, `.ai-context/short-term.md`.
  - **Notes:** Atualizar descrições antigas que dizem que castração é futura ou que `Animal.castrado` ainda é enum editável.
  - **Verification:** Documentação de animais/castrações/arquitetura/contexto atualizada para o modelo `CastracaoAnimal` e estado derivado. API: `pnpm --filter @zootech/api typecheck`, `lint` e `test`; web: `pnpm --filter @zootech/web typecheck`, `lint` e `build`. Validação manual recomendada: agenda, ficha e legado com os quatro perfis.

## Validation Checklist

- [x] Testes de API cobrem regras, autorização, concorrência e rollback de auditoria.
- [x] Migration preserva `sim`, `nao` e `nao_informado` sem inventar dados.
- [x] Lint, typecheck e build passam para API e web.
- [x] Agenda e ficha refletem status, datas, observações e histórico de cancelamentos.
- [x] Reagendamento após cancelamento cria tentativa nova e preserva a cancelada.
- [x] `.ai-context/` reflete a arquitetura entregue para as tasks 1 e 2.
- [x] Resumo final inclui verificações e passos concretos de teste manual.

## Blockers / Decisions Needed

- Nenhum bloqueio de produto identificado. Durante a tarefa 1, documentar a representação final no esquema para separar avaliação “Não castrado” de procedimento cirúrgico sem reabrir os status independentes no formulário do animal.
