# Feature Specification: Chassis do painel administrativo

**Feature Branch**: `002-admin-panel-shell`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Comece criando a primeira versão do painel administrativo web." Escopo confirmado: chassis (navegação, início e áreas), sem animais, recintos, estoque nem autenticação.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconhecer o chassis (Priority: P1)

Um veterinário ou gestor abre o painel no escritório e, numa única visualização, reconhece o produto, vê a navegação e a região de conteúdo. Sabe onde está (área atual) e o que pode fazer agora, sem texto que explique o que já está visível.

**Why this priority**: Sem chassis reconhecível, o operador não tem onde pousar nas features de domínio. Esta história sozinha já transforma a casca isolada em um painel administrativo.

**Independent Test**: Abrir o painel e apontar, sem ajuda, o nome do produto, a navegação, a área atual e a região de conteúdo — mesmo que as áreas de plantel ainda estejam vazias.

**Acceptance Scenarios**:

1. **Given** o painel aberto na área inicial, **When** o operador observa a tela, **Then** vê a identidade do produto, a navegação e a região de conteúdo ao mesmo tempo, sem precisar de instrução externa.
2. **Given** o mesmo chassis, **When** o operador procura a área em que está, **Then** o destino atual está distinguível dos demais destinos da navegação.
3. **Given** a mesma tela, **When** se remove qualquer texto auxiliar, **Then** o operador ainda identifica o produto, a navegação e a área atual.

---

### User Story 2 - Início com estado do sistema (Priority: P1)

Na área inicial, o operador consulta se o sistema está no ar e atualiza esse estado. A identidade, o rótulo já resolvido (No ar ou Indisponível) e a ação de atualizar permanecem visíveis e acionáveis. O chassis não interpreta o sinal: mostra o estado já resolvido.

**Why this priority**: É o único valor operacional desta versão. Sem o início funcional, o chassis é só moldura vazia.

**Independent Test**: Abrir o início, ler o estado do sistema e completar a ação de atualizar — sem entrar em áreas de plantel e sem dados de animais ou recintos.

**Acceptance Scenarios**:

1. **Given** a área inicial com o sistema disponível, **When** o operador vê o conteúdo, **Then** o estado apresentado é “No ar”, com ícone associativo, e a ação de atualizar está visível e acionável.
2. **Given** a área inicial com o sistema indisponível, **When** o operador vê o conteúdo, **Then** o estado apresentado é “Indisponível”, com ícone associativo, e a ação de atualizar permanece acionável.
3. **Given** a área inicial, **When** o operador aciona atualizar, **Then** o estado apresentado passa a refletir a verificação mais recente (No ar ou Indisponível), sem o operador decidir o significado do sinal.

---

### User Story 3 - Navegar entre áreas (Priority: P2)

O operador troca de área pela navegação: Início, Animais e Recintos. Animais e Recintos existem como destinos, mas não listam nem cadastram plantel. Cada área vazia mostra um estado honesto, sem inventar animais, recintos, instituição ou números.

**Why this priority**: O painel só vira mapa do produto se o operador puder ir às áreas futuras e voltar ao início. Sem isso, o chassis não antecipa o centro do produto (plantel).

**Independent Test**: Percorrer Início, Animais e Recintos pela navegação, confirmar o destino ativo em cada uma e verificar que Animais e Recintos não exibem dado de domínio — só estado vazio honesto.

**Acceptance Scenarios**:

1. **Given** o chassis visível, **When** o operador aciona o destino Animais (ou Recintos), **Then** a região de conteúdo passa a essa área e o destino correspondente fica distinguível na navegação.
2. **Given** uma área de plantel aberta, **When** o operador aciona Início, **Then** volta à área inicial com o estado do sistema, sem perder a identidade nem a navegação.
3. **Given** a área Animais ou Recintos, **When** o operador observa o conteúdo, **Then** não vê lista, cadastro, identificador, quantidade nem exemplo de animal ou recinto — apenas o estado vazio da área.
4. **Given** a navegação, **When** o operador procura estoque, autenticação ou outro destino fora desta versão, **Then** esses destinos não aparecem.

---

### User Story 4 - Chassis utilizável em 320px (Priority: P2)

O mesmo chassis cabe em viewport de 320px: identidade, navegação (ou o controle que a abre) e a ação primária da área atual permanecem visíveis e acionáveis, sem scroll horizontal da página. Em tela maior, o layout pode ganhar espaço; isso é aprimoramento, não requisito para a tela mínima funcionar.

