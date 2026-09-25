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
    return <p className="[padding:28px_24px_48px] [display:flex] [flex-direction:column] [gap:20px] [max-width:none] [flex:1] [min-height:0] [overflow:auto] [&_h1]:[margin:0] [&_h1]:[font-size:28px] [&_h2]:[margin:8px_0_0] [&_h2]:[font-size:20px] [&_h3]:[margin:0] [&_h3]:[font-size:17px] max-[760px]:[padding:20px_16px_40px] [font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Abrindo a sessão…</p>;
  }

  if (section === "acessos" && !canAccess(perfil, "acessos")) {
    return <p className="[padding:28px_24px_48px] [display:flex] [flex-direction:column] [gap:20px] [max-width:none] [flex:1] [min-height:0] [overflow:auto] [&_h1]:[margin:0] [&_h1]:[font-size:28px] [&_h2]:[margin:8px_0_0] [&_h2]:[font-size:20px] [&_h3]:[margin:0] [&_h3]:[font-size:17px] max-[760px]:[padding:20px_16px_40px] [font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Abrindo a sessão…</p>;
  }

  const allowed = canAccess(perfil, section);

  async function leave() {
    await logout();
    window.location.assign("/");
  }

  return (
    <div className="group [height:100vh] [min-height:100vh] [display:grid] [grid-template-columns:216px_1fr] [background:var(--bg)] [color:var(--ink)] [font-size:14px] min-[761px]:max-[1023px]:[grid-template-columns:72px_1fr] max-[760px]:[grid-template-columns:1fr]" data-nav={navOpen ? "open" : "closed"}>
      <a className="[position:absolute] [left:16px] [top:8px] [z-index:20] [transform:translateY(-140%)] [background:var(--surface)] [color:var(--ink)] [padding:8px_12px] [border-radius:8px] focus:[transform:none]" href="#conteudo">
        Ir para o conteúdo
      </a>
      {navOpen ? (
        <Button className="[display:none] max-[760px]:[display:block] max-[760px]:[position:fixed] max-[760px]:[inset:0] max-[760px]:[width:auto] max-[760px]:[height:auto] max-[760px]:[padding:0] max-[760px]:[border:0] max-[760px]:[border-radius:0] max-[760px]:[background:rgba(12,_21,_20,_0.45)] max-[760px]:[z-index:25]" variant="ghost" type="button" aria-label="Fechar menu" onClick={() => setNavOpen(false)} />
      ) : null}
      <aside className="[view-transition-name:zoot-wall] [background:var(--primary-700)] [color:var(--on-dark)] [padding:18px_12px_24px] [display:flex] [flex-direction:column] [gap:4px] [min-height:100vh] min-[761px]:max-[1023px]:[padding-inline:8px] max-[760px]:[position:fixed] max-[760px]:[z-index:30] max-[760px]:[inset:0_auto_0_0] max-[760px]:[width:min(280px,_88vw)] max-[760px]:[transform:translateX(-105%)] max-[760px]:[transition:transform_180ms_cubic-bezier(0.16,_1,_0.3,_1)] max-[760px]:group-data-[nav=open]:[transform:none] motion-reduce:[transition:none]">
        <div className="[display:flex] [gap:12px] [align-items:center] [color:#fff] [position:relative] [z-index:1] [&_b]:[display:block] [&_b]:[font-family:var(--display)] [&_b]:[font-weight:700] [&_b]:[font-size:17px] [&_b]:[letter-spacing:-0.02em] [&_b]:[line-height:1.1] [&_small]:[display:block] [&_small]:[margin-top:3px] [&_small]:[color:var(--on-dark-soft)] [&_small]:[font-size:12px] [padding:4px_8px_16px] [&_b]:[font-size:15px] min-[761px]:max-[1023px]:[&_span]:[position:absolute] min-[761px]:max-[1023px]:[&_span]:[width:1px] min-[761px]:max-[1023px]:[&_span]:[height:1px] min-[761px]:max-[1023px]:[&_span]:[overflow:hidden] min-[761px]:max-[1023px]:[&_span]:[clip:rect(0_0_0_0)] min-[761px]:max-[1023px]:[justify-content:center] min-[761px]:max-[1023px]:[padding-inline:0] max-[760px]:[&_span]:[position:static] max-[760px]:[&_span]:[width:auto] max-[760px]:[&_span]:[height:auto] max-[760px]:[&_span]:[overflow:visible] max-[760px]:[&_span]:[clip:auto]">
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
              <div className="[font:600_12px/1.3_var(--body)] [color:var(--on-dark-soft)] [padding:16px_12px_6px] min-[761px]:max-[1023px]:[position:absolute] min-[761px]:max-[1023px]:[width:1px] min-[761px]:max-[1023px]:[height:1px] min-[761px]:max-[1023px]:[overflow:hidden] min-[761px]:max-[1023px]:[clip:rect(0_0_0_0)] max-[760px]:[position:static] max-[760px]:[width:auto] max-[760px]:[height:auto] max-[760px]:[overflow:visible] max-[760px]:[clip:auto]">{group.label}</div>
              {group.items.map((item) => (
                <NavLink key={item.id} item={item} current={section} />
              ))}
            </div>
          ))}
          {!painelVisible && visibleGroups.length === 0 ? (
            <p className="[font:600_12px/1.3_var(--body)] [color:var(--on-dark-soft)] [padding:16px_12px_6px] min-[761px]:max-[1023px]:[position:absolute] min-[761px]:max-[1023px]:[width:1px] min-[761px]:max-[1023px]:[height:1px] min-[761px]:max-[1023px]:[overflow:hidden] min-[761px]:max-[1023px]:[clip:rect(0_0_0_0)] max-[760px]:[position:static] max-[760px]:[width:auto] max-[760px]:[height:auto] max-[760px]:[overflow:visible] max-[760px]:[clip:auto]">Nenhuma área com esse nome</p>
          ) : null}
        </nav>
      </aside>
      <div className="[min-width:0] [min-height:0] [height:100%] [display:flex] [flex-direction:column] [overflow:hidden]">
        <header className="[min-height:56px] [background:var(--surface)] [border-bottom:1px_solid_var(--line)] [display:flex] [align-items:center] [gap:16px] [padding:8px_24px] max-[760px]:[flex-wrap:wrap] max-[760px]:[padding-inline:12px]">
          <Button
            className="[display:none] max-[760px]:[display:inline-flex]"
            variant="outline"
            type="button"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            Menu
          </Button>
          <span className="[display:none] [align-items:center] [gap:8px] [color:var(--ink)] [font-family:var(--display)] [font-weight:700] [letter-spacing:-0.02em] max-[760px]:[display:flex]">
            <Mark size={28} />
            <b className="top-word">ZooTech</b>
          </span>
          <p className="[color:var(--muted)] [font-size:13px] [white-space:nowrap] [&_b]:[color:var(--ink)] [&_b]:[font-weight:600] max-[760px]:[display:none]">
            ZooTech / <b>{title}</b>
          </p>
          <form className="[flex:1] [min-width:180px] max-[760px]:[flex:1_1_100%] max-[760px]:[order:3] max-[760px]:[min-width:0]" role="search" onSubmit={(event) => event.preventDefault()}>
            <Label className="[position:absolute] [width:1px] [height:1px] [padding:0] [margin:-1px] [overflow:hidden] [clip:rect(0,_0,_0,_0)] [white-space:nowrap] [border:0]" htmlFor="busca-menu">
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
          <div className="[display:flex] [align-items:center] [gap:10px] [margin-left:auto]">
            <div className="[display:flex] [flex-direction:column] [align-items:flex-end] [font-size:13px] [&_a]:[color:inherit] [&_a]:[text-decoration:none] [&_a:hover_b]:underline [&_span]:[color:var(--muted)] [&_span]:[font-family:var(--mono)] [&_span]:[font-size:12px] max-[760px]:[display:none]">
              <Link href="/painel/perfil">
                <b>{nome}</b>
              </Link>
              <span>{cargo}</span>
            </div>
            <span className="[width:36px] [height:36px] [border-radius:50%] [background:var(--primary-50)] [color:var(--primary)] [display:grid] [place-items:center] [font:700_12px/1_var(--display)]" aria-hidden="true">
              {initials(nome)}
            </span>
            <Button variant="outline" type="button" onClick={leave}>
              Sair
            </Button>
          </div>
        </header>
        <main className="[padding:28px_24px_48px] [display:flex] [flex-direction:column] [gap:20px] [max-width:none] [flex:1] [min-height:0] [overflow:auto] [&_h1]:[margin:0] [&_h1]:[font-size:28px] [&_h2]:[margin:8px_0_0] [&_h2]:[font-size:20px] [&_h3]:[margin:0] [&_h3]:[font-size:17px] max-[760px]:[padding:20px_16px_40px]" id="conteudo">
          {allowed ? (
            (children ?? <EmptySection title={title} />)
          ) : (
            <section className="[&_h1]:[margin-bottom:8px]">
              <h1>{title}</h1>
              <p className="[color:var(--muted)] [max-width:62ch]">Esta seção não está disponível para a sua função.</p>
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
        <p className="[color:var(--muted)] [max-width:62ch]">
          Sessão de {nome}. Confirme o posto do turno antes de seguir para o plantel.
        </p>
      </div>
      <form className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" onSubmit={confirmPosto}>
        <fieldset className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="[font-size:13px] [font-weight:600]">Onde você está agora</legend>
          <RadioGroup
            className="[display:flex] [flex-wrap:wrap] [gap:8px] [&_label]:[min-height:40px] [&_label]:[border-radius:8px] [&_label]:[border:1px_solid_var(--line)] [&_label]:[background:var(--surface)] [&_label]:[padding:8px_14px] [&_label]:[font:600_14px/1_var(--body)] [&_label]:[cursor:pointer] [&_label]:[color:var(--ink)] [&_label]:[background:var(--primary-50)] [&_label]:[border-color:var(--primary)] [&_label]:[color:var(--primary-700)]"
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
                <RadioGroupItem id={`posto-${item}`} value={item} className="[position:absolute] [width:1px] [height:1px] [padding:0] [margin:-1px] [overflow:hidden] [clip:rect(0,_0,_0,_0)] [white-space:nowrap] [border:0]" />
                {item}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
        <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
          <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">O posto fica guardado neste computador.</p>
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
    <section className="[&_h1]:[margin-bottom:8px]">
      <h1>{title}</h1>
      <p className="[color:var(--muted)] [max-width:62ch]">Nenhum registro aberto nesta estação.</p>
    </section>
  );
}

