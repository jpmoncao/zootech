# Implementation Plan: Gestão de castrações

## Objective

Substituir o campo isolado de castração por um fluxo único por animal que permita registrar status legado, agendar uma cirurgia futura, concluir ou cancelar, consultar a agenda e auditar todas as alterações para todos os perfis autenticados.

## Relevant Context

- A spec de produto está em `.ai-context/specs/gestao-de-castracoes.md`; decisões confirmadas: todos os usuários autenticados podem operar, agenda sem local/recursos extras, um único registro por animal, datas planejadas com hora e hora efetiva opcional.
- O módulo atual de animais já possui controllers, service, DTOs, timeline e auditoria transacional em `apps/api/src/animais/`. As rotas são autenticadas por `JwtAuthGuard` e `RolesGuard`; todos os quatro perfis podem operar animais.
- `Animal.castrado` atualmente é um enum (`sim`, `nao`, `nao_informado`) em `apps/api/prisma/schema.prisma`. O campo alimenta criação/edição, filtro da lista e alertas.
- O front de animais mantém o select no cadastro e edição, e filtro na lista. Navegação já tem item de Castrações comentado em `apps/web/src/lib/nav.ts`; `sectionRoles` em `apps/web/src/lib/access.ts` já define `castracoes` para todos.
- O histórico do animal é montado por `AnimaisService.timeline`; eventos e `AuditoriaEvento` são gravados na mesma transação. Testes HTTP ficam em `apps/api/src/animais/animais.spec.ts`.
- Especificação e status de memória do projeto têm trechos antigos indicando que castração é módulo futuro. Atualizar documentação durável após a implementação.

## Files and Modules Likely Involved

- `apps/api/prisma/schema.prisma`
- Nova migration em `apps/api/prisma/migrations/` e migration lock se necessário
- `apps/api/src/animais/animais.module.ts`, `animais.controller.ts`, `animais.service.ts`
- DTOs novos em `apps/api/src/animais/dto/` ou módulo Nest separado `apps/api/src/castracoes/` (decidir durante implementação; manter junto de animais reduz acoplamento inicial)
- `apps/api/src/animais/animais.spec.ts` ou novos testes de integração próprios
- `apps/web/src/lib/api.ts`, `apps/web/src/lib/nav.ts`
- Nova página `apps/web/src/app/painel/castracoes/page.tsx`
- `apps/web/src/app/painel/animais/page.tsx` e `apps/web/src/app/painel/animais/[id]/page.tsx`
- `.ai-context/specs/gestao-de-animais.md`, `.ai-context/architecture.md`, `.ai-context/decisions.md`, `.ai-context/glossary.md`, `.ai-context/short-term.md`

## Proposed Approach

1. Criar registros relacionais de avaliação e tentativas de procedimento por animal, com status, origem, data/hora planejada, data efetiva (hora opcional), observação e motivo de cancelamento. Permitir histórico de tentativas canceladas, limitar a um agendamento ativo e a um procedimento realizado por animal.
2. Tratar transições na API, não aceitar status final arbitrário no PATCH. Criar endpoints para agenda, criação, reagendamento/observação, conclusão e cancelamento, todos autenticados para os quatro perfis.
3. Registrar cada ação na auditoria e timeline na mesma transação que altera o registro. Preservar estado anterior/novo, autor e motivo quando aplicável.
4. Integrar status derivado e histórico na ficha/listagem do animal, remover o select de cadastro/edição e adaptar filtro/alertas existentes.
5. Criar página de agenda com itens agendados futuros e atrasados, busca por nome/registro, filtros de data e consulta de realizados/cancelados. Não incluir local ou recursos.
6. Migrar `sim` para procedimento legado realizado, `nao` para avaliação legada “Não castrado” e `nao_informado` para ausência de informação. Essa avaliação não representa uma cirurgia nem inventa data. O campo de edição isolado sai do formulário, e a informação fica visível no histórico/status do módulo.

## Implementation Steps

1. **Fechar contrato de domínio e persistência**
   - Definir enum de estado e origem, nullable/precision das datas e semântica da observação.
   - Representar `nao` legado como avaliação informativa `nao_castrado`, distinta de um procedimento; avaliação pode guardar data conhecida e observação.
   - Adicionar relação `Animal.castracoes` 0..N e índices/constraints no Prisma. Garantir por índice parcial PostgreSQL (ou transação equivalente) no máximo um agendamento ativo e no máximo um procedimento realizado por animal.
2. **Migration e compatibilidade**
   - Criar migration não destrutiva: criar tabela, migrar `sim` para registro `realizada`/`legada` sem data e `nao` para avaliação legada `nao_castrado`; manter `nao_informado` sem registro.
   - Remover `Animal.castrado` apenas depois da conversão; validar contagens antes/depois na migration ou em consulta de verificação.
