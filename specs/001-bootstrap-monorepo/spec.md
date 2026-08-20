# Feature Specification: Bootstrap do monorepo ZooTech

**Feature Branch**: `001-bootstrap-monorepo`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Inicialize os projetos baseados nas especificações da constituição"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Espaço de trabalho único e navegável (Priority: P1)

Um contribuidor abre o repositório e identifica, sem pedir ajuda, onde vive o painel, onde vive a API e onde vivem os contratos compartilhados. As fronteiras são óbvias: cada pacote tem uma responsabilidade clara e nada de domínio de produto está misturado com a interface.

**Why this priority**: Sem um espaço de trabalho localizável, nenhuma feature seguinte pode ser desenvolvida sem acoplar camadas. Esta história sozinha já entrega o mapa do produto.

**Independent Test**: Um revisor que não participou da criação aponta, em até cinco minutos, o painel, a API e os pacotes compartilhados (contratos, interface e configuração) e descreve a responsabilidade de cada um.

**Acceptance Scenarios**:

1. **Given** o repositório recém-inicializado, **When** um contribuidor percorre a árvore de pastas, **Then** encontra o painel, a API e os pacotes compartilhados em locais distintos e nomeados pela responsabilidade.
2. **Given** o mesmo repositório, **When** o contribuidor procura regras de negócio de produto (animais, recintos, estoque), **Then** não encontra nenhuma — apenas a estrutura pronta para recebê-las depois.
3. **Given** um pacote de interface, **When** o contribuidor inspeciona suas dependências, **Then** esse pacote não aponta para o domínio da API.

---

### User Story 2 - Subir o painel e a API localmente (Priority: P1)

Um contribuidor clona o repositório, segue apenas o guia na raiz e, em poucos minutos, vê o painel no navegador e confirma que a API está disponível. Não precisa adivinhar comandos nem descobrir ferramentas por conta própria.

**Why this priority**: A fundação só tem valor se a equipe consegue executá-la. Sem start local documentado, o monorepo é um esqueleto morto.

**Independent Test**: Em uma máquina limpa (dependências de sistema já presentes), seguir só o guia da raiz leva o painel a uma tela visível e a API a responder a uma verificação de disponibilidade.

**Acceptance Scenarios**:

1. **Given** o repositório clonado e o guia da raiz, **When** o contribuidor executa os passos de instalação e de subida, **Then** o painel abre uma tela inicial e a API responde que está disponível.
2. **Given** o guia da raiz, **When** o contribuidor procura como instalar e como iniciar cada lado, **Then** encontra os dois fluxos descritos, sem depender de conhecimento tribal.
3. **Given** os dois lados em execução, **When** o contribuidor encerra um deles, **Then** o outro continua disponível de forma independente.

---

### User Story 3 - Contratos compartilhados entre painel e API (Priority: P2)

Painel e API falam a mesma língua: tipos e interfaces de contrato vivem em um único lugar compartilhado. Ninguém copia um formato no painel e outro na API.

**Why this priority**: Contratos duplicados divergem na primeira feature de domínio. Esta história garante a fonte única antes de qualquer dado de produto.

**Independent Test**: Existe pelo menos um contrato compartilhado (por exemplo, o formato da verificação de disponibilidade) usado pelos dois lados; alterar o contrato no pacote compartilhado torna a divergência visível nos dois consumidores.

**Acceptance Scenarios**:

1. **Given** o pacote de contratos, **When** o contribuidor inspeciona o painel e a API, **Then** ambos consomem o mesmo contrato de disponibilidade, sem cópia local divergente.
2. **Given** uma alteração no contrato compartilhado (campo obrigatório novo ou tipo incompatível), **When** a verificação de tipos do espaço de trabalho roda, **Then** os dois consumidores sinalizam a incompatibilidade — nenhum lado permanece desatualizado em silêncio.
3. **Given** a fronteira de camadas, **When** o contribuidor procura contratos públicos, **Then** eles estão nomeados e publicados no pacote compartilhado, não “entendidos de passagem” só em cada uso.

---

### User Story 4 - Casca do painel usável em 320px (Priority: P2)

Há uma tela inicial mínima do painel, pensada para celular estreito. Conteúdo e ação primária cabem em 320px sem scroll horizontal da página. A tela é autoexplicativa: sem texto que repete o que já está visível; ações com ícone associativo; controles com nome acessível; cores com contraste adequado.

**Why this priority**: A constituição exige Mobile-First, UX clara e acessibilidade mínima desde o primeiro pixel. Adiar isso para “depois das telas reais” reproduz o anti-padrão que a constituição proíbe.

**Independent Test**: Abrir a tela inicial em viewport de 320px, completar a ação primária visível, e passar uma auditoria pontual de nome acessível e contraste — sem precisar de outras features.

**Acceptance Scenarios**:

