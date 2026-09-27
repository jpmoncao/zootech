"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type SignaturePadProps = {
  onChange: (signature: File | null) => void;
  disabled?: boolean;
};

const WIDTH = 900;
const HEIGHT = 300;

export function SignaturePad({ onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingPointer = useRef<number | null>(null);
  const hasInk = useRef(false);
  const [signed, setSigned] = useState(false);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setSigned(false);
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#135E63";
    context.lineWidth = 4;
  }, []);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || drawingPointer.current !== null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointer.current = event.pointerId;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFrom(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.1, point.y + 0.1);
    context.stroke();
    hasInk.current = true;
    setSigned(true);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || drawingPointer.current !== event.pointerId) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFrom(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const finish = async (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointer.current !== event.pointerId) return;
    drawingPointer.current = null;
    if (!hasInk.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) onChange(new File([blob], "assinatura.png", { type: "image/png" }));
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border border-input bg-white">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Desenhe a assinatura do tutor nesta área"
          className={`block h-36 w-full touch-none ${disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"}`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {signed ? "Assinatura pronta para envio." : "Assinatura vazia. Peça ao tutor para assinar com o dedo ou mouse."}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={disabled || !signed} onClick={clear}>
          Limpar assinatura
        </Button>
      </div>
    </div>
  );
}
