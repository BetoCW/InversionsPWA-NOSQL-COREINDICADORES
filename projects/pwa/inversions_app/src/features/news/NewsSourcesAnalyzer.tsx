/**
 * src/features/news/NewsSourcesAnalyzer.tsx
 * FIC: Analizador de fuentes de noticias personalizadas para análisis de inversiones
 * 
 * Permite al usuario:
 * - Agregar URLs de fuentes financieras
 * - Seleccionar una compañía
 * - Obtener análisis consolidado con recomendación (BUY/SELL/HOLD)
 * - Expandir/contraer lista de fuentes
 */

import React, { useState } from 'react';
import { SourceInput } from './SourceInput';
import { SourceList } from './SourceList';
import { AnalysisResult } from './AnalysisResult';
import '../styles/NewsSourcesAnalyzer.css';

interface NewsSource {
  id: string;
  url: string;
  status: 'pending' | 'valid' | 'invalid' | 'analyzed';
  addedAt: string;
}

interface AnalysisState {
  loading: boolean;
  error: string | null;
  result: AnalysisResultData | null;
}

interface AnalysisResultData {
  company: string;
  verdict: 'BUY' | 'SELL' | 'HOLD';
  score: number;
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  timestamp: string;
}

const DEFAULT_SOURCES: NewsSource[] = [
  {
    id: 'default-nasdaq',
    url: 'nasdaq.com',
    status: 'valid',
    addedAt: new Date().toISOString(),
  },
  {
    id: 'default-investing',
    url: 'investing.com',
    status: 'valid',
    addedAt: new Date().toISOString(),
  },
];

export const NewsSourcesAnalyzer: React.FC = () => {
  // FIC: Estado de fuentes agregadas
  const [sources, setSources] = useState<NewsSource[]>(DEFAULT_SOURCES);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // FIC: Estado de análisis
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
  });

  /**
   * Agrega una nueva fuente a la lista
   */
  const handleAddSource = async (url: string) => {
    const normalizedUrl = url.replace(/^www\./, '').toLowerCase();
    const alreadyExists = sources.some(
      (source) => source.url.replace(/^www\./, '').toLowerCase() === normalizedUrl
    );

    if (alreadyExists) {
      setAnalysis({
        loading: false,
        error: 'Esa fuente ya esta agregada',
        result: null,
      });
      return;
    }

    // FIC: Valida URL en el frontend primero
    const newSource: NewsSource = {
      id: `source-${Date.now()}`,
      url,
      status: 'pending',
      addedAt: new Date().toISOString(),
    };

    setSources((prev) => [newSource, ...prev]);

    // FIC: Valida con el backend
    try {
      const response = await fetch('/api/news/validate-url?url=' + encodeURIComponent(url));
      const data = await response.json();

      setSources((prev) =>
        prev.map((s) =>
          s.id === newSource.id
            ? { ...s, status: data.valid ? 'valid' : 'invalid' }
            : s
        )
      );
    } catch (error) {
      console.error('[NewsSourcesAnalyzer] Error validating URL:', error);
      setSources((prev) =>
        prev.map((s) =>
          s.id === newSource.id ? { ...s, status: 'invalid' } : s
        )
      );
    }
  };

  /**
   * Elimina una fuente de la lista
   */
  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const getReusableSources = () =>
    sources.filter((s) => s.status === 'valid' || s.status === 'analyzed');

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value);
    setAnalysis((prev) => ({
      loading: false,
      error: null,
      result: prev.result?.company === value.trim() ? prev.result : null,
    }));
  };

  /**
   * Ejecuta el análisis consolidado
   */
  const handleAnalyze = async () => {
    if (!selectedCompany.trim()) {
      setAnalysis({
        loading: false,
        error: 'Por favor selecciona una compañía',
        result: null,
      });
      return;
    }

    const validSources = getReusableSources();
    if (validSources.length === 0) {
      setAnalysis({
        loading: false,
        error: 'Agrega al menos una fuente válida',
        result: null,
      });
      return;
    }

    setAnalysis({
      loading: true,
      error: null,
      result: null,
    });

    try {
      const response = await fetch('/api/news/analyze-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany.trim(),
          urls: validSources.map((s) => s.url),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en el análisis');
      }

      const data = await response.json();

      // FIC: Actualiza estado de fuentes después del análisis
      setSources((prev) =>
        prev.map((s) =>
          validSources.some((vs) => vs.id === s.id)
            ? { ...s, status: 'analyzed' }
            : s
        )
      );

      setAnalysis({
        loading: false,
        error: null,
        result: data,
      });
    } catch (error) {
      setAnalysis({
        loading: false,
        error: (error as Error).message,
        result: null,
      });
    }
  };

  return (
    <div className="news-sources-analyzer">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="nsa-header">
        <h2>Análisis de Fuentes de Noticias</h2>
        <p className="nsa-description">
          Agrega dominios de fuentes financieras (ej: bloomberg.com, cnbc.com) y selecciona una compañía.
          El sistema buscará automáticamente noticias de esa compañía en esos sitios y proporcionará 
          un análisis consolidado con recomendación de inversión (Comprar, Vender, Mantener)
        </p>
      </div>

      <div className="nsa-layout">
        {/* ── Columna izquierda: Entrada y lista ────────────────────────────────────────────── */}
        <div className="nsa-left">
          {/* Input para agregar URLs */}
          <SourceInput onAddSource={handleAddSource} loading={analysis.loading} />

          {/* Selector de compañía */}
          <div className="nsa-company-section">
            <label htmlFor="company-input" className="nsa-label">
              Compañía a Analizar
            </label>
            <input
              id="company-input"
              type="text"
              placeholder="Ej: Apple, Microsoft, Tesla..."
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              disabled={analysis.loading}
              className="nsa-company-input"
            />
          </div>

          {/* Lista expandible de fuentes */}
          <div className="nsa-sources-section">
            <button
              className="nsa-toggle-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={sources.length === 0}
            >
              <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
              Fuentes Agregadas ({sources.length})
            </button>

            {isExpanded && sources.length > 0 && (
              <SourceList
                sources={sources}
                onRemove={handleRemoveSource}
                loading={analysis.loading}
              />
            )}
          </div>

          {/* Botón de análisis */}
          <button
            className="nsa-analyze-btn"
            onClick={handleAnalyze}
            disabled={
              analysis.loading ||
              getReusableSources().length === 0 ||
              !selectedCompany.trim()
            }
          >
            {analysis.loading ? 'Analizando...' : 'Analizar Fuentes'}
          </button>
        </div>

        {/* ── Columna derecha: Resultados ────────────────────────────────────────────── */}
        <div className="nsa-right">
          {analysis.error && (
            <div className="nsa-error-box">
              <span className="error-icon">⚠</span>
              <p>{analysis.error}</p>
            </div>
          )}

          {analysis.result && <AnalysisResult result={analysis.result} />}

          {!analysis.result && !analysis.error && !analysis.loading && (
            <div className="nsa-placeholder">
              <p>Agrega fuentes y haz clic en "Analizar Fuentes"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
