"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "@/components/shell";
import { canManageAnimais } from "@/lib/access";
import { ApiError, getCurrentUser, listarBaias, obterAnimal, type Animal, type Baia } from "@/lib/api";
import { AlertasFicha } from "./alertas-card";
import { BaiaFicha } from "./baia-card";
import { CastracoesCard } from "./castracoes-card";
import { DadosFicha } from "./dados-ficha";
import { ExamesFicha } from "./exames-card";
import { GaleriaFicha } from "./galeria-card";
import { HistoricoFicha } from "./historico";
import { ObservacoesFicha } from "./observacoes-card";
import { PesoFicha } from "./peso-card";
import { ResumoFicha } from "./resumo-card";
import { RevogarFicha } from "./revogar-card";

export default function Page() {
  return (
    <Shell section="animais" title="Ficha do animal">
      <FichaAnimal />
    </Shell>
  );
}

function FichaAnimal() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = useMemo(() => idAnimal(params.id), [params.id]);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [baias, setBaias] = useState<Baia[]>([]);
  const [loading, setLoading] = useState(id != null);
  const [erro, setErro] = useState<string | null>(id == null ? "Identificador de animal inválido." : null);
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const perfil = getCurrentUser()?.perfilAcesso ?? null;
  const podeEditar = Boolean(perfil && canManageAnimais(perfil));
  const podeRevogar = perfil === "coordenacao";

  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    setLoading(true);
    setErro(null);
    Promise.all([obterAnimal(id), listarBaias()])
      .then(([animalData, baiasData]) => {
        if (!cancelled) {
          setAnimal(animalData);
          setBaias(baiasData);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAnimal(null);
        setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a ficha do animal.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function refresh() {
    if (id == null) return;
    setLoading(true);
    setErro(null);
    try {
      const [animalData, baiasData] = await Promise.all([obterAnimal(id), listarBaias()]);
      setAnimal(animalData);
      setBaias(baiasData);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a ficha do animal.");
      setAnimal(null);
    } finally {
      setLoading(false);
    }
  }

  async function reloadAfterChange() {
    if (id == null) return;
    const [animalData, baiasData] = await Promise.all([obterAnimal(id), listarBaias()]);
    setAnimal(animalData);
    setBaias(baiasData);
    setDirty(false);
  }

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement)) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const next = new URL(target.href, window.location.href);
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${next.pathname}${next.search}${next.hash}`);
      setLeaveOpen(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  function confirmarSaida() {
    const href = pendingHref;
    setLeaveOpen(false);
    setPendingHref(null);
    setDirty(false);
    if (href) router.push(href);
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:20px] [width:100%]">
      <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] gap-4 max-[760px]:[flex-direction:column]">
        <div>
          <Button asChild variant="link" className="[width:fit-content] [min-height:34px] [padding-inline:0]">
            <Link href="/painel/animais">
              <ArrowLeft aria-hidden="true" />
              Voltar para animais
            </Link>
          </Button>
          <h1>{animal?.nome ?? "Ficha do animal"}</h1>
          <p className="[color:var(--muted)] [max-width:62ch]">Identificação, pendências, localização e histórico do animal.</p>
        </div>
        <Button variant="outline" type="button" onClick={() => void refresh()} disabled={id == null || loading}>
          <RefreshCw aria-hidden="true" />
          Atualizar
        </Button>
      </div>

      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <FichaSkeleton /> : null}

      {!loading && animal ? (
        <Ficha
          animal={animal}
          baias={baias}
          podeEditar={podeEditar && !animal.somenteLeitura}
          podeRevogar={podeRevogar}
          onChanged={reloadAfterChange}
          onDirtyChange={setDirty}
        />
      ) : null}
      <ConfirmDialog
        open={leaveOpen}
        title="Descartar alterações?"
        description="Há um rascunho de alterações na ficha. Se sair agora, essas alterações serão perdidas."
        confirmLabel="Descartar e sair"
        confirmVariant="default"
        onOpenChange={setLeaveOpen}
        onConfirm={confirmarSaida}
      />
    </div>
  );
}

function Ficha({
  animal,
  baias,
  podeEditar,
  podeRevogar,
  onChanged,
  onDirtyChange,
}: {
  animal: Animal;
  baias: Baia[];
  podeEditar: boolean;
  podeRevogar: boolean;
  onChanged: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid [grid-template-columns:minmax(0,_1fr)_minmax(300px,_0.42fr)] [align-items:start] gap-4 max-[760px]:grid-cols-[1fr]">
        <div className="flex min-w-0 flex-col gap-4 [grid-column:1] [grid-row:1] max-[760px]:contents">
          <div className="max-[760px]:order-1">
            <ResumoFicha animal={animal} />
          </div>
          <div className="flex flex-col gap-4 max-[760px]:order-3">
            <DadosFicha animal={animal} disabled={!podeEditar} onChanged={onChanged} onDirtyChange={onDirtyChange} />
            <GaleriaFicha animal={animal} disabled={!podeEditar} onChanged={onChanged} />
            <BaiaFicha animal={animal} baias={baias} disabled={!podeEditar} onChanged={onChanged} />
            <CastracoesCard animal={animal} onChanged={onChanged} />
            <PesoFicha animal={animal} disabled={!podeEditar} onChanged={onChanged} />
            <ObservacoesFicha animal={animal} disabled={!podeEditar} onChanged={onChanged} />
            <ExamesFicha animal={animal} disabled={!podeEditar} onChanged={onChanged} />
            {animal.somenteLeitura && podeRevogar ? <RevogarFicha animal={animal} onChanged={onChanged} /> : null}
          </div>
        </div>
        <AlertasFicha animal={animal} podeEditar={podeEditar} incluiRevogacao={animal.somenteLeitura && podeRevogar} />
      </div>
      <HistoricoFicha eventos={animal.eventos ?? []} />
    </div>
  );
}

function FichaSkeleton() {
  return (
    <div className="grid [grid-template-columns:minmax(0,_1fr)_minmax(300px,_0.42fr)] [align-items:start] gap-4 max-[760px]:grid-cols-[1fr]" aria-label="Carregando ficha">
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]">
        <div className="grid [grid-template-columns:132px_minmax(0,_1fr)] items-center gap-4 [&_h2]:[margin:10px_0_2px] [&_h2]:[font-size:24px] max-[760px]:grid-cols-[1fr]">
          <Skeleton className="[&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [width:132px] [aspect-ratio:1_/_1] [border-radius:8px] [background:var(--primary-50)] [color:var(--primary)] grid [place-items:center] [overflow:hidden] [&_svg]:[width:48px] [&_svg]:[height:48px] max-[760px]:[width:min(220px,_100%)]" />
          <div className="[display:flex] [flex-direction:column] [gap:12px]">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </section>
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)]">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-20 w-full" />
      </section>
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)]">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-48 w-full" />
      </section>
    </div>
  );
}

function idAnimal(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  return Number(value);
}