**Why this priority**: A constituição exige Mobile-First em toda tela interativa. Adiar o 320px para “quando houver dados” reproduz o anti-padrão da casca.

**Independent Test**: Abrir cada área em viewport de 320px, completar a ação primária da área (atualizar no início; identificar o estado vazio nas áreas de plantel) e voltar ao início pela navegação — sem scroll horizontal da página.

**Acceptance Scenarios**:

1. **Given** qualquer área do chassis em viewport de 320px de largura, **When** o operador usa a tela, **Then** identidade, acesso à navegação e ação primária da área permanecem visíveis e acionáveis, sem scroll horizontal da página.
2. **Given** a área inicial em 320px, **When** o operador aciona atualizar, **Then** completa a ação sem abrir um destino oculto só para encontrá-la.
3. **Given** viewport maior que 320px, **When** o operador usa o painel, **Then** o chassis continua correto; o layout extra não é necessário para as ações da história 1–3 funcionarem.

---

### Edge Cases

- O operador recarrega o painel numa área de plantel: permanece nessa área (ou, se a área não puder ser restaurada, cai no início); o chassis e a navegação continuam presentes.
- O operador aciona o destino da área em que já está: permanece na mesma área; o destino ativo continua distinguível.
- A verificação de disponibilidade falha ao atualizar no início: o estado apresentado é “Indisponível”; o chassis e a navegação não desaparecem.
- Viewport maior que 320px: navegação pode ficar mais visível; isso não desobriga o mínimo de 320px.
- Áreas de plantel vazias: ausência de dados é o comportamento esperado, não um erro. Não se fabricam registros, instituições nem mensagens que descrevam o que o nome da área já diz.
- Esta versão não pede identificação: qualquer pessoa que abra o painel vê o chassis. Controle de acesso fica para feature futura.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel MUST apresentar um chassis persistente composto de identidade do produto, navegação e região de conteúdo, visíveis em todas as áreas desta feature.
- **FR-002**: A navegação MUST oferecer exatamente três destinos: Início, Animais e Recintos. MUST NOT oferecer estoque, autenticação nem outros destinos nesta versão.
- **FR-003**: O destino correspondente à área atual MUST estar distinguível dos demais destinos da navegação.
- **FR-004**: A área inicial MUST apresentar o estado do sistema já resolvido (“No ar” ou “Indisponível”), com ícone associativo, e MUST permitir a ação de atualizar esse estado.
- **FR-005**: A ação de atualizar MUST usar ícone associativo e o rótulo “Atualizar” (significado não universal). Copy MUST NOT repetir informação já visível nem preencher espaço com texto irrelevante.
- **FR-006**: As áreas Animais e Recintos MUST existir como destinos navegáveis e MUST apresentar estado vazio honesto. MUST NOT listar, cadastrar, editar ou exibir qualquer dado de animal, recinto, instituição ou quantidade.
- **FR-007**: Conteúdo e ações primárias de cada área MUST permanecer visíveis e acionáveis em viewport de 320px de largura, sem scroll horizontal da página. Layouts maiores MAY aprimorar a experiência; MUST NOT ser o ponto de partida para a tela mínima funcionar.
- **FR-008**: Todo controle interativo do chassis MUST ter nome acessível. Imagens de conteúdo MUST ter texto alternativo descritivo; imagens decorativas MUST ter texto alternativo vazio.
- **FR-009**: Combinações de cor do chassis MUST atender contraste WCAG 2.2 AA (4,5:1 para texto normal; 3:1 para texto grande e elementos essenciais de interface).
- **FR-010**: Componentes de interface MUST receber dados já resolvidos e emitir intenções; MUST NOT conter regras de negócio, autorização ou orquestração de casos de uso (incluindo decidir se o sistema está disponível).
- **FR-011**: O idioma da interface MUST ser português do Brasil. A identidade visível MUST ser “ZooTech”, sem logotipo institucional nem marca de terceiros.
- **FR-012**: Esta feature MUST NOT entregar autenticação, persistência de dados de produto, consulta ou cadastro de plantel, estoque, papéis de campo nem publicação em ambiente de produção.
- **FR-013**: O sinal de disponibilidade usado no início MUST ser o mesmo conceito já entregue pela fundação (estado disponível ou indisponível); esta feature MUST NOT inventar um segundo significado para “No ar” / “Indisponível”.

