# Decisions

## 2026-09-23 — ZooTech é a gestão do CCZ

**Status:** Accepted

**Context:** O repositório tinha sido zerado e o produto ainda não estava definido.

**Decision:** ZooTech é o sistema de gestão do Centro de Controle de Zoonoses. Atores: veterinário, funcionário do CCZ e tutor. Termos de domínio citados: animais, baias, veterinários, funcionários e tutores.

**Rationale:** Confirmado pelo autor do projeto.

**Consequences:** O bootstrap anterior deixa de valer como direção de produto. Baia entrou depois, na decisão de ocupação e transferência.

## 2026-09-23 — MVP é login e painel do veterinário ADM

**Status:** Superseded

**Context:** O domínio completo já tem dez casos de uso.

**Decision:** O primeiro marco é login e o painel do ator ADM (veterinário), com persistência em Postgres.

**Rationale:** Confirmado como marco essencial do MVP.

**Consequences:** Substituída pela decisão seguinte. A leitura antiga, de deixar o clínico fora do painel, não vale mais.

## 2026-09-23 — O painel ADM cobre o sistema inteiro

**Status:** Accepted

**Context:** Faltava dizer o que o veterinário administrador faz depois do login.

**Decision:** O painel tem todas as funcionalidades do sistema (UC02–UC10), mais cadastro e gestão de usuários e funcionários, mais consulta ao registro de auditoria. Funcionário e veterinário não administrador permanecem limitados ao diagrama de casos de uso.

**Rationale:** Confirmado pelo autor.

**Consequences:** A spec do MVP não é uma casca de login. Gestão de usuários e auditoria são exclusivas do ADM.

## 2026-09-23 — Animal ocupa uma baia e nasce sem tutor

**Status:** Superseded

**Context:** O diagrama de classes exigia um tutor por animal e não tinha baia. O acolhimento contradizia isso.

**Decision:** Todo animal ocupa exatamente uma baia e pode ser transferido. O animal entra sem tutor. O tutor é vinculado quando o animal é atribuído a uma adoção.

**Rationale:** Confirmado pelo autor.

**Consequences:** A cardinalidade tutor–animal do diagrama original fica `0..1`. Atributos da baia, além da identidade, continuam em aberto. A transferência troca a baia atual; um histórico próprio de baias, separado da auditoria, não foi pedido.

## 2026-09-23 — Stack do monorepo

**Status:** Accepted

**Context:** Era preciso escolher a base técnica antes de criar o repositório de código.

**Decision:** Monorepo Node.js e TypeScript. Front em Next.js, API em NestJS, banco Postgres. pnpm para pacotes e Turborepo para o build.

**Rationale:** Confirmado pelo autor do projeto.

**Consequences:** O monorepo ainda não foi criado. Herança de `Usuario` no Postgres continua em aberto.

## 2026-09-23 — Diagrama de classes é a referência de domínio

**Status:** Accepted

**Context:** O autor enviou o diagrama de classes como esquema do backend.

**Decision:** Tratar esse diagrama como a referência de domínio. Não criar classe `Veterinario` separada enquanto o diagrama representar o veterinário como `Funcionario`.

**Rationale:** O diagrama é a fonte enviada para o esquema.

**Consequences:** Tutor obrigatório e a ausência de baia foram corrigidos na decisão de ocupação e adoção. Continuam em aberto: `idTutor` além da herança de `Usuario`, e a cardinalidade 0..1 de castração e adoção. Includes do diagrama de casos de uso: só UC06 e UC08 incluem UC01.

## 2026-09-23 — Nenhuma tela antes da identidade visual

**Status:** Accepted

**Context:** O bootstrap do monorepo é o próximo código, e o front ainda não tem direção visual.

**Decision:** O front do bootstrap não tem tela, layout, componente, estilo nem cópia de produto. A identidade visual será definida antes de qualquer interface. A API desse marco expõe somente `GET /health`.

**Rationale:** Confirmado pelo autor. A interface espera a identidade visual.

