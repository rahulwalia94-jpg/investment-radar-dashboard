// ═══ PORTFOLIO PAGE ═══════════════════════════════════════════
export function Portfolio({ data, API }) {
  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const portfolio_signal = analysis.portfolioSignal || {};

  const holdings = [
    { tk: 'NET',  name: 'Cloudflare',         qty: 1.066992, avg: 208.62, sector: 'Edge AI' },
    { tk: 'CEG',  name: 'Constellation Energy', qty: 0.714253, avg: 310.43, sector: 'Nuclear Power' },
    { tk: 'GLNG', name: 'Golar LNG',            qty: 3.489692, avg: 50.93,  sector: 'LNG Infrastructure' },
  ];

  const usdInr = snap.usdInr || 92.35;
  let totalPLUSD = 0;
  let totalPLINR = 0;

  return (
    <div className="page port-page">
      <div className="page-title">Your Portfolio</div>
      <div className="port-subtitle">IND Money US Holdings • USD via Yahoo Finance</div>

      {holdings.map(h => {
        const curr   = snap.usPrices?.[h.tk] || h.avg;
        const plUSD  = (curr - h.avg) * h.qty;
        const plPct  = ((curr - h.avg) / h.avg * 100);
        const plINR  = plUSD * usdInr;
        totalPLUSD += plUSD;
        totalPLINR += plINR;
        const sig    = portfolio_signal[h.tk];
        const isGain = plPct >= 0;

        return (
          <div key={h.tk} className={`holding-card ${isGain ? 'gain' : 'loss'}`}>
            <div className="hc-header">
              <div>
                <div className="hc-tk">{h.tk}</div>
                <div className="hc-name">{h.name}</div>
                <div className="hc-sector">{h.sector}</div>
              </div>
              <div className="hc-prices">
                <div className="hc-current">${curr.toFixed(2)}</div>
                <div className="hc-avg">avg ${h.avg}</div>
              </div>
            </div>

            <div className="hc-pl">
              <div className={`hc-pl-pct ${isGain ? 'gain' : 'loss'}`}>
                {isGain ? '+' : ''}{plPct.toFixed(2)}%
              </div>
              <div className="hc-pl-usd">{isGain ? '+' : ''}${plUSD.toFixed(2)}</div>
              <div className="hc-pl-inr">{isGain ? '+' : ''}₹{Math.round(plINR).toLocaleString('en-IN')}</div>
            </div>

            <div className="hc-details">
              <div className="hc-detail-row">
                <span>Qty</span><span>{h.qty} shares</span>
              </div>
              <div className="hc-detail-row">
                <span>Current value</span>
                <span>${(curr * h.qty).toFixed(2)} / ₹{Math.round(curr * h.qty * usdInr).toLocaleString('en-IN')}</span>
              </div>
              <div className="hc-detail-row">
                <span>Cost basis</span>
                <span>${(h.avg * h.qty).toFixed(2)}</span>
              </div>
            </div>

            {sig && (
              <div className={`hc-signal signal-${sig.action?.toLowerCase()}`}>
                <div className="hs-action">{sig.action}</div>
                <div className="hs-reason">{sig.reason}</div>
                {sig.stop_loss && <div className="hs-stop">Stop loss: ${sig.stop_loss} | Target: ${sig.target}</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Total P&L */}
      <div className={`total-pl-card ${totalPLUSD >= 0 ? 'gain' : 'loss'}`}>
        <div className="tpl-label">TOTAL PORTFOLIO P&L</div>
        <div className="tpl-usd">{totalPLUSD >= 0 ? '+' : ''}${totalPLUSD.toFixed(2)}</div>
        <div className="tpl-inr">{totalPLINR >= 0 ? '+' : ''}₹{Math.round(totalPLINR).toLocaleString('en-IN')}</div>
        <div className="tpl-fx">USD/INR: {usdInr} • FX overlay: +3% annual (rupee weakening)</div>
      </div>

      {/* Coherence note */}
      {portfolio_signal.coherence && (
        <div className="coherence-card">
          <div className="coh-title">AI Portfolio Review</div>
          <div className="coh-text">{portfolio_signal.coherence}</div>
        </div>
      )}

      {/* Upcoming events */}
      <div className="events-card">
        <div className="ev-title">Upcoming Events</div>
        {[
          { date: 'Apr 6-8',  event: 'RBI MPC Meeting',     impact: 'Rate decision — watch for pause vs cut' },
          { date: 'Apr 29',   event: 'MSFT + META Earnings', impact: 'Signal for NET earnings next day' },
          { date: 'Apr 30',   event: 'NET Earnings',         impact: 'Your holding — critical event' },
          { date: 'May 6-7',  event: 'US Fed Meeting',       impact: 'Rate decision — watch for hawkish signal' },
        ].map((ev, i) => (
          <div key={i} className="event-row">
            <div className="ev-date">{ev.date}</div>
            <div className="ev-info">
              <div className="ev-name">{ev.event}</div>
              <div className="ev-impact">{ev.impact}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ ALERTS PAGE ══════════════════════════════════════════════
export function Alerts({ data, API }) {
  const snap = data?.snap || {};

  return (
    <div className="page alerts-page">
      <div className="page-title">Alerts</div>

      <div className="alert-config-card">
        <div className="ac-title">WhatsApp Alerts</div>
        <div className="ac-status live">● Active — 2 messages/day</div>
        <div className="ac-times">
          <div className="ac-time"><span>📊</span> Morning Brief — 9:05 AM IST</div>
          <div className="ac-time"><span>📈</span> Evening Summary — 7:05 PM IST</div>
        </div>
        <div className="ac-note">Plus real-time alerts when holdings move {'>'} 3%</div>
      </div>

      <div className="section-card">
        <div className="section-title">Threshold Alerts</div>
        {[
          { label: 'Price move trigger', value: '3%', note: 'Alert if any holding moves >3% in a session' },
          { label: 'FII surge trigger',  value: '₹5,000 Cr', note: 'Alert if FII buys/sells more than this' },
          { label: 'Min alert score',    value: '80/100', note: 'Only WhatsApp if top pick scores above this' },
        ].map(t => (
          <div key={t.label} className="threshold-row">
            <div>
              <div className="tr-label">{t.label}</div>
              <div className="tr-note">{t.note}</div>
            </div>
            <div className="tr-value">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-title">Quick Commands (reply to WhatsApp)</div>
        {[
          { cmd: 'DETAILS [STOCK]', desc: 'Get full analysis for any stock' },
          { cmd: 'STATUS',          desc: 'System and data freshness status' },
          { cmd: 'PAUSE',           desc: 'Stop alerts for 24 hours' },
          { cmd: 'WEEKLY',          desc: 'Request weekly performance report' },
          { cmd: 'HELP',            desc: 'Show all available commands' },
        ].map(c => (
          <div key={c.cmd} className="cmd-row">
            <code className="cmd-code">{c.cmd}</code>
            <span className="cmd-desc">{c.desc}</span>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-title">Data Refresh Schedule</div>
        {[
          { time: '9:00 AM IST',  label: 'India Open',   job: 'Full refresh + AI + WhatsApp brief' },
          { time: '12:00 PM IST', label: 'India Midday', job: 'Price update + threshold check' },
          { time: '3:00 PM IST',  label: 'India Close',  job: 'Final India prices + FII close' },
          { time: '7:00 PM IST',  label: 'US Open',      job: 'US prices + portfolio P&L update' },
          { time: '10:00 PM IST', label: 'US Midday',    job: 'US mid-session + WhatsApp evening' },
          { time: '1:30 AM IST',  label: 'US Close',     job: 'Final US prices + day summary' },
        ].map(s => (
          <div key={s.time} className="schedule-row">
            <div className="sr-time">{s.time}</div>
            <div className="sr-info">
              <div className="sr-label">{s.label}</div>
              <div className="sr-job">{s.job}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ SETTINGS PAGE ════════════════════════════════════════════
export function Settings({ data, API, onRefresh }) {
  const snap  = data?.snap  || {};
  const stats = data?.stats || {};

  const triggerRefresh = async () => {
    try {
      await fetch(`${API}/api/refresh?label=Manual`, { method: 'GET' });
      alert('Refresh triggered! Check back in 3-4 minutes.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-title">Settings</div>

      <div className="section-card">
        <div className="section-title">System Status</div>
        <div className="status-rows">
          <div className="status-row"><span>Backend</span><span className="status-live">● Live on Render</span></div>
          <div className="status-row"><span>Firebase</span><span className="status-live">● Connected</span></div>
          <div className="status-row"><span>Last snapshot</span><span>{snap.label || '--'}</span></div>
          <div className="status-row">
            <span>Data age</span>
            <span style={{color: snap.ts && (Date.now()-new Date(snap.ts).getTime())/60000 < 60 ? '#00d4aa' : '#ffa726'}}>
              {snap.ts ? `${Math.round((Date.now()-new Date(snap.ts).getTime())/60000)} min` : '--'}
            </span>
          </div>
          <div className="status-row"><span>India prices</span><span>{snap.prices ? Object.keys(snap.prices).length : 0} stocks</span></div>
          <div className="status-row"><span>US prices</span><span>{snap.usPrices ? Object.keys(snap.usPrices).length : 0} stocks</span></div>
          <div className="status-row"><span>Regime</span><span style={{color:'#ffa726'}}>{snap.regime || '--'}</span></div>
          <div className="status-row"><span>FII</span><span style={{color: (snap.fii?.fii_net||0)>=0?'#00d4aa':'#ff4757'}}>{snap.fii?.fii_net !== undefined ? `${snap.fii.fii_net>=0?'+':''}${Math.round(snap.fii.fii_net)} Cr` : '--'}</span></div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">📰 News Loop Status (24/7)</div>
        <div className="status-rows">
          <div className="status-row"><span>Status</span><span className="status-live">● Running continuously</span></div>
          <div className="status-row"><span>Coverage</span><span style={{color:'#00d4aa'}}>605 stocks (500 India + 105 US)</span></div>
          <div className="status-row"><span>Full rotation</span><span>Every ~2.5 hours</span></div>
          <div className="status-row"><span>Update interval</span><span>15 min per batch of 25 stocks</span></div>
          <div className="status-row"><span>Source</span><span>Google News RSS</span></div>
          <div className="status-row"><span>Cost</span><span style={{color:'#00d4aa'}}>$0 (free)</span></div>
        </div>
        <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--t3)',marginTop:'8px',lineHeight:'1.6'}}>
          News runs 24/7 independently. When scoring runs at 9AM/12PM/3PM/7PM/10PM/1:30AM it reads the freshest news already in Firebase — never waits for news to fetch.
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">Calibration Status (Nifty 500)</div>
        <div className="status-rows">
          <div className="status-row"><span>Last calibration</span><span>{data?.stats?.calibration?.last_run ? new Date(data.stats.calibration.last_run).toLocaleDateString('en-IN') : 'Never — runs Sunday 2AM'}</span></div>
          <div className="status-row"><span>Stocks calibrated</span><span style={{color:'#00d4aa'}}>{data?.stats?.calibration?.instruments || 0} stocks</span></div>
          <div className="status-row"><span>Valuations (Screener)</span><span>{data?.stats?.calibration?.valuations || 0} stocks</span></div>
          <div className="status-row"><span>Source</span><span style={{color:'#00d4aa'}}>Real 52-week price history</span></div>
          <div className="status-row"><span>Next run</span><span>Sunday 2:00 AM IST</span></div>
        </div>
        <div style={{fontFamily:'var(--mono)',fontSize:'8px',color:'var(--t3)',marginTop:'8px',lineHeight:'1.6'}}>
          Every Sunday the backend fetches 52-week price history for all Nifty 500 stocks, calculates real volatility and base returns per regime, and updates Firebase. No hardcoded estimates.
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">Manual Controls</div>
        <button className="control-btn primary" onClick={triggerRefresh}>
          ↻ Trigger Manual Refresh
        </button>
        <button className="control-btn" onClick={onRefresh}>
          ↺ Reload Dashboard
        </button>
      </div>

      <div className="section-card">
        <div className="section-title">Cost Tracker (Monthly)</div>
        {[
          { service: 'Claude Haiku API',  cost: '~$2.81', note: '180 auto-runs + 10 manual' },
          { service: 'Twilio WhatsApp',   cost: '~$5.65', note: '2 msgs/day = 60/month' },
          { service: 'Firebase',          cost: '$0',      note: 'Free tier — well under limits' },
          { service: 'Render Backend',    cost: '$7',      note: 'Starter paid — always-on' },
          { service: 'GitHub Pages',      cost: '$0',      note: 'Dashboard hosting free' },
          { service: 'Total',             cost: '~$15.46', note: '~₹1,430/month', bold: true },
        ].map(c => (
          <div key={c.service} className={`cost-row ${c.bold ? 'bold' : ''}`}>
            <div>
              <div className="cost-service">{c.service}</div>
              <div className="cost-note">{c.note}</div>
            </div>
            <div className="cost-amount">{c.cost}</div>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-title">Fetch Errors (last refresh)</div>
        {(snap.errors || []).length === 0
          ? <div className="no-errors">✓ No errors in last refresh</div>
          : (snap.errors || []).map((e, i) => (
              <div key={i} className="error-row">⚠️ {e}</div>
            ))
        }
      </div>
    </div>
  );
}

// Default export for compatibility
export default Portfolio;