### Key Entities

- **Chassis**: Estrutura persistente do painel. Agrupa identidade do produto, navegação e região de conteúdo; permanece enquanto o operador troca de área.
- **Destino de navegação**: Entrada nomeada que leva a uma área. Nesta feature: Início, Animais e Recintos. Atributo mínimo: indicação de ativo (é ou não a área atual).
- **Área**: Conteúdo que ocupa a região principal. Início apresenta o estado do sistema; Animais e Recintos apresentam só o estado vazio.
- **Estado vazio**: Representação honesta de uma área de plantel sem dados. Não é erro; não contém registros, exemplos nem números inventados.
- **Estado de disponibilidade**: Sinal já definido na fundação. Atributos: rótulo resolvido (“No ar” | “Indisponível”) e a intenção de atualizar. O chassis exibe; não interpreta o sinal bruto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um operador que não participou da criação identifica o produto, a navegação e a área atual em até 10 segundos na primeira visualização (teste com pelo menos 3 pessoas da equipe ou stakeholders).
- **SC-002**: 100% dos operadores do mesmo teste conseguem ir ao Início a partir de Animais ou Recintos na primeira tentativa, em até 15 segundos.
- **SC-003**: Em viewport de 320px, 100% das ações primárias de cada área (atualizar no início; reconhecer o estado vazio e voltar ao início nas áreas de plantel) permanecem visíveis e acionáveis, sem scroll horizontal da página.
- **SC-004**: Em auditoria pontual do chassis, 100% dos controles interativos têm nome acessível e 100% das combinações de cor verificadas passam no critério AA.
- **SC-005**: Remover o texto auxiliar de qualquer área não impede o operador de identificar o produto, o destino atual e a ação primária em uma única visualização (mesmo teste de SC-001).
- **SC-006**: Em inspeção das áreas Animais e Recintos, zero registros, identificadores, quantidades ou exemplos de domínio são exibidos.
- **SC-007**: 90% dos operadores do teste de SC-001 descrevem o início como o lugar para ver se o sistema está no ar, sem confundir Animais ou Recintos com uma lista já povoada.

## Assumptions

- A Constituição ZooTech 1.0.0 (ratificada em 2026-08-19) prevalece: Mobile-First, UX clara, acessibilidade mínima, Clean Architecture e UI sem regra de negócio. Esta spec não redesenha essas escolhas.
- O usuário primário é veterinário ou gestão no escritório, conforme o documento de produto. Tratador em campo e almoxarifado não recebem superfície própria nesta versão; há um único painel.
- “Primeira versão do painel administrativo” significa o chassis: navegação, início e áreas nomeadas. Não significa consulta nem cadastro de plantel.
- As áreas Animais e Recintos existem para orientar o mapa do produto (o plantel é o centro). Estoque fica de fora da navegação até uma spec futura, porque é periférico.
- A fundação (`001-bootstrap-monorepo`) já entrega identidade, estado de disponibilidade e ação de atualizar. Esta feature incorpora esse valor ao início do chassis; não substitui o significado desses rótulos.
- Não há autenticação: quem abre o painel vê o chassis. Isso é aceitável nesta versão porque o produto ainda não opera dados de plantel.
- Não se inventam instituição, logotipo, cliente, depoimento nem dado de domínio. Estado vazio é suficiente.
- Idioma da interface e desta spec: português do Brasil (`pt-BR`).
- Dependência: o painel e a verificação de disponibilidade da fundação já existem e continuam a ser o único sinal de “No ar” / “Indisponível”.

## Constitution Alignment

Esta spec cita e respeita, para o chassis:

- **I. Mobile-First**: FR-007, US4, SC-003.
- **II. UX Clara e Não-Redundante**: FR-005, FR-006, US1 cenário 3, SC-005, SC-007.
- **III. Acessibilidade Mínima**: FR-008, FR-009, SC-004.
- **IV. Clean Architecture no Monorepo**: FR-010, FR-013 (o chassis é superfície de entrega; o significado de disponibilidade permanece o da fundação).
- **V. UI Sem Regras de Negócio**: FR-010, US2 cenário 3.
- **Governance**: desvios de princípio exigem emenda constitucional; FR-012 impede antecipar domínio, autenticação e estoque nesta feature.
