"use client";

import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { AnimalPhoto } from "@/components/animal-photo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PhotoPicker } from "@/components/photo-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./ficha-ui";
import { adicionarFotoAnimal, ApiError, removerFotoAnimal, type Animal } from "@/lib/api";

const MAX_FOTOS = 10;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GaleriaFicha({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  return (
    <section id="galeria-ficha" className="scroll-mt-4 [background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] gap-4 [box-shadow:var(--shadow)] [grid-column:1] max-[760px]:[grid-column:auto]" aria-label="Galeria">
      <SectionHeader icon={<ImagePlus aria-hidden="true" />} title="Galeria" note={`${animal.fotos.length}/${MAX_FOTOS} fotos`} />
      <Galeria animal={animal} disabled={disabled} onChanged={onChanged} />
    </section>
  );
}

function Galeria({ animal, disabled, onChanged }: { animal: Animal; disabled: boolean; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<number | null>(null);

  async function add(files: File[]) {
    if (!files.length || disabled) return;
    const vagas = MAX_FOTOS - animal.fotos.length;
    if (vagas <= 0) {
      setErro("A galeria aceita no máximo 10 fotos.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      for (const foto of files.slice(0, vagas)) {
        await adicionarFotoAnimal(animal.id, foto);
      }
      await onChanged();
      if (files.length > vagas) setErro("Algumas fotos não foram incluídas porque o limite é 10.");
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível adicionar a foto.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (disabled || removeId == null) return;
    const fotoId = removeId;
    setRemoveId(null);
    setSaving(true);
    setErro(null);
    try {
      await removerFotoAnimal(animal.id, fotoId);
      await onChanged();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível remover a foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="[display:flex] [flex-direction:column] [gap:14px]">
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      {!disabled ? (
        <PhotoPicker remaining={MAX_FOTOS - animal.fotos.length} disabled={saving} onPicked={(files) => void add(files)} />
      ) : null}
      {animal.fotos.length > 0 ? (
        <div className="grid [grid-template-columns:repeat(auto-fill,_minmax(124px,_1fr))] [gap:10px] [&_figure]:[margin:0] [&_figure]:[border:1px_solid_var(--line)] [&_figure]:[border-radius:8px] [&_figure]:[padding:8px] [&_figure]:[display:flex] [&_figure]:[flex-direction:column] [&_figure]:[gap:8px] [&_figure]:[background:#fff] [&_img]:[width:100%] [&_img]:[aspect-ratio:1_/_1] [&_img]:[object-fit:cover] [&_img]:[border-radius:6px] [&_img]:[background:var(--bg)] [&_figcaption]:[color:var(--muted)] [&_figcaption]:[font-size:12px] [&_figcaption]:[overflow-wrap:anywhere] [grid-template-columns:repeat(auto-fill,_minmax(150px,_1fr))]">
          {animal.fotos.map((foto) => (
            <figure key={foto.id}>
              <AnimalPhoto foto={foto} alt={`Foto ${foto.ordem + 1} de ${animal.nome}`} />
              <figcaption>
                {foto.identificacao ? "Identificação" : "Galeria"} · {formatBytes(foto.tamanhoBytes)}
              </figcaption>
              {!disabled ? (
                <Button type="button" variant="outline" disabled={saving} onClick={() => setRemoveId(foto.id)}>
                  <Trash2 aria-hidden="true" />
                  Remover
                </Button>
              ) : null}
            </figure>
          ))}
        </div>
      ) : (
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Nenhuma foto registrada.</p>
      )}
      <ConfirmDialog
        open={removeId != null}
        title="Remover foto"
        description="Remover esta foto da galeria?"
        confirmLabel="Remover"
        onOpenChange={(open) => { if (!open) setRemoveId(null); }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
