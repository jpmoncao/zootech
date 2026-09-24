# Spec: Bootstrap do monorepo

## Summary

Criar o monorepo ZooTech já com a stack decidida, pronto para o desenvolvimento seguinte, sem nenhuma tela. O front existe como pacote configurado e não apresenta interface. A API sobe com uma única rota, de health. A identidade visual será definida antes de qualquer tela.

## Problem

O repositório tem domínio, atores e stack definidos, e ainda não tem aplicação. O próximo código precisa de um monorepo executável. Qualquer tela agora anteciparia decisões visuais que o autor quer tomar antes, na identidade visual.

Quem desenvolve precisa instalar, subir a API, confirmar que ela responde, e encontrar configuração, scripts e variáveis já no lugar para o painel e o domínio entrarem depois.

## Goals

- O monorepo Node.js e TypeScript existe, com pnpm e Turborepo, app Next.js e API NestJS.
- A API responde em uma rota de health e em nenhuma outra rota de produto.
- O front está no workspace, com TypeScript, scripts e variáveis de ambiente, e não renderiza tela, layout, componente nem token visual.
- Lint, checagem de tipos e build estão ligados nos dois apps.
- Postgres local e a variável de conexão estão configurados para o uso futuro, sem esquema de domínio.
- Um desenvolvedor consegue instalar e verificar o health seguindo o README.

## Non-Goals

- Telas, rotas de página, layout de produto, componentes de interface, folha de estilo, fonte, cor, logo ou cópia do ZooTech.
- Biblioteca de UI, design system ou Tailwind.
- Login, painel, casos de uso UC01–UC10, usuários, funcionários, auditoria ou qualquer recurso de domínio.
- Escolha ou instalação de ORM, migrações, tabelas ou entidades.
- Autenticação, fila, storage externo ou outro serviço além do Postgres.
- Deploy, domínio público ou pipeline de publicação.
- Restaurar o bootstrap anterior que foi removido do repositório.

## Users

- Autor do projeto: confere que a base existe e que nenhuma decisão visual foi tomada no código.
- Quem implementa o próximo marco: usa scripts, config e o health como ponto de partida para a identidade visual e, depois, para o painel.

Não há usuário do CCZ neste marco. Veterinário ADM, funcionário e tutor não interagem com o sistema ainda.

## User Stories

- Como autor, quero o front no monorepo sem tela nenhuma, para definir a identidade visual antes de qualquer interface.
- Como autor, quero a API no ar só com health, para saber que o back compila e responde antes do domínio.
- Como quem vai implementar o painel, quero scripts, TypeScript, lint e variáveis de ambiente prontos, para a próxima feature entrar sem recriar o monorepo.

## Requirements

### Monorepo

- O repositório passa a ser um workspace pnpm com Turborepo.
- Existem dois apps: `apps/web` (Next.js, TypeScript) e `apps/api` (NestJS, TypeScript).
- A raiz oferece scripts para instalar dependências, subir o que este marco executa, checar tipos, lintar e buildar.
- A configuração TypeScript é estrita e compartilhada na medida necessária para os dois apps compilarem do mesmo jeito.
- ESLint está configurado nos dois apps. Formatação automática entra se fizer parte do mesmo ferramental, sem regra visual.

### Front

- `apps/web` é um pacote Next.js válido no workspace: dependências, config do framework, TypeScript e script de checagem.
- O pacote não contém tela. Não há página de produto, layout com conteúdo, componente, stylesheet, fonte, paleta, espaçamento de marca nem texto do CCZ.
- Arquivo exigido pelo framework só para o pacote existir fica vazio de produto e de identidade visual: sem texto visível, sem estilo e sem metadata de marca. Esse arquivo não conta como tela e será substituído quando a identidade visual existir.
- Nenhuma biblioteca de interface é instalada.
- A URL base da API fica em variável de ambiente de exemplo, para o front futuro chamá-la. Neste marco o front não faz essa chamada.

### API

- `apps/api` sobe com NestJS e expõe somente `GET /health`.
- A resposta de sucesso é HTTP 200 e um JSON com `status` igual a `ok`.
- Qualquer outro caminho responde como rota inexistente.
- O health indica que o processo da API está no ar. Ele não consulta o Postgres e responde mesmo com o banco parado.
- A API escuta em `0.0.0.0` e na porta definida por `PORT`.
- Configuração central cobre porta, origem CORS do front e URL do Postgres, lidas de ambiente, com exemplo versionado e sem segredo commitado.
- Pipe global de validação fica registrado para os módulos futuros, ainda sem rota que receba corpo.

### Postgres

