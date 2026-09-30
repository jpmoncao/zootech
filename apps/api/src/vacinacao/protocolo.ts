import { addDias, mesmaData } from "./datas";

// Cálculo do esquema vacinal. Vive aqui, e não dentro de um service, porque tanto a API de
// vacinação quanto os alertas da ficha do animal precisam da mesma resposta para "qual é a
// próxima dose". Duplicar isso nos dois lugares seria garantia de divergência.

export type EsquemaProtocolo = {
  dosesPrevistas: number;
  intervaloDosesDias: number | null;
  revacinacaoDias: number | null;
};

export type AplicacaoDatada = {
  numeroDose: number;
  dataAplicacao: Date;
};

export type AplicacaoComProxima = AplicacaoDatada & {
  dataProximaDose: Date | null;
  dataProximaDoseCalculada: Date | null;
};

// Última aplicação por data; empate pela maior dose. É a base do intervalo mínimo.
export function ultimaAplicacao<T extends AplicacaoDatada>(ativas: T[]): T | null {
  let ultima: T | null = null;
  for (const aplicacao of ativas) {
    if (
      !ultima ||
      aplicacao.dataAplicacao > ultima.dataAplicacao ||
      (mesmaData(aplicacao.dataAplicacao, ultima.dataAplicacao) && aplicacao.numeroDose > ultima.numeroDose)
    ) {
      ultima = aplicacao;
    }
  }
  return ultima;
}

// Esquema em curso usa o intervalo entre doses; esquema fechado usa a revacinação.
// Sem revacinação, um esquema fechado não gera próxima dose.
export function calcularProximaDose(esquema: EsquemaProtocolo, totalAtivas: number, base: Date): Date | null {
  if (totalAtivas < esquema.dosesPrevistas) {
    return esquema.intervaloDosesDias === null ? null : addDias(base, esquema.intervaloDosesDias);
  }
  return esquema.revacinacaoDias === null ? null : addDias(base, esquema.revacinacaoDias);
}

export function calcularDataMinima<T extends AplicacaoDatada>(esquema: EsquemaProtocolo, ativas: T[]): Date | null {
  const ultima = ultimaAplicacao(ativas);
  return ultima ? calcularProximaDose(esquema, ativas.length, ultima.dataAplicacao) : null;
}

// Data editada pela equipe vale; sem edição, a próxima dose é o mínimo calculado agora,
// o que mantém o cálculo correto depois de anular uma dose do meio.
export function resolverProximaDose<T extends AplicacaoComProxima>(esquema: EsquemaProtocolo, ativas: T[]): Date | null {
  const ultima = ultimaAplicacao(ativas);
  if (!ultima) return null;
  const editada = !mesmaData(ultima.dataProximaDose, ultima.dataProximaDoseCalculada);
  return editada ? ultima.dataProximaDose : calcularDataMinima(esquema, ativas);
}

// Menor número de dose livre entre as aplicações ativas. Sem anulação é "doses aplicadas + 1";
// com uma dose do meio anulada, reocupa a lacuna em vez de colidir com a dose seguinte.
export function proximoNumeroDose(ativas: AplicacaoDatada[]): number {
  const usados = new Set(ativas.map((aplicacao) => aplicacao.numeroDose));
  let numero = 1;
  while (usados.has(numero)) numero += 1;
  return numero;
}
