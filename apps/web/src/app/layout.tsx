import type { ReactNode } from "react";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const contract = `THESIS: O acesso é serviço público, não vitrine. A parede petróleo do login vira o menu. Recuso o hero de métricas e o tom de loja de pet.
OWN-WORLD: Névoa #F4F7F6, branco, tinta #17211F. Petróleo #135E63 e #0C4549 ocupam a parede e o menu. Âmbar #E8A317 só no escudo provisório. Campo raio 6, botão 8, foco petróleo. Bricolage Grotesque nos títulos, Figtree na interface, IBM Plex Mono no CPF e na matrícula.
STORY: O servidor entra com CPF ou matrícula, ou pede acesso. No painel confirma o posto e reconhece o menu. Não há cadastro de animais.
FIRST VIEWPORT: Desktop partido ao meio. Esquerda, petróleo em tela cheia, escudo âmbar, manchete Bricolage, uma frase, rodapé mono. Direita, branca, título Entrar, dois campos altos e o botão petróleo na largura do formulário. No painel, a mesma parede tem 216 px; o miolo é o posto.
FORM: Guia visual CCZ, direção vinculada pelo autor, seed b35759c1.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance`;

export const metadata = {
  title: {
    default: "ZooTech",
    template: "%s · ZooTech",
  },
  description: "Gestão do Centro de Controle de Zoonoses.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(display.variable, body.variable, mono.variable)}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--\n${contract}\n-->` }} />
        {children}
      </body>
    </html>
  );
}
