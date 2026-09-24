# Architecture

## System Summary

Monorepo pnpm e Turborepo com `apps/web` (Next.js, sem tela) e `apps/api` (NestJS, só `GET /health`). Postgres local está no `compose.yaml`, sem esquema. O diagrama de classes de 2026-09-23 continua sem código de domínio.

## Main Modules

- `apps/web`: pacote Next.js sem tela, layout vazio e página que não renderiza conteúdo.
- `apps/api`: NestJS com `GET /health`. Escuta em `0.0.0.0` e `PORT` (padrão 3001). Não abre conexão com o banco.
- `compose.yaml`: Postgres 17 local. Sem migração.
- `tsconfig.base.json` e `eslint.config.mjs`: config compartilhada.

Pacote de contratos ainda não existe.

## Data Flow

O painel do veterinário ADM autentica na API e, a partir daí, opera o domínio inteiro e a gestão de usuários. A API persiste tudo no Postgres, inclusive o registro de auditoria. Não há outro serviço no caminho.

## External Integrations

Nenhuma. Só o banco Postgres.

## Storage

Postgres. Estratégia relacional da herança `Usuario` → `Funcionario` / `Tutor` (tabela única ou tabelas separadas) ainda não foi decidida.

## Domain Model

Não existe a classe `Veterinario`: no diagrama, veterinário cabe em `Funcionario` (`cargo`, `crmv`) com `Usuario.perfilAcesso`.

O diagrama original dizia que todo animal tem exatamente um tutor e não tinha `Baia`. Isso foi corrigido em 2026-09-23:

- Todo animal ocupa exatamente uma baia e pode ser transferido para outra.
- O animal entra sem tutor. O tutor só é vinculado quando o animal é atribuído a uma adoção.
- Atributos de `Baia` além da identidade ainda não foram definidos.
- Transferência troca a baia atual. Não houve pedido de tabela de histórico própria; o registro de auditoria cobre a mudança. Needs confirmation se o histórico de baias precisa existir fora da auditoria.

Relações vigentes:

- `Funcionario` e `Tutor` herdam de `Usuario`.
- Um `Tutor` possui zero ou mais `Animal`. O animal tem zero ou um tutor.
- Um `Animal` ocupa exatamente uma `Baia`. Uma baia abriga zero ou mais animais.
- Um `Animal` possui exatamente um `Prontuario`.
- Um `Prontuario` contém zero ou mais `RegistroVacina`.
- Um `Animal` tem zero ou uma `Castracao`.
- Um `Animal` tem zero ou uma `Adocao`. A adoção é o momento em que o animal recebe o tutor.
- Um `Funcionario` atende zero ou mais `Prontuario`.

```mermaid
classDiagram
    direction TB

    class Usuario {
        +int idUsuario
        +String nome
        +String email
        +String senhaHash
        +String cpf
        +String telefone
        +String perfilAcesso
        +autenticar()
        +redefinirSenha()
    }

    class Funcionario {
        +String matricula
        +String cargo
        +String crmv
    }

    class Tutor {
        +int idTutor
        +String enderecoCompleto
        +String bairro
        +int quantidadeAnimais
        +cadastrarTutor()
        +atualizarEndereco()
    }

    class Animal {
        +int idAnimal
        +String nome
        +String especie
        +String raca
        +String sexo
        +String porte
        +String cor
        +String numeroMicrochip
        +String statusAcolhimento
        +cadastrar()
        +atualizarStatus()
        +vincularTutor()
        +transferirBaia()
    }

    class Baia {
        +int idBaia
    }

    class Prontuario {
        +int idProntuario
        +DateTime dataAtendimento
        +String anamnese
        +String diagnostico
        +String prescricaoMedicamentosa
        +float pesoKg
        +float temperatura
        +adicionarAtendimento()
        +gerarHistorico()
    }

    class RegistroVacina {
        +int idVacina
        +String nomeVacina
        +String lote
        +Date dataAplicacao
        +Date dataProximaDose
    }

    class Castracao {
        +int idCastracao
        +Date dataSolicitacao
        +DateTime dataCirurgia
        +String statusFila
        +String observacoesPosOperatorias
        +solicitarCastracao()
        +agendarCirurgia()
        +concluirProcedimento()
    }

    class Adocao {
        +int idAdocao
        +Date dataAdocao
        +boolean termoAssinado
        +String statusAcompanhamento
        +registrarAdocao()
        +emitirTermoResponsabilidade()
    }

    Usuario <|-- Funcionario : herança
    Usuario <|-- Tutor : herança
    Tutor "0..1" --> "0..*" Animal : possui após adoção
    Animal "0..*" --> "1" Baia : ocupa
    Animal "1" --> "1" Prontuario : possui
    Prontuario "1" --> "0..*" RegistroVacina : contém
    Animal "1" --> "0..1" Castracao : submete
    Animal "1" --> "0..1" Adocao : passa
    Funcionario "1" --> "0..*" Prontuario : atende
```

## Use Cases

Includes confirmados na imagem de 2026-09-23. Não há outros `include` ou `extend` nesse trecho:

```mermaid
UC06 -.->|"<<include>>"| UC01
UC08 -.->|"<<include>>"| UC01
```

UC06 (prontuário) e UC08 (agendar e executar castração) incluem UC01 (login). Os outros casos de uso se ligam ao login pela associação do ator, sem `include` desenhado.

| Caso de uso | Funcionário do CCZ | Veterinário | ADM |
| --- | --- | --- | --- |
| UC01 Efetuar login | sim | sim | sim |
| UC02 Cadastrar e atualizar tutor | sim | não | sim |
| UC03 Cadastrar e atualizar animal | sim | sim | sim |
| UC04 Registrar acolhimento e triagem | sim | não | sim |
| UC05 Gerenciar fila de castração | sim | não | sim |
| UC06 Registrar atendimento no prontuário | não | sim | sim |
| UC07 Registrar vacinação antirrábica | não | sim | sim |
| UC08 Agendar e executar castração | não | sim | sim |
| UC09 Processar adoção e termo de posse | sim | não | sim |
| UC10 Emitir relatórios epidemiológicos | sim | sim | sim |
| Cadastrar e gerir usuários e funcionários | não | não | sim |
| Consultar registro de auditoria | não | não | sim |

O painel do veterinário ADM reúne todas as funcionalidades do sistema, mais a gestão de usuários e funcionários e o registro de auditoria. A coluna ADM não veio do diagrama de casos de uso; veio da definição do painel.

## Testing Strategy

Jest em `apps/api` cobre `GET /health`. O front não tem testes.

## Local Development

Node.js 22 ou superior e pnpm 11. `pnpm install` na raiz. `pnpm dev:api` sobe a API. `docker compose up -d` sobe o Postgres. O front não tem tela para abrir.

## Deployment

Não definido. Não faz parte do pedido atual.