1. **Given** a tela inicial do painel em viewport de 320px de largura, **When** o operador vê a página, **Then** conteúdo e ação primária permanecem visíveis e acionáveis, sem scroll horizontal da página.
2. **Given** a mesma tela, **When** se remove qualquer texto auxiliar, **Then** o operador ainda entende o que a tela é e qual ação tomar.
3. **Given** controles interativos da tela inicial (botões, ícones clicáveis), **When** um revisor inspeciona o nome acessível e o contraste, **Then** cada controle tem nome acessível e as combinações de cor atendem o critério AA (4,5:1 para texto normal; 3:1 para texto grande e elementos essenciais).
4. **Given** uma imagem na tela inicial, **When** ela transmite conteúdo, **Then** possui texto alternativo descritivo; se for puramente decorativa, o texto alternativo é vazio.

---

### User Story 5 - Camadas da API localizáveis e vazias de domínio (Priority: P3)

A API já nasce com as camadas de domínio, aplicação e borda (entrada HTTP, persistência, integrações) visíveis. Não há regra de negócio de produto ainda, mas um contribuidor sabe onde cada tipo de código deve entrar. Entrada e saída ficam na borda; o domínio não depende de entrega web nem de persistência.

**Why this priority**: Sem o mapa de camadas, a primeira feature de domínio vai parar no lugar errado. É a prova de Clean Architecture antes do primeiro caso de uso.

**Independent Test**: Um revisor localiza as três camadas e confirma que o domínio não depende de mecanismos de entrega ou de entrada/saída, e que não há regra de negócio de zoológico/estoque nesta feature.

**Acceptance Scenarios**:

1. **Given** a árvore da API, **When** o contribuidor procura domínio, aplicação e borda de entrada/saída, **Then** encontra locais distintos (ou equivalentes óbvios) para cada camada.
2. **Given** a camada de domínio, **When** o contribuidor inspeciona de que ela depende, **Then** não encontra dependências de HTTP, banco, painel web ou estilos.
3. **Given** esta feature, **When** o contribuidor procura comentários que explicam regras de negócio de produto no código, **Then** não encontra nenhum — a orientação está na spec e na constituição.

---

### Edge Cases

- O contribuidor tenta iniciar o painel ou a API sem ter instalado as dependências: o guia da raiz descreve o passo de instalação antes do de subida, e a falha de instalação é visível (não um erro opaco depois de tentar iniciar).
- Apenas um dos lados sobe com sucesso: o outro permanece independente; o guia deixa claro que são dois serviços, não um único processo obrigatório.
- Viewport maior que 320px: a tela inicial continua correta; layouts maiores são aprimoramento, não requisito para a tela mínima funcionar.
- A verificação de disponibilidade da API é chamada com o serviço parado: o cliente recebe falha de conexão ou indisponibilidade, não um falso “ok”.
- Um contribuidor adiciona um contrato só no painel ou só na API: isso viola FR-006; a revisão deve recusar a duplicata sem justificativa documentada.
- A tela inicial não tem ação de produto (criar animal, etc.): isso é esperado; a ação primária desta feature é reconhecer o painel e, se houver, navegar ou confirmar que o sistema está no ar — não operar o domínio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O espaço de trabalho MUST declarar, com fronteiras óbvias, o painel web, a API HTTP e os pacotes compartilhados de contratos, interface e configuração.
- **FR-002**: Um contribuidor MUST conseguir instalar as dependências e iniciar o painel e a API usando apenas o guia na raiz do repositório.
- **FR-003**: O painel MUST carregar uma tela inicial cuja ação e conteúdo primários permanecem visíveis e acionáveis em viewport de 320px, sem scroll horizontal da página.
- **FR-004**: Todo controle interativo da tela inicial MUST ter nome acessível. Imagens de conteúdo MUST ter texto alternativo descritivo; imagens decorativas MUST ter texto alternativo vazio.
- **FR-005**: Combinações de cor da tela inicial MUST atender contraste WCAG 2.2 AA (4,5:1 para texto normal; 3:1 para texto grande e elementos essenciais de interface).
- **FR-006**: Tipos e interfaces de contrato entre painel e API MUST viver em um único pacote compartilhado; nenhum dos lados MAY manter cópia divergente sem justificativa documentada.
- **FR-007**: A API MUST expor uma verificação de disponibilidade que o contribuidor consegue invocar depois de iniciar o serviço, e cujo formato de resposta é definido no pacote de contratos.
- **FR-008**: Componentes de interface MUST receber dados já resolvidos e emitir intenções; MUST NOT conter regras de negócio, autorização ou orquestração de casos de uso.
- **FR-009**: A API MUST organizar domínio, aplicação e borda de entrada/saída de forma localizável. O domínio MUST NOT depender de mecanismos de entrega HTTP, persistência ou do painel.
- **FR-010**: A verificação de tipos do espaço de trabalho MUST ser estrita: tipos implícitos indefinidos são proibidos; contratos públicos (respostas, propriedades de interface) MUST ser publicados com nome no pacote de contratos ou no pacote que os define — não apenas “entendidos” no ponto de uso.
- **FR-011**: Ações visíveis na tela inicial MUST usar ícone associativo; rótulo textual acompanha o ícone quando o significado não for universal. Copy MUST NOT repetir informação já visível nem preencher espaço com texto irrelevante.
- **FR-012**: Esta feature MUST NOT entregar autenticação, persistência de dados de produto, funcionalidades de domínio (animais, recintos, estoque) nem publicação em ambiente de produção.
- **FR-013**: O guia da raiz MUST documentar: como instalar, como iniciar o painel, como iniciar a API e onde cada pacote vive.

