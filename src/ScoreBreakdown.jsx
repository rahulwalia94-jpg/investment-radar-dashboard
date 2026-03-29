import React, { useState } from 'react';

// ── 5-LAYER SCORE BREAKDOWN ────────────────────────────────────

const LAYER_CONFIG = {
  quant:       { label: 'QUANT',       icon: '⟁', color: '#00ffcc', weight: 30, desc: 'GARCH volatility, Sharpe ratio, momentum, mean reversion' },
  news:        { label: 'NEWS',        icon: '◈', color: '#00b4ff', weight: 25, desc: 'Sentiment analysis, geopolitical flags, Trump/Fed/RBI/Iran signals' },
  fundamental: { label: 'FUNDAMENTAL', icon: '◎', color: '#7b2fff', weight: 20, desc: 'P/E vs 5yr avg, ROE quality, debt safety' },
  macro:       { label: 'MACRO',       icon: '◇', color: '#ffcc00', weight: 15, desc: 'FII flow, VIX level, oil price, USD/INR impact' },
  geo:         { label: 'GEO',         icon: '⊕', color: '#ff8c00', weight: 10, desc: 'Trump tariffs, Iran risk, OPEC, central bank stance' },
};

const GEO_FLAG_LABELS = {
  TRUMP_TARIFF:   { label: 'Trump Tariff',    emoji: '🇺🇸' },
  TRUMP_FED:      { label: 'Fed Policy',      emoji: '🏦' },
  IRAN_HORMUZ:    { label: 'Iran/Hormuz',     emoji: '🛢️' },
  RBI_POLICY:     { label: 'RBI Policy',      emoji: '🇮🇳' },
  CHINA_SLOWDOWN: { label: 'China Slowdown',  emoji: '🇨🇳' },
  INDIA_BUDGET:   { label: 'India Budget',    emoji: '📊' },
  OPEC_OIL:       { label: 'OPEC Oil',        emoji: '⛽' },
};

