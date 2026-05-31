import {
  ALGORITHM_VERSION,
  type ConfluenceSignalRow,
  type EstadoSenal,
  type Timeframe,
  type TipoSenal,
  type Tendencia
} from "../indicators/types";
import { evaluateNewsImpact } from "./newsImpactEngine";
import type { AnalyzedNewsSource, NewsImpactResponse, NewsVerdict } from "./types";

interface BuildNewsRowsInput {
  ticket: string;
  timeframe: Timeframe;
  precio: number;
  sourceInputHash: string;
  previousRows?: ConfluenceSignalRow[];
  now?: Date;
  limit?: number;
}

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400
};

function vigenciaIso(now: Date, timeframe: Timeframe): string {
  const seconds = TIMEFRAME_SECONDS[timeframe] * 5;
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

function tipoSenalFromVerdict(verdict: NewsVerdict): TipoSenal {
  if (verdict === "BUY") return "CALL";
  if (verdict === "SELL") return "PUT";
  return "HOLD";
}

function tendenciaFromScore(score: number): Tendencia {
  if (score > 0.12) return "ALCISTA";
  if (score < -0.12) return "BAJISTA";
  return "LATERAL";
}

function estadoFromArticle(article: AnalyzedNewsSource): EstadoSenal {
  return article.credibilityScore > 0 ? "ACTIVA" : "DEGRADADA";
}

function publishedDate(article: AnalyzedNewsSource, fallback: Date): string {
  const date = new Date(article.publishedAt);
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : fallback.toISOString().slice(0, 10);
}

function shortProvider(provider: string): string {
  const clean = provider.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (clean.includes("yahoo")) return "YAHOO";
  if (clean.includes("finnhub")) return "FINNHUB";
  if (clean.includes("newsapi")) return "NEWSAPI";
  if (clean.includes("polygon")) return "POLYGON";
  if (clean.includes("alpha")) return "ALPHA";
  return provider.slice(0, 10).toUpperCase() || "NEWS";
}

function deltaForArticle(
  previousRows: ConfluenceSignalRow[] | undefined,
  article: AnalyzedNewsSource,
  tipoSenal: TipoSenal
) {
  const prev = previousRows?.find((row) => row.core === "A_NOTICIAS" && row.evidencia_refs?.includes(article.url ?? article.id));
  if (!prev) return "NUEVA" as const;
  return prev.tipoSenal === tipoSenal ? "CONFIRMADA" as const : "INVERTIDA" as const;
}

function buildRowFromArticle(
  input: BuildNewsRowsInput,
  article: AnalyzedNewsSource,
  index: number,
  computedAt: Date,
  aggregate: NewsImpactResponse
): ConfluenceSignalRow {
  const tipoSenal = tipoSenalFromVerdict(article.verdict);
  const estado = estadoFromArticle(article);
  const score = Number(Math.max(-1, Math.min(1, article.sentimentScore)).toFixed(3));
  const peso = Number(Math.max(0, Math.min(1, article.confidence * article.credibilityScore)).toFixed(3));
  const evidenceRef = article.url ?? `news:${article.id}`;

  return {
    ticket: input.ticket,
    core: "A_NOTICIAS",
    subCore: `${shortProvider(article.provider)} #${index + 1}`,
    precio: input.precio,
    tipoSenal,
    fecha: publishedDate(article, computedAt),
    timeframe: input.timeframe,
    tendencia: tendenciaFromScore(score),
    score,
    peso,
    invertir: estado === "ACTIVA" && tipoSenal !== "HOLD" && article.confidence >= 0.35,
    estado,
    vigencia: vigenciaIso(computedAt, input.timeframe),
    fuente: article.provider,
    evidencia_refs: [evidenceRef],
    ia_revisada: false,
    delta_vs_anterior: deltaForArticle(input.previousRows, article, tipoSenal),
    observacion: {
      objetivo: `Evaluar noticia real ${index + 1} de ${aggregate.articles.length} para ${input.ticket}.`,
      senal: `${article.verdict} convertido a ${tipoSenal} con confianza ${(article.confidence * 100).toFixed(0)}%.`,
      explicacion: `${article.title}. ${article.summary}. ${article.rationale}`,
      metricas: {
        SENTIMIENTO: article.sentimentScore,
        CONFIANZA: article.confidence,
        CREDIBILIDAD: article.credibilityScore,
        PROVEEDOR: article.provider
      }
    },
    algorithm_version: ALGORITHM_VERSION,
    computed_at: computedAt.toISOString(),
    source_input_hash: `${input.sourceInputHash}:news:${article.id}`
  };
}

/**
 * Construye filas reales del core A_NOTICIAS para la tabla canonica.
 * A diferencia del stub anterior, devuelve 1 fila por cada noticia real recibida.
 */
export async function buildNewsConfluenceRows(input: BuildNewsRowsInput): Promise<ConfluenceSignalRow[]> {
  const computedAt = input.now ?? new Date();
  const limit = Math.max(1, Math.min(20, Math.floor(input.limit ?? 8)));
  const aggregate = await evaluateNewsImpact({ symbol: input.ticket, limit, includeFallback: false });

  return aggregate.articles.map((article, index) =>
    buildRowFromArticle(input, article, index, computedAt, aggregate)
  );
}
