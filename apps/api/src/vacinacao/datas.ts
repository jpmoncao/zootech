const DIA_MS = 86_400_000;
const TIMEZONE = process.env.ZOOTECH_TIMEZONE ?? "America/Sao_Paulo";

const formatoLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Datas civis (coluna DATE) viajam como Date à meia-noite UTC, para não escorregarem um dia na conversão.
export function parseDataCivil(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor ? null : data;
}

export function formatDataCivil(data: Date | null | undefined): string | null {
  return data ? data.toISOString().slice(0, 10) : null;
}

export function dataCivilLocal(instante: Date): Date {
  return new Date(`${formatoLocal.format(instante)}T00:00:00.000Z`);
}

export function hojeCivil(): Date {
  return dataCivilLocal(new Date());
}

export function addDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * DIA_MS);
}

export function diffDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DIA_MS);
}

export function mesmaData(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.getTime() === b.getTime();
}

// Datas do animal (acolhimento, nascimento) chegam de <input type="date"> e ficam à meia-noite UTC:
// já são datas civis. Converter pelo fuso local as empurraria para o dia anterior.
export function dataCivilUtc(instante: Date): Date {
  return new Date(`${instante.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