3. **API e regras de negócio**
   - Implementar consulta paginada/filtrada da agenda e consulta por animal.
   - Implementar criar agendamento, avaliação legada ou registro legado realizado; permitir novo agendamento depois de cancelamento e manter cada tentativa no histórico.
   - Garantir concorrencialmente no máximo um agendamento ativo e no máximo um procedimento realizado por animal.
   - Implementar reagendamento, conclusão e cancelamento com DTOs e transições permitidas. Agendamento exige instante futuro; conclusão permite data efetiva sem hora; cancelamento exige motivo.
   - Recusar criação/alteração em animal adotado ou falecido, exceto cancelamento de agendamento existente. Todos os perfis autenticados podem operar.
   - Gravar `EventoAnimal` e `AuditoriaEvento` transacionalmente. Expor estado resumido no objeto do animal e castração completa na ficha.
4. **Testes da API**
   - Cobrir autenticação 401, operações para os quatro perfis e autoria derivada da sessão.
   - Cobrir migração sem data inventada, avaliação legada `nao_castrado`, datas, transições, novo agendamento após cancelamento, duplicidade de agendamento ativo, segundo procedimento realizado, concorrência, animais terminais e rollback quando auditoria falha.
5. **Contrato e interface da agenda**
   - Adicionar tipos/funções API no `api.ts` e tornar acessível o item Castrações em navegação.
   - Construir `/painel/castracoes` com agenda cronológica, filtros e estados carregando/vazio/erro, links para ficha e ações contextuais.
   - Usar controles shadcn, Tailwind em `className` e tokens do `DESIGN.md`; não adicionar CSS de feature em `globals.css`.
6. **Integração na lista e ficha animal**
   - Remover select de castração do cadastro/edição e o filtro enum antigo; substituir por status derivado e filtros úteis (agendada, realizada, não castrado, não informado, cancelada conforme decisão de UX).
   - Trocar alerta “castração não informada” por resumo/status acionável conforme o estado, incluindo “Não castrado” quando houver avaliação explícita.
   - Na ficha, mostrar status, data/observação e permitir agendar, registrar legado, concluir, reagendar ou cancelar segundo o estado atual.
7. **Atualizar contexto e validar**
   - Alinhar spec de animais e atualizar architecture, decisions, glossary e short-term.
   - Rodar Prisma generate/migration, testes da API, typecheck/lint/build API e web; validar manualmente agenda, filtros e fluxos na ficha.

## Verification Plan

- Migration: executar contra banco de teste com exemplos `sim`, `nao` e `nao_informado`; confirmar que nenhuma data foi inventada e que cada valor legado foi preservado no tipo de registro correto.
- API: `pnpm --filter @zootech/api test -- --runInBand`, `pnpm --filter @zootech/api typecheck` e `pnpm --filter @zootech/api lint`.
- Web: `pnpm --filter @zootech/web typecheck`, `pnpm --filter @zootech/web lint` e `pnpm --filter @zootech/web build`.
- Navegador: entrar com perfis dos quatro tipos; agendar, reagendar, concluir, cancelar e registrar legado; confirmar agenda, status na ficha/lista, observação, filtros e bloqueio terminal.

## Risks and Edge Cases

- Os valores legados `sim`, `nao` e `nao_informado` não são equivalentes a “registro de cirurgia realizado” versus “nenhum registro”; a migração precisa preservar `nao` como avaliação sem criar cirurgia fictícia.
- Pode existir mais de uma tentativa de agenda ao longo do tempo, mas apenas uma ativa por vez; cada cancelada precisa permanecer inativa no histórico e a próxima tentativa usa novo registro.
- Horários em timezone local precisam ser normalizados para UTC sem deslocamento indevido na entrada de `datetime-local`.
- Auditoria e operação devem compartilhar a mesma transação para não exibir cirurgia sem trilha ou evento sem cirurgia.
- Atualizar listagem de animais não deve quebrar os filtros e alertas que hoje dependem de `castrado`.

## Open Questions

1. Resolvida: preservar `nao` legado como avaliação “Não castrado”, sem criar procedimento ou inventar data.
2. Resolvida: cancelamento inativa o agendamento e mantém o histórico; uma nova tentativa cria outro registro.

## Definition of Done

- Todos os perfis autenticados podem consultar e operar castrações, com autoria da sessão e histórico/auditoria atômicos.
- Animal pode ter histórico de tentativas canceladas, no máximo um agendamento ativo e no máximo um procedimento realizado; legados são migrados sem inventar datas e `não castrado` é preservado como avaliação.
- Agenda e ficha permitem acompanhar agendado, realizado, cancelado, não castrado e não informado, incluindo observação e datas disponíveis.
- Select legado foi removido do cadastro/edição e listagem integrada usa os novos estados.
- Regras para estados terminais, cancelamento, reagendamento e concorrência são cobertas por testes.
- Testes, typecheck, lint e build relevantes passam; contexto do projeto está atualizado.
