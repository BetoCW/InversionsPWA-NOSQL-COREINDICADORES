/**
 * src/features/AppShell.tsx
 * FIC: Contenedor principal de la aplicación con navegación entre módulos
 */

import React, { useState } from 'react';
import { MainDashboard } from './dashboard/MainDashboard';
import { NewsSourcesAnalyzer } from './news/NewsSourcesAnalyzer';

type TabId = 'dashboard' | 'news-analysis';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  component: React.ComponentType;
}

const TABS: Tab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    component: MainDashboard,
  },
  {
    id: 'news-analysis',
    label: 'Análisis de Noticias',
    icon: '📰',
    component: NewsSourcesAnalyzer,
  },
];

/**
 * FIC: Shell principal que orquesta navegación entre módulos
 * Permite alternar entre Dashboard de confluencia y Análisis de noticias personalizadas
 */
export const AppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const activeTabConfig = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = activeTabConfig?.component || MainDashboard;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ── Navigation Bar ─────────────────────────────────────────────── */}
      <nav
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          minHeight: '56px',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--color-border)' : 'transparent',
                border: 'none',
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                font: 'inherit',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s',
                fontSize: '0.9rem',
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
          Inversiones PWA v1.0
        </div>
      </nav>

      {/* ── Active Tab Content ─────────────────────────────────────────────── */}
      <div style={{ padding: '1.5rem' }}>
        <ActiveComponent />
      </div>
    </div>
  );
};
