# Glossary

## Terms

### CCZ

Centro de Controle de Zoonoses. Instituição que o ZooTech gere.

### Identidade visual

Direção visual do ZooTech, registrada em `DESIGN.md`. O guia em `/Users/jpmoncao/Downloads/Guia Visual CCZ.html` é a referência (verde-petróleo, âmbar só no escudo provisório, Bricolage Grotesque, Figtree, IBM Plex Mono). O nome visível é só ZooTech. Não há brasão municipal. A primeira superfície é o login e a casca do painel.

### ADM

Veterinário administrador. No painel, executa todas as funcionalidades do sistema, cadastra e gere usuários e funcionários, e consulta a auditoria. Não há classe própria: o acesso fica em `Usuario.perfilAcesso`. Na interface, esse papel se chama Coordenação (`coordenacao`). Só ele aceita solicitações de acesso e troca o tipo de um usuário já ativo.

### Veterinário

Ator clínico do CCZ. No diagrama, é um `Funcionario` com `crmv` e cargo, não uma subclasse separada. Needs confirmation.

### Funcionário

Pessoa do CCZ representada por `Funcionario` (`matricula`, `cargo`, `crmv`), herdeira de `Usuario`. No caso de uso, o funcionário opera cadastro, acolhimento, fila de castração, adoção e relatórios.

### Tutor

Responsável pelo animal depois da adoção. Herda de `Usuario` e tem endereço, bairro e quantidade de animais. O diagrama também dá a `Tutor` um `idTutor` próprio. O animal entra no CCZ sem tutor.

### Animal

Animal acompanhado pelo CCZ: nome, espécie, raça, sexo, porte, cor, microchip e status de acolhimento. Ocupa exatamente uma baia. Pode ser transferido. Nasce sem tutor.

### Baia

Local que abriga zero ou mais animais. Todo animal está em exatamente uma baia e pode ser transferido. Possui código único, setor (canil, gatil ou quarentena), tipo (coletiva ou individual), capacidade, área opcional, solário, exclusividade para isolamento, última higienização opcional e estado operacional (ativa, inativa, interditada ou em higienização). Regras e fluxos estão em `.ai-context/specs/gestao-de-baias.md`.

### Auditoria

Registro consultável pelo ADM. Os eventos gravados ainda não foram listados. A transferência de baia não tem histórico próprio separado deste registro, até que isso seja pedido.

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
