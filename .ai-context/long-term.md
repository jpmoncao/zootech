# Long-Term Context

## Vision

Sistema de gestão do Centro de Controle de Zoonoses: animais em baias, acolhimento, prontuário, vacinação, castração, adoção (quando o tutor passa a existir), relatórios, usuários e auditoria.

## Product Principles

- O primeiro uso real é o veterinário administrador consultar e operar o CCZ a partir do painel.
- O diagrama de classes vale, com três correções posteriores: baia obrigatória e transferível, animal nasce sem tutor, tutor entra na adoção.
- Needs confirmation: princípios de interface e de prioridade entre plantel, clínico e adoção.

## Technical Principles

- Monorepo Node.js e TypeScript.
- Front: Next.js. Back: NestJS. Banco: Postgres.
- Pacotes e tarefas de build com pnpm e Turborepo.
- Persistência no banco desde o MVP. Sem outras integrações.

## Roadmap

### Now

Painel do veterinário ADM, depois do login:

- UC02 a UC10.
- Cadastro e gestão de usuários e funcionários.
- Registro de auditoria.
- Baias e transferência de animal entre baias.

### Next

Needs confirmation. Painéis restritos de funcionário e de veterinário já estão no diagrama de casos de uso. O marco atual entrega essas funções ao ADM.

### Later

Needs confirmation. Login de tutor não aparece no diagrama.

## Non-Goals

- Integrações externas além do Postgres, neste momento.
- Restaurar o painel e a API do bootstrap anterior.
- Tratar o painel ADM como uma casca vazia. Ele inclui o domínio clínico e operacional.

## Long-Lived Constraints

- Atores de negócio já citados: veterinário, funcionário do CCZ e tutor.
- Identificadores brasileiros no modelo: CPF no usuário e CRMV no funcionário.
- Includes confirmados: UC06 e UC08 incluem UC01. Não há outros includes nem extends no trecho enviado.