**Consequences:** A spec do bootstrap está em `.ai-context/specs/bootstrap-monorepo.md`. Biblioteca de UI, ORM e domínio ficam fora desse marco. A spec do painel ADM não começa pelas telas.

## 2026-09-23 — O guia visual do CCZ é a referência da identidade

**Status:** Accepted

**Context:** A identidade visual ainda não existia, e o autor enviou o guia HTML gerado para o protótipo do CCZ.

**Decision:** Esse guia é vinculante. A direção recomendada (saúde pública, verde-petróleo, âmbar de vacina, Bricolage Grotesque, Figtree, IBM Plex Mono) vale. As alternativas gov.br e ardósia/menta não foram escolhidas. O nome visível é só ZooTech. Não há brasão; o escudo provisório não vira brasão municipal.

**Rationale:** Confirmado pelo autor em 2026-09-23: a identidade serve a equipe do CCZ, o ADM é o primeiro usuário entregue, o nome na interface é ZooTech, e não se inventa brasão.

**Consequences:** `PRODUCT.md` guarda o contexto. `DESIGN.md` registra a direção construída no login e na casca do painel. O âmbar não é cor geral de botão: fica no escudo provisório.

## 2026-09-24 — Interface do web usa shadcn

**Status:** Accepted

**Context:** O front já tem identidade visual e controles desenhados à mão no login e na casca.

**Decision:** A interface em `apps/web` usa componentes shadcn/ui, tematizados com `DESIGN.md`. A regra está em `.cursor/rules/shadcn-components.mdc`. A API não usa essa biblioteca.

**Rationale:** Confirmado pelo autor.

**Consequences:** Peça nova de interface entra por `src/components/ui`. O tema padrão do shadcn não substitui petróleo, Figtree nem os raios já registrados. Login e casca usam esses componentes desde 2026-09-24.

## 2026-09-23 — Reset onto the agentic workflow

**Status:** Accepted

**Context:** O repo tinha um bootstrap Speckit e o workflow agêntico foi colocado por cima.

**Decision:** Remover da árvore de trabalho o monorepo anterior, Speckit, Impeccable e as specs `001` e `002`. Manter o workflow e `.ai-context/`.

**Rationale:** O workflow novo é o ponto de partida.

**Consequences:** O histórico Git ainda contém a árvore antiga até um commit registrar o reset.

## 2026-09-24 — Só a coordenação aceita acesso e troca tipo

**Status:** Accepted

**Context:** O pedido de acesso já existe na tela de login, sem fila nem papel gravado. Faltava dizer quem aceita o servidor novo e quem pode mudar a função depois.

**Decision:** Só o perfil `coordenacao` aceita ou recusa a solicitação e escolhe a função nesse aceite. Só `coordenacao` troca o `perfilAcesso` de um usuário já ativo. Veterinário, agente e recepção não aceitam nem trocam tipo. A pessoa não altera a própria função no perfil.

**Rationale:** Confirmado pelo autor em 2026-09-24.

**Consequences:** A fila e a troca de tipo ficam em `/painel/acessos`. A spec está em `.ai-context/specs/autenticacao-jwt-rbac.md`. Desativar conta e editar CPF ou matrícula de outra pessoa continuam fora deste marco.

## 2026-09-24 — Auth usa Prisma, menus iguais e sem e-mail

**Status:** Accepted

**Context:** O plano de autenticação deixou três assunções em aberto: o ORM, se agente e recepção veem seções diferentes, e se o aceite avisa por e-mail.

**Decision:** O acesso ao Postgres deste marco é Prisma. `agente` e `recepcao` visualizam as mesmas seções do funcionário. Não há e-mail transacional. Aceite, recusa e troca de tipo aparecem quando a pessoa entra ou usa o painel.

**Rationale:** Confirmado pelo autor em 2026-09-24. Um mapa de seções diferente, no futuro, altera só o mapa e o guard.

**Consequences:** O plano está em `.ai-context/plans/autenticacao-jwt-rbac.md`. As tarefas estão em `.ai-context/tasks/autenticacao-jwt-rbac.md`.


