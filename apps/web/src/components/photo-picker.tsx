"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACCEPT = "image/jpeg,image/png,image/webp";

export function PhotoPicker({
  disabled,
  remaining,
  label = "Adicionar fotos",
  hint = "JPG, PNG ou WebP. Recorte em quadrado antes de enviar.",
  onPicked,
}: {
  disabled?: boolean;
  remaining: number;
  label?: string;
  hint?: string;
  onPicked: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const current = queue[0] ?? null;
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  function onFiles(list: FileList | null) {
    if (!list?.length || remaining <= 0) return;
    const files = Array.from(list).slice(0, remaining);
    const [first] = files;
    if (!first) return;
    if (preview) URL.revokeObjectURL(preview);
    setQueue(files);
    setPreview(URL.createObjectURL(first));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function closeQueue() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setQueue([]);
    setWorking(false);
  }

  async function confirmCrop() {
    if (!current || !preview || !area) return;
    setWorking(true);
    try {
      const cropped = await cropToFile(preview, area, current.name);
      onPicked([cropped]);
      const [, ...rest] = queue;
      URL.revokeObjectURL(preview);
      if (rest[0]) {
        setQueue(rest);
        setPreview(URL.createObjectURL(rest[0]));
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setArea(null);
      } else {
        setQueue([]);
        setPreview(null);
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="photo-upload">
        <ImagePlus aria-hidden="true" />
        <div>
          <p className="photo-upload-title">{label}</p>
          <p className="hint">{hint}</p>
        </div>
        <Button type="button" variant="outline" disabled={disabled || remaining <= 0} onClick={openPicker}>
          Adicionar fotos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          disabled={disabled || remaining <= 0}
          onChange={(event) => onFiles(event.target.files)}
        />
      </div>

      <Dialog open={Boolean(current && preview)} onOpenChange={(open) => (!open ? closeQueue() : undefined)}>
        <DialogContent className="photo-crop-dialog z-[70]" overlayClassName="z-[70]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Recortar foto</DialogTitle>
            <DialogDescription>
              Ajuste o quadrado. {queue.length > 1 ? `${queue.length} fotos na fila.` : "Uma foto para recortar."}
            </DialogDescription>
          </DialogHeader>
          <div className="photo-crop-stage">
            {preview ? (
              <Cropper
                image={preview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedAreaPixels) => setArea(croppedAreaPixels)}
              />
            ) : null}
          </div>
          <label className="photo-crop-zoom">
            Zoom
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeQueue} disabled={working}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void confirmCrop()} disabled={working || !area}>
              Usar recorte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function cropToFile(imageSrc: string, area: Area, fileName: string) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível recortar a foto.");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Falha ao gerar o recorte."))), "image/jpeg", 0.92);
  });
  const base = fileName.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Não foi possível ler a imagem.")));
    image.src = src;
  });
}
