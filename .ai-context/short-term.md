# Short-Term Context

## Current Focus

Domínio do MVP fechado em 2026-09-23: painel ADM com o sistema inteiro, baia obrigatória e tutor só na adoção. Próximo passo é a spec, ainda sem código.

## Active Tasks

- Escrever a spec do MVP.
  - Status: pronta para começar
  - Notes: o painel ADM inclui UC02–UC10, gestão de usuários/funcionários e auditoria
- Criar o monorepo (pnpm, Turborepo, Next.js, NestJS, Postgres).
  - Status: ainda não autorizado como implementação

## Recent Changes

- 2026-09-23
  - Change: Painel ADM cobre todas as funcionalidades, mais usuários/funcionários e auditoria. Animal sempre em uma baia e pode ser transferido. Tutor só depois da adoção. Includes confirmados: UC06 e UC08 incluem UC01.
  - Reason: Respostas do autor sobre o corte do painel e o modelo.
- 2026-09-23
  - Change: Removidos o monorepo anterior, Speckit, Impeccable e as specs `001` e `002`.
  - Reason: Recomeçar pelo workflow agêntico.

## Blockers

- Atributos da baia, os eventos gravados na auditoria e os valores de `perfilAcesso` ainda não foram listados.
  - Impact: a spec precisa assumir esses detalhes ou recebê-los.
  - Next action: seguir com suposições explícitas na spec, se não houver outra rodada de diagrama.

## Next Steps

1. Escrever a spec do MVP com `product-spec`.
2. Planejar o monorepo e a API a partir dessa spec.
3. Implementar só depois do plano.

## Things To Remember

- Não restaurar o bootstrap apagado.
- O veterinário ADM enxerga todas as funcionalidades. Funcionário e veterinário continuam com os casos de uso do diagrama.
- Persistência é Postgres. Não há fila, storage externo nem serviço de terceiros neste momento.
