"use client";

import { AlertTriangle, CalendarDays, Cat, Dog, MapPin, Scale } from "lucide-react";
import { AnimalPhoto } from "@/components/animal-photo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Animal } from "@/lib/api";
import { especieLabel, formatDateOnly, QuickFact, sexoLabel, situacaoLabel } from "./ficha-ui";

export function ResumoFicha({ animal }: { animal: Animal }) {
  const foto = animal.fotos.find((item) => item.identificacao) ?? animal.fotos[0];
  const Icon = animal.especie === "cao" ? Dog : Cat;

  return (
    <section id="resumo-ficha" className="@container scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" aria-label="Resumo do animal">
      <div className="grid [grid-template-columns:132px_minmax(0,_1fr)] items-center gap-4 [&_h2]:[margin:10px_0_2px] [&_h2]:[font-size:24px] max-[760px]:grid-cols-[1fr]">
        <div className="[&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [width:132px] [aspect-ratio:1_/_1] [border-radius:8px] [background:var(--primary-50)] [color:var(--primary)] grid [place-items:center] [overflow:hidden] [&_svg]:[width:48px] [&_svg]:[height:48px] max-[760px]:[width:min(220px,_100%)]">
          {foto ? <AnimalPhoto foto={foto} alt={`Foto de ${animal.nome}`} /> : <Icon aria-hidden="true" />}
        </div>
        <div className="[min-width:0] [&_p]:[margin:0] [&_p]:[color:var(--muted)]">
          <div className="[display:flex] items-center [gap:8px] [flex-wrap:wrap]">
            <span className="[min-height:28px] [border-radius:999px] [padding:6px_10px] [display:inline-flex] items-center [justify-content:center] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[estado=ativa]:[background:var(--ok-50)] data-[estado=ativa]:[color:var(--ok)] data-[estado=em\_higienizacao]:[background:var(--info-50)] data-[estado=em\_higienizacao]:[color:var(--info)] data-[estado=interditada]:[background:var(--crit-50)] data-[estado=interditada]:[color:var(--crit)] data-[estado=inativa]:[background:var(--bg)] data-[estado=inativa]:[color:var(--muted)] data-[estado=inativa]:[border:1px_solid_var(--line)] data-[estado=em\_tratamento]:[background:var(--info-50)] data-[estado=em\_tratamento]:[color:var(--info)] data-[estado=em\_quarentena\_observacao]:[background:var(--info-50)] data-[estado=em\_quarentena\_observacao]:[color:var(--info)] data-[estado=saudavel]:[background:var(--ok-50)] data-[estado=saudavel]:[color:var(--ok)] data-[estado=adotado]:[background:var(--primary-50)] data-[estado=adotado]:[color:var(--primary-700)] data-[estado=obito]:[background:var(--bg)] data-[estado=obito]:[color:var(--muted)] data-[estado=obito]:[border:1px_solid_var(--line)] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]" data-estado={animal.situacao}>
              {situacaoLabel[animal.situacao]}
            </span>
            {animal.emIsolamento ? <span className="[min-height:28px] [border-radius:999px] [padding:6px_10px] [display:inline-flex] items-center [justify-content:center] [width:fit-content] [font:700_12px/1_var(--body)] [white-space:nowrap] data-[estado=ativa]:[background:var(--ok-50)] data-[estado=ativa]:[color:var(--ok)] data-[estado=em\_higienizacao]:[background:var(--info-50)] data-[estado=em\_higienizacao]:[color:var(--info)] data-[estado=interditada]:[background:var(--crit-50)] data-[estado=interditada]:[color:var(--crit)] data-[estado=inativa]:[background:var(--bg)] data-[estado=inativa]:[color:var(--muted)] data-[estado=inativa]:[border:1px_solid_var(--line)] data-[estado=em\_tratamento]:[background:var(--info-50)] data-[estado=em\_tratamento]:[color:var(--info)] data-[estado=em\_quarentena\_observacao]:[background:var(--info-50)] data-[estado=em\_quarentena\_observacao]:[color:var(--info)] data-[estado=saudavel]:[background:var(--ok-50)] data-[estado=saudavel]:[color:var(--ok)] data-[estado=adotado]:[background:var(--primary-50)] data-[estado=adotado]:[color:var(--primary-700)] data-[estado=obito]:[background:var(--bg)] data-[estado=obito]:[color:var(--muted)] data-[estado=obito]:[border:1px_solid_var(--line)] max-[760px]:[grid-column:2] max-[760px]:[align-items:flex-start] max-[760px]:[text-align:left]" data-estado="em_quarentena_observacao">Isolamento</span> : null}
          </div>
          <h2>{animal.nome}</h2>
          <p className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]">{animal.numeroRegistro}</p>
          <p>
            {animal.raca?.nome ?? "Raça não informada"} · {especieLabel[animal.especie]} · {sexoLabel[animal.sexo]}
          </p>
        </div>
      </div>
      {animal.somenteLeitura ? (
        <Alert>
          <AlertDescription>
            Animal em estado terminal. A ficha está bloqueada para mutações e permanece disponível para consulta.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-[18px] grid grid-cols-1 gap-2.5 @min-[22rem]:grid-cols-2 @min-[40rem]:grid-cols-4" aria-label="Indicadores da ficha">
        <QuickFact icon={<MapPin aria-hidden="true" />} label="Baia" value={animal.baia?.codigo ?? "Sem baia"} tone={animal.baia ? "ok" : "warn"} />
        <QuickFact icon={<Scale aria-hidden="true" />} label="Peso" value={animal.pesoAtualKg ? `${animal.pesoAtualKg} kg` : "Não informado"} tone={animal.pesoAtualKg ? "info" : "muted"} />
        <QuickFact icon={<AlertTriangle aria-hidden="true" />} label="Pendências" value={String(animal.alertas.length)} tone={animal.alertas.length > 0 ? "warn" : "ok"} />
        <QuickFact icon={<CalendarDays aria-hidden="true" />} label="Acolhimento" value={animal.dataAcolhimento ? formatDateOnly(animal.dataAcolhimento) : "Não informado"} tone="muted" />
      </div>
    </section>
  );
}
