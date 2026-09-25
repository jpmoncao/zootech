"use client";

import { useEffect, useState } from "react";
import { carregarArquivoFoto, type FotoAnimal } from "@/lib/api";

export function AnimalPhoto({
  foto,
  alt,
  className,
}: {
  foto: Pick<FotoAnimal, "id" | "url">;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void carregarArquivoFoto({ url: foto.url })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [foto.url]);

  if (!src) return null;
  return <img className={className} src={src} alt={alt} />;
}
