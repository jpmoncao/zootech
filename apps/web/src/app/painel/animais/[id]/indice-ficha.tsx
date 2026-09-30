"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { Animal } from "@/lib/api";

function itensIndice(animal: Animal, incluiRevogacao: boolean) {
  const exames = (animal.eventos ?? []).filter((evento) => evento.tipo === "exame" || evento.tipo === "diagnostico").length;
  const itens: { href: string; label: string; total?: number }[] = [
    { href: "#resumo-ficha", label: "Resumo" },
    { href: "#dados-ficha", label: "Dados da ficha" },
    { href: "#galeria-ficha", label: "Galeria", total: animal.fotos.length },
    { href: "#baia-ficha", label: "Baia e localização" },
    { href: "#castracoes-ficha", label: "Castrações", total: animal.castracoes?.length ?? 0 },
    { href: "#peso-ficha", label: "Peso", total: animal.pesagens?.length ?? 0 },
    { href: "#observacoes-ficha", label: "Observações", total: animal.observacoes?.length ?? 0 },
    { href: "#exames-ficha", label: "Exames e diagnósticos", total: exames },
    { href: "#vacinacao-ficha", label: "Vacinação" },
  ];
  if (incluiRevogacao) itens.push({ href: "#revogacao-ficha", label: "Revogar estado terminal" });
  itens.push({ href: "#historico-ficha", label: "Histórico", total: animal.eventos?.length ?? 0 });
  return itens;
}

export function IndiceFicha({ animal, incluiRevogacao }: { animal: Animal; incluiRevogacao: boolean }) {
  const itens = itensIndice(animal, incluiRevogacao);
  const [ativo, setAtivo] = useState(itens[0]?.href ?? "");

  useEffect(() => {
    const secoes = itens
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((secao): secao is HTMLElement => secao != null);
    const painel = document.getElementById("conteudo");
    if (secoes.length === 0 || !painel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visivel = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel) setAtivo(`#${visivel.target.id}`);
      },
      { root: painel, rootMargin: "-12% 0px -45% 0px", threshold: [0.15, 0.4, 0.75] },
    );
    secoes.forEach((secao) => observer.observe(secao));
    return () => observer.disconnect();
  }, [animal, incluiRevogacao]);

  function irPara(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const secao = document.getElementById(href.slice(1));
    const painel = document.getElementById("conteudo");
    if (!secao || !painel) return;
    event.preventDefault();
    setAtivo(href);
    const topo = secao.getBoundingClientRect().top - painel.getBoundingClientRect().top + painel.scrollTop - 16;
    const limite = Math.max(0, painel.scrollHeight - painel.clientHeight);
    painel.scrollTo({ top: Math.min(Math.max(0, topo), limite), behavior: "smooth" });
  }

  return (
    <nav className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [box-shadow:var(--shadow)]" aria-label="Índice da ficha">
      <h2 className="m-0 text-[17px]">Nesta ficha</h2>
      <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
        {itens.map((item) => {
          const atual = item.href === ativo;
          return (
            <li key={item.href}>
              <a
                className={`block rounded-md px-2 py-1.5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--bg)] ${atual ? "bg-[var(--primary-50)]" : ""}`}
                href={item.href}
                aria-current={atual ? "location" : undefined}
                onClick={(event) => irPara(event, item.href)}
              >
                {item.label}{item.total != null ? ` (${item.total})` : ""}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
