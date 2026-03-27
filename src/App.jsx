import { useState, useEffect, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import { Portfolio, Alerts, Settings } from './pages/OtherPages';
import Backtest from './pages/Backtest';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'https://investment-radar-backend.onrender.com';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [snapRes, statsRes] = await Promise.all([
        fetch(`${API}/api/snapshot`),
        fetch(`${API}/api/stats`),
      ]);
      if (!snapRes.ok) throw new Error(`HTTP ${snapRes.status}`);
      const json  = await snapRes.json();
      const stats = statsRes.ok ? await statsRes.json() : null;
      if (json.ok) {
        setData({ ...json, stats });
        setLastRefresh(new Date());
      } else {
        setError(json.error || 'No data yet — backend may be running first recalibration');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const nav = [
    { id: 'dashboard',     icon: '📊', label: 'Dashboard'     },
    { id: 'opportunities', icon: '🎯', label: 'Opportunities' },
    { id: 'portfolio',     icon: '💼', label: 'Portfolio'     },
    { id: 'alerts',        icon: '🔔', label: 'Alerts'        },
    { id: 'settings',      icon: '⚙️', label: 'Settings'      },
  ];

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">📡</div>
      <div className="loading-title">Investment Radar Pro</div>
      <div className="loading-sub">Loading from Firebase...</div>
      <div className="loading-ring" />
    </div>
  );

  if (error && !data) return (
    <div className="error-screen">
      <div className="error-icon">⚠️</div>
      <div className="error-title">Connection Error</div>
      <div className="error-msg">{error}</div>
      <button className="retry-btn" onClick={fetchData}>Retry</button>
    </div>
  );

  const pageProps = { data, API, onRefresh: fetchData, lastRefresh };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="header-icon">📡</span>
          <div>
            <div className="header-title">Investment Radar Pro</div>
            <div className="header-sub">
              {data?.snap?.regime || 'SIDEWAYS'} •{' '}
              {data?.snap?.ts
                ? `${Math.round((Date.now() - new Date(data.snap.ts).getTime()) / 60000)}m ago`
                : 'loading'}
            </div>
          </div>
        </div>
        <div className="header-right">
          {data?.snap?.fii?.fii_net !== undefined && (
            <div className={`fii-badge ${data.snap.fii.fii_net >= 0 ? 'positive' : 'negative'}`}>
              FII {data.snap.fii.fii_net >= 0 ? '+' : ''}{Math.round(data.snap.fii.fii_net)} Cr
            </div>
          )}
          <button className="refresh-btn" onClick={fetchData} title="Refresh">↻</button>
        </div>
      </header>

      {/* Data freshness banner if stale */}
      {data?.snap?.ts && Math.round((Date.now() - new Date(data.snap.ts).getTime()) / 60000) > 120 && (
        <div className="stale-banner">
          ⚠️ Data is {Math.round((Date.now() - new Date(data.snap.ts).getTime()) / 3600000)}h old —
          next scheduled refresh at {data?.snap?.label || 'next scheduled time'}
        </div>
      )}

      {/* Main content */}
      <main className="app-main">
        {page === 'dashboard'     && <Dashboard     {...pageProps} />}
        {page === 'opportunities' && <Opportunities {...pageProps} />}
        {page === 'portfolio'     && <Portfolio     {...pageProps} />}
        {page === 'alerts'        && <Alerts        {...pageProps} />}
        {page === 'settings'      && <Settings      {...pageProps} />}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {nav.map(n => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
