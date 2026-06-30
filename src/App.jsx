import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";

/* ═══════════════════════════════════════════════════════
   PALETTE
═══════════════════════════════════════════════════════ */
const P = {
  bg:        "#080B12",
  bgCard:    "#0D1120",
  bgCard2:   "#0A0E1A",
  border:    "#1C2035",
  border2:   "#242840",
  green:     "#00D4A0",
  greenDim:  "#009E78",
  greenGlow: "rgba(0,212,160,",
  red:       "#FF4560",
  redGlow:   "rgba(255,69,96,",
  amber:     "#FFB020",
  amberGlow: "rgba(255,176,32,",
  blue:      "#5B9EFF",
  blueGlow:  "rgba(91,158,255,",
  purple:    "#A78BFA",
  text:      "#EDF1FB",
  sub:       "#7B8DB0",
  muted:     "#404D6A",
  faint:     "#1E2540",
};

/* ═══════════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .tj { font-family: 'Inter', system-ui, sans-serif; color: ${P.text}; }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Ticker */
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-track { display: flex; animation: ticker-scroll 32s linear infinite; width: max-content; }
  .ticker-track:hover { animation-play-state: paused; }

  /* Number flash */
  @keyframes numFlash {
    0%   { opacity: 1; }
    20%  { opacity: 0.2; color: ${P.green}; }
    60%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .flash { animation: numFlash 0.55s ease-out; }

  /* Streak badge */
  @keyframes pulse-amber {
    0%, 100% { box-shadow: 0 0 0 0 ${P.amberGlow}0.5); }
    50%       { box-shadow: 0 0 0 5px ${P.amberGlow}0); }
  }
  .streak-pulse { animation: pulse-amber 2s infinite; }

  /* Toast */
  @keyframes slideIn {
    from { transform: translateX(40px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  .toast-anim { animation: slideIn 0.25s ease-out; }

  /* Nav hover */
  .nav-btn { cursor: pointer; transition: all 0.15s; }
  .nav-btn:hover { color: ${P.text} !important; }

  /* Calendar cell hover */
  .cal-cell { transition: transform 0.1s, box-shadow 0.1s; }
  .cal-cell:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }

  /* Table row hover */
  .log-row { transition: background 0.1s; }
  .log-row:hover { background: rgba(255,255,255,0.025) !important; }

  /* Inputs */
  .tj-inp, .tj-sel, .tj-txt {
    width: 100%; background: ${P.bg}; border: 1px solid ${P.border2};
    border-radius: 10px; color: ${P.text}; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tj-inp:focus, .tj-sel:focus, .tj-txt:focus {
    border-color: ${P.green}88;
    box-shadow: 0 0 0 3px ${P.greenGlow}0.08);
  }
  .tj-inp  { font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 11px 14px; }
  .tj-sel  { font-family: 'Inter', system-ui; font-size: 12px; padding: 11px 14px; }
  .tj-txt  { font-family: 'Inter', system-ui; font-size: 12px; padding: 11px 14px; resize: vertical; min-height: 72px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: ${P.bg}; }
  ::-webkit-scrollbar-thumb { background: ${P.faint}; border-radius: 3px; }

  /* Modal scroll */
  .modal-body { overflow-y: auto; max-height: 88vh; }

  /* Button base */
  .tj-btn { cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
  .tj-btn:hover { opacity: 0.88; }
  .tj-btn:active { transform: scale(0.97); }

  /* Card glow pulse (subtle) */
  @keyframes glowPulse {
    0%, 100% { opacity: 0.06; }
    50%       { opacity: 0.11; }
  }
  .glow-blob { animation: glowPulse 4s ease-in-out infinite; }
`;

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const INSTRUMENTS = ["NIFTY", "SENSEX"];
const HOLIDAYS = [
  "2025-01-14","2025-01-26","2025-02-26","2025-03-14","2025-03-31",
  "2025-04-10","2025-04-14","2025-04-18","2025-05-01","2025-08-15",
  "2025-08-27","2025-10-02","2025-10-23","2025-11-05","2025-12-25",
  "2026-01-26","2026-03-20","2026-04-02","2026-04-06","2026-04-14",
  "2026-05-01","2026-08-15","2026-10-02","2026-10-21","2026-11-04","2026-12-25",
];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WDAYS  = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const fmtINR = (n, sign = false) => {
  if (n == null || n === "") return "—";
  const num = Number(n), abs = Math.abs(num);
  const s = sign ? (num < 0 ? "−" : num > 0 ? "+" : "") : "";
  return `${s}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
const fmtROI  = n => (n == null || isNaN(n)) ? "—" : `${n > 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
const roiClr  = n => n > 0 ? P.green : n < 0 ? P.red : P.sub;
const pnlClr  = n => Number(n) >= 0 ? P.green : P.red;

const dim       = (y,m) => new Date(y,m+1,0).getDate();
const firstDay  = (y,m) => new Date(y,m,1).getDay();
const toKey     = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const todayKey  = () => { const d=new Date(); return toKey(d.getFullYear(),d.getMonth(),d.getDate()); };
const weekNum   = ds => { const d=new Date(ds),j=new Date(d.getFullYear(),0,1); return Math.ceil(((d-j)/86400000+j.getDay()+1)/7); };
const monthOf   = ds => ds.slice(0,7);

/* ═══════════════════════════════════════════════════════
   COMPUTE ROIs
═══════════════════════════════════════════════════════ */
const computeROIs = (entries, startCap) => {
  const days = Object.values(entries)
    .filter(e => e.type==="trade" && e.pnl!=="" && e.pnl!==null && e.date)
    .sort((a,b) => a.date.localeCompare(b.date));

  let cap = startCap;
  const dailyROI={}, wg={}, mg={};

  for (const e of days) {
    const pnl=Number(e.pnl), wd=Number(e.withdrawal||0);
    dailyROI[e.date] = cap>0 ? (pnl/cap)*100 : 0;

    const wk=`${e.date.slice(0,4)}-W${String(weekNum(e.date)).padStart(2,"0")}`;
    if(!wg[wk]) wg[wk]={pnl:0,cap};
    wg[wk].pnl+=pnl;

    const mk=monthOf(e.date);
    if(!mg[mk]) mg[mk]={pnl:0,cap};
    mg[mk].pnl+=pnl;

    cap = cap+pnl-wd;
  }

  return {
    dailyROI,
    weeklyROI:  Object.fromEntries(Object.entries(wg).map(([k,v])=>[k, v.cap>0?(v.pnl/v.cap)*100:0])),
    monthlyROI: Object.fromEntries(Object.entries(mg).map(([k,v])=>[k, v.cap>0?(v.pnl/v.cap)*100:0])),
  };
};

const computeStreak = entries => {
  const days = Object.values(entries)
    .filter(e => e.type==="trade" && e.pnl!=="" && e.pnl!==null && e.date)
    .sort((a,b) => b.date.localeCompare(a.date));
  let s=0;
  for (const e of days) { if(Number(e.pnl)>0) s++; else break; }
  return s;
};

/* ═══════════════════════════════════════════════════════
   CSV EXPORT
═══════════════════════════════════════════════════════ */
const exportCSV = (entries, cap) => {
  const { dailyROI } = computeROIs(entries, cap);
  const rows=[["Date","Type","Instrument","P&L (INR)","Withdrawal (INR)","Daily ROI (%)","Notes"]];
  Object.values(entries)
    .filter(e=>e.date)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .forEach(e => rows.push([
      e.date, e.type, e.instrument||"",
      e.type==="trade"?(e.pnl??""):"",
      e.withdrawal||"",
      e.type==="trade"&&dailyROI[e.date]!=null?dailyROI[e.date].toFixed(2):"",
      (e.notes||"").replace(/,/g,";"),
    ]));
  const a = Object.assign(document.createElement("a"),{
    href: URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"})),
    download: `trade_journal_${todayKey()}.csv`,
  });
  a.click(); URL.revokeObjectURL(a.href);
};

/* ═══════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════ */

/* ── Stat card with top-bar accent + glow blob ── */
function StatCard({ label, value, sub, accent, flashKey }) {
  const ref = useRef(null);
  const prev = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (prev.current !== null && prev.current !== value) {
      ref.current.classList.remove("flash");
      void ref.current.offsetWidth;
      ref.current.classList.add("flash");
    }
    prev.current = value;
  }, [value]);

  const g = accent || P.muted;
  return (
    <div style={{
      background: `linear-gradient(150deg, #10162A 0%, #0B1020 55%, #080C18 100%)`,
      border: `1px solid ${P.border2}`,
      borderRadius: 16,
      padding: "20px 20px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* accent top bar */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:3,
        background:`linear-gradient(90deg,${g},${g}44,transparent)`,
        borderRadius:"16px 16px 0 0" }} />
      {/* ambient glow blob */}
      <div className="glow-blob" style={{ position:"absolute",top:-24,left:-12,
        width:110,height:110,borderRadius:"50%",background:g,
        filter:"blur(40px)",pointerEvents:"none" }} />
      {/* faint diagonal line */}
      <div style={{ position:"absolute",bottom:0,right:0,width:"55%",height:1,
        background:`linear-gradient(90deg,transparent,${g}18)` }} />

      <div style={{ fontSize:9,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
        textTransform:"uppercase",marginBottom:10,position:"relative" }}>{label}</div>
      <div ref={ref} className="mono" style={{ fontSize:22,fontWeight:700,color:g,
        letterSpacing:"-0.03em",lineHeight:1,position:"relative" }}>{value}</div>
      {sub && <div style={{ fontSize:10,color:P.muted,marginTop:9,position:"relative" }}>{sub}</div>}
    </div>
  );
}

