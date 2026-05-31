import type { NewsAnalysisAggregate, NewsImpactResponse, NewsVerdict } from "./types";

function actionFromVerdict(verdict: NewsVerdict): string {
  if (verdict === "BUY") return "vigilar entrada alcista solo con confirmación técnica";
  if (verdict === "SELL") return "reducir exposición o esperar estabilización";
  return "mantener en observación hasta nueva confirmación";
}

export function buildInvestmentAdvice(input: NewsImpactResponse | NewsAnalysisAggregate) {
  const verdict = input.verdict;
  const confidence = input.confidence;
  const symbol = input.symbol;

  const sourceCount = "articles" in input ? input.articles.length : input.totalSources;
  const summary = sourceCount === 0
    ? `Para ${symbol}, no se encontraron noticias reales suficientes. La señal queda en HOLD sin confianza operativa.`
    : `Para ${symbol}, el módulo TNMT detecta sesgo ${verdict} con confianza ${(confidence * 100).toFixed(0)}%.`;

  return {
    symbol,
    verdict,
    confidence,
    action: sourceCount === 0 ? "esperar datos reales antes de operar" : actionFromVerdict(verdict),
    summary,
    riskNote: "No es recomendación financiera. Combínalo con precio, liquidez, riesgo y gestión de posición.",
    checklist: [
      "Confirmar tendencia en la tabla de confluencia.",
      "Revisar noticias de mayor credibilidad primero.",
      "Evitar operar si la evidencia está mixta o degradada.",
      "Definir stop y tamaño antes de ejecutar."
    ]
  };
}
