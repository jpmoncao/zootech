# Implementation Plan: Gestão de Baias

## Objective

Implementar cadastro, edição, consulta em lista e mapa esquemático, ações operacionais, ocupantes e auditoria de baias conforme `.ai-context/specs/gestao-de-baias.md`.

## Relevant Context

- Monorepo pnpm/Turborepo: Next.js em `apps/web`, NestJS em `apps/api`, Postgres com Prisma.
- A API tem módulos `auth`, `users` e `prisma`. O guard de papéis permite restringir endpoints; atualmente apenas algumas operações são exclusivas de `coordenacao`.
- `AuditoriaEvento` armazena `tipo`, `usuarioId`, `dados` JSON e `createdAt`, e ações de usuário já gravam auditoria dentro de transação.
- O menu já aponta `baias` para `/painel/baias`; páginas de seção genérica usam `apps/web/src/app/painel/[secao]/page.tsx` e `Shell`.
- Não existem modelos nem módulo de domínio para `Baia` ou `Animal`. A ocupação, a regra animal-em-uma-baia e o isolamento dependem de um contrato mínimo de Animal.
- A spec recomenda que baias ocupadas não possam ser interditadas/inativadas e que higienização só comece vazia; permissões e política de motivos continuam abertas.

## Files and Modules Likely Involved

### API

- `apps/api/prisma/schema.prisma` e nova migration Prisma: modelos, enums, relações e índices.
- `apps/api/src/app.module.ts`: registrar módulo de baias.
- Novo `apps/api/src/baias/`: controller, service, DTOs e testes Jest seguindo o padrão Nest atual.
- `apps/api/src/prisma/prisma.service.ts`: reutilizar cliente existente; sem mudança prevista.
- `apps/api/src/auth/decorators/roles.decorator.ts`, `apps/api/src/auth/guards/roles.guard.ts`: aplicar RBAC existente; só alterar se a política confirmada exigir novo mecanismo.

### Web

- `apps/web/src/app/painel/baias/page.tsx` (rota específica para substituir a página genérica).
- Novo componente de domínio sob `apps/web/src/components/` para formulário, lista/mapa, detalhes e ações; aproveitar componentes em `apps/web/src/components/ui/`.
- `apps/web/src/lib/api.ts`: funções e tipos para listar/criar/editar baias, ações, higienização e histórico.
- `apps/web/src/lib/access.ts`: declarar capacidades por perfil se a política confirmada exigir ocultação/negação no front; API continua sendo autoridade.
- `apps/web/src/app/globals.css`: estilos apenas quando não cobertos pelos componentes e tokens existentes.

### Contexto

- Atualizar `.ai-context/architecture.md`, `.ai-context/glossary.md` e `.ai-context/short-term.md` depois que modelo, fluxo e permissões forem implementados/decididos.

## Proposed Approach

Separar regras de domínio no backend da apresentação no front. Persistir mudanças de estado e respectivos eventos de auditoria atomicamente. O modelo de baia deve expor ocupação atual por relação, com validação transacional de capacidade e estado. A UI consome a mesma consulta filtrada para lista e mapa.

Antes de implementar ocupantes, definir integração com o futuro módulo Animal: preferir usar a relação do modelo Animal quando ele for criado; caso o marco de baias venha primeiro, criar apenas o contrato/modelo mínimo aprovado, sem antecipar dados clínicos. Não armazenar contagem de ocupantes como fonte independente.

## Implementation Steps

1. **Fechar decisões funcionais mínimas**
   - Confirmar papéis que podem cadastrar/editar, higienizar, interditar/liberar e inativar/reativar.
   - Confirmar motivo obrigatório/opcional e se higienização exige baia vazia.
   - Definir o contrato com Animal/isolation e se o marco inclui fluxo de transferência ou apenas leitura dos ocupantes.

2. **Modelar e migrar dados**
   - Adicionar `Baia`, enums de setor/tipo/estado e timestamps; código normalizado/único; capacidade, área e booleanos definidos na spec.
   - Relacionar a baia aos animais ocupantes conforme o contrato aprovado. Garantir no banco que cada animal tenha no máximo uma baia atual e considerar a obrigatoriedade de exatamente uma no momento de criar o domínio Animal.
   - Reutilizar `AuditoriaEvento`, padronizando `tipo` e `dados` para identificar entidade/baia, evento e alterações.
   - Gerar migration e cliente Prisma.

