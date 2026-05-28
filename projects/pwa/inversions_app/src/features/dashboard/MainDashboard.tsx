// FIC: Main operational dashboard — Revolut layout with DashboardLayout, NavBar with Badge, and evidence Drawer.
// FIC: Dashboard operativo principal — layout Revolut con DashboardLayout, NavBar con Badge y Drawer de evidencia.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardOrchestrator,
  type DashboardOrchestratorResponse,
  type DashboardSignalCard
} from "../../services/signals/signalApi";
import { CoreSelector, type CoreDefinition } from "./CoreSelector";
import { SignalOverlay } from "./SignalOverlay";
import { ExplainabilityTable } from "./ExplainabilityTable";
import { SignalEvidencePanel } from "../signals/SignalEvidencePanel";
import { WatchlistTree } from "./WatchlistTree";
import { SuperChart } from "./SuperChart";
import { TimeControls } from "./TimeControls";
import { IndicatorsMenu } from "./IndicatorsMenu";
import { RuntimeModeSwitches } from "./RuntimeModeSwitches";
import { ConfluenceSignalsTable } from "./ConfluenceSignalsTable";
import { SimulationControlPanel } from "./simulation/SimulationControlPanel";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Badge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/SkeletonCard";
import { Drawer } from "../../components/ui/Drawer";
import type { ConfluenceSignalRow, SimulationResponse } from "../../services/signals/confluenceTableApi";
import { useSignalStore } from "../../store/signals";

const initialCores: CoreDefinition[] = [
  { id: "technical", label: "Technical", description: "Momentum y estructura", enabled: true },
  { id: "options", label: "Options", description: "Flujo y skew", enabled: true },
  { id: "flow", label: "Institutional Flow", description: "UOA/bloques", enabled: true },
  { id: "news", label: "News", description: "Sentimiento y eventos", enabled: true },
  { id: "ai", label: "AI", description: "Confirmación IA", enabled: true }
];

