---
name: ZooTech
description: Acesso de serviço público — parede petróleo, névoa, escudo âmbar provisório.
colors:
  primary: "#135E63"
  primary-deep: "#0C4549"
  primary-soft: "#E3F0EF"
  accent-amber: "#E8A317"
  accent-amber-soft: "#FDF3DC"
  ink: "#17211F"
  muted: "#5B6B68"
  line: "#D9E1DF"
  mist: "#F4F7F6"
  surface: "#FFFFFF"
  on-dark: "#E3F0EF"
  on-dark-soft: "#A9CBC7"
  ok: "#2F8A4E"
  ok-soft: "#E4F3E8"
  warn: "#A35F00"
  warn-soft: "#FCEFD9"
  crit: "#B93A2B"
  crit-soft: "#FBE6E3"
  info: "#2E6AA3"
  info-soft: "#E3EDF7"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, Cascadia Mono, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  field: "6px"
  control: "8px"
  panel: "10px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
    typography: "Figtree 600 15px/1"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    padding: "8px"
    height: "40px"
    typography: "Figtree 600 13px/1"
  input-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
    height: "52px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  nav-link-current:
    backgroundColor: "rgba(255, 255, 255, 0.12)"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "64px"
  choice-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "64px"
  seg-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "40px"
---

# Design System: ZooTech

## Overview

**Creative North Star: "A Parede Petróleo"**

ZooTech é identidade de serviço público sanitário, não de vitrine nem de loja de pet. A parede verde-petróleo do login e a lateral do painel são a mesma matéria: autoridade quieta, contraste alto, zero hero de métricas. O miolo opera em névoa e branco; o posto do turno é o centro do painel, não um dashboard de KPIs.

A tipografia carrega a hierarquia: Bricolage Grotesque só nos títulos e na marca, Figtree na interface operacional, IBM Plex Mono no CPF, na matrícula e em identificadores. O escudo âmbar é marcador provisório — não brasão municipal, não acento de UI.

**Key Characteristics:**
- Parede petróleo contínua do login (metade da viewport) ao menu (216 px)
- Âmbar restrito ao escudo provisório inline SVG
- Campos altos (raio 6), botões (raio 8), foco petróleo
- Mono tabular em CPF/matrícula; sem cadastro de animais nesta identidade

## Colors

Petróleo profundo na parede e no menu; névoa e branco no miolo; tinta escura no texto; âmbar só no escudo.