### Key Entities

- **Espaço de trabalho**: O repositório único do ZooTech. Agrupa o painel, a API e os pacotes compartilhados; é o que o contribuidor clona.
- **Painel**: Superfície de entrega para o operador. Nesta feature, reduz-se à tela inicial (casca) usável em 320px, sem regras de negócio.
- **API**: Superfície de entrega HTTP. Nesta feature, reduz-se à estrutura de camadas e à verificação de disponibilidade.
- **Contrato compartilhado**: Tipo ou interface versionado no pacote de contratos, consumido pelo painel e pela API. O primeiro contrato concreto é o da verificação de disponibilidade.
- **Verificação de disponibilidade**: Sinal de que a API está no ar. Atributos mínimos: indicação de estado (disponível) e identificação do serviço; sem dados de domínio.
- **Pacote de interface**: Primitivos visuais reutilizáveis do painel. Não contém política de negócio.
- **Pacote de configuração**: Convenções compartilhadas de qualidade (verificação de tipos e de estilo) aplicadas a todos os pacotes do espaço de trabalho.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um contribuidor novo, usando apenas o guia da raiz, deixa painel e API em execução em até 10 minutos (cronometrados a partir do clone, com dependências de sistema já instaladas).
- **SC-002**: Em viewport de 320px, 100% das ações primárias da tela inicial permanecem visíveis e acionáveis, sem scroll horizontal da página.
- **SC-003**: Um revisor independente localiza painel, API e pacotes compartilhados (contratos, interface, configuração) em até 5 minutos, sem perguntar à equipe.
- **SC-004**: Alterar um contrato compartilhado de forma incompatível faz os dois consumidores falharem na verificação de tipos; zero dos lados permanece em silêncio com cópia antiga.
- **SC-005**: Em auditoria pontual da tela inicial, 100% dos controles interativos têm nome acessível e 100% das combinações de cor verificadas passam no critério AA.
- **SC-006**: Remover o texto auxiliar da tela inicial não impede um operador de identificar o produto e a ação primária em uma única visualização (teste com pelo menos 3 pessoas da equipe ou stakeholders).
- **SC-007**: 100% das pastas de domínio inspecionadas nesta feature estão livres de dependência de entrega HTTP, persistência ou painel.

## Assumptions

- A Constituição ZooTech 1.0.0 (ratificada em 2026-08-19) é a fonte da arquitetura e do stack; esta spec exige conformidade com os princípios I–V e com as seções Stack e Arquitetura, Qualidade e Conformidade, e Governance, sem redesenhar essas escolhas.
- O público desta feature é a equipe de produto/engenharia (contribuidores), não o operador final do zoológico. A tela inicial existe para provar Mobile-First, UX clara e acessibilidade, não para operar o domínio.
- “Inicializar os projetos” significa fundação executável: espaço de trabalho, dois serviços (painel e API), pacotes compartilhados, tela-casca e verificação de disponibilidade. Não inclui publicação contínua, deploy, banco de dados nem autenticação.
- Dependências de sistema (runtime de linguagem, gerenciador de pacotes ratificado na constituição) já estão na máquina do contribuidor; o guia cobre o restante a partir do clone.
- A ação primária da tela inicial é reconhecer o painel (identidade do produto) e, opcionalmente, um atalho para a verificação de que o sistema está no ar — não um fluxo de cadastro de animais.
- Pacotes equivalentes em nome são aceitos se a responsabilidade permanecer óbvia, conforme a constituição.
- Features seguintes (domínio, autenticação, persistência) nascem sobre esta fundação; nada nesta spec as antecipa além de deixar o lugar certo vazio.

## Constitution Alignment

Esta spec cita e respeita, para a fundação:

- **I. Mobile-First**: FR-003, SC-002.
- **II. UX Clara e Não-Redundante**: FR-011, SC-006.
- **III. Acessibilidade Mínima**: FR-004, FR-005, SC-005.
- **IV. Clean Architecture no Monorepo**: FR-001, FR-006, FR-009, SC-003, SC-004, SC-007.
- **V. UI Sem Regras de Negócio**: FR-008, US5 cenário 3.
- **Qualidade**: FR-010 (verificação de tipos estrita; contratos públicos publicados com nome).
- **Governance**: desvios de stack exigem emenda constitucional; esta feature não introduz capacidade fora da arquitetura ratificada (FR-012).
