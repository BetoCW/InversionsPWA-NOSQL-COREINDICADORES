import type { NewsSentiment } from "./types";

const POSITIVE_TERMS = [
  "beat", "beats", "growth", "profit", "profits", "surge", "rally", "upgrade", "bullish", "record",
  "strong", "outperform", "positive", "gain", "gains", "approval", "partnership", "expansion", "demand",
  "revenue", "innovation", "buyback", "dividend", "higher", "optimistic", "resilient", "momentum"
];

const NEGATIVE_TERMS = [
  "miss", "misses", "loss", "losses", "drop", "falls", "downgrade", "bearish", "weak", "lawsuit",
  "probe", "investigation", "risk", "risks", "decline", "cut", "cuts", "warning", "debt", "lower",
  "slowdown", "layoffs", "fraud", "fine", "volatile", "pressure", "concern", "concerns", "recession"
];

function countTerms(text: string, terms: string[]): number {
  const normalized = ` ${text.toLowerCase()} `;
  return terms.reduce((total, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "g");
    return total + (normalized.match(pattern)?.length ?? 0);
  }, 0);
}

export function classifySentiment(score: number): NewsSentiment {
  if (score > 0.12) return "positive";
  if (score < -0.12) return "negative";
  return "neutral";
}

export function sentimentToVerdict(score: number): "BUY" | "HOLD" | "SELL" {
  if (score > 0.18) return "BUY";
  if (score < -0.18) return "SELL";
  return "HOLD";
}

export function analyzeSentiment(text: string): { sentiment: NewsSentiment; score: number; confidence: number } {
  const words = text.toLowerCase().match(/[a-záéíóúñü0-9$.-]+/gi) ?? [];
  if (words.length === 0) {
    return { sentiment: "neutral", score: 0, confidence: 0.2 };
  }

  const positive = countTerms(text, POSITIVE_TERMS);
  const negative = countTerms(text, NEGATIVE_TERMS);
  const raw = (positive - negative) / Math.max(5, Math.sqrt(words.length));
  const score = Math.max(-1, Math.min(1, Number(raw.toFixed(3))));
  const confidence = Math.max(0.25, Math.min(0.95, Number((Math.abs(score) + (positive + negative > 0 ? 0.35 : 0.15)).toFixed(3))));

  return {
    sentiment: classifySentiment(score),
    score,
    confidence
  };
}
