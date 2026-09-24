# Spec: Autenticação JWT, aceite de acesso e perfil

## Summary

O servidor do CCZ pede acesso no login. O pedido chega a uma tela do painel. Só a coordenação aceita ou recusa, e a função que vale é a escolhida nesse aceite. Só a coordenação troca o tipo de um usuário já ativo. O login confere CPF ou matrícula e senha na API, devolve um JWT e abre o painel conforme o papel. Cada pessoa autenticada abre a própria tela de perfil.

## Problem

O login e o pedido de acesso já existem na interface, mas a senha não é conferida e a sessão fica só no navegador. O pedido não chega a ninguém. A pessoa que solicita ainda escolhe a própria função, e essa escolha não vira permissão.

Quem opera o CCZ precisa de uma conta real: pedir acesso, esperar a coordenação aceitar e definir a função, entrar com JWT e ver o que aquele papel pode ver. A coordenação também precisa corrigir o tipo depois, sem que veterinário, agente ou recepção façam isso.

## Goals

- A solicitação de acesso sai do navegador, fica persistida e aparece numa fila do painel.
- Só o perfil `coordenacao` aceita ou recusa. No aceite, escolhe a função. Essa função é o `perfilAcesso` usado no RBAC.
- Só `coordenacao` troca o tipo de um usuário já ativo. Os outros papéis não têm essa ação, nem no próprio perfil.
- O login da tela atual chama a API. Credencial errada não abre o painel. Conta pendente ou recusada não recebe token.
- A API emite JWT de acesso. Cada rota de produto exige o papel gravado no usuário.
- A pessoa autenticada abre o próprio perfil e altera telefone, e-mail institucional e senha.
- Existe uma conta inicial de coordenação para o primeiro aceite, criada fora da fila.

## Non-Goals

- Casos de uso UC02–UC10, cadastro de animal, baia, prontuário, vacina, castração, adoção ou relatório com dado real.
- O restante da gestão de usuários: desativar conta, reenviar senha ou editar nome, CPF e matrícula de outra pessoa.
- Login de tutor. Tutor não é ator do painel.
- Recuperação de senha por e-mail, convite por link ou integração com gov.br.
- Tela de auditoria. Entram só os eventos mínimos desta spec.
- Trocar a identidade visual. Telas novas usam `DESIGN.md` e os componentes shadcn já adotados.

## Users

- Solicitante: servidor do CCZ ainda sem conta ativa. Preenche o pedido no login e espera o aceite.
- Coordenação: perfil `coordenacao`. Veterinário administrador. Única função que aceita pedidos e troca tipo.
- Veterinário clínico: perfil `veterinario`. Entra no painel clínico. Não vê a fila nem troca tipo.
- Agente de zoonoses e recepção: perfis `agente` e `recepcao`. Entram no painel operacional. Não veem a fila nem trocam tipo.

## User Stories

- Como servidor sem conta, quero solicitar acesso com meus dados e uma senha, para a coordenação decidir se eu entro.
- Como coordenação, quero ver os pedidos pendentes e aceitar um deles escolhendo a função na hora, para a pessoa passar a entrar com o papel certo.
- Como coordenação, quero trocar o tipo de um usuário já ativo, para corrigir a função sem um pedido novo.
- Como coordenação, quero recusar um pedido com um motivo curto, para a pessoa saber que não entrou.
- Como servidor aceito, quero entrar com CPF ou matrícula e senha e cair no painel, para a sessão deixar de ser só local.
- Como servidor aceito, quero abrir meu perfil e atualizar telefone, e-mail e senha, sem conseguir mudar minha própria função.

## Requirements

### Papéis

`Usuario.perfilAcesso` tem quatro valores, os mesmos já desenhados no pedido de acesso:

| Valor | Nome na interface | Quem é |
| --- | --- | --- |
| `coordenacao` | Coordenação | Veterinário administrador. Único papel que aceita usuários, troca tipo e consulta auditoria. |
| `veterinario` | Médico(a)-veterinário(a) | Ator clínico do diagrama. Exige CRMV. |
| `agente` | Agente de zoonoses | Funcionário de manejo e recolhimento. |
| `recepcao` | Recepção | Funcionário de balcão. |

