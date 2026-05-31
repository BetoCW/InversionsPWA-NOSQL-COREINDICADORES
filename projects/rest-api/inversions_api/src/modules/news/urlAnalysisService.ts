import { analyzeSentiment, sentimentToVerdict } from "./sentimentService";
import type { AnalyzedNewsSource, NewsAnalysisAggregate, NewsSourceInput } from "./types";

const SYMBOL_ALIASES: Record<string, string[]> = {
  AAPL: ["aapl", "apple", "iphone", "mac", "ios"],
  MSFT: ["msft", "microsoft", "azure", "windows", "copilot"],
  NVDA: ["nvda", "nvidia", "gpu", "blackwell", "cuda"],
  TSLA: ["tsla", "tesla", "elon", "model y", "model 3"],
  AMZN: ["amzn", "amazon", "aws", "prime"],
  GOOGL: ["googl", "google", "alphabet", "gemini", "youtube"],
  META: ["meta", "facebook", "instagram", "whatsapp", "threads"],
  AMD: ["amd", "radeon", "epyc", "ryzen"],
  SPY: ["spy", "s&p", "s&p 500", "sp500", "market"],
  QQQ: ["qqq", "nasdaq", "nasdaq 100", "tech"]
};

const GENERIC_FINANCE_TERMS = [
  "earnings", "revenue", "guidance", "stock", "shares", "market", "sec", "options", "analyst",
  "upgrade", "downgrade", "inflation", "rates", "fed", "ai", "semiconductor", "cloud"
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(html: string): string {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  );
}

function extractTitleFromHtml(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return normalizeWhitespace(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title?.[1] ? normalizeWhitespace(stripHtml(title[1])) : undefined;
}

function summarize(text: string): string {
  const clean = normalizeWhitespace(text);
  if (clean.length <= 260) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [];
  const selected = sentences.slice(0, 2).join(" ").trim();
  return selected.length > 80 ? selected.slice(0, 340) : `${clean.slice(0, 337)}...`;
}

function detectSymbols(text: string, explicitSymbol?: string): string[] {
  const normalized = text.toLowerCase();
  const symbols = new Set<string>();

  if (explicitSymbol) symbols.add(explicitSymbol.toUpperCase());

  const tickers = text.match(/\b[A-Z]{1,5}\b/g) ?? [];
  for (const ticker of tickers) {
    if (SYMBOL_ALIASES[ticker]) symbols.add(ticker);
  }

  for (const [symbol, aliases] of Object.entries(SYMBOL_ALIASES)) {
    const matched = aliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(normalized);
    });
    if (matched) symbols.add(symbol);
  }

  return [...symbols].slice(0, 8);
}

function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  const found = new Set<string>();
  for (const term of GENERIC_FINANCE_TERMS) {
    if (normalized.includes(term)) found.add(term);
  }
  const tickers = text.match(/\b[A-Z]{2,5}\b/g) ?? [];
  for (const ticker of tickers.slice(0, 8)) found.add(ticker);
  return [...found].slice(0, 12);
}

function credibilityFor(input: NewsSourceInput, text: string): number {
  let score = 0.55;
  const url = input.url?.toLowerCase() ?? "";
  if (/reuters|bloomberg|cnbc|marketwatch|wsj|finance\.yahoo|sec\.gov|nasdaq|investor/.test(url)) score += 0.25;
  if (url.startsWith("https://")) score += 0.08;
  if (text.length > 700) score += 0.07;
  if (!input.url && input.text) score -= 0.08;
  return Math.max(0.15, Math.min(0.98, Number(score.toFixed(2))));
}

async function fetchUrlBody(url: string): Promise<{ title?: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.NEWS_FETCH_TIMEOUT_MS ?? 4500));

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": process.env.EDGAR_USER_AGENT ?? "InversionsTNMT/1.0 (local-dev)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return {
      title: extractTitleFromHtml(html),
      text: stripHtml(html)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function isUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function analyzeNewsSource(input: NewsSourceInput, symbol?: string): Promise<AnalyzedNewsSource> {
  const sourceId = input.id ?? `src-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let title = input.title;
  let rawText = input.text ?? "";
  let provider = input.provider ?? "manual";

  if (input.url && !rawText) {
    provider = "url";
    try {
      const fetched = await fetchUrlBody(input.url);
      title = title ?? fetched.title;
      rawText = fetched.text;
    } catch (error) {
      rawText = `No se pudo descargar la URL ${input.url}. Error: ${(error as Error).message}`;
      title = title ?? "Fuente no disponible";
    }
  }

  if (!rawText && input.url && isUrl(input.url)) {
    rawText = input.url;
  }

  const cleanText = normalizeWhitespace(rawText || input.title || "Sin contenido para analizar.");
  const sentiment = analyzeSentiment(`${title ?? ""} ${cleanText}`);
  const affectedSymbols = detectSymbols(`${title ?? ""} ${cleanText}`, symbol ?? input.symbol);
  const credibilityScore = credibilityFor(input, cleanText);
  const verdict = sentimentToVerdict(sentiment.score * credibilityScore);

  return {
    id: sourceId,
    title: title ?? summarize(cleanText).slice(0, 90),
    url: input.url,
    provider,
    publishedAt: input.publishedAt ?? new Date().toISOString(),
    summary: summarize(cleanText),
    rawText: cleanText.slice(0, 5000),
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    confidence: Number((sentiment.confidence * credibilityScore).toFixed(3)),
    credibilityScore,
    affectedSymbols,
    keywords: extractKeywords(`${title ?? ""} ${cleanText}`),
    verdict,
    rationale: `Sentimiento ${sentiment.sentiment} (${sentiment.score}) con credibilidad ${credibilityScore}.`
  };
}

export function aggregateNewsAnalysis(symbol: string, sources: AnalyzedNewsSource[]): NewsAnalysisAggregate {
  const safeSymbol = symbol.trim().toUpperCase() || "SPY";
  const total = sources.length || 1;
  const weighted = sources.reduce((sum, item) => sum + item.sentimentScore * item.credibilityScore, 0) / total;
  const score = Number(Math.max(-1, Math.min(1, weighted)).toFixed(3));
  const sentiment = score > 0.12 ? "positive" : score < -0.12 ? "negative" : "neutral";
  const verdict = score > 0.18 ? "BUY" : score < -0.18 ? "SELL" : "HOLD";
  const buyCount = sources.filter((item) => item.verdict === "BUY").length;
  const sellCount = sources.filter((item) => item.verdict === "SELL").length;
  const holdCount = sources.filter((item) => item.verdict === "HOLD").length;
  const confidence = Number(Math.min(0.98, Math.max(0.2, sources.reduce((sum, item) => sum + item.confidence, 0) / total)).toFixed(3));

  return {
    symbol: safeSymbol,
    generatedAt: new Date().toISOString(),
    totalSources: sources.length,
    sentiment,
    sentimentScore: score,
    confidence,
    verdict,
    buyCount,
    holdCount,
    sellCount,
    sources,
    highlights: sources.slice(0, 4).map((item) => `${item.verdict}: ${item.title}`)
  };
}

export async function analyzeNewsSources(inputs: NewsSourceInput[], symbol?: string): Promise<NewsAnalysisAggregate> {
  const safeSymbol = symbol?.trim().toUpperCase() || inputs.find((item) => item.symbol)?.symbol?.toUpperCase() || "SPY";
  const analyzed = await Promise.all(inputs.map((input) => analyzeNewsSource(input, safeSymbol)));
  return aggregateNewsAnalysis(safeSymbol, analyzed);
}
