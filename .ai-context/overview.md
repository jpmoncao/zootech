# Project Overview

## What This Project Is

ZooTech é o sistema de gestão do Centro de Controle de Zoonoses (CCZ). O monorepo existe com Next.js sem tela e NestJS só com `GET /health`. O domínio do MVP ainda não foi implementado. A stack foi confirmada em 2026-09-23.

## Who It Serves

- Veterinário administrador: primeiro ator do MVP. Opera o sistema inteiro, cadastra usuários e funcionários e consulta a auditoria.
- Funcionário do CCZ: cadastro, acolhimento, fila de castração, adoção e relatórios, no recorte do diagrama.
- Veterinário: prontuário, vacinação, castração e relatórios, no recorte do diagrama.
- Tutor: responsável pelo animal depois da adoção. Não é ator dos casos de uso desenhados.

## Core Problem

O CCZ precisa registrar animais em baias, o clínico, a adoção e os tutores — o tutor só entra quando o animal é adotado.

## Current Stage

MVP. Primeiro marco: login e painel do veterinário administrador com todas as funcionalidades, gestão de usuários e funcionários, e auditoria. Persistência em Postgres. Nenhuma outra integração.

## Main Capabilities

Confirmadas como domínio, ainda não implementadas:

- Autenticação.
- Baias, animais, tutores, acolhimento, prontuário, vacinas, castração, adoção e relatórios epidemiológicos.
- Cadastro e gestão de usuários e funcionários, exclusivos do ADM.
- Registro de auditoria consultável pelo ADM.

O animal pode estar sem baia durante tratamento; ficha deve destacar a pendência de alocação. Pode ser transferido e nasce sem tutor; só recebe tutor na adoção.

## Important Links

- Repository: este repositório
- Design: diagramas Mermaid do usuário (2026-09-23), copiados em `architecture.md`
- Documentation: `AGENTS.md`, `DEVELOPMENT_WORKFLOW.md`, `.ai-context/`
- Production: não há
- Staging: não há