## 2026-09-24 — Animal pode ficar sem baia e todos os perfis gerem ficha

**Status:** Accepted

**Context:** A gestão de baias pressupunha ocupação obrigatória, mas animais podem sair temporariamente para tratamento. Faltava definir acesso ao CRUD de animais.

**Decision:** Animal ocupa zero ou uma baia. Ficha e listagem destacam “Sem baia” e oferecem ação para alocar/readequar. Todos os perfis autenticados podem consultar, criar e editar animais. Situações iniciais: em tratamento, em quarentena/observação, saudável, adotado e óbito. Espécies iniciais: cão e gato. Ações clínicas registráveis: vacinação, castração, exame e diagnóstico. Histórico do animal é auditável por perfil autorizado a ver animais.

**Rationale:** Confirmado pelo autor em 2026-09-24.

**Consequences:** Atualizar `.ai-context/specs/gestao-de-baias.md` para cardinalidade opcional. Regras de dados, fotos, cadastro e histórico ficam em `.ai-context/specs/gestao-de-animais.md`.


## 2026-09-24 — Catálogo padrão de raças

**Status:** Accepted

**Context:** Spec de gestão de animais precisava de catálogo de seed para cães e gatos.

**Decision:** Usar as listas de cães e gatos informadas pelo autor em `.ai-context/specs/gestao-de-animais.md`, incluindo SRD, Outra e Não Informada. “Outra” permite cadastrar opção personalizada reutilizável por espécie; “Não Informada” representa raça desconhecida.

**Rationale:** Lista e semântica das opções confirmadas pelo autor em 2026-09-24.

**Consequences:** Seed deve ser idempotente e preservar raças personalizadas.


## 2026-09-24 — Pendências, fotos e estados terminais de animais

**Status:** Accepted

**Context:** Revisão da spec de gestão de animais esclareceu validação de dados faltantes, tratamento de fotos e preservação dos registros.

**Decision:** Sexo pode ser não informado e gera alerta na ficha e listagem, junto de raça não informada, idade aproximada, castração não informada e ausência de baia. Cada animal aceita até 10 fotos quadradas; formatos JPEG/JPG, PNG e WebP; arquivos acima de 5 MB são comprimidos. Remoção de foto pede confirmação. Registro de animal nunca é deletado. Situações adotado/óbito são somente leitura e não aparecem na listagem padrão; Coordenação pode revogá-las por erro com motivo obrigatório e trilha auditável. CRUD de vacinação, castração e adoção ficam para módulos posteriores.

**Rationale:** Confirmado pelo autor em 2026-09-24.

**Consequences:** Regras completas em `.ai-context/specs/gestao-de-animais.md`; API não terá exclusão de animal. Próximos módulos de vacinação devem incluir lote, dose e aplicador.


## 2026-09-24 — Decisões técnicas para ficha e fotos de animais

**Status:** Accepted

**Context:** O plano de gestão de animais tinha decisões técnicas abertas para rota da ficha, processamento de imagens, retenção e normalização de raças.

**Decision:** Ficha usa `/painel/animais/[id]`; regra de URL será atualizada durante implementação para permitir rota segmentada dedicada. Fotos são cortadas em quadrado, limitadas a 1200×1200 px e, se fonte exceder 5 MB, convertidas para WebP com qualidade inicial 85, reduzida até 70 para caber abaixo de 5 MB. Persistir enquanto animal existir; remover apenas fotos removidas ou órfãs. Raças personalizadas são normalizadas com Unicode NFC, trim, colapso de espaços e comparação case-insensitive.

**Rationale:** Recomendações técnicas aceitas pelo autor em 2026-09-24.

**Consequences:** Detalhes estão em `.ai-context/plans/gestao-de-animais.md` e `.ai-context/specs/gestao-de-animais.md`. Critério de elegibilidade para isolamento segue pendente de esclarecimento.


## 2026-09-24 — Elegibilidade explícita para isolamento

**Status:** Accepted

**Context:** Baias exclusivas para isolamento precisam de critério verificável ao alocar animais.

