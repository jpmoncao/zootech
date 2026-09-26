"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Animal } from "@/lib/api";
import { IndiceFicha } from "./indice-ficha";

export function AlertasFicha({ animal, podeEditar, incluiRevogacao }: { animal: Animal; podeEditar: boolean; incluiRevogacao: boolean }) {
  return (
    <aside className="sticky top-4 flex max-h-[calc(100dvh-6rem)] flex-col gap-4 self-start overflow-auto overscroll-contain [grid-column:2] [grid-row:1] max-[760px]:order-2 max-[760px]:static max-[760px]:max-h-none max-[760px]:[grid-column:auto] max-[760px]:[grid-row:auto]">
      <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [&_h2]:[margin-top:0]" aria-label="Alertas e pendências">
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [&_h2]:[margin:0] [&_h2]:[font-size:17px] [&>svg]:[width:22px] [&>svg]:[height:22px] [&>svg]:[color:var(--primary)] [&_svg]:[color:var(--primary)]">
          <div>
            <h2>Alertas e pendências</h2>
            <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Campos que afetam triagem, localização e acompanhamento.</p>
          </div>
          <AlertCircle aria-hidden="true" />
        </div>
        {animal.alertas.length > 0 ? (
          <ul className="[margin:0] [padding:0] [list-style:none] [display:flex] [flex-direction:column] [gap:8px] [&_li]:[border:1px_solid_#f1d5a6] [&_li]:[border-radius:8px] [&_li]:[background:var(--warn-50)] [&_li]:[color:#6b3f00] [&_li]:[padding:10px_12px] [&_li]:[font-weight:600] [&_li]:[display:flex] [&_li]:items-center [&_li]:[justify-content:space-between] [&_li]:[gap:10px] max-[760px]:[&_li]:[align-items:flex-start] max-[760px]:[&_li]:[flex-direction:column] max-[760px]:[&>li a]:[width:100%] max-[760px]:[&>li button]:[width:100%]">
            {animal.alertas.map((alerta) => (
              <li key={`${alerta.tipo}-${alerta.mensagem}`}>
                <span>{alerta.mensagem}</span>
                <AlertAction tipo={alerta.tipo} disabled={!podeEditar} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="[border:1px_solid_#c8e3cf] [border-radius:8px] [background:var(--ok-50)] [color:var(--ok)] [padding:12px] [margin:0] [font-weight:700]">Nenhuma pendência registrada para esta ficha.</p>
        )}
      </section>
      <IndiceFicha animal={animal} incluiRevogacao={incluiRevogacao} />
    </aside>
  );
}

function AlertAction({ tipo, disabled }: { tipo: string; disabled: boolean }) {
  let target = "";
  switch (tipo) {
    case "sem_baia":
      target = "#baia-ficha";
      break;
    case "sem_castracao":
      target = "#castracoes-ficha";
      break;
    default:
      target = "#dados-ficha";
      break;
  }

  let label = "";
  switch (tipo) {
    case "sem_baia":
      label = "Resolver na baia";
      break;
    case "sem_castracao":
      label = "Registrar castração";
      break;
    default:
      label = "Editar dados";
      break;
  }

  return (
    <Button asChild variant="outline" disabled={disabled}>
      <a href={target}>{label}</a>
    </Button>
  );
}