`agente` e `recepcao` compartilham, neste marco, as permissões da coluna “Funcionário do CCZ” do diagrama. A diferença fica no nome da função e no cargo gravado.

| Ação | coordenacao | veterinario | agente | recepcao |
| --- | --- | --- | --- | --- |
| Entrar e abrir o próprio perfil | sim | sim | sim | sim |
| Ver a fila, aceitar e recusar | sim | não | não | não |
| Trocar o tipo de outro usuário | sim | não | não | não |
| UC02 tutor, UC04 acolhimento, UC05 fila de castração, UC09 adoção | sim | não | sim | sim |
| UC03 animal, UC10 relatórios | sim | sim | sim | sim |
| UC06 prontuário, UC07 vacinação, UC08 castração | sim | sim | não | não |
| Consultar auditoria | sim | não | não | não |

As rotas de domínio ainda não gravam animal nem baia. O RBAC esconde o item de menu e a API responde 403 se o papel não pode a ação.

O papel usado em cada pedido é o gravado no banco, não uma cópia antiga dentro do JWT. A troca de tipo vale na próxima chamada.

### Solicitar acesso

O fluxo de “Solicitar acesso” continua na tela de entrar: dados, função pretendida, senha.

- Dados obrigatórios: nome completo (mínimo 5 caracteres), CPF com 11 dígitos, matrícula de 4 a 8 dígitos distinta do CPF, e-mail institucional terminado em `.gov.br`.
- Função pretendida: uma das quatro. Se for veterinário, o CRMV é obrigatório (pelo menos 4 dígitos). Essa escolha é informativa. Não concede acesso e pode diferir da função definida no aceite.
- Senha: mínimo 8 caracteres, confirmada no formulário. A API guarda só o hash.
- O envio persiste uma solicitação `pendente`. A pessoa vê a confirmação e não ganha sessão.
- CPF, e-mail ou matrícula já usados numa conta ativa, ou numa solicitação `pendente`, impedem um segundo pedido. A mensagem diz qual dado conflita, sem revelar o nome da outra pessoa.
- Uma solicitação `recusada` não bloqueia um pedido novo com os mesmos dados.

### Fila de aceite

Seção do painel em `/painel/acessos`, rótulo “Acessos”, visível só para `coordenacao`. Os outros papéis não veem o item. Acesso direto à URL redireciona ao painel e a API responde 403.

A fila lista solicitações `pendente`, da mais antiga para a mais recente: nome, CPF mascarado, matrícula, e-mail, função pretendida, CRMV quando houver e data do pedido.

No aceite, a coordenação escolhe a função que vale, vê a pretendida ao lado e informa CRMV se a função escolhida for `veterinario` e o pedido não tiver um CRMV válido.

O aceite cria `Usuario` e `Funcionario` ativos. `perfilAcesso` é a função escolhida. `cargo` recebe o nome da função. `crmv` fica preenchido só para `veterinario`. A senha hasheada do pedido vira a senha da conta. A solicitação vai para `aceita` e sai da fila. Não há e-mail.

Na recusa, um motivo opcional de até 280 caracteres fica na solicitação. O status vai para `recusada`. Não nasce usuário. Com a senha daquele pedido, a pessoa vê que o acesso não foi aceito e o motivo, se existir.

### Troca de tipo

Na mesma seção “Acessos”, abaixo da fila, a coordenação vê os usuários ativos: nome, matrícula, função atual e CRMV quando houver.

A troca pede a nova função e confirma. Se a nova função for `veterinario`, o CRMV é obrigatório nesse formulário. Se a função deixar de ser `veterinario`, o CRMV sai de `Funcionario` e o cargo passa a ser o nome da função nova.

Quem não é `coordenacao` não chama essa ação. O perfil próprio não oferece troca de tipo.

A coordenação não troca o próprio tipo. Outra coordenação pode trocar o tipo dela. A última conta `coordenacao` do sistema não pode ser rebaixada: a API recusa e a tela explica que precisa existir outra coordenação.

