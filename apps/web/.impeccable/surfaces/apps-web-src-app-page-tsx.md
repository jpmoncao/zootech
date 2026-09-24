---
version: 1
slug: "apps-web-src-app-page-tsx"
primary_target: "apps/web/src/app/page.tsx"
related_targets: ["apps/web/src/app/painel/page.tsx","apps/web/src/components/login-screen.tsx","apps/web/src/components/shell.tsx"]
---

# Acesso

Modo: Operate.

Publico: servidor do CCZ no balcao ou no canil. Primeiro usuario entregue: veterinario ADM. Tarefa: entrar com CPF ou matricula, pedir acesso quando ainda nao tem conta, restaurar sessao pelo refresh e confirmar o posto do turno na casca do painel.

Direcao: guia visual CCZ, vinculante. Verde-petroleo e ambar de vacina, Bricolage Grotesque, Figtree, IBM Plex Mono. Nome visivel: ZooTech. Escudo provisório, sem brasao.

Momento: a parede petroleo do login torna-se o menu. O painel ja possui Acessos, Perfil e Baias; outras secoes continuam abrindo pela casca generica ate seus dominios serem implementados.

Fora desta superficie: cadastro de animais, vacinacao, castracao, adocao, denuncias e relatorios. Baias tem lista/mapa, filtros, formulario, detalhe, acoes e historico, mas ocupantes reais dependem do futuro dominio Animal.

A senha e conferida pela API. O JWT de acesso fica em memoria, o refresh usa cookie HttpOnly, e `zootech.session` guarda apenas o posto do turno neste computador.