3. **Implementar API de consulta e cadastro**
   - Criar endpoints autenticados para listar com filtros por setor/estado/busca, obter detalhe e histórico, criar e editar.
   - Validar código, capacidade inteira >= 1, capacidade individual = 1, unicidade case-insensitive, e impedir reduzir capacidade abaixo da ocupação ou invalidar ocupantes existentes.
   - Retornar ocupantes, capacidade usada e capacidade restante sem duplicar informação persistida.

4. **Implementar ações e auditoria transacionais**
   - Criar endpoints para iniciar/concluir higienização, interditar/liberar e inativar/reativar, conforme política autorizada.
   - Validar estados concorrentes e ocupação dentro da mesma transação; registrar usuário autenticado, horário e resumo no mesmo commit.
   - Rejeitar ocupação/alocação quando baia estiver indisponível, cheia ou incompatível com isolamento. Integrar transferência quando o contrato de Animal estiver disponível.

5. **Construir interface de baias**
   - Substituir a rota genérica `/painel/baias` por página de domínio.
   - Entregar lista e mapa esquemático agrupado por setor, filtros compartilhados, busca por código e indicadores de estado/capacidade.
   - Implementar cadastro/edição com validação e preservação dos dados ao ocorrer erro; painel de detalhes com ocupantes, última higienização e histórico.
   - Adicionar ações operacionais com confirmação e mensagens de bloqueio claras; seguir identidade visual e shadcn já adotados.

6. **Revisar permissões e atualizar contexto**
   - Aplicar o RBAC confirmado nos endpoints e refletir affordances equivalentes na UI.
   - Atualizar documentação de arquitetura, glossário e foco de curto prazo para registrar modelo e comportamento entregues.

## Verification Plan

- API: `pnpm --filter @zootech/api prisma:generate`, migration em Postgres local, `pnpm --filter @zootech/api test`, `pnpm --filter @zootech/api typecheck` e `pnpm --filter @zootech/api lint`.
- Web: `pnpm --filter @zootech/web typecheck`, `pnpm --filter @zootech/web lint` e `pnpm --filter @zootech/web build`.
- Raiz: `pnpm typecheck`, `pnpm lint` e, se necessário, `pnpm build`.
- Cobrir API com testes para duplicidade de código, limites de capacidade, conflitos de estado, autorização, auditoria atômica, ocupação concorrente e transferência.
- Validar manualmente no navegador: alternância lista/mapa, filtros, cadastro/edição, ocupantes, ações, erros e histórico com perfis autorizados e não autorizados.

## Risks and Edge Cases

- Sem modelo de Animal, ocupantes e isolamento não podem ser validados de ponta a ponta. Evitar criar uma relação provisória que conflite com o módulo futuro.
- `AuditoriaEvento` não possui FK para entidade; consultar histórico de baia exigirá convenção estável em `dados` ou evolução do modelo de auditoria.
- A comparação de código sem distinção de maiúsculas deve ser garantida sob concorrência (normalização persistida ou índice funcional, não apenas validação na aplicação).
- Operações concorrentes na última vaga ou numa interdição precisam de transação/isolamento que impeça capacidade excedida e auditoria órfã.
- Uma migração que imponha baia obrigatória a animais existentes não se aplica ainda; planejar quando o domínio Animal for introduzido.
- RBAC de ações operacionais permanece indefinido na spec e pode afetar controller, menus e testes.

## Open Questions

1. O CRUD de baias será implementado junto com cadastro de animais, ou este plano deve criar um modelo mínimo de Animal para ocupantes?
2. Qual é o campo/estado oficial de isolamento do animal?
3. Quais perfis podem executar cada ação e consultar histórico?
4. O fluxo de transferência entre baias entra neste marco ou fica para o CRUD de animais?
5. O histórico pode usar `AuditoriaEvento.dados` com `entidade` e `entidadeId`, ou é necessário modelo de auditoria de domínio dedicado?
6. O Postgres alvo suporta índice funcional para unicidade case-insensitive no padrão Prisma escolhido, ou será usado campo normalizado?

## Definition of Done

- Coordenação e perfis autorizados conseguem executar as operações permitidas; perfis não autorizados recebem negação da API.
- Lista e mapa mostram os mesmos resultados para filtros aplicados, com estado e ocupação atuais.
- Regras de capacidade, individualidade, isolamento e estado são aplicadas no backend, inclusive sob concorrência.
- Ações confirmadas e alterações de cadastro geram auditoria imutável na mesma transação.
- Testes automatizados, typecheck, lint e build aplicáveis passam; a jornada principal foi verificada no navegador.
- Contexto de arquitetura e glossário descrevem o modelo realmente implementado.
