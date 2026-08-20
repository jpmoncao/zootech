# Data Model: Bootstrap do monorepo ZooTech

**Feature**: `001-bootstrap-monorepo`  
**Date**: 2026-08-19

Esta feature **não persiste** dados de produto. O modelo abaixo descreve entidades de fundação (espaço de trabalho e contrato de disponibilidade), extraídas da spec. Sem tabelas, migrations ou ORM.

## Entities

### Espaço de trabalho

Representa o repositório único clonável.

| Campo | Tipo | Regras |
|-------|------|--------|
| painel | App web | Obrigatório; localizável em `apps/web` |
| api | App HTTP | Obrigatório; localizável em `apps/api` |
| contratos | Pacote compartilhado | Obrigatório; único dono de tipos web↔API |
| interface | Pacote de UI | Obrigatório; primitivos visuais; não aponta para domínio da API |
| configuração | Pacote de qualidade | Obrigatório; TypeScript strict + lint |

**Relações**: contém 2 apps e 3 packages. Não tem ciclo de dependência UI → API.

**Transições**: nenhuma. Criado uma vez no bootstrap.

---

### Verificação de disponibilidade (Health)

Sinal de que a API está no ar. Não é entidade de zoológico.

| Campo | Tipo | Regras |
|-------|------|--------|
| status | `'ok'` | Obrigatório no sucesso HTTP 200. Nenhum outro valor neste contrato. |
| service | string não vazia | Obrigatório. Valor fixo desta feature: `"api"`. |

**Relações**: definido em `@zootech/contracts`; consumido por `apps/api` (serializa a resposta) e `apps/web` (interpreta o corpo).

**Transições** (vista do cliente, não persistidas):

```text
desconhecido --fetch sucesso 200 + status ok--> disponivel
desconhecido --rede falha / não-200 / corpo inválido--> indisponivel
disponivel --refresh falha--> indisponivel
indisponivel --refresh sucesso--> disponivel
```

Falso “ok” é inválido: corpo só é `disponivel` após parse bem-sucedido de `HealthResponse`.

**Validação**:

- HTTP 200 MUST ter JSON compatível com `HealthResponse`.
- Campo extra pode ser ignorado na leitura; campo obrigatório ausente MUST ser tratado como indisponível no painel.
- API parada: falha de conexão → `indisponivel`, nunca `{ status: "ok" }`.

---

### View-model da casca (painel)

Não é persistido. Produzido por `apps/web/src/application/get-availability.ts` e recebido pela página presentacional.

| Campo | Tipo | Regras |
|-------|------|--------|
| productName | string | `"ZooTech"` — identidade visível, não repetida em subtítulo |
| availability | `'available' \| 'unavailable'` | Já resolvido; a UI não decide política |
| availabilityLabel | string | Texto curto já pronto (“No ar” / “Indisponível”) |

A UI **não** calcula status a partir do HTTP; só renderiza o view-model.

---

### Fora do modelo (esta feature)

- Animal, recinto, estoque, usuário, sessão, pedido.
- Qualquer agregado que precise de banco.

Essas entidades nascem em specs futuras, no `domain/` da API, reutilizando `@zootech/contracts`.
