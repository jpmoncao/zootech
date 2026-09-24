"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { canAccess } from "../lib/access";
import {
  getCurrentUser,
  logout,
  restoreSession,
  type PerfilAcesso,
} from "../lib/api";
import { navGroups, painelItem, type NavItem } from "../lib/nav";
import { readPosto, writePosto } from "../lib/session";
import { Mark } from "./mark";

const postos = ["Balcão", "Canil", "Gatil", "Sala de vacina"] as const;

const icons: Record<string, string> = {
  painel: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  animais: "M12 21c6-3 8-7 8-11V6l-8-3-8 3v4c0 4 2 8 8 11z",
  baias: "M4 20V8l8-4 8 4v12H4z",
  vacinacao: "M14 4l6 6-8 8H6v-6l8-8z",
  castracoes: "M12 4v16M6 8h12",
  adocoes: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z",
  observacao: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  denuncias: "M12 3l9 16H3L12 3z",
  relatorios: "M6 20V10M12 20V4M18 20v-7",
  acessos: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19 8v6M22 11h-6",
};

type ShellProps = {
  section: string;
  title: string;
  children?: ReactNode;
};

export function Shell({ section, title, children }: ShellProps) {
  const [ready, setReady] = useState(false);
  const [nome, setNome] = useState("Servidor");
  const [cargo, setCargo] = useState("Servidor");
  const [perfil, setPerfil] = useState<PerfilAcesso | null>(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    restoreSession().then((user) => {
      if (cancelled) return;
      if (!user) {
        window.location.replace("/");
        return;
      }
      setNome(user.nome);
      setCargo(user.cargo ?? "Servidor");
      setPerfil(user.perfilAcesso);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [section]);

  useEffect(() => {
    if (!ready || !perfil) return;
    if (section === "acessos" && !canAccess(perfil, "acessos")) {
      window.location.replace("/painel");
    }
  }, [ready, perfil, section]);

  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const visibleGroups = useMemo(() => {
    if (!perfil) return [];
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!canAccess(perfil, item.id)) return false;
          if (!needle) return true;
          return item.label.toLocaleLowerCase("pt-BR").includes(needle);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [perfil, needle]);

  const painelVisible =
    perfil !== null &&
    canAccess(perfil, painelItem.id) &&
    (needle === "" || painelItem.label.toLocaleLowerCase("pt-BR").includes(needle));

  if (!ready || !perfil) {
    return <p className="content hint">Abrindo a sessão…</p>;
  }

  if (section === "acessos" && !canAccess(perfil, "acessos")) {
    return <p className="content hint">Abrindo a sessão…</p>;
  }

  const allowed = canAccess(perfil, section);

  async function leave() {
    await logout();
    window.location.assign("/");
  }

  return (
    <div className="shell" data-nav={navOpen ? "open" : "closed"}>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      {navOpen ? (
        <Button className="backdrop" variant="ghost" type="button" aria-label="Fechar menu" onClick={() => setNavOpen(false)} />
      ) : null}
      <aside className="side">
        <div className="brand">
          <Mark />
          <span>
            <b>ZooTech</b>
            <small>Gestão de Zoonoses</small>
          </span>
        </div>
        <nav aria-label="Seções">
          {painelVisible ? <NavLink item={painelItem} current={section} /> : null}
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="nav-group">{group.label}</div>
              {group.items.map((item) => (
                <NavLink key={item.id} item={item} current={section} />
              ))}
            </div>
          ))}
          {!painelVisible && visibleGroups.length === 0 ? (
            <p className="nav-group">Nenhuma área com esse nome</p>
          ) : null}
        </nav>
      </aside>
      <div className="main">
        <header className="top">
          <Button
            className="menu-btn"
            variant="outline"
            type="button"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            Menu
          </Button>
          <span className="top-mark">
            <Mark size={28} />
            <b className="top-word">ZooTech</b>
          </span>
          <p className="crumbs">
            ZooTech / <b>{title}</b>
          </p>
          <form className="top-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <Label className="sr-only" htmlFor="busca-menu">
              Buscar
            </Label>
            <Input
              id="busca-menu"
              className="h-11 bg-[var(--bg)]"
              value={query}
              placeholder="Buscar no menu"
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          <div className="userbox">
            <div className="who">
              <Link href="/painel/perfil">
                <b>{nome}</b>
              </Link>
              <span>{cargo}</span>
            </div>
            <span className="avatar" aria-hidden="true">
              {initials(nome)}
            </span>
            <Button variant="outline" type="button" onClick={leave}>
              Sair
            </Button>
          </div>
        </header>
        <main className="content" id="conteudo">
          {allowed ? (
            (children ?? <EmptySection title={title} />)
          ) : (
            <section className="empty">
              <h1>{title}</h1>
              <p className="lede">Esta seção não está disponível para a sua função.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export function PostoTurno() {
  const nome = getCurrentUser()?.nome ?? "Servidor";
  const [posto, setPosto] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPosto(readPosto());
  }, []);

  function confirmPosto(event: FormEvent) {
    event.preventDefault();
    if (!posto) return;
    writePosto(posto);
    setSaved(true);
  }

  return (
    <>
      <div>
        <h1>Painel</h1>
        <p className="lede">
          Sessão de {nome}. Confirme o posto do turno antes de seguir para o plantel.
        </p>
      </div>
      <form className="panel" onSubmit={confirmPosto}>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="legend">Onde você está agora</legend>
          <RadioGroup
            className="seg"
            value={posto ?? ""}
            aria-label="Posto de trabalho"
            onValueChange={(value) => {
              setPosto(value);
              setSaved(false);
            }}
          >
            {postos.map((item) => (
              <Label
                key={item}
                htmlFor={`posto-${item}`}
                data-checked={posto === item ? "true" : undefined}
              >
                <RadioGroupItem id={`posto-${item}`} value={item} className="sr-only" />
                {item}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
        <div className="actions">
          <p className="hint">O posto fica guardado neste computador.</p>
          <Button type="submit" disabled={!posto}>
            Confirmar posto
          </Button>
        </div>
        {saved && posto ? (
          <Alert variant="success" role="status">
            <AlertDescription className="text-inherit">
              Posto registrado neste computador: {posto}.
            </AlertDescription>
          </Alert>
        ) : null}
      </form>
    </>
  );
}

function EmptySection({ title }: { title: string }) {
  return (
    <section className="empty">
      <h1>{title}</h1>
      <p className="lede">Nenhum registro aberto nesta estação.</p>
    </section>
  );
}

function NavLink({ item, current }: { item: NavItem; current: string }) {
  return (
    <Link className="nav-link" href={item.href} aria-current={item.id === current ? "page" : undefined}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d={icons[item.id]} />
      </svg>
      <span>{item.label}</span>
    </Link>
  );
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${last}`.toUpperCase();
}