A pessoa afetada mantém a sessão até o token curto vencer ou até sair. A próxima chamada já obedece à função nova. Os refreshes dela são invalidados na troca, para o login seguinte nascer com o tipo certo.

### Login ligado à API

O formulário “Entrar” deixa de gravar sessão local sem conferir senha. O aviso de que a senha não é conferida sai da tela.

- Identificador: CPF (11 dígitos) ou matrícula (4 a 8 dígitos).
- Conta ativa: a API emite o JWT e o front abre `/painel` com o nome da pessoa.
- “Manter conectado neste computador” marcado: a sessão dura até 14 dias. Desmarcado: acaba quando o navegador fecha.
- Sair apaga a sessão no navegador e invalida o refresh no servidor.
- Conta inexistente ou senha errada: “CPF, matrícula ou senha não conferem.”
- Solicitação pendente com a senha correta: “Seu pedido ainda aguarda o aceite da coordenação.” Sem token.
- Solicitação recusada com a senha correta: “A coordenação não aceitou este pedido.” O motivo aparece se existir. Sem token.

O posto do turno continua preferência deste computador e não autentica ninguém.

### JWT e RBAC

- Login bem-sucedido devolve um JWT de acesso de 15 minutos com o identificador do usuário. O `perfilAcesso` consultado nas rotas é o do banco.
- O refresh fica em cookie `HttpOnly`, `Secure` em produção, `SameSite=Lax`. Com “manter conectado”, dura 14 dias. Sem isso, é cookie de sessão.
- O JWT de acesso fica em memória no front. Não vai para `localStorage` nem `sessionStorage`.
- Sem token válido: 401, e o front volta para `/`.
- Papel insuficiente: 403, e o front diz que a seção não está disponível para a função.
- Senha, hash e refresh não aparecem em log de aplicação.

### Conta inicial

Um seed local cria um único veterinário administrador a partir de variáveis de ambiente (nome, CPF, matrícula, e-mail, senha, CRMV). O exemplo versionado usa valores fictícios de desenvolvimento. Senha real não entra no repositório. Essa conta não passa pela fila.

### Perfil

Rota `/painel/perfil` para os quatro papéis. A entrada é o nome no cabeçalho. “Sair” continua ao lado.

Somente leitura: nome, CPF mascarado, matrícula, função, CRMV quando existir. Não há controle para a própria pessoa mudar função, CPF, matrícula, nome ou CRMV.

Editáveis, cada um no próprio envio: telefone (vazio ou 10–11 dígitos), e-mail institucional único terminado em `.gov.br`, e senha (senha atual, nova com no mínimo 8 caracteres, confirmação igual). Troca de senha invalida os refreshes anteriores e mantém a sessão atual.

## Acceptance Criteria

- Dado um visitante sem conta, quando envia o pedido válido, então a solicitação fica `pendente` e o painel não abre.
- Dado um pedido pendente, quando o solicitante entra com a senha do pedido, então vê que aguarda o aceite e não recebe JWT.
- Dado um usuário que não é `coordenacao`, quando abre Acessos ou chama aceite, recusa ou troca de tipo, então não vê a seção e a API responde 403.
- Dado um pedido cuja função pretendida é recepção, quando a coordenação aceita escolhendo `agente`, então o funcionário nasce com `perfilAcesso` `agente`.
- Dado o aceite como `veterinario` sem CRMV válido, quando confirma, então nada é gravado e o CRMV permanece em erro.
- Dado um funcionário aceito, quando entra com a senha do pedido, então o painel abre com o nome dele e o menu do papel.
- Dado um usuário ativo `recepcao`, quando a coordenação troca o tipo para `veterinario` com CRMV, então a função passa a ser `veterinario` e o menu clínico passa a aparecer na próxima entrada.
- Dado a própria conta da coordenação, quando ela tenta trocar o próprio tipo, então a API recusa.
- Dado a única coordenação do sistema, quando outra ação tentaria rebaixá-la, então a API recusa e informa que precisa existir outra coordenação.
- Dado qualquer papel no próprio perfil, quando olha a função, então ela está somente leitura.
- Dado “manter conectado” desmarcado, quando o navegador fecha, então `/painel` volta ao login.
- Dado o texto “A senha não é conferida pelo servidor”, quando o login está ligado, então esse aviso não aparece.