function LayerBar({ layerKey, data, expanded, onClick }) {
  const cfg   = LAYER_CONFIG[layerKey];
  const score = data?.score || 50;

  return (
    <div onClick={onClick} style={{ marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: cfg.color, width: 14 }}>{cfg.icon}</span>
        <span style={{ fontSize: 8, fontFamily: 'Orbitron, monospace', letterSpacing: 2,
          color: cfg.color, width: 90 }}>{cfg.label}</span>
        <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          color: '#3a5070', width: 30, textAlign: 'right' }}>{cfg.weight}%</span>
        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)',
          borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`,
            background: `linear-gradient(90deg, ${cfg.color}66, ${cfg.color})`,
            borderRadius: 3, boxShadow: `0 0 8px ${cfg.color}44`,
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          color: cfg.color, width: 28, textAlign: 'right', fontWeight: 700 }}>
          {score}
        </span>
      </div>

      {expanded && (
        <div style={{ marginLeft: 22, marginBottom: 6, padding: '6px 10px',
          borderRadius: 8, background: `${cfg.color}08`,
          border: `1px solid ${cfg.color}20` }}>
          <div style={{ fontSize: 8, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace',
            marginBottom: 4 }}>{cfg.desc}</div>

          {/* Quant details */}
          {layerKey === 'quant' && data?.components && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { l: 'Sharpe',   v: data.components.sharpe?.toFixed(2) },
                { l: 'Mom',      v: data.components.momentum ? `${data.components.momentum?.toFixed(1)}%` : null },
                { l: 'σ',        v: data.components.sigma ? `${(data.components.sigma*100).toFixed(0)}%` : null },
                { l: 'VaR 95%', v: data.components.var95 ? `${data.components.var95?.toFixed(1)}%` : null },
                { l: 'z-score',  v: data.components.z_score?.toFixed(2) },
                { l: 'Exp Ret',  v: data.components.exp_return ? `${data.components.exp_return?.toFixed(1)}%` : null },
              ].filter(x => x.v).map(x => (
                <div key={x.l} style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ color: '#3a5070' }}>{x.l}: </span>
                  <span style={{ color: cfg.color }}>{x.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* News details */}
          {layerKey === 'news' && (
            <div>
              {data?.sentiment !== undefined && (
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                  color: data.sentiment >= 0 ? '#00ffcc' : '#ff2244', marginBottom: 4 }}>
                  Sentiment: {data.sentiment >= 0 ? '+' : ''}{data.sentiment?.toFixed(2)}
                  {' '}· {data.articles || 0} articles
                </div>
              )}
              {data?.flags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {data.flags.map(f => {
                    const fl  = GEO_FLAG_LABELS[f.flag] || { label: f.flag, emoji: '⚑' };
                    const pos = (f.impact || 0) >= 0;
                    return (
                      <div key={f.flag} style={{ padding: '2px 6px', borderRadius: 4,
                        background: pos ? 'rgba(0,255,204,0.08)' : 'rgba(255,34,68,0.08)',
                        border: `1px solid ${pos ? 'rgba(0,255,204,0.2)' : 'rgba(255,34,68,0.2)'}`,
                        fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                        color: pos ? '#00ffcc' : '#ff2244' }}>
                        {fl.emoji} {fl.label} {pos ? '+' : ''}{f.impact}
                      </div>
                    );
                  })}
                </div>
              )}
              {(!data?.flags || data.flags.length === 0) && (
                <div style={{ fontSize: 8, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace' }}>
                  No geopolitical flags detected
                </div>
              )}
            </div>
          )}

          {/* Fundamental details */}
          {layerKey === 'fundamental' && data?.components && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { l: 'P/E score',  v: data.components.pe },
                { l: 'ROE score',  v: data.components.roe },
                { l: 'Debt score', v: data.components.debt },
              ].filter(x => x.v !== undefined).map(x => (
                <div key={x.l} style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ color: '#3a5070' }}>{x.l}: </span>
                  <span style={{ color: x.v >= 60 ? '#00ffcc' : x.v >= 40 ? '#ffcc00' : '#ff2244' }}>
                    {x.v}
                  </span>
                </div>
              ))}
              {data.raw && (
                <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: '#3a5070' }}>
                  {data.raw.pe ? `P/E ${data.raw.pe?.toFixed(1)}` : ''}
                  {data.raw.roe ? ` · ROE ${data.raw.roe?.toFixed(0)}%` : ''}
                  {data.raw.de !== undefined ? ` · D/E ${data.raw.de?.toFixed(1)}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Macro details */}
          {layerKey === 'macro' && data?.adj !== undefined && (
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ color: '#3a5070' }}>Sector adjustment: </span>
              <span style={{ color: data.adj >= 0 ? '#00ffcc' : '#ff2244' }}>
                {data.adj >= 0 ? '+' : ''}{data.adj}
              </span>
            </div>
          )}

          {/* Geo details */}
          {layerKey === 'geo' && data?.flags?.length > 0 && (
            <div style={{ fontSize: 8, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace' }}>
              {data.flags.map(f => f.note || f.flag).join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ScoreBreakdown({ scoreData }) {
  const [expandedLayer, setExpandedLayer] = useState(null);

  if (!scoreData?.layers || Object.keys(scoreData.layers).length === 0) {
    return (
      <div style={{ fontSize: 8, color: '#3a5070', fontFamily: 'JetBrains Mono, monospace',
        padding: '8px 0' }}>
        Layer data not available — refresh to generate
      </div>
    );
  }

  const hasRealData = scoreData.layers.quant?.source === 'garch_calculated';

  return (
    <div style={{ marginTop: 8, paddingTop: 8,
      borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 7, fontFamily: 'Orbitron, monospace', letterSpacing: 3,
          color: '#4a5680' }}>5-LAYER ANALYSIS</div>
        <div style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
          color: hasRealData ? '#00ffcc88' : '#ffcc0088' }}>
          {hasRealData ? '✓ GARCH' : '~ ESTIMATED'}
        </div>
      </div>

      {Object.entries(LAYER_CONFIG).map(([key]) => {
        const layerData = scoreData.layers?.[key];
        if (!layerData) return null;
        return (
          <LayerBar key={key} layerKey={key} data={layerData}
            expanded={expandedLayer === key}
            onClick={() => setExpandedLayer(expandedLayer === key ? null : key)}/>
        );
      })}

      {/* Geo flags summary */}
      {scoreData.layers?.news?.flags?.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {scoreData.layers.news.flags.map(f => {
            const fl  = GEO_FLAG_LABELS[f.flag] || { label: f.flag, emoji: '⚑' };
            const pos = (f.impact || 0) >= 0;
            return (
              <div key={f.flag} title={f.note} style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 8,
                fontFamily: 'JetBrains Mono, monospace',
                background: pos ? 'rgba(0,255,204,0.08)' : 'rgba(255,34,68,0.08)',
                border: `1px solid ${pos ? 'rgba(0,255,204,0.2)' : 'rgba(255,34,68,0.2)'}`,
                color: pos ? '#00ffcc' : '#ff2244',
              }}>
                {fl.emoji} {fl.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