/* ── Scrolling ticker strip ── */
function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ background:"#05080E",borderBottom:`1px solid ${P.border}`,
      height:30,overflow:"hidden",display:"flex",alignItems:"center" }}>
      <div className="ticker-track">
        {doubled.map((item,i) => (
          <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:10,
            padding:"0 26px",borderRight:`1px solid ${P.border}`,
            fontSize:10,fontWeight:600,whiteSpace:"nowrap" }}>
            <span style={{ color:P.muted,letterSpacing:"0.12em",fontSize:9 }}>{item.label}</span>
            <span className="mono" style={{ color:item.color||P.sub,letterSpacing:"0.04em" }}>{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── ROI pill ── */
const RoiPill = ({ val, sm }) => (
  <span style={{
    display:"inline-flex",alignItems:"center",
    padding: sm ? "2px 8px" : "4px 11px",
    borderRadius:20, fontSize: sm ? 9 : 11, fontWeight:700, letterSpacing:"0.03em",
    background: val>0?"rgba(0,212,160,.13)":val<0?"rgba(255,69,96,.13)":"rgba(78,88,120,.1)",
    color:roiClr(val),
  }} className="mono">{fmtROI(val)}</span>
);

/* ── Calendar day chip ── */
function DayChip({ pnl, roi, wd }) {
  const pos = Number(pnl) >= 0;
  const gc = pos ? P.greenGlow : P.redGlow;
  const fc = pos ? P.green : P.red;
  return (
    <div style={{ width:"100%", marginTop:5 }}>
      <div style={{
        background: `${gc}0.18)`,
        border: `1px solid ${gc}0.38)`,
        borderRadius: 7,
        padding: "4px 3px",
        textAlign: "center",
      }}>
        <div className="mono" style={{ fontSize:9,fontWeight:700,color:fc,lineHeight:1.3 }}>
          {fmtINR(pnl, true)}
        </div>
        {roi !== undefined && (
          <div className="mono" style={{ fontSize:7.5,color:roiClr(roi),marginTop:1.5,opacity:0.85 }}>
            {fmtROI(roi)}
          </div>
        )}
      </div>
      {wd > 0 && (
        <div className="mono" style={{ fontSize:7,color:P.amber,textAlign:"center",marginTop:2.5,letterSpacing:"0.03em" }}>
          ↑ {fmtINR(wd)}
        </div>
      )}
    </div>
  );
}

/* ── Badge ── */
const Badge = ({ type }) => {
  const map = {
    profit:  { bg:"rgba(0,212,160,.14)", c:P.green,  t:"PROFIT"  },
    loss:    { bg:"rgba(255,69,96,.14)", c:P.red,    t:"LOSS"    },
    skip:    { bg:"rgba(64,77,106,.18)", c:P.sub,    t:"SKIP"    },
    holiday: { bg:"rgba(255,176,32,.13)",c:P.amber,  t:"HOLIDAY" },
  };
  const s = map[type]||map.skip;
  return (
    <span style={{ background:s.bg,color:s.c,fontSize:9,fontWeight:700,
      letterSpacing:"0.1em",padding:"3px 10px",borderRadius:20 }}>{s.t}</span>
  );
};

/* ── Section card ── */
const Card = ({ children, accentColor, style:sx }) => (
  <div style={{
    background: `linear-gradient(155deg,#0F1526 0%,#0B1020 45%,#080C18 100%)`,
    border: `1px solid ${accentColor ? accentColor+"30" : P.border2}`,
    borderRadius: 18,
    padding: "24px 28px",
    marginBottom: 18,
    boxShadow: accentColor ? `0 0 50px ${accentColor}08,inset 0 1px 0 ${accentColor}14` : "none",
    ...sx,
  }}>{children}</div>
);

/* ── Section title ── */
const SectionTitle = ({ children, right }) => (
  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22 }}>
    <div style={{ fontSize:10,fontWeight:700,color:P.muted,letterSpacing:"0.2em",textTransform:"uppercase" }}>{children}</div>
    {right}
  </div>
);

/* ── Buttons ── */
const Btn = ({ children, onClick, variant="primary", style:sx }) => {
  const v = {
    primary:   { background:`linear-gradient(135deg,${P.green},${P.greenDim})`,color:"#030810",border:"none",fontWeight:700,boxShadow:`0 4px 18px ${P.greenGlow}.22)` },
    secondary: { background:"transparent",color:P.sub,border:`1px solid ${P.border2}`,fontWeight:500 },
    danger:    { background:"transparent",color:P.red,border:`1px solid ${P.redGlow}.35)`,fontWeight:600 },
    ghost:     { background:"rgba(255,255,255,.04)",color:P.sub,border:`1px solid ${P.border}`,fontWeight:500 },
  };
  return (
    <button onClick={onClick} className="tj-btn" style={{
      ...v[variant], borderRadius:10, padding:"9px 18px", fontSize:11,
      fontFamily:"'Inter',system-ui,sans-serif", letterSpacing:"0.04em", cursor:"pointer",
      ...sx,
    }}>{children}</button>
  );
};

/* ── Form primitives ── */
const Lbl = ({ children }) => (
  <div style={{ fontSize:9,fontWeight:700,color:P.muted,letterSpacing:"0.18em",
    textTransform:"uppercase",marginBottom:7 }}>{children}</div>
);
const Inp = ({ style:sx, ...p }) => (
  <input className="tj-inp" style={{ boxSizing:"border-box", ...sx }} {...p} />
);
const Sel = ({ children, style:sx, ...p }) => (
  <select className="tj-sel" style={{ boxSizing:"border-box", ...sx }} {...p}>{children}</select>
);
const Txtarea = ({ style:sx, ...p }) => (
  <textarea className="tj-txt" style={{ boxSizing:"border-box", ...sx }} {...p} />
);
const Chip = ({ label, active, color, onClick }) => (
  <button onClick={onClick} className="tj-btn" style={{
    padding:"7px 16px", borderRadius:22, fontSize:11,
    fontFamily:"'Inter',system-ui,sans-serif",
    fontWeight: active ? 700 : 500, cursor:"pointer",
    border: active ? `1px solid ${color}` : `1px solid ${P.border2}`,
    background: active ? `${color}1E` : "transparent",
    color: active ? color : P.muted,
  }}>{label}</button>
);
const HR = ({ mt=20,mb=20 }) => (
  <div style={{ borderTop:`1px solid ${P.border}`,marginTop:mt,marginBottom:mb }} />
);

/* ── Table cells ── */
const Th = ({ children, right }) => (
  <th style={{ textAlign:right?"right":"left",fontSize:9,fontWeight:700,color:P.muted,
    letterSpacing:"0.18em",textTransform:"uppercase",padding:"9px 14px",
    borderBottom:`1px solid ${P.border}` }}>{children}</th>
);
const Td = ({ children, style:sx }) => (
  <td style={{ padding:"11px 14px",borderBottom:`1px solid rgba(28,32,53,.7)`,verticalAlign:"middle",...sx }}>{children}</td>
);

/* ═══════════════════════════════════════════════════════
   BLANK ENTRY
═══════════════════════════════════════════════════════ */
const blank = d => ({ date:d, type:"trade", instrument:"", pnl:"", withdrawal:"", notes:"" });