### Primary
- **Petróleo** (#135E63): botão primário, foco, borda ativa, texto de seleção, accent-color de checkbox.
- **Petróleo Profundo** (#0C4549): parede do login, lateral do shell, hover do botão primário, círculos do escudo.
- **Petróleo Suave** (#E3F0EF): hover de secundário, escolha/seg selecionados, fundo do avatar, seleção de texto.

### Tertiary
- **Âmbar de Vacina** (#E8A317): preenchimento do escudo provisório apenas. Soft (#FDF3DC) existe no token set para futuros selos de vacina, não como acento decorativo.

### Neutral
- **Tinta** (#17211F): texto principal.
- **Muted** (#5B6B68): dicas, crumbs, legendas inativas.
- **Linha** (#D9E1DF): bordas de campo, painel, topo, divisores.
- **Névoa** (#F4F7F6): fundo do shell e busca do topo.
- **Superfície** (#FFFFFF): formulário de login, painéis, botão secundário.
- **Sobre Escuro** (#E3F0EF) / **Sobre Escuro Suave** (#A9CBC7): texto na parede petróleo.

### Status
- **Ok** (#2F8A4E / soft #E4F3E8), **Aviso** (#A35F00 / soft #FCEFD9), **Crítico** (#B93A2B / soft #FBE6E3), **Info** (#2E6AA3 / soft #E3EDF7): alertas com texto escuro sobre fundo claro; status nunca só pela cor.

### Named Rules
**The Parede Rule.** Petróleo profundo (#0C4549) é parede e menu — nunca um card hero nem um fundo de marketing.

**The Amber Shield Rule.** Âmbar (#E8A317) só no escudo provisório. Não é acento de botão, link, chip ou destaque de seção.

**The Status-With-Words Rule.** Ok, aviso, crítico e info carregam texto legível sobre o soft correspondente; a cor não basta.

## Typography

**Display Font:** Bricolage Grotesque (Segoe UI / system-ui)
**Body Font:** Figtree (Segoe UI / system-ui)
**Label/Mono Font:** IBM Plex Mono (ui-monospace)

**Character:** Display compacto e denso nos títulos; Figtree operacional no restante; mono tabular para identificadores de servidor.

### Hierarchy
- **Display** (700, 38px desktop / 28px ≤760px, lh 1.1, -0.02em): manchete na parede do login.
- **Headline** (700, 28px, lh 1.1, -0.02em): “Entrar”, títulos de etapa, h1 do conteúdo do painel.
- **Title** (700, 15–17px, lh 1.1, -0.02em): palavra ZooTech na marca.
- **Body** (400, 16px / 1.5 no login; 14px no shell): interface e lede (máx. ~62ch).
- **Label** (600, 13px): labels de campo, passos, grupos de nav, crumbs.
- **Mono** (400, 14px inputs; 12px rodapé/identificador): CPF, matrícula, CRMV, display da sessão.

### Named Rules
**The Three-Face Rule.** Bricolage só em títulos e marca; Figtree na UI; IBM Plex Mono em CPF, matrícula e IDs — sem misturar papéis.

## Layout

Login desktop: grid 1fr 1fr. Esquerda = parede petróleo em tela cheia (padding 40px); direita = formulário branco (padding 48×64, max-width 560px), campos altos e botão em largura total. Shell desktop: grid 216px + 1fr; conteúdo max-width 880px, padding 28×24. Em ≤1023px a lateral vira trilho de 72px (rótulos ocultos). Em ≤760px o login empilha e o menu vira drawer fixo (≤280px / 88vw) com backdrop.

### Named Rules
**The Wall Continuity Rule.** A mesma parede petróleo do login vira o menu de 216 px; o miolo do painel é o posto, não um hero de métricas.

## Elevation & Depth

Sistema predominantemente plano: profundidade por tom (parede vs. névoa vs. branco) e por uma sombra única e suave em painéis. Foco é anel petróleo, não glow colorido.

### Shadow Vocabulary
- **Panel** (`0 10px 28px rgba(12, 69, 73, 0.08)`): containers `.panel`.
- **Focus** (`0 0 0 3px rgba(19, 94, 99, 0.22)`): campo e escolha ativos.
- **Focus error** (`0 0 0 3px rgba(185, 58, 43, 0.15)`): campo inválido.
- **Drawer scrim** (`rgba(12, 21, 20, 0.45)`): backdrop mobile.

### Named Rules
**The Flat-Wall Rule.** A parede petróleo não recebe sombra; elevação fica no miolo (painel) e no foco.

## Shapes

Cantos funcionais, sem pílulas de marketing: campo 6px, controles interativos 8px, painel 10px, avatar circular. Escudo = SVG de caminho fechado (viewBox 30×34), não raster.

### Named Rules
**The Field-Button Split.** Campo = 6px; botão, nav, escolha e seg = 8px; painel = 10px. Não unificar.

## Components

### Buttons
- **Shape:** raio 8px, min-height 44px, padding 10×16, Figtree 600 15px.
- **Primary:** petróleo (#135E63) / texto branco; hover → petróleo profundo.
- **Secondary:** superfície + borda linha; hover → petróleo suave.
- **Ghost:** sem borda, texto petróleo 13px/600, min-height 40px (Mostrar/Ocultar senha).
- **Block:** width 100% no formulário de login.

### Cards / Containers
- **Panel:** superfície, borda linha, raio 10px, padding 20px, sombra panel — só onde há interação (ex.: confirmar posto).
- **Alert:** raio 8px, padding 12×14, soft + borda tonal + texto escuro (info / ok / warn).

### Inputs / Fields
- **Control:** min-height 52px (56px no login), raio 6px, borda linha, padding 8×12.
- **Focus:** borda petróleo + anel focus; outline global `:focus-visible` 2px petróleo.
- **Error:** borda crítico + anel crítico; texto de erro 13px crítico.
- **Mono inputs:** IBM Plex Mono 14px em CPF/matrícula/CRMV.

### Navigation
- Lateral petróleo profundo; links min-height 40px, raio 8px, on-dark; current = branco sobre `rgba(255,255,255,0.12)`; grupos 12px/600 on-dark-soft.
- Topo: superfície, borda inferior linha, busca em névoa, crumbs muted, avatar 36px petróleo suave.

### Choice & Segment
- **Choice:** grid 2 colunas, min-height 64px, raio 8px; selected = borda petróleo + soft + anel focus.
- **Seg (posto):** botões 40px; selected = soft + borda petróleo + texto petróleo profundo.

### Mark (signature)
- Escudo âmbar (#E8A317) com cinco círculos petróleo profundo (#0C4549); inline SVG; tamanhos típicos 28–36px; view-transition `zoot-mark` / parede `zoot-wall` (240ms, ease out-expo). Sem brasão municipal, sem raster de shipping.

## Do's and Don'ts

### Do:
- **Do** manter a parede petróleo (#0C4549) como login full-bleed e menu 216 px.
- **Do** usar âmbar (#E8A317) só no escudo provisório.
- **Do** tipografar CPF/matrícula em IBM Plex Mono e títulos em Bricolage.
- **Do** campos raio 6 / botões raio 8 / foco petróleo.
- **Do** escrever status em texto sobre soft (ok, warn, crit, info).

### Don't:
- **Don't** tratar o painel como hero de métricas, vitrine ou loja de pet.
- **Don't** inventar brasão municipal, logo institucional ou selo de prefeitura.
- **Don't** usar âmbar como acento geral de UI.
- **Don't** cadastrar animais nesta superfície de identidade — o menu lista áreas vazias.
- **Don't** substituir o nome visível ZooTech por CCZ na marca.