**Decision:** `Animal.emIsolamento` é indicador clínico explícito, separado da situação geral do animal. Baia exclusiva aceita apenas animais com o indicador ativo. Alterações e alocações são auditáveis.

**Rationale:** Recomendação técnica aceita pelo autor em 2026-09-24.

**Consequences:** Regras alinhadas em `.ai-context/specs/gestao-de-animais.md` e `.ai-context/specs/gestao-de-baias.md`; integração valida o campo no backend em transação.


## 2026-09-24 — Modelo físico inicial de animais

**Status:** Accepted

**Context:** A task 1 de gestão de animais precisava criar persistência antes do CRUD e ainda representar dados desconhecidos sem inventar valores.

**Decision:** Usar enums Prisma para espécie, sexo, porte, situação, castração, unidade de idade e tipo de evento. `Animal` guarda número de registro textual e chave normalizada única; `baiaId`, `racaId`, datas, idade estimada e autor são opcionais para suportar pendência/importação sem dados falsos. Raças ficam em `RacaAnimal` com chave única por espécie + nome normalizado. Fotos, pesagens, observações e eventos ficam em tabelas próprias; observações e eventos são append-only no modelo da aplicação.

**Rationale:** Esse desenho acompanha a spec sem antecipar módulos de vacinação, castração ou adoção e prepara a integração futura com baias e timeline auditável.

**Consequences:** Migration `20260924180000_gestao_animais` cria as tabelas e constraints básicas. A aplicação ainda precisa validar coerência espécie/raça, obrigatoriedade de campos mínimos, estados terminais e ausência de exclusão no módulo `animais`.


## 2026-09-24 — Fotos locais de animais usam sharp e raiz gerenciada

**Status:** Accepted

**Context:** A task 5 de gestão de animais precisava escolher biblioteca de processamento e uma estratégia segura para armazenar, servir e remover arquivos locais.

**Decision:** Usar `sharp` na API para validar formato real, cortar em quadrado, limitar a 1200×1200 px e gerar WebP. A raiz de mídia é configurável por `ZOOTECH_MEDIA_ROOT` ou `MEDIA_ROOT`, com padrão `storage/media`. O servidor gera nomes aleatórios, persiste somente metadados/caminho interno em `FotoAnimal`, devolve uma URL controlada e bloqueia leitura/remoção fora da raiz gerenciada. O limite de 10 fotos por animal é verificado em transação com lock do animal.

**Rationale:** `sharp` é mantido, rápido e cobre os formatos exigidos sem serviço externo. Raiz gerenciada evita path traversal e mantém a decisão de MVP sem storage de terceiros.

**Consequences:** Fotos são servidas por `GET /animais/:id/fotos/:fotoId/arquivo` e removidas por `DELETE /animais/:id/fotos/:fotoId`; não há exposição de caminho local na resposta. Falha de banco após escrita limpa o arquivo salvo, e remoção apaga o arquivo apenas quando não há outra referência.

## 2026-09-24 — Recorte de foto no cliente e caminho relativo na API

**Status:** Accepted

**Context:** A galeria quebrava quando a API subia de outro `cwd`, porque `FotoAnimal.caminhoAbsoluto` guardava path absoluto. O crop no servidor também recentralizava um recorte que o usuário já definia na tela.

**Decision:** O front recorta em quadrado com `react-easy-crop` antes do upload. A API valida formato e quadrado, redimensiona/comprime sem `fit: "cover"` e grava caminho relativo `animais/{id}/{uuid}.webp`, resolvido a partir de `apps/api/storage/media`. Fotos antigas com path absoluto sob essa raiz são convertidas pela migration `20260924220000_foto_caminho_relativo`.

**Rationale:** Caminho relativo sobrevive a mudanças de diretório de execução. Recusar foto não quadrada preserva o recorte escolhido pelo usuário.

**Consequences:** Clientes da API que enviarem imagem retangular recebem 400. A URL pública continua sendo a rota autenticada `/animais/:id/fotos/:fotoId/arquivo`.
