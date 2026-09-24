# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A identidade serve a equipe do Centro de Controle de Zoonoses, no balcão e no manejo dos animais:

- Veterinário: registra vacinas, castrações e laudos na sala de vacina e no consultório.
- Agente de zoonoses: recolhe, maneja e move animais no canil, no gatil e na rua, muitas vezes de luva, em pé, com tablet.
- Recepção: atende o cidadão no balcão (entrega voluntária, denúncia, adoção, busca de animal perdido).
- Coordenação: aprova acessos, acompanha lotação, estoque e indicadores para a Secretaria de Saúde.

O primeiro usuário entregue é o veterinário administrador (ADM). No painel, executa todas as funcionalidades, cadastra e gere usuários e funcionários, e consulta a auditoria. Não há classe própria: o acesso fica em `Usuario.perfilAcesso`.

O tutor é o responsável pelo animal depois da adoção. Não é ator dos casos de uso desenhados e não é público desta identidade.

## Product Purpose

ZooTech é o sistema de gestão do CCZ. Existe para tirar o plantel, as baias, o clínico, a vacinação, a castração, a adoção e a vigilância de planilha, ficha de papel e mensagem solta, e deixar um registro sanitário consultável.

Sucesso, neste momento, é a equipe conseguir registrar e achar um animal, uma baia e uma dose sem perder o histórico. O primeiro marco de produto é o login e o painel do ADM.

## Positioning

É prontuário e registro sanitário de um serviço público de saúde animal, operado por servidores no CCZ. O animal entra sem tutor, ocupa exatamente uma baia e só recebe tutor na adoção. O cadastro de acesso é uma solicitação aprovada pela coordenação, não uma conta aberta.

## Operating Context

Uso previsto no desktop do balcão e no tablet do canil e do gatil. A rotina inclui recolhimento, observação antirrábica de 10 dias, higienização e interdição de baia, vacinação individual ou em campanha, e leitura de microchip quando houver leitor USB ou Bluetooth.

O front ainda não tem tela. A API expõe somente `GET /health`. Persistência prevista em Postgres local. Não há produção, staging, fila, storage externo nem serviço de terceiros.

## Capabilities and Constraints

Confirmado como domínio, ainda sem código de produto: autenticação; baias, animais, tutores, acolhimento, prontuário, vacinas, castração, adoção e relatórios epidemiológicos; gestão de usuários e funcionários e auditoria, exclusivas do ADM.

Regras já fechadas: todo animal ocupa exatamente uma baia e pode ser transferido; nasce sem tutor; o tutor entra na adoção. Veterinário é um `Funcionario` com `crmv`, não uma classe separada. Nenhuma tela, layout, componente ou estilo entra no código antes da identidade visual.

Em aberto: enumeração de `perfilAcesso`; atributos da baia além do identificador; eventos gravados na auditoria; se o canil usa tablet de fato e se a rede lá é estável; se existe leitor de microchip.

O nome visível na interface é somente ZooTech.

## Brand Commitments

O nome do sistema é ZooTech. CCZ é a instituição, não o nome do produto.

O autor tornou vinculante o guia em `/Users/jpmoncao/Downloads/Guia Visual CCZ.html` (23/09/2026). A direção recomendada nesse guia — sistema de saúde pública, verde-petróleo com âmbar de vacina, Bricolage Grotesque, Figtree e IBM Plex Mono — é a referência da identidade. As duas alternativas do guia (gov.br e ardósia/menta) foram apresentadas à equipe e não foram escolhidas.

Não há brasão municipal. O escudo provisório do guia permanece marcador temporário. Não inventar brasão, logotipo institucional nem selo de prefeitura.

Nomes, microchips, lotes e registros profissionais do guia são fictícios.

## Evidence on Hand

- Guia visual: `/Users/jpmoncao/Downloads/Guia Visual CCZ.html`.
- Domínio e atores: `.ai-context/overview.md`, `.ai-context/decisions.md`, `.ai-context/glossary.md`.
- Front vazio: `apps/web/src/app/page.tsx` retorna `null`.
- Não há depoimento, caso real, brasão, logo definitivo nem dado operacional do CCZ. Trabalho futuro não pode fabricar isso.

## Product Principles

- O registro sanitário vale mais do que a aparência de produto de pet shop.
- A identidade cabe na equipe inteira; o ADM é quem usa primeiro.
- O que pede ação — observação, quarentena, dose a vencer, baia interditada — aparece antes do restante, com cor e texto.
- A interface aguentar luva, pressa e consulta em pé no canil.
- Não fabricar brasão, prova social nem dado que o CCZ não entregou.

## Accessibility & Inclusion

Herdado do guia vinculante: alvo de toque de pelo menos 40 px; texto branco sobre o verde-petróleo em contraste alto; âmbar só com texto escuro; selos de status com texto sobre o fundo claro acima de 4,5:1. Status nunca depende só da cor. Desktop no balcão e tablet no canil são os dois contextos de uso.
