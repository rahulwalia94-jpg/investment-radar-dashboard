// ═══════════════════════════════════════════════════════════════
// Opportunities Page — Full feature set v2
// Kelly sizing, Monte Carlo, 52wk, valuation, sector heatmap,
// dividend yield, promoter holding, news sentiment, filters
// ═══════════════════════════════════════════════════════════════
import { useState, useMemo, useEffect } from 'react';

const C = {
  bg:'#050810',bg2:'#080c18',surf:'#0c1120',bdr:'#141c2e',bdr2:'#1a2540',
  green:'#00d4aa',red:'#ff4757',amber:'#ffa726',blue:'#4f8ef7',
  cyan:'#00c8e0',purple:'#9b59ff',text:'#e8f0fe',t2:'#7a90b8',t3:'#3a4d6e',
};

function kelly(score, sigma) {
  if (!sigma || sigma <= 0) return 0;
  const w = Math.min(0.82, Math.max(0.3, score / 100));
  const k = (w / (sigma * 0.8)) - ((1-w) / (sigma * 1.5));
  return Math.max(0, Math.min(0.25, k));
}

function monteCarlo(bR, sigma) {
  if (!bR || !sigma) return null;
  const mu = (bR / 100) * 0.5;
  const vol = sigma * Math.sqrt(0.5);
  const z = mu / vol;
  const t = 1/(1+0.2316419*Math.abs(z));
  const p = t*(0.319382+t*(-0.356564+t*(1.781478+t*(-1.821256+t*1.330274))));
  const cdf = 1 - (1/Math.sqrt(6.2832))*Math.exp(-z*z/2)*p;
  return Math.round((z >= 0 ? cdf : 1-cdf)*100);
}

function sColor(sig) {
  const s=(sig||'').toUpperCase();
  if(s.includes('BUY')||s.includes('ADD')) return C.green;
  if(s.includes('AVOID')||s.includes('SELL')) return C.red;
  if(s.includes('REDUCE')) return C.amber;
  return C.t2;
}

function secColor(sec) {
  const s=(sec||'').toLowerCase();
  if(s.includes('defence')||s.includes('defense')) return '#00d4aa';
  if(s.includes('it ')||s.includes('software')||s.includes('tech')) return '#4f8ef7';
  if(s.includes('bank')||s.includes('finance')||s.includes('nbfc')) return '#00c8e0';
  if(s.includes('oil')||s.includes('energy')||s.includes('gas')||s.includes('lng')) return '#ffa726';
  if(s.includes('pharma')||s.includes('health')) return '#a78bfa';
  if(s.includes('fmcg')||s.includes('consum')) return '#f472b6';
  if(s.includes('auto')||s.includes('vehicle')) return '#ff6b35';
  if(s.includes('power')||s.includes('electric')) return '#fbbf24';
  if(s.includes('gold')||s.includes('metal')) return '#ffd700';
  if(s.includes('us ')||s.includes('cloud')||s.includes('ai')) return '#ff9933';
  return '#4f8ef7';
}

