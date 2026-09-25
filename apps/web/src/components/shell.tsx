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
import { Mark } from "./mark"

const postos = ["Balcão", "Canil", "Gatil", "Sala de vacina"] as const;

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
      <item.icon className="nav-icon" size={20} aria-hidden="true" />
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