export function MainDashboard() {
  const isTestEnv = import.meta.env.MODE === "test";
  const [timeframe, setTimeframe] = useState("1d");
  const [periodRange, setPeriodRange] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const [instrumentsInput, setInstrumentsInput] = useState("AAPL,MSFT,NVDA,SPY");
  const [cores, setCores] = useState<CoreDefinition[]>(initialCores);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardOrchestratorResponse | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<DashboardSignalCard | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [simulationRows, setSimulationRows] = useState<ConfluenceSignalRow[] | undefined>(undefined);
  const [simulationVerdict, setSimulationVerdict] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceSignal, setEvidenceSignal] = useState<DashboardSignalCard | null>(null);
  const { selectedInstrument, selectedSignal: storeSelectedRow, runtimeMode, operationalMode } = useSignalStore();

  const handleSimulationResult = useCallback((result: SimulationResponse) => {
    setSimulationRows(result.table);
    setSimulationVerdict(result.verdict);
  }, []);

  const selectedSymbol = selectedInstrument?.symbol ?? payload?.cards[0]?.instrument ?? "SPY";
  const activeCoreCount = useMemo(() => cores.filter((core) => core.enabled).length, [cores]);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboardOrchestrator({ instruments: instrumentsInput, timeframe });
      setPayload(response);
      setSelectedSignal(response.cards[0] ?? null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar dashboard");
    } finally {
      setLoading(false);
    }
  }, [instrumentsInput, timeframe]);

  useEffect(() => {
    void refreshDashboard();
  }, []);

  const toggleCore = (coreId: string) => {
    setCores((prev) => prev.map((core) => (core.id === coreId ? { ...core, enabled: !core.enabled } : core)));
  };

  // FIC: Badge color for runtime mode — cobalt for demo, warning for real, muted for offline.
  // FIC: Color del badge según modo runtime — cobalt para demo, warning para real, apagado para offline.
  const modeBadgeColor =
    runtimeMode === "offline" ? "var(--color-text-muted)" :
    operationalMode === "real" ? "var(--color-warning)" :
    "var(--color-accent)";

  const modeBadgeLabel =
    runtimeMode === "offline" ? "Offline" :
    operationalMode === "real" ? "Real" :
    "Demo";

  const nav = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        {/* Hamburger for tablet */}
        <button
          className="drawer-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir watchlist"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "1.25rem",
            display: "none"
          }}
        >
          ☰
        </button>
        <Badge label="FIC" color="var(--color-accent)" size="sm" />
        <span style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-base)" }}>Inversions</span>
        <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>Dashboard de Confluencia</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        <Badge
          label={modeBadgeLabel}
          color={modeBadgeColor}
          pulse={operationalMode === "real" && runtimeMode !== "offline"}
        />
        {lastUpdated && (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
            Actualizado: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      <style>{`
        @media (max-width: 1023px) {
          .drawer-toggle { display: block !important; }
        }
      `}</style>
    </div>
  );

  const sidebar = <WatchlistTree />;

  const mainContent = (
    <div style={{ display: "grid", gap: "var(--space-lg)" }}>
      {/* ── Filter bar */}
      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "var(--space-sm)", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "0.35rem", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Instrumentos
            </label>
            <input
              value={instrumentsInput}
              onChange={(e) => setInstrumentsInput(e.target.value)}
              placeholder="AAPL, MSFT, NVDA, SPY"
              onKeyDown={(e) => { if (e.key === "Enter") void refreshDashboard(); }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "0.35rem", fontWeight: "var(--font-weight-emphasis)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Cores
            </label>
            <div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "0.45rem 0.75rem", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", whiteSpace: "nowrap" }}>
              {activeCoreCount} / {cores.length} activos
            </div>
          </div>
          <button className="btn-primary" onClick={() => void refreshDashboard()} disabled={loading} style={{ height: "34px" }}>
            {loading ? "Cargando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {/* ── Core selector */}
      <CoreSelector cores={cores} onToggle={toggleCore} />

      {/* ── Runtime and chart controls */}
      {!isTestEnv && (
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <RuntimeModeSwitches />
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <IndicatorsMenu />
            <TimeControls
              symbol={selectedSymbol}
              onTimeframeChange={(tf) => setTimeframe(tf)}
              onPeriodChange={(_p, startDate, endDate) => setPeriodRange({ startDate, endDate })}
            />
          </div>
        </div>
      )}

      {/* ── Error banner */}
      {error && (
        <div style={{ background: "rgba(226, 59, 74, 0.08)", border: "1px solid var(--color-sell)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", color: "var(--color-sell)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: "var(--font-weight-bold)" }}>Error:</span> {error}
        </div>
      )}

      {/* ── Loading skeleton — FR-005 */}
      {loading && !payload && (
        <div style={{ display: "grid", gap: "var(--space-sm)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} height={110} lines={3} />)}
        </div>
      )}

      {/* ── Payload views */}
      {payload && (
        <div style={{ display: "grid", gap: "var(--space-lg)" }}>
          {!isTestEnv && (
            <div style={{ display: "grid", gap: "var(--space-md)", gridTemplateColumns: "1fr" }}>
              <div className="card" style={{ minHeight: 380 }}>
                <SuperChart symbol={selectedSymbol} timeframe={timeframe} startDate={periodRange?.startDate} endDate={periodRange?.endDate} />
              </div>
              <SimulationControlPanel ticket={selectedSymbol} onResult={handleSimulationResult} />
              {simulationVerdict && (
                <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <strong>Verdict derivado:</strong>
                  <span>
                    {String(simulationVerdict.verdict)} (score {Number(simulationVerdict.score ?? 0).toFixed(3)})
                    {simulationVerdict.degraded && <em style={{ color: "var(--color-text-muted)" }}> · degradado</em>}
                  </span>
                </div>
              )}
              <ConfluenceSignalsTable symbol={selectedSymbol} rows={simulationRows} />
            </div>
          )}

          {/* FIC: Signal cards — clicking opens evidence drawer (US3). */}
          {/* FIC: Tarjetas de señal — clic abre drawer de evidencia (US3). */}
          <SignalOverlay
            cards={payload.cards}
            onCardClick={(card) => {
              setEvidenceSignal(card);
              setEvidenceDrawerOpen(true);
            }}
          />
          <ExplainabilityTable cards={payload.cards} />

          {/* ── Inline evidence (test env fallback) */}
          <div className="card">
            <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2>Detalle de evidencia</h2>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {payload.cards.map((card) => (
                  <button
                    key={card.signalId}
                    className={`btn-ghost ${selectedSignal?.signalId === card.signalId ? "active" : ""}`}
                    onClick={() => setSelectedSignal(card)}
                  >
                    {card.instrument}
                  </button>
                ))}
              </div>
            </div>
            <SignalEvidencePanel evidence={selectedSignal?.evidence ?? []} />
            {storeSelectedRow && Array.isArray((storeSelectedRow.metadata as any)?.evidencia_refs) && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ fontSize: "0.8rem" }}>Evidencia de la fila seleccionada</strong>
                <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0, fontSize: "0.75rem" }}>
                  {((storeSelectedRow.metadata as any).evidencia_refs as string[]).map((ref, i) => (
                    <li key={`${ref}-${i}`}>{ref}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {!payload && !loading && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📊</div>
          <p>Cargando datos de confluencia…</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DashboardLayout
        nav={nav}
        sidebar={sidebar}
        main={mainContent}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />

      {/* FIC: Evidence drawer — slide-in from right, opens on signal card click (US3). */}
      {/* FIC: Drawer de evidencia — desliza desde la derecha, se abre al clic en tarjeta de señal (US3). */}
      <Drawer
        isOpen={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
        position="right"
        title={evidenceSignal ? `Evidencia — ${evidenceSignal.instrument}` : "Evidencia"}
      >
        <SignalEvidencePanel evidence={evidenceSignal?.evidence ?? []} />
      </Drawer>
    </>
  );
}
