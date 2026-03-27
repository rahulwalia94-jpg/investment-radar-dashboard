// ═══════════════════════════════════════════════════════════════
// Backtest.jsx — Walk-Forward Backtest Results Dashboard
// Shows model accuracy, IC, factor attribution, regime performance
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';

const C = {
  bg:'#050810',bg2:'#080c18',surf:'#0c1120',bdr:'#141c2e',bdr2:'#1a2540',
  green:'#00d4aa',red:'#ff4757',amber:'#ffa726',blue:'#4f8ef7',
  cyan:'#00c8e0',purple:'#9b59ff',text:'#e8f0fe',t2:'#7a90b8',t3:'#3a4d6e',
};

const REGIME_COLOR = {
  BULL:'#00d4aa', SOFT_BULL:'#4f8ef7', SIDEWAYS:'#ffa726',
  SOFT_BEAR:'#ff6b35', BEAR:'#ff4757',
};

export default function Backtest({ data, API }) {
  const [bt,      setBt]      = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('summary');

  useEffect(() => {
    fetch(`${API}/api/backtest`)
      .then(r => r.json())
      .then(d => { setBt(d.backtest); setLoading(false); })
      .catch(() => setLoading(false));
  }, [API]);

  if (loading) return (
    <div style={{flex:1,backgroundColor:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:C.t3,fontFamily:'monospace',fontSize:11}}>Loading backtest results...</div>
    </div>
  );

  if (!bt || bt.error) return (
    <div style={{flex:1,backgroundColor:C.bg,padding:20}}>
      <div style={{color:C.t3,fontFamily:'monospace',fontSize:11,textAlign:'center',paddingTop:40}}>
        <div style={{fontSize:32,marginBottom:12}}>📊</div>
        No backtest data yet.<br/>
        Python quant engine needs to run at least once.<br/>
        <br/>
        <span style={{color:C.blue}}>Runs automatically every morning after scoring.</span>
      </div>
    </div>
  );

  const s = bt.summary || {};
  const ra = bt.regime_attribution || {};
  const monthly = bt.monthly_results || [];

  const TabBtn = ({id, label}) => (
    <button onClick={()=>setTab(id)} style={{
      padding:'5px 12px', borderRadius:8, cursor:'pointer',
      border:`1px solid ${tab===id?C.blue+'88':C.bdr2}`,
      backgroundColor:tab===id?C.blue+'20':'transparent',
      color:tab===id?C.blue:C.t3, fontSize:9, fontFamily:'monospace',
    }}>{label}</button>
  );

  return (
    <div style={{flex:1,backgroundColor:C.bg,overflowY:'auto',paddingBottom:80}}>

      {/* Header */}
      <div style={{padding:'10px 12px',borderBottom:`1px solid ${C.bdr}`,backgroundColor:C.bg2}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text}}>📈 Walk-Forward Backtest</div>
        <div style={{fontSize:9,fontFamily:'monospace',color:C.t3}}>
          {s.n_periods} months · {s.holding_days}d holding · Top {s.top_n} picks
        </div>
      </div>

      {/* Key metrics */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'10px 12px 0'}}>
        {[
          {label:'Model Return',  val:`+${s.total_return_model}%`,  color:s.total_return_model>0?C.green:C.red},
          {label:'Nifty Return',  val:`+${s.total_return_nifty}%`,  color:C.t2},
          {label:'Alpha',         val:`+${s.total_alpha}%`,          color:s.total_alpha>0?C.green:C.red},
          {label:'Avg IC',        val:s.avg_ic,                      color:s.avg_ic>0.05?C.green:C.amber},
          {label:'IC > 0 Rate',   val:`${s.ic_positive_rate}%`,      color:s.ic_positive_rate>55?C.green:C.amber},
          {label:'Hit Rate',      val:`${s.avg_hit_rate}%`,          color:s.avg_hit_rate>55?C.green:C.amber},
          {label:'Sharpe',        val:s.sharpe_ratio,                color:s.sharpe_ratio>0.5?C.green:C.amber},
          {label:'Max Drawdown',  val:`${s.max_drawdown}%`,          color:C.red},
        ].map(m=>(
          <div key={m.label} style={{backgroundColor:C.surf,borderRadius:10,border:`1px solid ${C.bdr2}`,padding:'8px 12px',minWidth:80}}>
            <div style={{fontSize:7,fontFamily:'monospace',color:C.t3,letterSpacing:1}}>{m.label}</div>
            <div style={{fontSize:14,fontWeight:700,fontFamily:'monospace',color:m.color,marginTop:3}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* IC explanation */}
      <div style={{margin:'8px 12px 0',backgroundColor:C.blue+'10',borderRadius:10,
        border:`1px solid ${C.blue}33`,padding:'8px 12px'}}>
        <div style={{fontSize:8,fontFamily:'monospace',color:C.blue,marginBottom:3}}>WHAT IS IC?</div>
        <div style={{fontSize:9,fontFamily:'monospace',color:C.t2,lineHeight:1.5}}>
          IC (Information Coefficient) = rank correlation between model scores and actual returns.
          IC {'>'} 0.05 = model adds value. IC {'>'} 0.10 = excellent. Current: <span style={{color:s.avg_ic>0.05?C.green:C.amber,fontWeight:700}}>{s.avg_ic}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,padding:'10px 12px 0'}}>
        <TabBtn id="summary"   label="Summary" />
        <TabBtn id="regime"    label="By Regime" />
        <TabBtn id="monthly"   label="Monthly" />
      </div>

      {/* Tab content */}
      <div style={{padding:'8px 12px 0'}}>

        {/* SUMMARY TAB */}
        {tab==='summary'&&(
          <div style={{backgroundColor:C.surf,borderRadius:12,border:`1px solid ${C.bdr2}`,padding:12}}>
            <div style={{fontSize:8,fontFamily:'monospace',letterSpacing:2,color:C.blue,marginBottom:10}}>MODEL PERFORMANCE SUMMARY</div>
            {[
              {label:'Backtest period',     val:`${s.lookback_months} months walk-forward`},
              {label:'Holding period',      val:`${s.holding_days} trading days (3 months)`},
              {label:'Stocks per portfolio',val:`Top ${s.top_n} picks per month`},
              {label:'Total model return',  val:`+${s.total_return_model}%`, color:C.green},
              {label:'Total Nifty return',  val:`+${s.total_return_nifty}%`, color:C.t2},
              {label:'Alpha generated',     val:`+${s.total_alpha}%`, color:s.total_alpha>0?C.green:C.red},
              {label:'Monthly alpha avg',   val:`+${s.avg_monthly_alpha}%`, color:C.amber},
              {label:'Sharpe ratio',        val:s.sharpe_ratio, color:s.sharpe_ratio>0.5?C.green:C.amber},
              {label:'Information Coeff',   val:s.avg_ic, color:s.avg_ic>0.05?C.green:C.amber},
              {label:'IC positive rate',    val:`${s.ic_positive_rate}%`, color:C.blue},
              {label:'Hit rate',            val:`${s.avg_hit_rate}%`, color:C.blue},
              {label:'Max drawdown',        val:`${s.max_drawdown}%`, color:C.red},
            ].map(r=>(
              <div key={r.label} style={{display:'flex',justifyContent:'space-between',
                paddingVertical:6,borderBottom:`1px solid ${C.bdr}`,paddingBottom:6,marginBottom:6}}>
                <span style={{fontSize:10,fontFamily:'monospace',color:C.t2}}>{r.label}</span>
                <span style={{fontSize:10,fontFamily:'monospace',fontWeight:700,color:r.color||C.text}}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* REGIME TAB */}
        {tab==='regime'&&(
          <div>
            {Object.entries(ra).map(([regime, perf])=>{
              const rc = REGIME_COLOR[regime] || C.amber;
              return (
                <div key={regime} style={{backgroundColor:C.surf,borderRadius:12,
                  border:`1px solid ${rc}44`,padding:12,marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:rc,fontFamily:'monospace'}}>{regime.replace('_',' ')}</div>
                    <div style={{fontSize:9,fontFamily:'monospace',color:C.t3}}>{perf.n_periods} periods</div>
                  </div>
                  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                    {[
                      {label:'Avg Alpha',   val:`${perf.avg_alpha>=0?'+':''}${perf.avg_alpha}%`, color:perf.avg_alpha>0?C.green:C.red},
                      {label:'Avg IC',      val:perf.avg_ic,                                      color:perf.avg_ic>0.05?C.green:C.amber},
                      {label:'Hit Rate',    val:`${perf.hit_rate}%`,                              color:perf.hit_rate>55?C.green:C.amber},
                      {label:'Best Month',  val:`+${perf.best_month}%`,                           color:C.green},
                      {label:'Worst Month', val:`${perf.worst_month}%`,                           color:C.red},
                    ].map(m=>(
                      <div key={m.label}>
                        <div style={{fontSize:7,fontFamily:'monospace',color:C.t3}}>{m.label}</div>
                        <div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:m.color}}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MONTHLY TAB */}
        {tab==='monthly'&&(
          <div style={{backgroundColor:C.surf,borderRadius:12,border:`1px solid ${C.bdr2}`,padding:12}}>
            <div style={{fontSize:8,fontFamily:'monospace',letterSpacing:2,color:C.blue,marginBottom:8}}>MONTHLY RESULTS</div>
            {monthly.map((m,i)=>{
              const rc = REGIME_COLOR[m.regime] || C.amber;
              const alphaCol = m.alpha >= 0 ? C.green : C.red;
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                  paddingBottom:6,borderBottom:`1px solid ${C.bdr}`,marginBottom:6}}>
                  <div style={{width:55,fontSize:8,fontFamily:'monospace',color:C.t3}}>{m.date?.slice(0,7)}</div>
                  <div style={{width:65,fontSize:8,fontFamily:'monospace',color:rc,
                    padding:'1px 5px',borderRadius:4,backgroundColor:`${rc}15`}}>
                    {m.regime?.replace('_',' ')}
                  </div>
                  <div style={{flex:1,fontSize:9,fontFamily:'monospace',color:C.t2}}>
                    {(m.top_picks||[]).slice(0,3).join(', ')}
                  </div>
                  <div style={{width:45,fontSize:9,fontFamily:'monospace',color:alphaCol,textAlign:'right'}}>
                    {m.alpha>=0?'+':''}{m.alpha}%
                  </div>
                  <div style={{width:35,fontSize:8,fontFamily:'monospace',color:C.t3,textAlign:'right'}}>
                    IC {m.ic}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
