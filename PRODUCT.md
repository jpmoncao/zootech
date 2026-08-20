# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuário primário: veterinário ou gestão, no escritório, consultando o plantel para decidir. A tela maior é o cenário de uso; o painel ainda precisa permanecer utilizável em 320px (constituição), mas a hierarquia de informação serve à consulta e à decisão, não ao registro em pé ao lado do recinto.

Outros papéis (tratador em campo, estoque) não foram confirmados como primários. Registrados como audiência aberta.

## Product Purpose

ZooTech é o painel e a API de um zoológico: o operador consulta animais e recintos, e o estoque existe para servir esse cuidado. Sucesso é conseguir decidir sobre o plantel sem recorrer a planilha paralela ou a um sistema de estoque genérico.

O produto ainda não entrega domínio: a fundação atual é a casca do painel e a verificação de disponibilidade da API.

## Positioning

O centro é o plantel (animais e recintos). O estoque (ração, medicamentos, insumos) é periférico e só se justifica ligado a esse cuidado. Um ERP ou um estoque genérico não poderia reivindicar com honestidade essa ordem.

## Operating Context

- Dois processos independentes: painel Next.js (`apps/web`, porta 3000) e API Fastify (`apps/api`, porta 3333).
- Contratos públicos web↔API em `@zootech/contracts`; primitivos visuais em `@zootech/ui`.
- Idioma da interface e da documentação: português do Brasil (`pt-BR`).
- Uso confirmado: consulta e decisão no escritório. Dispositivos estreitos permanecem requisito constitucional, não o cenário primário.
- Domínio (animais, recintos, estoque), autenticação e persistência de produto ainda não existem; a constituição e a spec `001-bootstrap-monorepo` proíbem antecipá-los na fundação.

## Capabilities and Constraints

Confirmado:

- Nome do produto: ZooTech.
- Casca do painel: identidade, estado da API (“No ar” / “Indisponível”) e ação de atualizar.
- API: `GET /health`; formato em `@zootech/contracts`.
- UI não contém regra de negócio; casos de uso ficam na aplicação (API ou módulos de aplicação no cliente).
- Mobile-first 320px, copy não redundante, ícones associativos, contraste WCAG 2.2 AA.
- Sem autenticação, sem banco de produto, sem telas de domínio nesta fundação.

Aberto:

- Qual papel dentro de “veterinário ou gestão” é o primeiro a receber telas de domínio.
- Quais fluxos concretos de plantel e de estoque entram primeiro.
- Se tratador em campo e almoxarifado viram superfícies próprias ou o mesmo painel.

## Brand Commitments

- Nome: ZooTech. Sem logotipo, marca de instituição ou voz além do português direto já usado na casca (“No ar”, “Indisponível”, “Atualizar”).
- Constituição ZooTech 1.0.0 (`.specify/memory/constitution.md`) é vínculo de produto: mobile-first, UX não redundante, acessibilidade mínima, Clean Architecture, UI sem regra de negócio.
- Não há instituição real, identidade visual de terceiros nem tom de marca adicional a preservar.

## Evidence on Hand

Presente:

- Casca em `apps/web` (nome ZooTech, status da API, botão Atualizar).
- Constituição, spec e README da raiz.

Ausente — trabalho futuro não deve fabricar:

- Instituição, clientes, depoimentos, cases, números de plantel ou de estoque reais.
- Logotipo, fotografia, press ou prova social.
- Dados de domínio; as pastas de domínio da API estão vazias de propósito.

## Product Principles

1. O plantel é o centro; estoque só entra quando serve o cuidado animal.
2. A tela ajuda a consultar e decidir no escritório — densidade e hierarquia a serviço da decisão, não do registro em campo.
3. Não inventar instituição, cliente, prova ou dado de domínio.
4. 320px e AA continuam porta de entrada, mesmo com o cenário primário no escritório.
5. A interface mostra estado e emite intenção; política de negócio não mora nela.

## Accessibility & Inclusion

WCAG 2.2 AA na constituição: nome acessível em todo controle interativo; `alt` descritivo em imagem de conteúdo e `alt=""` em decorativa; contraste 4,5:1 (texto normal) e 3:1 (texto grande e elementos essenciais). Viewport 320px sem perder ação primária.
