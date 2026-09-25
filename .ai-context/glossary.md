# Glossary

## Terms

### CCZ

Centro de Controle de Zoonoses. Instituição que o ZooTech gere.

### Identidade visual

Direção visual do ZooTech, registrada em `DESIGN.md`. O guia em `/Users/jpmoncao/Downloads/Guia Visual CCZ.html` é a referência (verde-petróleo, âmbar só no escudo provisório, Bricolage Grotesque, Figtree, IBM Plex Mono). O nome visível é só ZooTech. Não há brasão municipal. A primeira superfície é o login e a casca do painel.

### Tons de informação

Cor identifica o status. Na mesma tela, cada status reconhecível tem uma cor só, para a pessoa ver a cor e saber do que se trata. O rótulo permanece. O mapa vive em `DESIGN.md` (Status). Tokens em `apps/web/src/app/globals.css`.

- Petróleo (`--primary`): identidade, navegação e ação principal. Não classifica estado.
- Verde (`--ok`): ativa, liberada, reativada, concluída.
- Azul (`--info`): higienização.
- Vermelho (`--crit`): interditada, erro.
- Cinza (`--muted`): inativa.
- Âmbar (`--warn`): pendência que ainda não tem tom próprio. Não é o âmbar do escudo.

Na baia, o estado operacional usa verde para ativa, azul para higienização, vermelho para interditada e cinza para inativa.

### ADM

Veterinário administrador. No painel, executa todas as funcionalidades do sistema, cadastra e gere usuários e funcionários, e consulta a auditoria. Não há classe própria: o acesso fica em `Usuario.perfilAcesso`. Na interface, esse papel se chama Coordenação (`coordenacao`). Só ele aceita solicitações de acesso e troca o tipo de um usuário já ativo.

### Veterinário

Ator clínico do CCZ. No diagrama, é um `Funcionario` com `crmv` e cargo, não uma subclasse separada. Needs confirmation.

### Funcionário

Pessoa do CCZ representada por `Funcionario` (`matricula`, `cargo`, `crmv`), herdeira de `Usuario`. No caso de uso, o funcionário opera cadastro, acolhimento, fila de castração, adoção e relatórios.

### Tutor

Responsável pelo animal depois da adoção. Herda de `Usuario` e tem endereço, bairro e quantidade de animais. O diagrama também dá a `Tutor` um `idTutor` próprio. O animal entra no CCZ sem tutor.

### Animal

Animal acompanhado pelo CCZ: identificação, fotos, espécie/raça, características, situação, indicador clínico independente `emIsolamento`, cuidados e histórico auditável. Pode ocupar zero ou uma baia; sem baia deve ficar destacado para readequação. Nasce sem tutor; tutor entra na adoção. Situações iniciais: em tratamento, em quarentena/observação, saudável, adotado e óbito.

### Foto do animal

Imagem da galeria do animal. O recorte quadrado acontece no front; a API aceita JPEG/JPG, PNG e WebP já recortados, valida o quadrado, gera saída WebP até 1200×1200 px, comprime para até 5 MB e limita a 10 fotos por animal. Arquivos ficam em `apps/api/storage/media` (ou `ZOOTECH_MEDIA_ROOT`/`MEDIA_ROOT`) com caminho relativo `animais/{id}/{uuid}.webp` e são servidos por rota controlada, sem expor o path no JSON.

### Raça do animal

Catálogo por espécie (`cao` ou `gato`) com nome de exibição e nome normalizado em Unicode NFC, trim, espaços colapsados e comparação sem distinção de caixa. O seed padrão cria 59 entradas entre cães e gatos, incluindo SRD, Outra e Não Informada, sem remover raças personalizadas.

### Baia

Local que abriga zero ou mais animais. Cada animal ocupa zero ou uma baia e pode ser alocado, transferido ou ficar sem baia durante tratamento. O cadastro persiste código único sem distinção de caixa, setor (canil, gatil ou quarentena), tipo (coletiva ou individual), capacidade, área opcional, solário, exclusividade para isolamento, última higienização opcional e estado operacional (ativa, inativa, interditada ou em higienização). A API calcula ocupantes, ocupação e vagas disponíveis a partir de `Animal.baiaId`. Regras e fluxos estão em `.ai-context/specs/gestao-de-baias.md`.

### Auditoria

Registro consultável pelo ADM/Coordenação no escopo administrativo e pela ficha do domínio quando aplicável. Eventos de baias usam `AuditoriaEvento` com `dados.entidade = "baia"` e `dados.entidadeId`, cobrindo criação, edição, interdição/liberação, inativação/reativação e higienização. Eventos de animais usam `dados.entidade = "animal"` e `dados.entidadeId`, cobrindo criação, edição, observação, pesagem, evento simples, mudança de baia, foto adicionada/removida e revogação terminal.

### Timeline do animal

Histórico cronológico reverso em `EventoAnimal`, alimentado por criação, edição, mudança de situação, mudança de baia, observação, pesagem, exame, diagnóstico e revogação de situação terminal. Observações e pesagens também têm tabelas append-only próprias; o evento dá a visão unificada da ficha.

### Prontuário

Registro clínico único de um animal. Campos do diagrama: data do atendimento, anamnese, diagnóstico, prescrição, peso e temperatura. Um prontuário contém as vacinas.

### Registro de vacina

Aplicação de vacina ligada ao prontuário: nome, lote, data de aplicação e data da próxima dose. O caso de uso UC07 fala em vacinação antirrábica.

### Castração

Pedido, cirurgia e pós-operatório de um animal. O diagrama limita a zero ou um registro por animal. A fila (`statusFila`) é operada pelo funcionário; agendar e executar é do veterinário.

### Adoção

Registro de adoção de um animal, com termo assinado e status de acompanhamento. Zero ou um por animal no diagrama. É neste momento que o animal recebe o tutor.

### Acolhimento

Entrada e triagem do animal (UC04), feita pelo funcionário. `Animal.statusAcolhimento` guarda o estado. O animal já ocupa uma baia e ainda não tem tutor.

### CRMV

Registro profissional do veterinário, campo `crmv` em `Funcionario`.

### perfilAcesso

Campo em `Usuario` que distingue o tipo de acesso e alimenta o RBAC. A spec `.ai-context/specs/autenticacao-jwt-rbac.md` usa quatro valores: `coordenacao`, `veterinario`, `agente` e `recepcao`. A função que vale é a escolhida no aceite. Depois disso, só `coordenacao` troca o tipo. O próprio usuário não troca.

### Solicitação de acesso

Pedido de um servidor ainda sem conta ativa. Nasce no login, fica `pendente` até o veterinário administrador aceitar ou recusar, e só vira `Usuario` e `Funcionario` no aceite.