/* ═══════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [tab,        setTab]        = useState("calendar");
  const [entries,    setEntries]    = useState({});
  const [capital,    setCapital]    = useState(null);
  const [setupMode,  setSetupMode]  = useState(false);
  const [capInput,   setCapInput]   = useState("");
  const [modal,      setModal]      = useState(null);
  const [calYear,    setCalYear]    = useState(new Date().getFullYear());
  const [calMonth,   setCalMonth]   = useState(new Date().getMonth());
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState(null);
  const [editingCap, setEditingCap] = useState(false);
  const [newCap,     setNewCap]     = useState("");
  const [hovBar,        setHovBar]        = useState(null);
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  /* ── Toast ── */
  const showToast = (msg, color=P.green) => {
    setToast({msg,color}); setTimeout(()=>setToast(null), 2800);
  };

  /* ── Storage ── */
  useEffect(() => {
    (async () => {
      try {
        const [cr,er] = await Promise.all([
          window.storage.get("tj5_cap").catch(()=>null),
          window.storage.get("tj5_ent").catch(()=>null),
        ]);
        if (cr) setCapital(Number(cr.value)); else setSetupMode(true);
        if (er) setEntries(JSON.parse(er.value));
      } catch { setSetupMode(true); }
      setLoading(false);
    })();
  }, []);

  const saveEntries = useCallback(async upd => {
    await window.storage.set("tj5_ent",JSON.stringify(upd)).catch(()=>{});
    setEntries(upd);
  }, []);
  const saveCap = async val => {
    await window.storage.set("tj5_cap",String(val)).catch(()=>{});
    setCapital(val);
  };

  /* ── Derived stats ── */
  const tradeDays  = Object.values(entries).filter(e => e.type==="trade"&&e.pnl!==""&&e.pnl!==null);
  const totalPnl   = tradeDays.reduce((s,e) => s+Number(e.pnl), 0);
  const totalWd    = Object.values(entries).reduce((s,e) => s+(Number(e.withdrawal)||0), 0);
  const curCap     = capital!=null ? capital+totalPnl-totalWd : null;
  const wins       = tradeDays.filter(e => Number(e.pnl)>0).length;
  const losses     = tradeDays.filter(e => Number(e.pnl)<0).length;
  const winRate    = tradeDays.length ? Math.round((wins/tradeDays.length)*100) : null;
  const overallROI = capital ? (totalPnl/capital)*100 : null;
  const streak     = computeStreak(entries);

  const { dailyROI, weeklyROI, monthlyROI } =
    capital ? computeROIs(entries,capital) : {dailyROI:{},weeklyROI:{},monthlyROI:{}};

  /* ── Month context ── */
  const mk       = `${calYear}-${String(calMonth+1).padStart(2,"0")}`;
  const monthPnl = Object.values(entries)
    .filter(e => e.date?.startsWith(mk)&&e.type==="trade"&&e.pnl!=="")
    .reduce((s,e) => s+Number(e.pnl), 0);
  const monthROI  = monthlyROI[mk];
  const mWins     = Object.values(entries).filter(e => e.date?.startsWith(mk)&&e.type==="trade"&&Number(e.pnl)>0).length;
  const mLosses   = Object.values(entries).filter(e => e.date?.startsWith(mk)&&e.type==="trade"&&Number(e.pnl)<0).length;

  /* ── Ticker data ── */
  const tickerItems = [
    {label:"CAPITAL",     value:fmtINR(curCap),                                  color:curCap>=capital?P.green:P.red},
    {label:"NET P&L",     value:fmtINR(totalPnl,true),                           color:totalPnl>=0?P.green:P.red},
    {label:"OVERALL ROI", value:fmtROI(overallROI),                              color:roiClr(overallROI)},
    {label:"WIN RATE",    value:winRate!=null?`${winRate}%`:"—",                 color:winRate>=50?P.green:P.red},
    {label:"THIS MONTH",  value:fmtINR(monthPnl,true),                           color:monthPnl>=0?P.green:P.red},
    {label:"WITHDRAWN",   value:fmtINR(totalWd),                                 color:P.amber},
    {label:"TRADE DAYS",  value:String(tradeDays.length),                        color:P.sub},
    {label:"WIN STREAK",  value:streak>0?`🔥 ${streak}`:"—",                    color:P.amber},
  ];

  /* ── Cell type ── */
  const cellType = dk => {
    if(dk>todayKey()) return "future";
    const e=entries[dk];
    if(HOLIDAYS.includes(dk)&&!e) return "holiday";
    if(!e) return "noTrade";
    if(e.type==="skip")    return "skipped";
    if(e.type==="holiday") return "holiday";
    if(e.type==="trade") {
      if(e.pnl===""||e.pnl===null) return "noTrade";
      return Number(e.pnl)>=0?"profit":"loss";
    }
    return "noTrade";
  };

  /* ── Modal ── */
  const openModal  = (dk,ex) => { if(dk>todayKey()) return; setModal({date:dk,entry:{...(ex||blank(dk))},isEdit:!!ex}); };
  const closeModal = () => setModal(null);
  const updM = (f,v) => setModal(m => ({...m,entry:{...m.entry,[f]:v}}));

  const handleSave = async () => {
    if(!modal) return;
    await saveEntries({...entries,[modal.date]:modal.entry});
    showToast(modal.isEdit?"Entry updated ✓":"Entry saved ✓");
    closeModal();
  };
  const handleDel = async () => {
    if(!modal) return;
    const upd={...entries}; delete upd[modal.date];
    await saveEntries(upd);
    showToast("Entry deleted",P.red);
    closeModal();
  };

  /* ── Setup ── */
  const handleSetup = async () => {
    const val=parseFloat(capInput.replace(/,/g,""));
    if(!val||val<=0) return;
    await saveCap(val); setSetupMode(false);
    showToast("Journal ready — start logging 🚀");
  };
  const handleCapEdit = async () => {
    const val=parseFloat(newCap.replace(/,/g,""));
    if(!val||val<=0) return;
    await saveCap(val); setEditingCap(false); setNewCap("");
    showToast("Capital updated ✓");
  };

  const handleReset = async () => {
    await window.storage.set("tj5_cap","").catch(()=>{});
    await window.storage.set("tj5_ent","{}").catch(()=>{});
    setCapital(null); setEntries({}); setConfirmReset(false);
    setSetupMode(true);
    showToast("Journal reset — enter your starting capital to begin","#FFB020");
  };

  /* ── Calendar layout ── */
  const dayCount = dim(calYear,calMonth);
  const padDays  = firstDay(calYear,calMonth);
  const sortedLog = Object.values(entries).filter(e=>e.date).sort((a,b)=>b.date.localeCompare(a.date));

  /* ════════════════════════════════════════
     LOADING
  ════════════════════════════════════════ */
  if(loading) return (
    <div className="tj" style={{minHeight:"100vh",background:P.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div className="mono" style={{color:P.muted,fontSize:11,letterSpacing:"0.2em"}}>LOADING…</div>
    </div>
  );

  /* ════════════════════════════════════════
     SETUP SCREEN
  ════════════════════════════════════════ */
  if(setupMode) return (
    <div className="tj" style={{minHeight:"100vh",background:P.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div style={{
        background:"linear-gradient(150deg,#121B30 0%,#0C1220 55%,#080C18 100%)",
        border:`1px solid ${P.border2}`,borderRadius:24,padding:"52px 46px",width:440,
        textAlign:"center",
        boxShadow:`0 40px 100px rgba(0,0,0,.75),0 0 80px ${P.greenGlow}.05),inset 0 1px 0 rgba(255,255,255,.05)`,
        position:"relative",overflow:"hidden",
      }}>
        {/* background glow */}
        <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",
          width:300,height:200,background:P.green,opacity:0.04,filter:"blur(60px)",borderRadius:"50%"}}/>
        <div style={{
          width:72,height:72,borderRadius:20,margin:"0 auto 24px",
          background:`linear-gradient(135deg,${P.green},${P.greenDim})`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,
          boxShadow:`0 0 40px ${P.greenGlow}.3),0 8px 28px rgba(0,0,0,.5)`,
          position:"relative",
        }}>📈</div>
        <div style={{fontSize:26,fontWeight:900,color:P.text,letterSpacing:"-0.02em",marginBottom:5}}>
          Trade Journal
        </div>
        <div style={{fontSize:10,color:P.muted,letterSpacing:"0.24em",marginBottom:38,textTransform:"uppercase"}}>
          NSE · BSE · Indian Markets
        </div>
        <Lbl>Starting Capital (₹)</Lbl>
        <Inp placeholder="e.g. 500000" value={capInput}
          onChange={e=>setCapInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handleSetup()}
          autoFocus style={{fontSize:17,padding:"14px 16px",textAlign:"center",marginBottom:9}} />
        <div style={{fontSize:10,color:P.muted,marginBottom:28}}>You can update this anytime from Settings.</div>
        <Btn onClick={handleSetup} style={{width:"100%",padding:"14px",fontSize:13,letterSpacing:"0.08em"}}>
          START JOURNAL →
        </Btn>
      </div>
    </div>
  );

  /* ════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════ */
  return (
    <div className="tj" style={{minHeight:"100vh",background:P.bg,color:P.text}}>
      <style>{CSS}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-anim" style={{
          position:"fixed",top:18,right:22,zIndex:999,
          background:`${toast.color}18`,border:`1px solid ${toast.color}55`,
          color:toast.color,padding:"11px 22px",borderRadius:12,
          fontSize:12,fontWeight:600,letterSpacing:"0.04em",
          backdropFilter:"blur(12px)",boxShadow:`0 8px 30px rgba(0,0,0,.5)`,
        }}>{toast.msg}</div>
      )}

      {/* ══════════════════════════════
          HEADER
      ══════════════════════════════ */}
      <div style={{
        background:"linear-gradient(180deg,#0D1426 0%,#091020 100%)",
        borderBottom:`1px solid ${P.border}`,
        padding:"13px 32px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:100,
        boxShadow:"0 4px 32px rgba(0,0,0,.5)",
      }}>
        {/* Logo mark */}
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{
            width:40,height:40,borderRadius:12,flexShrink:0,
            background:`linear-gradient(135deg,${P.green},${P.greenDim})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
            boxShadow:`0 0 24px ${P.greenGlow}.35),0 4px 14px rgba(0,0,0,.5)`,
          }}>📈</div>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:P.text,letterSpacing:"0.07em"}}>
              TRADE JOURNAL
            </div>
            <div style={{fontSize:9,color:P.muted,letterSpacing:"0.22em",textTransform:"uppercase",marginTop:2}}>
              NSE · BSE · Indian Markets
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{display:"flex",gap:2}}>
          {[["calendar","📅  Calendar"],["log","📋  Log"],["roi","📊  ROI"],["analytics","📈  Analytics"],["settings","⚙  Settings"]].map(([t,label]) => (
            <button key={t} className="nav-btn" onClick={()=>setTab(t)} style={{
              padding:"9px 20px",borderRadius:10,fontSize:11,fontWeight:600,
              fontFamily:"'Inter',system-ui,sans-serif",letterSpacing:"0.04em",cursor:"pointer",
              border: t===tab ? `1px solid ${P.greenGlow}.35)` : "1px solid transparent",
              background: t===tab
                ? `linear-gradient(135deg,${P.greenGlow}.12),${P.greenGlow}.06))`
                : "transparent",
              color: t===tab ? P.green : P.muted,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          TICKER
      ══════════════════════════════ */}
      <Ticker items={tickerItems} />

      {/* ══════════════════════════════
          BODY
      ══════════════════════════════ */}
      <div style={{padding:"26px 32px",maxWidth:1200,margin:"0 auto"}}>

        {/* ── STAT CARDS ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:26}}>
          <StatCard
            label="Starting Capital"
            value={fmtINR(capital)}
            accent={P.sub}
            sub={
              <span className="tj-btn" style={{color:P.blue,fontSize:10,cursor:"pointer",fontWeight:600}}
                onClick={()=>{setEditingCap(true);setTab("settings");}}>
                ✎ Edit capital
              </span>
            }
          />
          <StatCard
            label="Current Capital"
            value={fmtINR(curCap)}
            accent={curCap>=capital?P.green:P.red}
            sub="Start + P&L − Withdrawn"
          />
          <StatCard
            label="Net P&L"
            value={fmtINR(totalPnl,true)}
            accent={totalPnl>=0?P.green:P.red}
            sub={`${tradeDays.length} trading days`}
          />
          <StatCard
            label="Overall ROI"
            value={fmtROI(overallROI)}
            accent={roiClr(overallROI)}
            sub={winRate!=null?`${winRate}% win rate`:"—"}
          />
          <StatCard
            label="Total Withdrawn"
            value={fmtINR(totalWd)}
            accent={P.amber}
            sub="Booked out of profits"
          />

          {/* Wins/losses card with optional streak badge */}
          <div style={{position:"relative"}}>
            <StatCard
              label="Wins · Losses"
              value={`${wins}W  ${losses}L`}
              accent={wins>=losses?P.green:P.red}
              sub={`${tradeDays.length} trading days`}
            />
            {streak>=2 && (
              <div className="streak-pulse" style={{
                position:"absolute",top:-11,right:-9,
                background:`linear-gradient(135deg,${P.amber},#E8960E)`,
                color:"#1A0E00",fontSize:9,fontWeight:900,
                padding:"4px 10px",borderRadius:20,
                boxShadow:`0 4px 14px ${P.amberGlow}.4)`,
                letterSpacing:"0.04em",whiteSpace:"nowrap",
              }}>🔥 {streak} streak</div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════
            CALENDAR TAB
        ══════════════════════════════ */}
        {tab==="calendar" && (
          <Card>
            {/* Calendar nav */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
              <button className="tj-btn" onClick={()=>{
                if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}
                else setCalMonth(m=>m-1);
              }} style={{background:"rgba(255,255,255,.04)",border:`1px solid ${P.border2}`,
                color:P.sub,borderRadius:10,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                ← Prev
              </button>

              {/* Month header */}
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:P.text,letterSpacing:"-0.01em"}}>
                  {MONTHS[calMonth]} {calYear}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginTop:6}}>
                  <span className="mono" style={{
                    fontSize:12,fontWeight:700,
                    color:monthPnl>=0?P.green:P.red,
                  }}>{fmtINR(monthPnl,true)}</span>
                  {monthROI!==undefined && <RoiPill val={monthROI} sm/>}
                  <span style={{fontSize:11,color:P.muted}}>
                    {mWins}W · {mLosses}L
                  </span>
                </div>
              </div>

              <button className="tj-btn" onClick={()=>{
                if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}
                else setCalMonth(m=>m+1);
              }} style={{background:"rgba(255,255,255,.04)",border:`1px solid ${P.border2}`,
                color:P.sub,borderRadius:10,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Next →
              </button>
            </div>

            {/* Day headers */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:6}}>
              {WDAYS.map(d => (
                <div key={d} style={{fontSize:9,fontWeight:700,color:P.muted,
                  textAlign:"center",letterSpacing:"0.16em",padding:"4px 0"}}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
              {Array(padDays).fill(null).map((_,i) => <div key={`pad-${i}`}/>)}
              {Array(dayCount).fill(null).map((_,i) => {
                const day  = i+1;
                const dk   = toKey(calYear,calMonth,day);
                const ct   = cellType(dk);
                const e    = entries[dk];
                const roi  = dailyROI[dk];
                const isToday = dk===todayKey();
                const dow  = (padDays+i)%7;
                const isWknd = dow===0||dow===6;

                /* cell style */
                const cellBg = {
                  profit:  `linear-gradient(160deg,rgba(0,212,160,.1) 0%,rgba(0,212,160,.04) 100%)`,
                  loss:    `linear-gradient(160deg,rgba(255,69,96,.1) 0%,rgba(255,69,96,.04) 100%)`,
                  holiday: "rgba(255,176,32,.04)",
                  noTrade: "rgba(255,255,255,.016)",
                  skipped: "rgba(255,255,255,.016)",
                  future:  "transparent",
                }[ct]||"rgba(255,255,255,.016)";

                const cellBorder = {
                  profit:  `rgba(0,212,160,.32)`,
                  loss:    `rgba(255,69,96,.32)`,
                  holiday: P.amberGlow+".2)",
                  noTrade: P.border,
                  skipped: P.border,
                  future:  "transparent",
                }[ct]||P.border;

                const numColor = {
                  profit:"#00D4A0", loss:"#FF4560",
                  holiday:P.amber, future:P.faint,
                  skipped:P.muted, noTrade:P.muted,
                }[ct]||P.muted;

                return (
                  <div key={dk} className={ct!=="future"?"cal-cell":""} onClick={()=>ct!=="future"&&openModal(dk,entries[dk])} style={{
                    background: cellBg,
                    border: `1px solid ${isToday?P.amber:cellBorder}`,
                    borderRadius: 11,
                    padding: "7px 6px",
                    minHeight: 72,
                    display:"flex",flexDirection:"column",alignItems:"center",
                    cursor: ct==="future"?"default":"pointer",
                    opacity: ct==="future"?0.18 : isWknd&&ct==="noTrade"?0.38 : 1,
                    boxShadow: isToday?`0 0 0 1px ${P.amber}44`:
                               ct==="profit"?`inset 0 1px 0 rgba(0,212,160,.15)`:
                               ct==="loss"?`inset 0 1px 0 rgba(255,69,96,.15)`:"none",
                  }}>
                    <div className="mono" style={{fontSize:11,fontWeight:700,color:numColor}}>{day}</div>
                    {(ct==="profit"||ct==="loss")&&e &&
                      <DayChip pnl={e.pnl} roi={roi} wd={Number(e.withdrawal||0)}/>}
                    {ct==="holiday" &&
                      <div style={{fontSize:7,color:`${P.amber}99`,letterSpacing:"0.1em",
                        textTransform:"uppercase",marginTop:6}}>Holiday</div>}
                    {ct==="skipped" &&
                      <div style={{fontSize:7,color:P.muted,letterSpacing:"0.1em",
                        textTransform:"uppercase",marginTop:6}}>Skipped</div>}
                    {ct==="noTrade"&&!isWknd &&
                      <div style={{fontSize:7,color:P.faint,letterSpacing:"0.1em",
                        textTransform:"uppercase",marginTop:10}}>+ Log</div>}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:24,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
              {[
                [P.green, "Profit day"],
                [P.red,   "Loss day"],
                [P.amber, "Market holiday"],
                [P.muted, "Skipped / no trade"],
              ].map(([c,l]) => (
                <div key={l} style={{display:"flex",alignItems:"center",gap:7,fontSize:10,color:P.muted}}>
                  <div style={{width:10,height:10,borderRadius:3,background:c,opacity:.7}}/>
                  {l}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ══════════════════════════════
            LOG TAB
        ══════════════════════════════ */}
        {tab==="log" && (
          <Card>
            <SectionTitle right={
              <div style={{display:"flex",gap:8}}>
                <Btn variant="ghost" onClick={()=>exportCSV(entries,capital)}
                  style={{fontSize:10,padding:"7px 14px"}}>⬇ Export CSV</Btn>
                <Btn onClick={()=>openModal(todayKey(),entries[todayKey()])}
                  style={{fontSize:10,padding:"7px 16px"}}>+ Log Today</Btn>
              </div>
            }>Trade Log</SectionTitle>

            {sortedLog.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 0"}}>
                <div style={{fontSize:44,marginBottom:16}}>📋</div>
                <div style={{fontSize:14,color:P.sub,marginBottom:6,fontWeight:600}}>No entries yet.</div>
                <div style={{fontSize:11,color:P.muted}}>Click any past day on the calendar, or use "Log Today".</div>
              </div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr>
                      <Th>Date</Th><Th>Type</Th><Th>Instrument</Th>
                      <Th>P&L</Th><Th>Daily ROI</Th><Th>Withdrawal</Th>
                      <Th>Notes</Th><Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLog.map(e => {
                      const pnl=Number(e.pnl);
                      const bt=e.type==="trade"?(pnl>=0?"profit":"loss"):e.type;
                      const roi=dailyROI[e.date];
                      return (
                        <tr key={e.date} className="log-row">
                          <Td>
                            <span className="mono" style={{color:P.sub,fontSize:11}}>{e.date}</span>
                            {e.date===todayKey()&&
                              <span style={{fontSize:8,color:P.amber,marginLeft:8,fontWeight:700,
                                background:`${P.amber}15`,padding:"1px 6px",borderRadius:4}}>TODAY</span>}
                          </Td>
                          <Td><Badge type={bt}/></Td>
                          <Td style={{color:P.sub,fontWeight:500}}>{e.instrument||"—"}</Td>
                          <Td>
                            {e.type==="trade"&&e.pnl!==""
                              ? <span className="mono" style={{color:pnlClr(pnl),fontWeight:700}}>
                                  {fmtINR(e.pnl,true)}
                                </span>
                              : <span style={{color:P.faint}}>—</span>}
                          </Td>
                          <Td>{roi!==undefined?<RoiPill val={roi} sm/>:<span style={{color:P.faint}}>—</span>}</Td>
                          <Td>
                            {Number(e.withdrawal)>0
                              ? <span className="mono" style={{color:P.amber,fontWeight:600}}>{fmtINR(e.withdrawal)}</span>
                              : <span style={{color:P.faint}}>—</span>}
                          </Td>
                          <Td style={{color:P.sub,fontSize:11,maxWidth:180,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {e.notes||<span style={{color:P.faint}}>—</span>}
                          </Td>
                          <Td>
                            <Btn variant="ghost" onClick={()=>openModal(e.date,e)}
                              style={{fontSize:9,padding:"4px 12px"}}>Edit</Btn>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ══════════════════════════════
            ROI TAB
        ══════════════════════════════ */}
        {tab==="roi" && (
          <>
            {/* Capital hero card */}
            <div style={{
              background:`linear-gradient(135deg,#0D1830 0%,#0A1224 50%,#070A18 100%)`,
              border:`1px solid ${P.blueGlow}.22)`,
              borderRadius:18,padding:"28px 30px",marginBottom:18,
              boxShadow:`0 0 70px ${P.blueGlow}.06),inset 0 1px 0 ${P.blueGlow}.1)`,
              position:"relative",overflow:"hidden",
            }}>
              <div style={{position:"absolute",top:-40,right:-20,width:200,height:200,
                background:P.blue,opacity:0.04,filter:"blur(60px)",borderRadius:"50%"}}/>
              <div style={{fontSize:10,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
                textTransform:"uppercase",marginBottom:20}}>Capital Breakdown</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:18}}>
                {[
                  ["Starting",     fmtINR(capital),           P.sub],
                  ["+ Net P&L",    fmtINR(totalPnl,true),     pnlClr(totalPnl)],
                  ["− Withdrawn",  fmtINR(totalWd),           P.amber],
                  ["= Current",    fmtINR(curCap),            curCap>=capital?P.green:P.red],
                  ["Overall ROI",  fmtROI(overallROI),        roiClr(overallROI)],
                  ["Win Rate",     winRate!=null?`${winRate}%`:"—", winRate>=50?P.green:P.red],
                ].map(([k,v,c]) => (
                  <div key={k}>
                    <div style={{fontSize:9,color:P.muted,letterSpacing:"0.15em",
                      textTransform:"uppercase",marginBottom:7}}>{k}</div>
                    <div className="mono" style={{fontSize:17,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:18,paddingTop:14,borderTop:`1px solid ${P.border}`,
                fontSize:10,color:P.muted,lineHeight:1.8}}>
                <span style={{color:P.faint}}>Formula: </span>
                Current Capital = Starting Capital + Net P&L − Withdrawn.
                Withdrawals reduce your trading pool but do <em>not</em> reduce P&L.
              </div>
            </div>

            {/* Monthly */}
            <Card>
              <SectionTitle>Monthly ROI</SectionTitle>
              {Object.keys(monthlyROI).length===0
                ? <div style={{color:P.faint,textAlign:"center",padding:"32px 0",fontSize:12}}>
                    No trade data yet.
                  </div>
                : <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr>
                      <Th>Month</Th><Th>Trade Days</Th>
                      <Th>Gross P&L</Th><Th>Withdrawn</Th>
                      <Th>Net in Capital</Th><Th>ROI</Th>
                    </tr></thead>
                    <tbody>
                      {Object.keys(monthlyROI).sort().reverse().map(mk2 => {
                        const me=Object.values(entries).filter(e=>e.date?.startsWith(mk2)&&e.type==="trade"&&e.pnl!=="");
                        const mp=me.reduce((s,e)=>s+Number(e.pnl),0);
                        const mw=Object.values(entries).filter(e=>e.date?.startsWith(mk2))
                          .reduce((s,e)=>s+(Number(e.withdrawal)||0),0);
                        const roi=monthlyROI[mk2];
                        return (
                          <tr key={mk2} className="log-row">
                            <Td><span style={{fontWeight:700,color:P.text}}>{mk2}</span></Td>
                            <Td style={{color:P.sub}}>{me.length}</Td>
                            <Td><span className="mono" style={{color:pnlClr(mp),fontWeight:700}}>{fmtINR(mp,true)}</span></Td>
                            <Td><span className="mono" style={{color:mw>0?P.amber:P.muted}}>{mw>0?fmtINR(mw):"—"}</span></Td>
                            <Td><span className="mono" style={{color:pnlClr(mp-mw)}}>{fmtINR(mp-mw,true)}</span></Td>
                            <Td><RoiPill val={roi} sm/></Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              }
            </Card>

            {/* Weekly */}
            <Card>
              <SectionTitle>Weekly ROI</SectionTitle>
              {Object.keys(weeklyROI).length===0
                ? <div style={{color:P.faint,textAlign:"center",padding:"32px 0",fontSize:12}}>
                    No trade data yet.
                  </div>
                : <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr>
                      <Th>Week</Th><Th>Trade Days</Th><Th>P&L</Th><Th>ROI</Th>
                    </tr></thead>
                    <tbody>
                      {Object.keys(weeklyROI).sort().reverse().map(wk => {
                        const we=Object.values(entries).filter(e=>{
                          if(!e.date||e.type!=="trade"||e.pnl==="") return false;
                          return `${e.date.slice(0,4)}-W${String(weekNum(e.date)).padStart(2,"0")}`===wk;
                        });
                        const wp=we.reduce((s,e)=>s+Number(e.pnl),0);
                        return (
                          <tr key={wk} className="log-row">
                            <Td><span style={{fontWeight:700,color:P.text}}>{wk}</span></Td>
                            <Td style={{color:P.sub}}>{we.length}</Td>
                            <Td><span className="mono" style={{color:pnlClr(wp),fontWeight:700}}>{fmtINR(wp,true)}</span></Td>
                            <Td><RoiPill val={weeklyROI[wk]} sm/></Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              }
            </Card>
          </>
        )}

        {/* ══════════════════════════════
            ANALYTICS TAB
        ══════════════════════════════ */}
        {tab==="analytics" && (() => {
          // ── data prep ──
          const tdays = Object.values(entries)
            .filter(e=>e.type==="trade"&&e.pnl!==""&&e.pnl!==null&&e.date)
            .sort((a,b)=>a.date.localeCompare(b.date));

          // Running capital + cumulative P&L series for recharts
          let runCap=capital||0, cumPnl=0;
          const chartData = tdays.map(e=>{
            const grossPnl=Number(e.pnl), brok=0, pnl=grossPnl-brok, wd=Number(e.withdrawal||0);
            cumPnl+=pnl;
            const capBefore=runCap;
            runCap=runCap+pnl-wd;
            return {
              date:     e.date.slice(5),
              fullDate: e.date,
              grossPnl,
              brokerage: brok,
              pnl,         // net P&L
              cumPnl,
              capital:  runCap,
              growthPct: capital ? parseFloat(((runCap-capital)/capital*100).toFixed(2)) : 0,
              roi:      capBefore>0 ? parseFloat((pnl/capBefore*100).toFixed(2)) : 0,
            };
          });

          const capPoints  = chartData.map(d=>d.capital);

          // ── Consistency score ──
          const totalT   = tdays.length;
          const winDays2 = tdays.filter(e=>Number(e.pnl)>0);
          const loseDays = tdays.filter(e=>Number(e.pnl)<0);
          const wr       = totalT ? wins/totalT : 0;
          const avgWin   = winDays2.length ? winDays2.reduce((s,e)=>s+Number(e.pnl),0)/winDays2.length : 0;
          const avgLoss  = loseDays.length ? Math.abs(loseDays.reduce((s,e)=>s+Number(e.pnl),0)/loseDays.length) : 0;
          const rrRatio  = avgLoss>0 ? avgWin/avgLoss : avgWin>0 ? 3 : 1;
          const expectancy = avgLoss>0||avgWin>0
            ? Math.max(0,((wr*avgWin)-((1-wr)*avgLoss))/Math.max(avgWin,avgLoss,1)) : 0;
          const blowupDays  = loseDays.filter(e=>Math.abs(Number(e.pnl))>avgWin&&avgWin>0).length;
          const blowupScore = totalT ? Math.max(0,1-(blowupDays/totalT)*2) : 1;
          const streakScore = totalT ? Math.min(1,streak/(totalT*0.4)) : 0;
          const score = totalT<3 ? null : Math.round(
            wr*35 + Math.min(rrRatio/3,1)*25 + expectancy*20 + blowupScore*15 + streakScore*5
          );
          const grade      = score===null?"—":score>=85?"A+":score>=75?"A":score>=65?"B+":score>=55?"B":score>=45?"C":"D";
          const gradeColor = score===null?P.muted:score>=75?P.green:score>=55?P.amber:P.red;

          // ── max drawdown ──
          let peak2=capital||0, maxDD=0;
          for(const v of capPoints){ if(v>peak2) peak2=v; const dd=peak2>0?(peak2-v)/peak2*100:0; if(dd>maxDD) maxDD=dd; }

          // ── Arc gauge helpers ──
          const polarXY = (cx,cy,r,deg) => { const rad=(deg-90)*Math.PI/180; return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}; };
          const arcPath = (cx,cy,r,s,e2) => { const A=polarXY(cx,cy,r,s),B=polarXY(cx,cy,r,e2),lg=e2-s>180?1:0; return `M${A.x},${A.y} A${r},${r},0,${lg},1,${B.x},${B.y}`; };
          const gaugeDeg   = -140+(( score??0)/100)*280;
          const gaugeTrack = arcPath(100,95,68,-140,140);
          const gaugeFill  = score!==null ? arcPath(100,95,68,-140,gaugeDeg) : null;

          // ── Recharts custom components ──
          const CustomTooltipPnL = ({active,payload,label}) => {
            if(!active||!payload?.length) return null;
            const d=payload[0]?.payload;
            return (
              <div style={{background:"#131C30",border:`1px solid ${P.border2}`,borderRadius:10,
                padding:"12px 16px",fontSize:11,lineHeight:2,minWidth:180,
                boxShadow:"0 8px 30px rgba(0,0,0,.6)"}}>
                <div className="mono" style={{color:P.sub,marginBottom:4}}>{d?.fullDate}</div>
                <div className="mono" style={{color:d?.pnl>=0?P.green:P.red,fontWeight:700,fontSize:14}}>
                  {fmtINR(d?.pnl,true)}
                </div>
                <div style={{color:P.muted,fontSize:10}}>Daily ROI: <span className="mono" style={{color:roiClr(d?.roi)}}>{fmtROI(d?.roi)}</span></div>
                <div style={{color:P.muted,fontSize:10}}>Capital: <span className="mono" style={{color:P.blue}}>{fmtINR(d?.capital)}</span></div>
              </div>
            );
          };

          const CustomTooltipCum = ({active,payload,label}) => {
            if(!active||!payload?.length) return null;
            const d=payload[0]?.payload;
            return (
              <div style={{background:"#131C30",border:`1px solid ${P.border2}`,borderRadius:10,
                padding:"12px 16px",fontSize:11,lineHeight:2,minWidth:170,
                boxShadow:"0 8px 30px rgba(0,0,0,.6)"}}>
                <div className="mono" style={{color:P.sub,marginBottom:4}}>{d?.fullDate}</div>
                <div style={{color:P.muted,fontSize:10}}>Cumulative P&L: <span className="mono" style={{color:d?.cumPnl>=0?P.green:P.red,fontWeight:700}}>{fmtINR(d?.cumPnl,true)}</span></div>
                <div style={{color:P.muted,fontSize:10}}>Capital: <span className="mono" style={{color:P.blue}}>{fmtINR(d?.capital)}</span></div>
                <div style={{color:P.muted,fontSize:10}}>Growth: <span className="mono" style={{color:roiClr(d?.growthPct)}}>{fmtROI(d?.growthPct)}</span></div>
              </div>
            );
          };

          const CustomTooltipGrowth = ({active,payload}) => {
            if(!active||!payload?.length) return null;
            const d=payload[0]?.payload;
            return (
              <div style={{background:"#131C30",border:`1px solid ${P.border2}`,borderRadius:10,
                padding:"12px 16px",fontSize:11,lineHeight:2,minWidth:160,
                boxShadow:"0 8px 30px rgba(0,0,0,.6)"}}>
                <div className="mono" style={{color:P.sub,marginBottom:4}}>{d?.fullDate}</div>
                <div style={{color:P.muted,fontSize:10}}>Growth: <span className="mono" style={{color:roiClr(d?.growthPct),fontWeight:700,fontSize:13}}>{fmtROI(d?.growthPct)}</span></div>
                <div style={{color:P.muted,fontSize:10}}>Capital: <span className="mono" style={{color:P.blue}}>{fmtINR(d?.capital)}</span></div>
              </div>
            );
          };

          const pnls = tdays.map(e=>Number(e.pnl));

          return (
            <>
              {/* ── Consistency Meter ── */}
              <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16,marginBottom:18}}>
                <Card style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
                    textTransform:"uppercase",marginBottom:14,alignSelf:"flex-start"}}>Consistency Score</div>
                  <svg width={200} height={116} viewBox="0 0 200 116">
                    <path d={gaugeTrack} fill="none" stroke={P.faint} strokeWidth={10} strokeLinecap="round"/>
                    {gaugeFill&&score!==null&&(
                      <path d={gaugeFill} fill="none" stroke={gradeColor} strokeWidth={10} strokeLinecap="round"
                        style={{filter:`drop-shadow(0 0 6px ${gradeColor}88)`}}/>
                    )}
                    <text x={100} y={88} textAnchor="middle" fill={gradeColor}
                      style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace"}}>{grade}</text>
                    <text x={100} y={108} textAnchor="middle" fill={P.muted}
                      style={{fontSize:11,fontFamily:"'Inter',sans-serif"}}>
                      {score!==null?`${score}/100`:"Need 3+ trades"}
                    </text>
                  </svg>
                  {score!==null&&(
                    <div style={{fontSize:10,color:P.sub,textAlign:"center",marginTop:4,lineHeight:1.8}}>
                      {score>=75?"Strong & consistent":score>=55?"Developing consistency":"Focus on discipline"}
                    </div>
                  )}
                </Card>

                <Card>
                  <div style={{fontSize:10,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
                    textTransform:"uppercase",marginBottom:18}}>Score Breakdown</div>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    {[
                      { label:"Win Rate",         pct:Math.round(wr*100),              score:Math.round(wr*35),                        max:35, color:wr>=0.6?P.green:wr>=0.45?P.amber:P.red,          note:totalT?`${wins}W / ${losses}L of ${totalT} days`:"No trades yet" },
                      { label:"Reward:Risk",       pct:Math.round(Math.min(rrRatio/3,1)*100), score:Math.round(Math.min(rrRatio/3,1)*25), max:25, color:rrRatio>=2?P.green:rrRatio>=1?P.amber:P.red, note:avgLoss>0?`Avg win ${fmtINR(avgWin)} · Avg loss ${fmtINR(avgLoss)} · ${rrRatio.toFixed(2)}×`:"No losses yet" },
                      { label:"Expectancy",        pct:Math.round(expectancy*100),      score:Math.round(expectancy*20),                max:20, color:expectancy>=0.5?P.green:expectancy>=0.2?P.amber:P.red, note:"(Win rate × Avg win) − (Loss rate × Avg loss)" },
                      { label:"Loss Control",      pct:Math.round(blowupScore*100),     score:Math.round(blowupScore*15),               max:15, color:blowupScore>=0.8?P.green:blowupScore>=0.5?P.amber:P.red, note:blowupDays>0?`${blowupDays} day(s) loss > avg win`:"No outsized losses ✓" },
                      { label:"Win Streak",        pct:Math.round(streakScore*100),     score:Math.round(streakScore*5),                max:5,  color:streak>=3?P.green:streak>=1?P.amber:P.muted,    note:streak>0?`Current: 🔥 ${streak} wins`:"No active streak" },
                    ].map(f=>(
                      <div key={f.label}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                          <div style={{fontSize:11,fontWeight:600,color:P.sub}}>{f.label}</div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:9,color:P.muted}}>{f.note}</span>
                            <span className="mono" style={{fontSize:11,fontWeight:700,color:f.color,minWidth:38,textAlign:"right"}}>
                              {totalT>=3?`${f.score}/${f.max}`:"—"}
                            </span>
                          </div>
                        </div>
                        <div style={{height:5,background:P.faint,borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:totalT>=3?`${f.pct}%`:"0%",
                            background:`linear-gradient(90deg,${f.color},${f.color}AA)`,
                            borderRadius:3,boxShadow:`0 0 6px ${f.color}66`,transition:"width 0.6s ease-out"}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* ── Summary stat cards ── */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
                {[
                  ["Best Day",    fmtINR(pnls.length?Math.max(...pnls):0,true), P.green,  tdays.length?tdays[pnls.indexOf(Math.max(...pnls))]?.date:"—"],
                  ["Worst Day",   fmtINR(pnls.length?Math.min(...pnls):0,true), P.red,    tdays.length?tdays[pnls.indexOf(Math.min(...pnls))]?.date:"—"],
                  ["Avg Win",     fmtINR(avgWin,true),  P.green,  `${winDays2.length} winning days`],
                  ["Max Drawdown",maxDD>0?`-${maxDD.toFixed(1)}%`:"—", P.red, "Peak → trough drop"],
                ].map(([k,v,c,sub])=>(
                  <div key={k} style={{background:P.faint+"33",borderRadius:10,padding:"13px 14px",border:`1px solid ${P.border}`}}>
                    <div style={{fontSize:9,color:P.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6}}>{k}</div>
                    <div className="mono" style={{fontSize:16,fontWeight:700,color:c,marginBottom:4}}>{v}</div>
                    <div style={{fontSize:10,color:P.muted}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* ── Chart 1: Daily P&L bars ── */}
              <Card>
                <SectionTitle>Daily P&L Distribution</SectionTitle>
                {chartData.length===0
                  ? <div style={{textAlign:"center",padding:"48px 0",color:P.faint,fontSize:12}}>No trade data yet.</div>
                  : <>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} margin={{top:10,right:20,left:10,bottom:20}}
                        barCategoryGap="20%">
                        <CartesianGrid vertical={false} stroke={P.faint} strokeDasharray="3 5"/>
                        <XAxis dataKey="date" tick={{fill:P.muted,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}
                          tickLine={false} axisLine={{stroke:P.border}} interval="preserveStartEnd"
                          angle={-35} textAnchor="end" height={36}/>
                        <YAxis tick={{fill:P.muted,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}
                          tickLine={false} axisLine={false} width={58}
                          tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v<=-1000?`${(v/1000).toFixed(0)}k`:v}/>
                        <ReferenceLine y={0} stroke={P.border2} strokeWidth={1.5}/>
                        <Tooltip content={<CustomTooltipPnL/>} cursor={{fill:"rgba(255,255,255,.03)"}}/>
                        <Bar dataKey="pnl" radius={[3,3,0,0]} maxBarSize={32}>
                          {chartData.map((d,i)=>(
                            <Cell key={i} fill={d.pnl>=0?P.green:P.red}
                              fillOpacity={0.85}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{display:"flex",gap:20,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}>
                      {[[P.green,"Profit day"],[P.red,"Loss day"]].map(([c,l])=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:P.muted}}>
                          <div style={{width:10,height:10,borderRadius:3,background:c,opacity:.8}}/>{l}
                        </div>
                      ))}
                    </div>
                  </>
                }
              </Card>

              {/* ── Chart 2: Cumulative P&L ── */}
              <Card>
                <SectionTitle>Cumulative P&L (₹)</SectionTitle>
                {chartData.length<2
                  ? <div style={{textAlign:"center",padding:"48px 0",color:P.faint,fontSize:12}}>Need 2+ trade days.</div>
                  : <>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{top:10,right:20,left:10,bottom:20}}>
                        <defs>
                          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={chartData[chartData.length-1].cumPnl>=0?P.green:P.red} stopOpacity={0.25}/>
                            <stop offset="95%" stopColor={chartData[chartData.length-1].cumPnl>=0?P.green:P.red} stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={P.faint} strokeDasharray="3 5"/>
                        <XAxis dataKey="date" tick={{fill:P.muted,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}
                          tickLine={false} axisLine={{stroke:P.border}} interval="preserveStartEnd"
                          angle={-35} textAnchor="end" height={36}/>
                        <YAxis tick={{fill:P.muted,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}
                          tickLine={false} axisLine={false} width={62}
                          tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v<=-1000?`${(v/1000).toFixed(0)}k`:v}/>
                        <ReferenceLine y={0} stroke={P.border2} strokeWidth={1.5} strokeDasharray="4 3"/>
                        <Tooltip content={<CustomTooltipCum/>}/>
                        <Area type="monotone" dataKey="cumPnl"
                          stroke={chartData[chartData.length-1].cumPnl>=0?P.green:P.red}
                          strokeWidth={2.5} fill="url(#cumGrad)" dot={false}
                          activeDot={{r:5,strokeWidth:0}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                }
              </Card>

              {/* ── Chart 3: Capital Growth % ── */}
              <Card>
                <SectionTitle>Capital Growth (%)</SectionTitle>
                {chartData.length<2
                  ? <div style={{textAlign:"center",padding:"48px 0",color:P.faint,fontSize:12}}>Need 2+ trade days.</div>
                  : <>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{top:10,right:20,left:10,bottom:20}}>
                        <defs>
                          <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={chartData[chartData.length-1].growthPct>=0?P.purple:P.red} stopOpacity={0.22}/>
                            <stop offset="95%" stopColor={chartData[chartData.length-1].growthPct>=0?P.purple:P.red} stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={P.faint} strokeDasharray="3 5"/>
                        <XAxis dataKey="date" tick={{fill:P.muted,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}
                          tickLine={false} axisLine={{stroke:P.border}} interval="preserveStartEnd"
                          angle={-35} textAnchor="end" height={36}/>
                        <YAxis tick={{fill:P.muted,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}
                          tickLine={false} axisLine={false} width={52}
                          tickFormatter={v=>`${v.toFixed(1)}%`}/>
                        <ReferenceLine y={0} stroke={P.border2} strokeWidth={1.5} strokeDasharray="4 3"/>
                        <Tooltip content={<CustomTooltipGrowth/>}/>
                        <Area type="monotone" dataKey="growthPct"
                          stroke={chartData[chartData.length-1].growthPct>=0?P.purple:P.red}
                          strokeWidth={2.5} fill="url(#growGrad)" dot={false}
                          activeDot={{r:5,strokeWidth:0}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                    {/* Growth summary row */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,
                      marginTop:18,paddingTop:16,borderTop:`1px solid ${P.border}`}}>
                      {[
                        ["Total Return",  fmtINR(chartData[chartData.length-1]?.cumPnl||0,true), (chartData[chartData.length-1]?.cumPnl||0)>=0?P.green:P.red, "Cumulative P&L"],
                        ["Growth %",      fmtROI(chartData[chartData.length-1]?.growthPct||0),   (chartData[chartData.length-1]?.growthPct||0)>=0?P.purple:P.red, "vs starting capital"],
                        ["Peak Capital",  fmtINR(Math.max(...capPoints,capital||0)),              P.green, "Highest point reached"],
                      ].map(([k,v,c,sub])=>(
                        <div key={k} style={{background:P.faint+"33",borderRadius:10,padding:"13px 14px",border:`1px solid ${P.border}`}}>
                          <div style={{fontSize:9,color:P.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6}}>{k}</div>
                          <div className="mono" style={{fontSize:16,fontWeight:700,color:c,marginBottom:4}}>{v}</div>
                          <div style={{fontSize:10,color:P.muted}}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </>
                }
              </Card>
            </>
          );
        })()}

                {/* ══════════════════════════════
            SETTINGS TAB
        ══════════════════════════════ */}
        {tab==="settings" && (
          <Card>
            <SectionTitle>Settings</SectionTitle>
            <div style={{maxWidth:460}}>

              {/* Capital block */}
              <div style={{
                background:`linear-gradient(135deg,${P.amberGlow}.07),${P.amberGlow}.03))`,
                border:`1px solid ${P.amberGlow}.28)`,
                borderRadius:14,padding:"20px 22px",marginBottom:22,
                boxShadow:`0 0 36px ${P.amberGlow}.05)`,
              }}>
                <div style={{fontSize:9,fontWeight:700,color:P.amber,letterSpacing:"0.2em",
                  textTransform:"uppercase",marginBottom:8}}>Starting Capital</div>
                <div className="mono" style={{fontSize:26,fontWeight:700,color:P.text,marginBottom:6}}>
                  {fmtINR(capital)}
                </div>
                <div style={{fontSize:11,color:P.muted,lineHeight:1.7}}>
                  Update when you add fresh funds to your trading account. Existing P&L entries are preserved.
                </div>
              </div>

              {!editingCap
                ? <Btn onClick={()=>{setEditingCap(true);setNewCap(String(capital));}}
                    style={{marginBottom:26}}>✎ Edit Starting Capital</Btn>
                : <div style={{marginBottom:26}}>
                    <Lbl>New Starting Capital (₹)</Lbl>
                    <div style={{display:"flex",gap:9}}>
                      <Inp value={newCap} onChange={e=>setNewCap(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&handleCapEdit()}
                        style={{flex:1}} autoFocus/>
                      <Btn onClick={handleCapEdit}>Save</Btn>
                      <Btn variant="secondary"
                        onClick={()=>{setEditingCap(false);setNewCap("");}}>Cancel</Btn>
                    </div>
                  </div>
              }

              <HR/>

              {/* Export */}
              <div style={{fontSize:9,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
                textTransform:"uppercase",marginBottom:10}}>Export Data</div>
              <div style={{fontSize:11,color:P.muted,lineHeight:1.8,marginBottom:16}}>
                Download your full journal as a CSV file. Opens in Excel, Google Sheets, or Numbers.
                Includes Date, Type, Instrument, P&L, Withdrawal, Daily ROI%, and Notes.
              </div>
              <Btn onClick={()=>exportCSV(entries,capital)} style={{marginBottom:28}}>
                ⬇ Export Journal as CSV
              </Btn>

              <HR/>

              {/* Summary table */}
              <div style={{fontSize:9,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
                textTransform:"uppercase",marginBottom:16}}>Journal Summary</div>
              {[
                ["Starting Capital",  fmtINR(capital),                          P.sub],
                ["Net P&L",           fmtINR(totalPnl,true),                    pnlClr(totalPnl)],
                ["Total Withdrawn",   fmtINR(totalWd),                          P.amber],
                ["Current Capital",   fmtINR(curCap),                           curCap>=capital?P.green:P.red],
                ["Overall ROI",       fmtROI(overallROI),                       roiClr(overallROI)],
                ["Total Trade Days",  String(tradeDays.length),                  P.sub],
                ["Win Days",          String(wins),                              P.green],
                ["Loss Days",         String(losses),                            P.red],
                ["Win Rate",          winRate!=null?`${winRate}%`:"—",          winRate>=50?P.green:P.red],
                ["Current Streak",    streak>0?`🔥 ${streak} wins`:"—",        P.amber],
              ].map(([k,v,c]) => (
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"10px 0",borderBottom:`1px solid ${P.border}`,fontSize:12}}>
                  <span style={{color:P.sub}}>{k}</span>
                  <span className="mono" style={{color:c,fontWeight:700}}>{v}</span>
                </div>
              ))}

              <HR mt={28} mb={20}/>

              {/* Reset Journal */}
              <div style={{fontSize:9,fontWeight:700,color:P.muted,letterSpacing:"0.2em",
                textTransform:"uppercase",marginBottom:12}}>Danger Zone</div>

              {!confirmReset ? (
                <div>
                  <div style={{fontSize:11,color:P.muted,lineHeight:1.8,marginBottom:14}}>
                    Wipe all entries and capital to start fresh. Use this before your first real trading day if you were testing.
                  </div>
                  <Btn variant="danger" onClick={()=>setConfirmReset(true)}
                    style={{fontSize:11,padding:"9px 18px"}}>
                    🗑 Reset Journal
                  </Btn>
                </div>
              ) : (
                <div style={{
                  background:"rgba(255,69,96,.07)",border:"1px solid rgba(255,69,96,.3)",
                  borderRadius:12,padding:"18px 20px",
                }}>
                  <div style={{fontSize:13,fontWeight:700,color:P.red,marginBottom:8}}>
                    Are you sure?
                  </div>
                  <div style={{fontSize:11,color:P.muted,lineHeight:1.8,marginBottom:16}}>
                    This will permanently delete <strong style={{color:P.text}}>all {Object.keys(entries).length} entries</strong> and reset your capital. This cannot be undone.
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <Btn variant="danger" onClick={handleReset}
                      style={{fontSize:11}}>Yes, reset everything</Btn>
                    <Btn variant="secondary" onClick={()=>setConfirmReset(false)}
                      style={{fontSize:11}}>Cancel</Btn>
                  </div>
                </div>
              )}

            </div>
          </Card>
        )}
      </div>

      {/* ══════════════════════════════
          MODAL
      ══════════════════════════════ */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",
          backdropFilter:"blur(10px)",zIndex:200,display:"flex",
          alignItems:"center",justifyContent:"center"}}
          onClick={e=>e.target===e.currentTarget&&closeModal()}>

          <div className="modal-body" style={{
            background:"linear-gradient(150deg,#131C32 0%,#0D1224 55%,#090C1C 100%)",
            border:`1px solid ${P.border2}`,borderRadius:20,padding:"32px 36px",
            width:510,maxWidth:"96vw",
            boxShadow:`0 50px 120px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.05)`,
          }}>
            {/* Modal header */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:16,fontWeight:800,color:P.text,letterSpacing:"-0.01em"}}>
                {modal.isEdit ? "Edit Entry" : "Log Entry"}
              </div>
              <div className="mono" style={{fontSize:11,color:P.muted,marginTop:4,letterSpacing:"0.1em"}}>
                {modal.date}
                {modal.date===todayKey()&&
                  <span style={{marginLeft:10,color:P.amber,fontSize:9,fontWeight:700,
                    background:`${P.amber}18`,padding:"2px 8px",borderRadius:5}}>TODAY</span>}
              </div>
            </div>

            {/* Day type */}
            <div style={{marginBottom:20}}>
              <Lbl>Day Type</Lbl>
              <div style={{display:"flex",gap:9}}>
                <Chip label="📊 Trade Day"  active={modal.entry.type==="trade"}   color={P.green} onClick={()=>updM("type","trade")}/>
                <Chip label="⏸ Skipped"    active={modal.entry.type==="skip"}    color={P.sub}   onClick={()=>updM("type","skip")}/>
                <Chip label="🏖 Holiday"   active={modal.entry.type==="holiday"} color={P.amber} onClick={()=>updM("type","holiday")}/>
              </div>
            </div>

            {modal.entry.type==="trade" && (<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
                <div>
                  <Lbl>Instrument</Lbl>
                  <Sel value={modal.entry.instrument} onChange={e=>updM("instrument",e.target.value)}>
                    <option value="">Select…</option>
                    {INSTRUMENTS.map(i=><option key={i} value={i}>{i}</option>)}
                  </Sel>
                </div>
                <div>
                  <Lbl>P&L Amount (₹)</Lbl>
                  <Inp type="number" placeholder="−5000 or +8000"
                    value={modal.entry.pnl} onChange={e=>updM("pnl",e.target.value)}
                    style={{
                      color: modal.entry.pnl===""?P.text : Number(modal.entry.pnl)>=0?P.green:P.red,
                      fontWeight:700,
                    }}/>
                  <div style={{fontSize:9,color:P.muted,marginTop:5}}>Negative value = loss</div>
                </div>
              </div>

              <div style={{marginBottom:18}}>
                <Lbl>Withdrawal from Today's Profit (₹) — optional</Lbl>
                <Inp type="number" placeholder="0"
                  value={modal.entry.withdrawal} onChange={e=>updM("withdrawal",e.target.value)}
                  style={{color:P.amber}}/>
                <div style={{fontSize:9,color:P.muted,marginTop:5}}>
                  Reduces capital pool. Does not affect P&L.
                </div>
              </div>
            </>)}

            <div style={{marginBottom:6}}>
              <Lbl>Notes</Lbl>
              <Txtarea
                placeholder={
                  modal.entry.type==="trade"    ? "Strategy, market conditions, lessons learned…" :
                  modal.entry.type==="holiday"  ? "Holiday name…" :
                  "Reason for skipping…"
                }
                value={modal.entry.notes} onChange={e=>updM("notes",e.target.value)}/>
            </div>

            <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:26}}>
              {modal.isEdit && <Btn variant="danger" onClick={handleDel}>Delete</Btn>}
              <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
              <Btn onClick={handleSave}>{modal.isEdit?"Update Entry":"Save Entry"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
