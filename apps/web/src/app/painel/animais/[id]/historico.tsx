import { ClipboardList } from "lucide-react";
import type { EventoAnimal } from "@/lib/api";
import { eventoVisual, type TomEventoAnimal } from "@/lib/evento-animal";
import { SectionHeader } from "./ficha-ui";

const timelineTone: Record<TomEventoAnimal, string> = {
  ok: "border-line border-l-ok bg-ok-50",
  info: "border-line border-l-info bg-info-50",
  crit: "border-line border-l-crit bg-crit-50",
  muted: "border-line border-l-muted-foreground bg-background",
  violet: "border-line border-l-violet bg-violet-50",
};

const timelineIconTone: Record<TomEventoAnimal, string> = {
  ok: "bg-ok text-white",
  info: "bg-info text-white",
  crit: "bg-crit text-white",
  muted: "bg-muted-foreground text-white",
  violet: "bg-violet text-white",
};

const formatDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function HistoricoFicha({ eventos }: { eventos: EventoAnimal[] }) {
  return (
    <section id="historico-ficha" className="scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)]" aria-label="Histórico do animal">
      <SectionHeader icon={<ClipboardList aria-hidden="true" />} title="Histórico" note={`${eventos.length} evento(s) do animal`} />
      <HistoricoAnimal eventos={eventos} />
    </section>
  );
}

export function HistoricoAnimal({ eventos }: { eventos: EventoAnimal[] }) {
  if (eventos.length === 0) {
    return <p className="text-sm wrap-break-word text-muted-foreground">Nenhum evento registrado no histórico do animal.</p>;
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {eventos.map((evento) => {
        const visual = eventoVisual(evento);
        const Icon = visual.icon;
        return (
          <li className={`flex items-start gap-3 rounded-lg border border-l-4 p-3 ${timelineTone[visual.tone]}`} key={evento.id}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${timelineIconTone[visual.tone]}`}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <strong className="text-sm font-semibold text-ink">{visual.label}</strong>
                <span className="text-xs text-muted-foreground">{formatDate.format(new Date(evento.createdAt))}</span>
              </div>
              <p className="text-xs text-muted-foreground">{evento.usuario?.nome ?? "Sistema"}</p>
              <small className="text-sm text-ink wrap-break-word">{evento.resumo}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