function NavLink({ item, current }: { item: NavItem; current: string }) {
  return (
    <Link className="[min-height:40px] [padding:8px_12px] [border-radius:8px] [color:var(--on-dark)] [text-decoration:none] [font-weight:500] [display:flex] [align-items:center] [gap:10px] [&_svg]:[display:block] [&_svg]:[flex:none] aria-[current=page]:[background:rgba(255,_255,_255,_0.12)] aria-[current=page]:[color:#fff] hover:[color:#fff] min-[761px]:max-[1023px]:[&_span]:[position:absolute] min-[761px]:max-[1023px]:[&_span]:[width:1px] min-[761px]:max-[1023px]:[&_span]:[height:1px] min-[761px]:max-[1023px]:[&_span]:[overflow:hidden] min-[761px]:max-[1023px]:[&_span]:[clip:rect(0_0_0_0)] min-[761px]:max-[1023px]:[justify-content:center] min-[761px]:max-[1023px]:[padding-inline:0] min-[761px]:max-[1023px]:[&_svg]:[display:block] max-[760px]:[&_span]:[position:static] max-[760px]:[&_span]:[width:auto] max-[760px]:[&_span]:[height:auto] max-[760px]:[&_span]:[overflow:visible] max-[760px]:[&_span]:[clip:auto] max-[760px]:[justify-content:flex-start] max-[760px]:[padding-inline:12px] max-[760px]:[&_svg]:[display:none]" href={item.href} aria-current={item.id === current ? "page" : undefined}>
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
