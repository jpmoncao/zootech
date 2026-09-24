# Short-Term Context

## Current Focus

Bootstrap do monorepo concluído em 2026-09-23. A identidade visual está em `DESIGN.md`. O front tem login e a casca do painel. A API responde só em `GET /health`. O domínio do MVP continua sem cadastro de animais.

## Active Tasks

- Bootstrap em `.ai-context/tasks/bootstrap-monorepo.md`.
  - Status: concluído
  - Notes: sem telas, sem ORM, sem domínio; Postgres só como Compose e `DATABASE_URL`
- Escrever a spec do MVP (painel ADM).
  - Status: bloqueada pela identidade visual para qualquer tela
  - Notes: o painel ADM inclui UC02–UC10, gestão de usuários/funcionários e auditoria

## Recent Changes

- 2026-09-23
  - Change: Login e casca do painel no front, com a identidade do guia. Sem cadastro de animais. Senha ainda não conferida pela API.
  - Reason: A identidade precisava existir antes das telas de domínio.
- 2026-09-23
  - Change: Monorepo criado com `apps/web` sem tela, `apps/api` só com `GET /health` e Postgres local sem esquema.
  - Reason: Bootstrap autorizado depois da spec e das tarefas.
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

1. Escrever a spec do painel ADM em cima da identidade já registrada.
2. Ligar o login a uma sessão real na API. Hoje a senha não é conferida e a sessão fica no navegador.

## Things To Remember

- Não restaurar o bootstrap apagado.
- O veterinário ADM enxerga todas as funcionalidades. Funcionário e veterinário continuam com os casos de uso do diagrama.
- Interface em `apps/web` usa shadcn, no tema de `DESIGN.md`. Login e casca já usam esses componentes.
- Persistência é Postgres. Não há fila, storage externo nem serviço de terceiros neste momento.
