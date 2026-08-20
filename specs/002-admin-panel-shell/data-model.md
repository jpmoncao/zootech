# Data Model: Chassis do painel administrativo

**Feature**: `002-admin-panel-shell`  
**Date**: 2026-08-19

Esta feature **não persiste** dados de produto. O modelo descreve view-models e configuração de chrome extraídos da spec. Sem tabelas, ORM ou entidades de zoológico. O sinal HTTP de disponibilidade permanece o de [`001-bootstrap-monorepo/data-model.md`](../001-bootstrap-monorepo/data-model.md) (`HealthResponse`).

## Entities

### Chassis

Estrutura persistente da superfície. Não é um registro; é o layout que envolve todas as áreas.

| Campo        | Tipo    | Regras |
|--------------|---------|--------|
| identity     | string  | Sempre `"ZooTech"`. Sem logotipo. |
| navigation   | Nav     | Sempre presente. Ver Destino. |
| contentArea  | Área    | Uma por vez, definida pela rota. |

**Relações**: contém exatamente uma Nav e uma Área atual.

**Transições**: nenhuma persistida. Troca de área = troca de rota.

---

### Destino de navegação

Entrada nomeada. Conjunto **fechado** nesta feature (FR-002).

| Campo    | Tipo | Regras |
|----------|------|--------|
| id       | `'home' \| 'animals' \| 'enclosures'` | Identificador estável no código; não visível. |
| href     | `'/' \| '/animais' \| '/recintos'` | Rota App Router. |
| label    | `'Início' \| 'Animais' \| 'Recintos'` | Rótulo visível pt-BR. |
| iconKey  | `'house' \| 'paw' \| 'fence'` | Chave já resolvida; a UI só mapeia para Lucide. |
| current  | boolean | `true` se `href` é a área atual. |

**Cardinalidade**: exatamente três destinos, nesta ordem: Início, Animais, Recintos.

**Validação**:

- MUST NOT existir destino de estoque, login ou outros.
- Um e somente um `current: true` por renderização (ou zero só no 404 do Next, fora do conjunto).

**Transições**: `current` muda com a navegação; os outros campos são constantes.

---

### Área

Conteúdo de `<main>`.

| id (rota)   | Tipo de conteúdo | View-model |
|-------------|------------------|------------|
| `/`         | Início           | `AvailabilityViewModel` (fundação) |
| `/animais`  | Plantel vazio    | `EmptyAreaViewModel` |
| `/recintos` | Plantel vazio    | `EmptyAreaViewModel` |

---

### AvailabilityViewModel (reuso)

Produzido só por `apps/web/src/application/get-availability.ts`. A UI não deriva o estado do HTTP.

| Campo              | Tipo | Regras |
|--------------------|------|--------|
| productName        | `"ZooTech"` | Identidade; no chassis a identidade do header pode coincidir — não duplicar como subtítulo no conteúdo. |
| availability       | `'available' \| 'unavailable'` | Já resolvido. |
| availabilityLabel  | `'No ar' \| 'Indisponível'` | Já resolvido. |

**Transições** (não persistidas): idênticas à fundação — sucesso 200 + `HealthResponse` → `available`; qualquer falha → `unavailable`.

---

### EmptyAreaViewModel

Produzido por módulo de aplicação (ex.: `get-empty-area.ts`). Sem lista.

| Campo      | Tipo | Regras |
|------------|------|--------|
| title      | `'Animais' \| 'Recintos'` | Igual ao `label` do destino. Sem frase extra. |
| iconKey    | `'paw' \| 'fence'` | Mesma chave do destino; ícone na área é decorativo (`aria-hidden`). |

**Validação**:

- MUST NOT incluir itens, ids, quantidades, nomes de animais/recintos, instituição ou “em breve”.
- Ausência de dados é estado válido, não erro.

**Transições**: nenhuma. Permanecem vazios até uma feature de domínio.

---

### Fora do modelo (esta feature)

- Animal, recinto, estoque, usuário, sessão.
- Qualquer agregado que precise de banco.
- Segundo contrato HTTP além de `HealthResponse`.
