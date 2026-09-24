# Project Overview

## What This Project Is

ZooTech é o sistema de gestão do Centro de Controle de Zoonoses (CCZ). O repositório está no estágio de definição: não há aplicação, monorepo nem banco criados. A direção de produto e a stack abaixo foram confirmadas em 2026-09-23.

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

O animal sempre está em uma baia e pode ser transferido. Ele nasce sem tutor e só recebe tutor na adoção.

## Important Links

- Repository: este repositório
- Design: diagramas Mermaid do usuário (2026-09-23), copiados em `architecture.md`
- Documentation: `AGENTS.md`, `DEVELOPMENT_WORKFLOW.md`, `.ai-context/`
- Production: não há
- Staging: não há