## Edge Cases

- Dois pedidos simultâneos com o mesmo CPF: um persiste; o outro recebe conflito.
- Aceite e recusa do mesmo pedido ao mesmo tempo: uma operação vence; a outra responde que o pedido já foi decidido.
- Aceite como veterinário e depois troca para recepção: o CRMV deixa de valer no funcionário.
- Troca para veterinário sem CRMV: a API não grava.
- JWT expirado: o front renova uma vez; se falhar, volta ao login sem apagar o posto salvo.
- E-mail com maiúsculas ou espaços: gravado em minúsculas, sem espaços nas pontas.
- Pessoa recusada pede de novo: novo registro `pendente`; o recusado permanece como histórico.

## UX / API Notes

Interface em português, nos componentes shadcn e no tema de `DESIGN.md`. A fila, a troca de tipo e o perfil usam a casca já existente.

- `POST /auth/solicitacoes` — cria pedido. 201 sem token.
- `GET /auth/solicitacoes?status=pendente` — fila. Só `coordenacao`.
- `POST /auth/solicitacoes/:id/aceitar` — `perfilAcesso` e `crmv` opcional.
- `POST /auth/solicitacoes/:id/recusar` — `motivo` opcional.
- `GET /usuarios` — usuários ativos. Só `coordenacao`.
- `PATCH /usuarios/:id/perfil` — `perfilAcesso` e `crmv` quando a função for veterinário. Só `coordenacao`.
- `POST /auth/login` — identificador e senha. 200 com dados públicos e JWT; cookie de refresh.
- `POST /auth/refresh` — novo JWT a partir do cookie.
- `POST /auth/logout` — invalida o refresh.
- `GET /auth/me` — perfil da sessão.
- `PATCH /auth/me` — telefone e e-mail.
- `POST /auth/me/senha` — senha atual e nova.

Validação 400, conflito 409, não autorizado 401, proibido 403. O registro `zootech.session` deixa de autenticar e pode guardar só o posto.

## Data and Permissions

Solicitação: nome, CPF, matrícula, e-mail, função pretendida, CRMV opcional, hash da senha, status (`pendente`, `aceita`, `recusada`), motivo, datas e o usuário que decidiu.

Usuário ativo nasce no aceite ou no seed. `Funcionario` liga matrícula, cargo e CRMV. CPF, e-mail e matrícula são únicos entre contas ativas.

Eventos mínimos, sem tela nesta spec: solicitação criada, aceita, recusada, tipo alterado, login bem-sucedido, senha alterada. A senha não entra no evento. O evento de tipo alterado guarda a função anterior, a nova e quem trocou.

## Dependencies

- Login, casca e pedido de acesso já desenhados em `apps/web`.
- API NestJS hoje só com `GET /health`.
- Postgres do `compose.yaml`, com migração só de usuário, funcionário e solicitação.
- Identidade em `DESIGN.md` e componentes em `apps/web/src/components/ui`.
- Conta seed de coordenação antes de qualquer pedido ser aceito.

## Open Questions

Nenhuma neste marco. Em 2026-09-24 o autor confirmou: `agente` e `recepcao` visualizam as mesmas seções; não há aviso por e-mail. A pessoa descobre aceite, recusa e troca de tipo ao entrar ou ao usar o painel. Um mapa de seções diferente fica para depois e não muda o restante do fluxo.

## Implementation Handoff

Confirmado pelo autor em 2026-09-24: só `coordenacao` aceita pedidos e só `coordenacao` troca o tipo de um usuário já ativo. Veterinário, agente e recepção não fazem nenhuma das duas coisas. A pessoa não troca o próprio tipo no perfil.

Ainda em assunção: os quatro perfis; agente e recepção compartilham o recorte do funcionário; sem e-mail transacional; seed local da primeira coordenação.

Próximo passo: revisar o que ainda está em aberto. Se estiver certo, implementar o login na API, `/painel/acessos` (fila e troca de tipo) e `/painel/perfil`.