export default function Opportunities({ data, API }) {
  const [search,   setSearch]   = useState('');
  const [minS,     setMinS]     = useState(50);
  const [country,  setCountry]  = useState('ALL');
  const [sortBy,   setSortBy]   = useState('score');
  const [exp,      setExp]      = useState(null);
  const [portVal,  setPortVal]  = useState(1000000);

  const snap     = data?.snap     || {};
  const analysis = data?.analysis || {};
  const regime   = snap.regime    || 'SIDEWAYS';
  const usdInr   = snap.usdInr    || 86;

  // Support both Python format (analysis.scores = {TICKER: {...}})
  // and Haiku format (analysis.scores.scores = {TICKER: {...}})
  const rawScores = analysis.scores?.scores || analysis.scores || {};
  const scores = {};
  for (const [k, v] of Object.entries(rawScores)) {
    if (v && typeof v === 'object' && typeof v.score === 'number') {
      scores[k] = v;
    }
  }

  const top5     = analysis.scores?.top5   || analysis.top5 || [];
  const chains   = analysis.chains?.chains || [];
  const sent     = analysis.sentiment?.sentiment || {};
  const newsMap  = data?.news?.stocks || {};
  const results  = snap.results  || [];

  useEffect(() => {
    fetch(`${API}/api/portfolio`).then(r=>r.json()).then(d=>{
      if(d.ok) setPortVal(d.portfolio?.reduce((s,p)=>s+(p.current*p.qty*usdInr),0)||1000000);
    }).catch(()=>{});
  },[API,usdInr]);

  // Build list
  const list = useMemo(()=>{
    const US_SET = new Set(['NET','CEG','GLNG','NVDA','MSFT','AAPL','GOOGL','META',
      'AMZN','TSLA','JPM','GS','XOM','LNG','GLD','QQQ','SPY','SOXX','PLTR','AMD',
      'AVGO','CRM','NOW','PANW','LLY','NVO','V','MA','WMT','LMT','RTX','SOXX']);

    return Object.entries(scores)
      .filter(([tk,s])=>{
        if(s.score<minS) return false;
        const isUS=US_SET.has(tk)||(s.country==='US');
        if(country==='US'&&!isUS) return false;
        if(country==='IN'&&isUS) return false;
        if(search){
          const q=search.toLowerCase();
          if(!tk.toLowerCase().includes(q)&&!(s.reason||'').toLowerCase().includes(q)&&!(s.sector||'').toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map(([tk,s])=>{
        const cal  = s.calibration  || {};
        const val  = s.valuation    || {};
        const sig  = cal.sigma?.[regime] || 0.25;
        const bR   = cal.base_returns?.[regime] ?? (s.score/5);
        const k    = kelly(s.score, sig);
        const prob = monteCarlo(bR, sig);
        const alloc= Math.round(k*portVal/1000)*1000;
        const news = newsMap[tk] || [];
        const chain= chains.flatMap(c=>[
          ...(c.positive||[]).filter(p=>p.stock===tk).map(p=>({dir:'+',adj:p.adj,c:c.trigger})),
          ...(c.negative||[]).filter(p=>p.stock===tk).map(p=>({dir:'-',adj:p.adj,c:c.trigger})),
        ]);
        return { tk,...s, cal, val, sig, bR, k, prob, alloc, news, chain,
          sc:secColor(s.sector), isTop:top5.includes(tk),
          sentScore:sent[tk]?.score||null,
          hasResult:results.find(r=>r.symbol===tk)||null,
        };
      })
      .sort((a,b)=>{
        if(sortBy==='kelly')  return b.k-a.k;
        if(sortBy==='prob')   return (b.prob||0)-(a.prob||0);
        if(sortBy==='return') return (b.bR||0)-(a.bR||0);
        return b.score-a.score;
      });
  },[scores,minS,country,search,sortBy,regime,portVal,chains,sent,newsMap,results,top5]);

  // Sector heatmap
  const heatmap = useMemo(()=>{
    const m={};
    Object.values(scores).forEach(s=>{
      const sec=(s.sector||'Unknown').split(' & ')[0].split(' ')[0].slice(0,12);
      if(!m[sec]) m[sec]={sum:0,n:0};
      m[sec].sum+=s.score; m[sec].n++;
    });
    return Object.entries(m)
      .map(([s,d])=>({s,avg:Math.round(d.sum/d.n),n:d.n}))
      .sort((a,b)=>b.avg-a.avg).slice(0,16);
  },[scores]);

  const col=(s)=>s>=75?C.green:s>=60?C.blue:s>=45?C.amber:C.red;
  const chip=(label,active,onClick)=>(
    <button onClick={onClick} style={{
      padding:'3px 8px',borderRadius:6,cursor:'pointer',
      border:`1px solid ${active?C.blue+'88':C.bdr2}`,
      backgroundColor:active?C.blue+'20':'transparent',
      color:active?C.blue:C.t3,fontSize:9,fontFamily:'monospace',
    }}>{label}</button>
  );

  return (
    <div style={{flex:1,backgroundColor:C.bg,overflowY:'auto',paddingBottom:80}}>

      {/* Sticky header */}
      <div style={{padding:'10px 12px',borderBottom:`1px solid ${C.bdr}`,backgroundColor:C.bg2,position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>🎯 Opportunities</div>
            <div style={{fontSize:9,fontFamily:'monospace',color:C.t3}}>{list.length} stocks · {regime}</div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {['ALL','IN','US'].map(c=>chip(c,country===c,()=>setCountry(c)))}
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search stock, sector, reason..."
          style={{width:'100%',padding:'6px 10px',borderRadius:8,border:`1px solid ${C.bdr2}`,
            backgroundColor:C.surf,color:C.text,fontSize:11,fontFamily:'monospace',
            outline:'none',boxSizing:'border-box',marginBottom:8}}/>
        <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
          {[0,40,50,60,70,80].map(s=>chip(s===0?'ALL':`${s}+`,minS===s,()=>setMinS(s)))}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
            padding:'3px 8px',borderRadius:6,border:`1px solid ${C.bdr2}`,
            backgroundColor:C.surf,color:C.t2,fontSize:9,fontFamily:'monospace',cursor:'pointer',
          }}>
            <option value="score">↓ Score</option>
            <option value="kelly">↓ Kelly %</option>
            <option value="prob">↓ Win Prob</option>
            <option value="return">↓ Exp Return</option>
          </select>
        </div>
      </div>

      {/* Sector Heatmap */}
      {heatmap.length>0&&(
        <div style={{margin:'10px 12px 0',backgroundColor:C.surf,borderRadius:12,border:`1px solid ${C.bdr2}`,padding:12}}>
          <div style={{fontSize:8,fontFamily:'monospace',letterSpacing:2,color:C.blue,marginBottom:8}}>SECTOR HEATMAP — tap to filter</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {heatmap.map(h=>{
              const c2=h.avg>=70?C.green:h.avg>=55?C.blue:h.avg>=45?C.amber:C.red;
              return (
                <div key={h.s} onClick={()=>setSearch(h.s)} style={{
                  padding:'4px 8px',borderRadius:6,cursor:'pointer',
                  border:`1px solid ${c2}44`,backgroundColor:`${c2}12`,
                }}>
                  <div style={{fontSize:8,fontFamily:'monospace',color:C.t2}}>{h.s}</div>
                  <div style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:c2}}>{h.avg}</div>
                  <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>{h.n}s</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming results */}
      {results.length>0&&(
        <div style={{margin:'8px 12px 0',backgroundColor:C.purple+'15',borderRadius:10,
          border:`1px solid ${C.purple}44`,padding:'8px 12px'}}>
          <div style={{fontSize:8,fontFamily:'monospace',letterSpacing:2,color:C.purple,marginBottom:4}}>📅 UPCOMING RESULTS</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {results.slice(0,8).map(r=>(
              <span key={r.symbol} style={{fontSize:8,fontFamily:'monospace'}}>
                <span style={{color:C.text,fontWeight:700}}>{r.symbol}</span>
                <span style={{color:C.t3}}> {r.date?.slice(5)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stock list */}
      <div style={{padding:'8px 12px 0'}}>
        {list.length===0?(
          <div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:32}}>🎯</div>
            <div style={{fontFamily:'monospace',color:C.t3,fontSize:11,marginTop:8}}>
              No stocks match filters.<br/>Try lower score threshold.
            </div>
          </div>
        ):list.map((inst,idx)=>{
          const isExp=exp===inst.tk;
          const c2=col(inst.score);
          return (
            <div key={inst.tk} onClick={()=>setExp(isExp?null:inst.tk)}
              style={{backgroundColor:C.surf,borderRadius:12,cursor:'pointer',
                border:`1px solid ${isExp?c2+'66':C.bdr2}`,marginBottom:6,padding:11}}>

              {/* Top row */}
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <div style={{fontSize:10,fontFamily:'monospace',color:c2,width:24,flexShrink:0,paddingTop:2}}>
                  {inst.isTop?'⭐':`#${idx+1}`}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                    <span style={{fontSize:15,fontWeight:800,color:C.text}}>{inst.tk}</span>
                    {inst.signal&&<span style={{fontSize:7,fontFamily:'monospace',padding:'2px 5px',
                      borderRadius:4,border:`1px solid ${sColor(inst.signal)}44`,
                      backgroundColor:`${sColor(inst.signal)}15`,color:sColor(inst.signal)}}>
                      {inst.signal}
                    </span>}
                    {inst.hasResult&&<span style={{fontSize:7,color:C.purple}}>📅</span>}
                    {/* Valuation badge */}
                    {inst.val?.pe&&inst.cal?.pe_5yr_avg&&(()=>{
                      const disc=((inst.cal.pe_5yr_avg-inst.val.pe)/inst.cal.pe_5yr_avg*100).toFixed(0);
                      const cheap=inst.val.pe<inst.cal.pe_5yr_avg*0.9;
                      const rich=inst.val.pe>inst.cal.pe_5yr_avg*1.1;
                      const vc=cheap?C.green:rich?C.red:C.amber;
                      const vl=cheap?`CHEAP ${disc}%↓`:rich?`RICH ${Math.abs(disc)}%↑`:'FAIR';
                      return <span style={{fontSize:7,fontFamily:'monospace',padding:'1px 5px',
                        borderRadius:4,border:`1px solid ${vc}44`,backgroundColor:`${vc}15`,color:vc}}>{vl}</span>;
                    })()}
                  </div>
                  <div style={{fontSize:8,fontFamily:'monospace',color:inst.sc,marginTop:2}}>
                    {inst.sector}
                    {inst.last_price&&<span style={{color:C.t3}}> · {inst.country==='US'?'$':'₹'}{inst.last_price?.toLocaleString('en-IN')}</span>}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:17,fontWeight:800,fontFamily:'monospace',color:c2}}>{inst.score}</div>
                  {inst.prob&&<div style={{fontSize:8,fontFamily:'monospace',color:C.t3}}>{inst.prob}% win</div>}
                </div>
              </div>

              {/* Metrics strip */}
              <div style={{display:'flex',gap:10,marginTop:6,flexWrap:'wrap'}}>
                {inst.bR!==undefined&&<span style={{fontSize:8,fontFamily:'monospace',color:C.t3}}>
                  Exp <span style={{color:inst.bR>=0?C.green:C.red}}>{inst.bR>=0?'+':''}{inst.bR?.toFixed(0)}%</span>
                </span>}
                {inst.k>0&&<span style={{fontSize:8,fontFamily:'monospace',color:C.t3}}>
                  Kelly <span style={{color:C.amber}}>{(inst.k*100).toFixed(0)}%</span>
                </span>}
                {inst.alloc>0&&<span style={{fontSize:8,fontFamily:'monospace',color:C.t3}}>
                  ₹<span style={{color:C.cyan}}>{(inst.alloc/100000).toFixed(1)}L</span>
                </span>}
                {inst.sentScore!==null&&<span style={{fontSize:8,fontFamily:'monospace',color:C.t3}}>
                  News <span style={{color:inst.sentScore>0?C.green:inst.sentScore<0?C.red:C.t3}}>
                    {inst.sentScore>0?'+':''}{inst.sentScore?.toFixed(1)}
                  </span>
                </span>}
                {inst.chain.length>0&&inst.chain.map((e,i)=>(
                  <span key={i} style={{fontSize:8,fontFamily:'monospace',color:e.dir==='+'?C.green:C.red}}>
                    {e.dir}{e.adj} domino
                  </span>
                ))}
              </div>

              {/* Reason */}
              {inst.reason&&<div style={{fontSize:9,fontFamily:'monospace',color:C.t2,marginTop:5,lineHeight:1.5}}>{inst.reason}</div>}

              {/* EXPANDED */}
              {isExp&&(
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.bdr}`}}>

                  {/* Regime returns */}
                  {inst.cal?.base_returns&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.blue,marginBottom:6}}>
                        CALIBRATION · {inst.cal.source==='calculated'?`✓ ${inst.cal.history_days}d real data`:'~ fallback estimates'}
                      </div>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {Object.entries(inst.cal.base_returns).map(([r,ret])=>(
                          <div key={r} style={{padding:'3px 7px',borderRadius:5,fontSize:8,fontFamily:'monospace',
                            backgroundColor:C.bg2,border:`1px solid ${r===regime?c2+'66':C.bdr}`,
                            color:r===regime?c2:C.t3}}>
                            {r.replace('_',' ')}: <b>{ret>=0?'+':''}{ret}%</b>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:8,fontFamily:'monospace',color:C.t3,marginTop:4}}>
                        σ {(inst.sig*100).toFixed(0)}%/yr in {regime}
                      </div>
                    </div>
                  )}

                  {/* Kelly box */}
                  {inst.k>0&&(
                    <div style={{marginBottom:10,backgroundColor:C.amber+'10',borderRadius:8,padding:8,border:`1px solid ${C.amber}33`}}>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.amber,marginBottom:6}}>💰 KELLY POSITION SIZING</div>
                      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>Kelly %</div>
                          <div style={{fontSize:16,fontWeight:700,color:C.amber,fontFamily:'monospace'}}>{(inst.k*100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>Full Kelly</div>
                          <div style={{fontSize:16,fontWeight:700,color:C.amber,fontFamily:'monospace'}}>₹{inst.alloc.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>Half Kelly (safer)</div>
                          <div style={{fontSize:16,fontWeight:700,color:C.t2,fontFamily:'monospace'}}>₹{(inst.alloc/2).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div style={{fontSize:7,fontFamily:'monospace',color:C.t3,marginTop:4}}>Portfolio ₹{(portVal/100000).toFixed(1)}L · Half Kelly reduces ruin risk</div>
                    </div>
                  )}

                  {/* Monte Carlo */}
                  {inst.prob&&(
                    <div style={{marginBottom:10,backgroundColor:C.purple+'10',borderRadius:8,padding:8,border:`1px solid ${C.purple}33`}}>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.purple,marginBottom:6}}>🎲 MONTE CARLO · 6 MONTHS</div>
                      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>Win probability</div>
                          <div style={{fontSize:18,fontWeight:700,fontFamily:'monospace',
                            color:inst.prob>=60?C.green:inst.prob>=45?C.amber:C.red}}>{inst.prob}%</div>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>Expected return</div>
                          <div style={{fontSize:18,fontWeight:700,fontFamily:'monospace',
                            color:inst.bR>=0?C.green:C.red}}>{inst.bR>=0?'+':''}{inst.bR?.toFixed(0)}%</div>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,fontFamily:'monospace'}}>Volatility σ</div>
                          <div style={{fontSize:18,fontWeight:700,fontFamily:'monospace',color:C.t2}}>{(inst.sig*100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Valuation */}
                  {inst.val&&Object.keys(inst.val).length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.cyan,marginBottom:6}}>LIVE VALUATION</div>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        {[
                          {l:'P/E', v:inst.val.pe?.toFixed(1), sub:inst.cal?.pe_5yr_avg?`5yr:${inst.cal.pe_5yr_avg.toFixed(1)}`:null},
                          {l:'P/B', v:inst.val.pb?.toFixed(1)},
                          {l:'ROE', v:inst.val.roe?`${inst.val.roe.toFixed(1)}%`:null},
                          {l:'ROCE', v:inst.val.roce?`${inst.val.roce.toFixed(1)}%`:null},
                          {l:'D/E', v:inst.val.de?.toFixed(2)},
                          {l:'Div', v:inst.val.divYield?`${inst.val.divYield.toFixed(1)}%`:null},
                          {l:'Promoter', v:inst.val.promoter?`${inst.val.promoter.toFixed(0)}%`:null},
                          {l:'Rev Gr', v:inst.val.salesGrowth?`${inst.val.salesGrowth.toFixed(0)}%`:null},
                        ].filter(x=>x.v).map(x=>(
                          <div key={x.l} style={{backgroundColor:C.bg2,borderRadius:6,padding:'4px 7px',border:`1px solid ${C.bdr}`}}>
                            <div style={{fontSize:7,fontFamily:'monospace',color:C.t3}}>{x.l}</div>
                            <div style={{fontSize:11,fontFamily:'monospace',color:C.text,fontWeight:600}}>{x.v}</div>
                            {x.sub&&<div style={{fontSize:7,fontFamily:'monospace',color:C.t3}}>{x.sub}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 52-week range */}
                  {inst.week52_high&&inst.week52_low&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.t3,marginBottom:4}}>52-WEEK RANGE</div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:9,fontFamily:'monospace',color:C.red}}>₹{Number(inst.week52_low).toLocaleString('en-IN')}</span>
                        <div style={{flex:1,height:4,backgroundColor:C.bdr,borderRadius:2,position:'relative'}}>
                          {inst.last_price&&(
                            <div style={{position:'absolute',top:-2,width:8,height:8,borderRadius:'50%',
                              backgroundColor:C.blue,border:'2px solid #fff',
                              left:`${Math.min(95,Math.max(0,(inst.last_price-inst.week52_low)/(inst.week52_high-inst.week52_low)*100))}%`,
                              transform:'translateX(-50%)'}}/>
                          )}
                        </div>
                        <span style={{fontSize:9,fontFamily:'monospace',color:C.green}}>₹{Number(inst.week52_high).toLocaleString('en-IN')}</span>
                      </div>
                      {inst.last_price&&inst.week52_high&&(
                        <div style={{fontSize:8,fontFamily:'monospace',color:C.t3,marginTop:3}}>
                          {(((inst.last_price-inst.week52_high)/inst.week52_high)*100).toFixed(1)}% from 52w high
                        </div>
                      )}
                    </div>
                  )}

                  {/* News */}
                  {inst.news.length>0&&(
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.t3,marginBottom:4}}>LATEST NEWS</div>
                      {inst.news.slice(0,2).map((n,i)=>(
                        <div key={i} style={{fontSize:9,fontFamily:'monospace',color:C.t2,
                          paddingBottom:3,borderBottom:`1px solid ${C.bdr}`,marginBottom:3,lineHeight:1.4}}>
                          {n.title}
                          <span style={{color:C.t3,fontSize:8}}> · {n.date?.slice(0,16)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Domino */}
                  {inst.chain.length>0&&(
                    <div>
                      <div style={{fontSize:7,fontFamily:'monospace',letterSpacing:2,color:C.t3,marginBottom:4}}>DOMINO CHAIN EFFECT</div>
                      {inst.chain.map((e,i)=>(
                        <div key={i} style={{fontSize:9,fontFamily:'monospace',
                          color:e.dir==='+'?C.green:C.red,lineHeight:1.4}}>
                          {e.dir==='+'?'↑':'↓'} {e.c} → {e.dir}{e.adj}pts
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