- Um Compose local sobe o Postgres para desenvolvimento, com usuário, senha e nome de banco só de exemplo local.
- `DATABASE_URL` está documentada no exemplo de ambiente da API.
- Não há migração, tabela, seed nem cliente de domínio em uso. A dependência de acesso ao banco só entra quando o esquema for decidido.

### Documentação mínima

- O README do repositório passa a dizer como instalar, subir a API, chamar o health e subir o Postgres local.
- O README afirma que o front não tem tela porque a identidade visual ainda será definida.

## Acceptance Criteria

- Dado um clone com as ferramentas da stack instaladas, quando as dependências são instaladas, então o workspace pnpm resolve `apps/web` e `apps/api`.
- Dado o monorepo instalado, quando a checagem de tipos e o lint rodam, então os dois apps terminam sem erro.
- Dado o monorepo instalado, quando o build roda, então os dois apps terminam sem erro.
- Dada a API no ar, quando o cliente chama `GET /health`, então a resposta é 200 e o corpo contém `status` com valor `ok`.
- Dada a API no ar e o Postgres parado, quando o cliente chama `GET /health`, então a resposta continua 200.
- Dada a API no ar, quando o cliente chama qualquer outro caminho, então a resposta é de rota inexistente.
- Dado o código de `apps/web`, quando se procura página, layout com conteúdo, componente, stylesheet, fonte ou token de cor, então não há tela nem decisão de identidade visual.
- Dado o repositório, quando se procura biblioteca de UI, ORM, migração ou módulo de domínio, então esses itens não estão instalados nem referenciados.
- Dado o README, quando o desenvolvedor segue os passos, então consegue instalar, subir a API e receber o health.

## Edge Cases

- Porta ocupada: a API falha ao subir e o log indica que a porta não pôde ser usada. Não há porta alternativa silenciosa.
- `PORT` ausente: a API usa uma porta padrão documentada no exemplo de ambiente.
- `DATABASE_URL` ausente: a API ainda sobe e o health responde, porque este marco não abre conexão.
- Origem CORS ausente: a API sobe. Nenhum browser chama a API neste marco.
- Arquivo obrigatório do Next.js: permanece sem conteúdo visível. Se alguém abrir o dev server do front, o documento não mostra marca, navegação nem cópia de produto.
- Segredos: exemplos usam valores locais fictícios. Arquivo de ambiente real fica fora do Git.

## UX / API Notes

Não há UX neste marco. A identidade visual é pré-requisito de qualquer tela, inclusive página em branco estilizada, splash ou placeholder com o nome do sistema.

Contrato do health:

- Método e caminho: `GET /health`
- Sucesso: `200` e `{ "status": "ok" }`
- Sem autenticação
- Sem corpo de requisição
- Sem dependência de banco

## Data and Permissions

- Nenhum dado de domínio é gravado ou lido.
- Não há usuário, sessão, papel nem permissão.
- O Compose local não é um ambiente compartilhado. Credenciais de exemplo servem só na máquina de desenvolvimento.

## Dependencies

- Decisões já aceitas: monorepo Node.js e TypeScript, Next.js, NestJS, Postgres, pnpm e Turborepo.
- Identidade visual ainda não existe e bloqueia qualquer tela.
- Esquema relacional de `Usuario`, atributos de baia e valores de `perfilAcesso` continuam em aberto e ficam fora deste marco.
- Node.js e pnpm disponíveis na máquina de quem for implementar.

## Open Questions

- Nenhuma pergunta bloqueia esta spec. ORM, autenticação e biblioteca de UI ficam para as specs que forem usá-los.
- A identidade visual será especificada à parte, antes de qualquer tela.

## Assumptions

- "Sem tela" inclui layout, componente, estilo e texto de produto. Um arquivo vazio exigido pelo Next.js é permitido e não é uma tela.
- O health é de processo, não de prontidão do banco.
- Postgres entra como Compose e variável de ambiente. O cliente e o esquema entram com a primeira persistência de domínio.
- Pacote compartilhado de contratos não entra agora. Configuração TypeScript compartilhada pode entrar porque os dois apps precisam compilar.
- Versões estáveis atuais da stack decidida. A pinagem exata fica no plano de implementação.

## Implementation Handoff

- Escopo de código: raiz do workspace, `apps/web`, `apps/api`, Compose do Postgres, exemplos de ambiente e README.
- Fora do código deste marco: `apps/web` com rotas de produto, módulos de domínio na API, migrações.
- Verificação esperada: typecheck, lint, build e uma chamada automatizada ou manual a `GET /health` com 200 e `{ "status": "ok" }`.
- Próximo passo sugerido: plano de implementação desta spec. A spec do painel e das telas espera a identidade visual.
