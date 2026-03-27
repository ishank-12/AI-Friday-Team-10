import { useState, useEffect, useRef, useCallback } from "react";

// ─── AZURE OPENAI CONFIG ─────────────────────────────────────────────────────
// Replace these with your actual Azure credentials
const AZURE_CONFIG = {
  endpoint: "https://genailab-maas-gpt-4o.openai.azure.com",
  apiKey: "YOUR_AZURE_API_KEY_HERE",        // ← paste your key here
  deployment: "gpt-4o",
  apiVersion: "2024-02-15-preview",
};

async function callAzureGPT(messages, systemPrompt) {
  const url = `${AZURE_CONFIG.endpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_CONFIG.apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response received.";
}

// ─── SYNTHETIC DATA ───────────────────────────────────────────────────────────
const MACHINE_TYPES = {
  compressor: { interval: 720, costPerHour: 420, icon: "⚙️", category: "Pneumatic", failureMode: "Seal degradation, bearing wear" },
  pump:       { interval: 500, costPerHour: 280, icon: "💧", category: "Fluid",     failureMode: "Cavitation, impeller corrosion" },
  conveyor:   { interval: 600, costPerHour: 190, icon: "🔄", category: "Transport", failureMode: "Belt slippage, roller seizure" },
  turbine:    { interval: 1000, costPerHour: 680, icon: "🌀", category: "Power",    failureMode: "Blade fatigue, vibration imbalance" },
  press:      { interval: 400, costPerHour: 350, icon: "🔩", category: "Forming",   failureMode: "Die misalignment, hydraulic leak" },
  robot:      { interval: 800, costPerHour: 520, icon: "🤖", category: "Automation",failureMode: "Joint wear, encoder drift" },
  generator:  { interval: 900, costPerHour: 750, icon: "⚡", category: "Power",     failureMode: "Winding insulation, brush wear" },
  mixer:      { interval: 300, costPerHour: 160, icon: "🔁", category: "Processing",failureMode: "Agitator shaft fatigue, seal leak" },
};

const MACHINES = [
  { id:"M01", name:"Alpha Compressor",    type:"compressor", location:"Zone A", age:4.2, hoursUsed:8420,  lastService:58,  usageIntensity:0.92 },
  { id:"M02", name:"Beta Pump Station",   type:"pump",       location:"Zone A", age:2.1, hoursUsed:4100,  lastService:12,  usageIntensity:0.65 },
  { id:"M03", name:"Conveyor Line 1",     type:"conveyor",   location:"Zone B", age:6.8, hoursUsed:12300, lastService:89,  usageIntensity:0.88 },
  { id:"M04", name:"Turbine Unit T1",     type:"turbine",    location:"Zone C", age:3.5, hoursUsed:6800,  lastService:34,  usageIntensity:0.74 },
  { id:"M05", name:"Hydraulic Press P1",  type:"press",      location:"Zone B", age:5.1, hoursUsed:9200,  lastService:120, usageIntensity:0.98 },
  { id:"M06", name:"Robot Arm R-7",       type:"robot",      location:"Zone D", age:1.8, hoursUsed:3100,  lastService:8,   usageIntensity:0.55 },
  { id:"M07", name:"Gamma Generator",     type:"generator",  location:"Zone C", age:7.2, hoursUsed:15400, lastService:145, usageIntensity:0.82 },
  { id:"M08", name:"Mixer Unit MX2",      type:"mixer",      location:"Zone A", age:2.9, hoursUsed:5500,  lastService:95,  usageIntensity:0.91 },
  { id:"M09", name:"Delta Compressor",    type:"compressor", location:"Zone D", age:3.3, hoursUsed:6200,  lastService:22,  usageIntensity:0.71 },
  { id:"M10", name:"Pump Station P2",     type:"pump",       location:"Zone B", age:4.7, hoursUsed:8900,  lastService:67,  usageIntensity:0.85 },
  { id:"M11", name:"Conveyor Line 2",     type:"conveyor",   location:"Zone A", age:1.5, hoursUsed:2800,  lastService:5,   usageIntensity:0.48 },
  { id:"M12", name:"Turbine Unit T2",     type:"turbine",    location:"Zone C", age:5.9, hoursUsed:11200, lastService:78,  usageIntensity:0.79 },
  { id:"M13", name:"Press Unit P2",       type:"press",      location:"Zone D", age:2.4, hoursUsed:4600,  lastService:18,  usageIntensity:0.62 },
  { id:"M14", name:"Robot Arm R-12",      type:"robot",      location:"Zone B", age:3.8, hoursUsed:7100,  lastService:110, usageIntensity:0.94 },
  { id:"M15", name:"Epsilon Generator",   type:"generator",  location:"Zone A", age:6.1, hoursUsed:13000, lastService:38,  usageIntensity:0.77 },
  { id:"M16", name:"Mixer Unit MX5",      type:"mixer",      location:"Zone C", age:1.2, hoursUsed:2100,  lastService:3,   usageIntensity:0.41 },
  { id:"M17", name:"Omega Compressor",    type:"compressor", location:"Zone B", age:8.4, hoursUsed:17200, lastService:200, usageIntensity:0.96 },
  { id:"M18", name:"Coolant Pump P3",     type:"pump",       location:"Zone D", age:3.1, hoursUsed:5900,  lastService:44,  usageIntensity:0.69 },
  { id:"M19", name:"Assembly Robot R-3",  type:"robot",      location:"Zone A", age:4.5, hoursUsed:8600,  lastService:55,  usageIntensity:0.83 },
  { id:"M20", name:"Press Unit P3",       type:"press",      location:"Zone C", age:2.7, hoursUsed:5100,  lastService:31,  usageIntensity:0.72 },
];

// Maintenance history per machine (synthetic)
const HISTORY = {
  M01: [{ date:"2024-09-10", type:"Preventive", outcome:"Passed", tech:"J.Kumar" },{ date:"2024-11-05", type:"Corrective", outcome:"Seal replaced", tech:"R.Singh" }],
  M03: [{ date:"2024-08-20", type:"Preventive", outcome:"Belt tension adjusted", tech:"P.Rao" }],
  M05: [{ date:"2024-07-15", type:"Corrective", outcome:"Hydraulic fluid top-up", tech:"A.Mehta" },{ date:"2024-05-01", type:"Preventive", outcome:"Passed", tech:"J.Kumar" }],
  M07: [{ date:"2024-06-12", type:"Major Overhaul", outcome:"Brushes replaced", tech:"V.Nair" }],
  M14: [{ date:"2024-10-30", type:"Corrective", outcome:"Joint lubrication", tech:"R.Singh" }],
  M17: [{ date:"2024-03-22", type:"Preventive", outcome:"Failed — deferred", tech:"A.Mehta" }],
};

function computeRisk(machine) {
  const spec = MACHINE_TYPES[machine.type];
  const overdueRatio   = machine.lastService / spec.interval;
  const ageScore       = Math.min(machine.age / 10, 1);
  const intensityScore = machine.usageIntensity;
  const hoursScore     = Math.min(machine.hoursUsed / 20000, 1);
  const composite = overdueRatio * 0.45 + intensityScore * 0.25 + ageScore * 0.15 + hoursScore * 0.15;
  const riskScore = Math.min(Math.round(composite * 100), 100);
  let tier, color, bg;
  if (riskScore >= 75)      { tier="Critical";  color="#ef4444"; bg="#fef2f2"; }
  else if (riskScore >= 50) { tier="Warning";   color="#f59e0b"; bg="#fffbeb"; }
  else if (riskScore >= 25) { tier="Scheduled"; color="#3b82f6"; bg="#eff6ff"; }
  else                       { tier="Healthy";   color="#10b981"; bg="#f0fdf4"; }
  const daysUntilService = Math.max(1, Math.round((spec.interval - machine.lastService) * (1 - machine.usageIntensity * 0.3)));
  const costOfDelay      = Math.round(spec.costPerHour * 8 * (riskScore / 100) * 1.4);
  const recommendedDate  = new Date();
  recommendedDate.setDate(recommendedDate.getDate() + Math.max(1, Math.min(daysUntilService, 30)));
  const failureProbability = Math.min(99, Math.round(riskScore * 1.1));
  return { riskScore, tier, color, bg, daysUntilService, costOfDelay, recommendedDate, spec, failureProbability };
}

const ENRICHED = MACHINES.map(m => ({ ...m, risk: computeRisk(m), history: HISTORY[m.id] || [] }));

// ─── STYLES ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f4f6fb;--surface:#fff;--surface2:#f0f3f9;--surface3:#e8ecf5;
  --border:#dde3ef;--border2:#e8ecf5;
  --text:#0d1526;--text2:#4a5568;--text3:#8a98b0;
  --accent:#2563eb;--accent-h:#1d4ed8;--accent-bg:#eff6ff;
  --purple:#7c3aed;--purple-bg:#f5f3ff;
  --red:#ef4444;--red-bg:#fef2f2;
  --amber:#f59e0b;--amber-bg:#fffbeb;
  --green:#10b981;--green-bg:#f0fdf4;
  --r:12px;--r-sm:8px;--r-xs:6px;
  --sh:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
  --sh-md:0 4px 16px rgba(15,23,42,.08),0 2px 6px rgba(15,23,42,.04);
  --sh-lg:0 12px 40px rgba(15,23,42,.10),0 4px 10px rgba(15,23,42,.05);
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);line-height:1.5;font-size:14px}
/* Layout */
.app{display:flex;height:100vh;overflow:hidden}
.sidebar{width:228px;min-width:228px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:0;z-index:10}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
/* Sidebar */
.sb-logo{padding:18px 20px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:10px}
.sb-logo-mark{width:34px;height:34px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.sb-logo-name{font-weight:700;font-size:15px;letter-spacing:-.3px}
.sb-logo-tag{font-size:10px;color:var(--text3);font-weight:500;letter-spacing:.6px;text-transform:uppercase}
.nav{padding:12px 10px;flex:1;overflow-y:auto}
.nav-group{font-size:10px;font-weight:700;color:var(--text3);letter-spacing:1.2px;text-transform:uppercase;padding:14px 10px 6px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--r-sm);cursor:pointer;font-size:13.5px;font-weight:500;color:var(--text2);transition:all .14s;margin-bottom:1px;user-select:none;position:relative}
.nav-item:hover{background:var(--surface2);color:var(--text)}
.nav-item.active{background:var(--accent-bg);color:var(--accent);font-weight:600}
.nav-item .ni{font-size:15px;width:22px;text-align:center;flex-shrink:0}
.nav-badge{margin-left:auto;background:var(--red);color:#fff;font-size:10px;font-weight:700;border-radius:99px;padding:1px 7px}
.sb-footer{padding:14px 20px;border-top:1px solid var(--border2)}
.sb-plant-label{font-size:10.5px;color:var(--text3);font-weight:500;margin-bottom:2px}
.sb-plant-name{font-size:13px;font-weight:700}
.sb-api-status{display:flex;align-items:center;gap:5px;margin-top:8px;font-size:11px;color:var(--text3)}
.sb-api-dot{width:6px;height:6px;border-radius:50%}
/* Topbar */
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:60px;display:flex;align-items:center;gap:14px;flex-shrink:0}
.topbar-left{flex:1;min-width:0}
.topbar-title{font-size:16px;font-weight:700;letter-spacing:-.3px}
.topbar-sub{font-size:12px;color:var(--text3);margin-top:1px}
.topbar-right{display:flex;gap:10px;align-items:center}
/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r-sm);font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:inherit;white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{background:var(--accent-h)}
.btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}.btn-ghost:hover{background:var(--surface2);color:var(--text)}
.btn-danger{background:var(--red);color:#fff}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-xs{padding:3px 8px;font-size:11px;border-radius:var(--r-xs)}
/* Content */
.content{flex:1;overflow-y:auto;padding:24px 28px}
/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh)}
.card-header{padding:15px 20px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.card-title{font-size:13.5px;font-weight:700;color:var(--text)}
.card-sub{font-size:11.5px;color:var(--text3);margin-top:2px}
.card-body{padding:20px}
/* KPI Strip */
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;position:relative;overflow:hidden;box-shadow:var(--sh)}
.kpi::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--kc,var(--accent))}
.kpi-label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:7px}
.kpi-value{font-size:26px;font-weight:700;letter-spacing:-1px;font-family:'DM Mono',monospace}
.kpi-trend{font-size:11.5px;color:var(--text3);margin-top:4px}
.kpi-icon{position:absolute;right:14px;top:14px;font-size:22px;opacity:.12}
/* Machine Grid */
.machine-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(192px,1fr));gap:10px;padding:14px}
.tile{border:1px solid var(--border);border-radius:var(--r-sm);padding:13px;cursor:pointer;transition:all .16s;background:var(--surface);position:relative;overflow:hidden}
.tile:hover{box-shadow:var(--sh-md);transform:translateY(-1px);border-color:var(--accent)}
.tile.sel{border-color:var(--accent);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.tile-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.tile-icon{font-size:20px}
.tile-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;text-transform:uppercase;letter-spacing:.2px}
.tile-name{font-size:12.5px;font-weight:700;margin-bottom:1px;line-height:1.3}
.tile-meta{font-size:10.5px;color:var(--text3);margin-bottom:9px}
.bar-track{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
.bar-fill{height:100%;border-radius:2px;transition:width .5s}
.bar-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
.pulse{animation:pulse 2s infinite}
/* Zones */
.zone-tabs{display:flex;gap:6px;padding:0 14px 10px;flex-wrap:wrap}
.ztab{padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--text2);transition:all .12s;font-family:inherit}
.ztab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
/* Priority */
.pq-list{padding:6px}
.pq-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-sm);cursor:pointer;transition:background .12s;border:1px solid transparent;margin-bottom:2px}
.pq-item:hover{background:var(--surface2)}
.pq-item.sel{background:var(--accent-bg);border-color:#bfdbfe}
.pq-rank{font-size:11px;font-weight:700;color:var(--text3);width:22px;text-align:center;font-family:'DM Mono',monospace;flex-shrink:0}
.pq-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.pq-info{flex:1;min-width:0}
.pq-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pq-detail{font-size:11px;color:var(--text3)}
.pq-score{font-size:13px;font-weight:700;font-family:'DM Mono',monospace;min-width:30px;text-align:right}
/* Detail Panel */
.detail-wrap{padding:20px}
.detail-top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.detail-icon{font-size:30px}
.detail-name{font-size:17px;font-weight:800;letter-spacing:-.4px}
.detail-loc{font-size:12px;color:var(--text3);margin-top:2px}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.stat-box{background:var(--surface2);border-radius:var(--r-sm);padding:10px 12px}
.stat-lbl{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.stat-val{font-size:16px;font-weight:700;font-family:'DM Mono',monospace}
.stat-unit{font-size:10.5px;color:var(--text3);font-weight:400}
.cost-box{border-radius:var(--r-sm);padding:12px 14px;margin-bottom:14px;border:1px solid}
.cost-title{font-size:13px;font-weight:700;margin-bottom:2px}
.cost-sub{font-size:11.5px;opacity:.8}
.sep{height:1px;background:var(--border2);margin:12px 0}
.ai-rec{font-size:12.5px;line-height:1.6;background:var(--surface2);padding:11px 13px;border-radius:var(--r-sm);color:var(--text)}
/* History */
.hist-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border2);font-size:12px}
.hist-row:last-child{border-bottom:none}
.hist-date{color:var(--text3);font-family:'DM Mono',monospace;flex-shrink:0;width:80px}
.hist-type{font-weight:600}
.hist-out{color:var(--text2);flex:1}
/* Schedule Board */
.sched-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:14px}
.sched-col{background:var(--surface2);border-radius:var(--r-sm);padding:12px;min-height:200px;transition:background .15s}
.sched-col.drag-over{background:#dbeafe}
.sched-col-head{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.sched-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:9px 11px;margin-bottom:7px;cursor:grab;transition:box-shadow .14s;user-select:none}
.sched-card:hover{box-shadow:var(--sh-md)}
.sched-card.dragging{opacity:.4}
.sched-card-name{font-size:12px;font-weight:700;margin-bottom:2px}
.sched-card-meta{font-size:10.5px;color:var(--text3)}
.sched-card-foot{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
/* AI Chat */
.chat-wrap{display:flex;flex-direction:column;height:540px}
.chat-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.msg{display:flex;gap:9px;align-items:flex-start}
.msg.user{flex-direction:row-reverse}
.avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.avatar.ai{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff}
.avatar.user{background:var(--surface2);color:var(--text2);border:1px solid var(--border)}
.bubble{max-width:78%;padding:9px 13px;border-radius:11px;font-size:13px;line-height:1.55}
.bubble.ai{background:var(--surface2);border-radius:11px 11px 11px 2px}
.bubble.user{background:var(--accent);color:#fff;border-radius:11px 11px 2px 11px}
.chat-sugs{padding:8px 14px 10px;display:flex;gap:7px;flex-wrap:wrap}
.sug{font-size:11.5px;padding:5px 11px;border:1px solid var(--border);border-radius:99px;cursor:pointer;color:var(--text2);background:var(--surface);transition:all .12s;font-family:inherit}
.sug:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}
.chat-input-row{padding:11px 14px;border-top:1px solid var(--border2);display:flex;gap:9px}
.chat-input{flex:1;border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 13px;font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;resize:none;background:var(--surface2)}
.chat-input:focus{border-color:var(--accent);background:var(--surface)}
.api-banner{background:var(--amber-bg);border:1px solid #fcd34d;border-radius:var(--r-sm);padding:10px 14px;font-size:12px;color:#92400e;margin:12px 14px 0;display:flex;align-items:center;gap:8px}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
.dots span{display:inline-block;width:4px;height:4px;background:var(--text3);border-radius:50%;margin:0 1.5px;animation:bounce 1.1s infinite}
.dots span:nth-child(2){animation-delay:.18s}.dots span:nth-child(3){animation-delay:.36s}
/* Analytics bars */
.a-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.a-bar-lbl{font-size:12px;font-weight:600;width:120px;flex-shrink:0}
.a-bar-track{flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden}
.a-bar-fill{height:100%;border-radius:4px;transition:width .6s}
.a-bar-val{font-size:12px;font-weight:700;font-family:'DM Mono',monospace;width:50px;text-align:right}
/* Timeline */
.tl-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border2)}
.tl-row:last-child{border-bottom:none}
.tl-date{font-size:11px;font-weight:700;color:var(--text3);width:72px;flex-shrink:0;font-family:'DM Mono',monospace}
.tl-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.tl-name{font-size:12.5px;font-weight:600;flex:1}
.tl-type{font-size:11px;color:var(--text3)}
.tl-cost{font-size:12px;font-weight:700;color:var(--purple);font-family:'DM Mono',monospace}
/* Modal */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:50;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.modal{background:var(--surface);border-radius:14px;padding:26px;width:430px;box-shadow:var(--sh-lg)}
.modal-title{font-size:16px;font-weight:800;margin-bottom:4px}
.modal-sub{font-size:12.5px;color:var(--text3);margin-bottom:18px}
.form-lbl{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:block}
.form-ctrl{width:100%;border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 11px;font-size:13px;font-family:inherit;outline:none;transition:border-color .14s;margin-bottom:14px}
.form-ctrl:focus{border-color:var(--accent)}
/* Settings Panel */
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border2)}
.settings-row:last-child{border-bottom:none}
.settings-lbl{font-size:13px;font-weight:600}
.settings-sub{font-size:11.5px;color:var(--text3)}
.settings-input{border:1px solid var(--border);border-radius:var(--r-sm);padding:6px 10px;font-size:12.5px;font-family:'DM Mono',monospace;width:260px;outline:none}
.settings-input:focus{border-color:var(--accent)}
/* Scrollbar */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
/* Utility */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.three-col{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px}
.mb16{margin-bottom:16px}
.tag{display:inline-flex;align-items:center;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:99px;text-transform:uppercase;letter-spacing:.2px}
.empty{text-align:center;padding:36px 20px;color:var(--text3)}
.empty-icon{font-size:32px;margin-bottom:8px}
.empty-text{font-size:13px}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function Badge({ tier, color }) {
  return <span className="tile-badge" style={{ background: color + "22", color }}>{tier}</span>;
}
function Tag({ label, color }) {
  return <span className="tag" style={{ background: color + "22", color }}>{label}</span>;
}
function Kpi({ label, value, trend, icon, color }) {
  return (
    <div className="kpi" style={{ "--kc": color }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-trend">{trend}</div>
    </div>
  );
}

// ─── COMMAND CENTER ──────────────────────────────────────────────────────────
function CommandCenter({ machines, selected, onSelect }) {
  const [zone, setZone] = useState("All");
  const zones = ["All", "Zone A", "Zone B", "Zone C", "Zone D"];
  const filtered = zone === "All" ? machines : machines.filter(m => m.location === zone);

  const critical = machines.filter(m => m.risk.tier === "Critical").length;
  const warning  = machines.filter(m => m.risk.tier === "Warning").length;
  const avgRisk  = Math.round(machines.reduce((s, m) => s + m.risk.riskScore, 0) / machines.length);
  const totalCost = machines.reduce((s, m) => s + m.risk.costOfDelay, 0);

  return (
    <div>
      <div className="kpi-strip">
        <Kpi label="Critical Machines"  value={critical}  trend={`Immediate action required`} icon="🔴" color="var(--red)" />
        <Kpi label="Warning Status"     value={warning}   trend="Service overdue soon" icon="🟡" color="var(--amber)" />
        <Kpi label="Fleet Risk Score"   value={`${avgRisk}%`} trend="Composite across 20 machines" icon="📊" color="var(--purple)" />
        <Kpi label="Daily Delay Risk"   value={`$${Math.round(totalCost/1000)}K`} trend="If all maintenance deferred" icon="💰" color="var(--accent)" />
      </div>
      <div className="card mb16">
        <div className="card-header">
          <div>
            <div className="card-title">Equipment Health Map</div>
            <div className="card-sub">Click any tile to inspect · Pulse = critical urgency</div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center", fontSize:11, color:"var(--text3)" }}>
            {[["Critical","var(--red)"],["Warning","var(--amber)"],["Scheduled","var(--accent)"],["Healthy","var(--green)"]].map(([t,c])=>(
              <span key={t} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:c, display:"inline-block" }}/>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="zone-tabs">
          {zones.map(z => <button key={z} className={`ztab ${zone===z?"active":""}`} onClick={()=>setZone(z)}>{z}</button>)}
        </div>
        <div className="machine-grid">
          {filtered.map(m => (
            <div key={m.id} className={`tile ${m.risk.tier==="Critical"?"pulse":""} ${selected?.id===m.id?"sel":""}`} onClick={()=>onSelect(m)}>
              <div className="tile-head">
                <span className="tile-icon">{MACHINE_TYPES[m.type].icon}</span>
                <Badge tier={m.risk.tier} color={m.risk.color} />
              </div>
              <div className="tile-name">{m.name}</div>
              <div className="tile-meta">{m.id} · {m.location}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width:`${m.risk.riskScore}%`, background:m.risk.color }}/></div>
              <div className="bar-labels"><span>Risk</span><span style={{ color:m.risk.color, fontWeight:700 }}>{m.risk.riskScore}%</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MACHINE DETAIL ───────────────────────────────────────────────────────────
function MachineDetail({ machine, onClose }) {
  if (!machine) return (
    <div className="card" style={{ height:"100%" }}>
      <div className="empty"><div className="empty-icon">🔍</div><div className="empty-text">Select any machine to inspect</div></div>
    </div>
  );
  const { risk, history } = machine;
  const spec = MACHINE_TYPES[machine.type];
  return (
    <div className="card" style={{ position:"sticky", top:0 }}>
      <div className="card-header">
        <div className="card-title">Machine Inspection</div>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
      </div>
      <div className="detail-wrap" style={{ overflowY:"auto", maxHeight:"calc(100vh - 200px)" }}>
        <div className="detail-top">
          <span className="detail-icon">{spec.icon}</span>
          <div style={{ flex:1 }}>
            <div className="detail-name">{machine.name}</div>
            <div className="detail-loc">{machine.id} · {machine.location} · {spec.category}</div>
          </div>
          <Badge tier={risk.tier} color={risk.color} />
        </div>
        <div className="stat-grid">
          {[["Risk Score",`${risk.riskScore}%`,risk.color],["Days Since Svc",`${machine.lastService}d`,""],["Total Hours",`${machine.hoursUsed.toLocaleString()}h`,""],["Equipment Age",`${machine.age}yr`,""],["Usage Intensity",`${Math.round(machine.usageIntensity*100)}%`,""],["Svc Interval",`${spec.interval}h`,""]].map(([l,v,c])=>(
            <div key={l} className="stat-box">
              <div className="stat-lbl">{l}</div>
              <div className="stat-val" style={{ color:c||"var(--text)" }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="cost-box" style={{ borderColor:risk.color+"60", background:risk.bg }}>
          <div className="cost-title" style={{ color:risk.color }}>⚠️ Delay Cost: ${risk.costOfDelay.toLocaleString()} / day deferred</div>
          <div className="cost-sub" style={{ color:risk.color }}>Based on failure probability ({risk.failureProbability}%) × ${spec.costPerHour}/hr production cost</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, fontWeight:600, color:"var(--text2)", marginBottom:5 }}>
            <span>Degradation Index</span><span style={{ color:risk.color }}>{risk.riskScore}%</span>
          </div>
          <div className="bar-track" style={{ height:8 }}>
            <div className="bar-fill" style={{ width:`${risk.riskScore}%`, background:`linear-gradient(90deg,#10b981,${risk.color})` }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--text3)", marginTop:4 }}><span>Healthy</span><span>Critical</span></div>
        </div>
        <div className="sep"/>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:7 }}>Failure Risk Pattern</div>
        <div style={{ fontSize:12, color:"var(--text2)", marginBottom:14, padding:"10px 12px", background:"var(--surface2)", borderRadius:"var(--r-sm)", borderLeft:`3px solid ${risk.color}` }}>
          {spec.failureMode}
        </div>
        {history.length > 0 && <>
          <div className="sep"/>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:7 }}>Service History</div>
          {history.map((h,i) => (
            <div key={i} className="hist-row">
              <span className="hist-date">{h.date.slice(5)}</span>
              <span className="hist-type">{h.type}</span>
              <span className="hist-out">{h.outcome}</span>
              <span style={{ fontSize:10.5, color:"var(--text3)" }}>{h.tech}</span>
            </div>
          ))}
        </>}
        <div className="sep"/>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:7 }}>AI Recommendation</div>
        <div className="ai-rec">
          Schedule <strong>{machine.name}</strong> by{" "}
          <strong style={{ color:risk.color }}>{risk.recommendedDate.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</strong>.{" "}
          {risk.tier==="Critical" ? "⚡ Critical — immediate action required. Failure probability is high and compounding."
           : risk.tier==="Warning" ? "🔶 Schedule within 1–2 weeks to avoid unplanned downtime."
           : risk.tier==="Scheduled" ? "📅 On track. Confirm date and assign technician."
           : "✅ Healthy. Continue standard monitoring schedule."}
        </div>
      </div>
    </div>
  );
}

// ─── PRIORITY QUEUE ───────────────────────────────────────────────────────────
function PriorityQueue({ machines, selected, onSelect }) {
  const sorted = [...machines].sort((a,b)=>b.risk.riskScore-a.risk.riskScore);
  const [override, setOverride] = useState(null);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrides, setOverrides] = useState({});
  const tiers = ["Critical","Warning","Scheduled","Healthy"];
  const tc = { Critical:"var(--red)", Warning:"var(--amber)", Scheduled:"var(--accent)", Healthy:"var(--green)" };

  return (
    <div>
      <div className="three-col">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">AI-Ranked Priority Queue</div><div className="card-sub">Composite risk score · Click ✏️ to override</div></div>
          </div>
          <div className="pq-list">
            {sorted.map((m,i)=>(
              <div key={m.id} className={`pq-item ${selected?.id===m.id?"sel":""}`} onClick={()=>onSelect(m)}>
                <span className="pq-rank">#{i+1}</span>
                <span className="pq-dot" style={{ background:m.risk.color }}/>
                <div className="pq-info">
                  <div className="pq-name">{m.name}</div>
                  <div className="pq-detail">
                    {overrides[m.id]
                      ? `↪ Rescheduled → ${overrides[m.id].date}`
                      : `${m.risk.daysUntilService}d window · Last svc ${m.lastService}d ago`}
                  </div>
                </div>
                <div className="pq-score" style={{ color:m.risk.color }}>{m.risk.riskScore}</div>
                <button className="btn btn-ghost btn-xs" style={{ marginLeft:6 }}
                  onClick={e=>{ e.stopPropagation(); setOverride(m); setOverrideDate(""); setOverrideNote(""); }}>✏️</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Tier Breakdown</div></div>
            <div className="card-body">
              {tiers.map(t=>{
                const count = machines.filter(m=>m.risk.tier===t).length;
                return (
                  <div key={t} className="a-bar-row">
                    <span className="a-bar-lbl">{t}</span>
                    <div className="a-bar-track"><div className="a-bar-fill" style={{ width:`${(count/20)*100}%`, background:tc[t] }}/></div>
                    <span className="a-bar-val" style={{ color:tc[t] }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Upcoming Service</div></div>
            <div style={{ padding:"8px 16px 14px" }}>
              {sorted.slice(0,7).map(m=>{
                const d = m.risk.recommendedDate;
                return (
                  <div key={m.id} className="tl-row">
                    <span className="tl-date">{`${d.getMonth()+1}/${d.getDate()}`}</span>
                    <span className="tl-dot" style={{ background:m.risk.color }}/>
                    <div style={{ flex:1 }}>
                      <div className="tl-name">{m.name}</div>
                      <div className="tl-type">{MACHINE_TYPES[m.type].category}</div>
                    </div>
                    <span className="tl-cost">${m.risk.costOfDelay}/d</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {override && (
        <div className="overlay" onClick={()=>setOverride(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Override Schedule — {override.name}</div>
            <div className="modal-sub">AI recommendation: {override.risk.recommendedDate.toLocaleDateString()}</div>
            <label className="form-lbl">New Date</label>
            <input type="date" className="form-ctrl" value={overrideDate} onChange={e=>setOverrideDate(e.target.value)}/>
            <label className="form-lbl">Reason / Note</label>
            <input type="text" className="form-ctrl" placeholder="e.g. Plant shutdown window" value={overrideNote} onChange={e=>setOverrideNote(e.target.value)}/>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn btn-primary" onClick={()=>{ if(overrideDate) setOverrides(p=>({...p,[override.id]:{date:overrideDate,note:overrideNote}})); setOverride(null); }}>Confirm</button>
              <button className="btn btn-ghost" onClick={()=>setOverride(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCHEDULE BOARD ───────────────────────────────────────────────────────────
function ScheduleBoard({ machines }) {
  const getCol = m => m.risk.tier==="Critical"?"This Week":m.risk.tier==="Warning"?"Next Week":m.risk.tier==="Scheduled"?"This Month":"Next Quarter";
  const cols = ["This Week","Next Week","This Month","Next Quarter"];
  const icons = { "This Week":"🔥","Next Week":"⚡","This Month":"📅","Next Quarter":"🗓️" };
  const colColors = { "This Week":"var(--red)","Next Week":"var(--amber)","This Month":"var(--accent)","Next Quarter":"var(--green)" };
  const [board, setBoard] = useState(()=>{ const b={}; cols.forEach(c=>b[c]=[]); machines.forEach(m=>b[getCol(m)].push(m)); return b; });
  const [drag, setDrag] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">Maintenance Schedule Board</div><div className="card-sub">Drag cards to reschedule · AI-suggested columns · Cost shown per day delayed</div></div>
      </div>
      <div className="sched-cols">
        {cols.map(col=>(
          <div key={col} className={`sched-col ${dragOver===col?"drag-over":""}`}
            style={{ borderTop:`3px solid ${colColors[col]}` }}
            onDragOver={e=>{e.preventDefault();setDragOver(col)}}
            onDragLeave={()=>setDragOver(null)}
            onDrop={()=>{ if(!drag||drag.col===col){setDragOver(null);return;} setBoard(p=>{const nb={...p};nb[drag.col]=nb[drag.col].filter(m=>m.id!==drag.m.id);nb[col]=[...nb[col],drag.m];return nb;}); setDrag(null);setDragOver(null); }}>
            <div className="sched-col-head">
              {icons[col]} {col}
              <span style={{ marginLeft:"auto", background:"var(--surface)", borderRadius:99, padding:"1px 7px", fontSize:11, fontWeight:800 }}>{board[col].length}</span>
            </div>
            {board[col].map(m=>(
              <div key={m.id} className={`sched-card ${drag?.m?.id===m.id?"dragging":""}`} draggable
                onDragStart={()=>setDrag({m,col})} onDragEnd={()=>{setDrag(null);setDragOver(null);}}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <span style={{ fontSize:14 }}>{MACHINE_TYPES[m.type].icon}</span>
                  <span className="sched-card-name">{m.name}</span>
                </div>
                <div className="sched-card-meta">{m.id} · Risk {m.risk.riskScore}%</div>
                <div className="sched-card-foot">
                  <Tag label={m.risk.tier} color={m.risk.color}/>
                  <span style={{ fontSize:10.5, color:"var(--text3)", fontFamily:"'DM Mono',monospace" }}>${m.risk.costOfDelay}/d</span>
                </div>
              </div>
            ))}
            {board[col].length===0 && <div style={{ textAlign:"center", padding:"18px 0", color:"var(--text3)", fontSize:12 }}>Drop cards here</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI ADVISOR ──────────────────────────────────────────────────────────────
function AIAdvisor({ machines, apiKey, endpoint }) {
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:`Hello! I'm your MaintainIQ Advisor powered by Azure GPT-4o.\n\nI have live visibility into all 20 machines. Currently **${machines.filter(m=>m.risk.tier==="Critical").length} machines are critical** and **${machines.filter(m=>m.risk.tier==="Warning").length} are in warning state**.\n\nAsk me about any machine, schedule, risk analysis, or maintenance strategy.`
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const systemPrompt = `You are MaintainIQ, an expert AI maintenance advisor for a manufacturing plant with 20 industrial machines. You have deep knowledge of predictive maintenance, equipment reliability, ISO 55001 asset management, and operational efficiency.

LIVE FLEET STATUS (as of today):
${machines.map(m=>`- ${m.name} (${m.id}): Risk ${m.risk.riskScore}% [${m.risk.tier}], Last service: ${m.lastService}d ago, Mfr interval: ${m.risk.spec.interval}h, Delay cost: $${m.risk.costOfDelay}/day, Failure modes: ${m.risk.spec.failureMode}, Usage: ${Math.round(m.usageIntensity*100)}%, Age: ${m.age}yr`).join("\n")}

CRITICAL MACHINES: ${machines.filter(m=>m.risk.tier==="Critical").map(m=>m.name).join(", ")||"None"}
WARNING MACHINES: ${machines.filter(m=>m.risk.tier==="Warning").map(m=>m.name).join(", ")||"None"}

Guidelines:
- Be concise, specific, and actionable (under 220 words)
- Cite specific machine IDs and risk data
- Prioritize by cost impact and failure probability
- Flag safety concerns clearly
- Suggest schedule windows when applicable`;

  const sugs = [
    "What needs urgent attention this week?",
    "Calculate my total maintenance cost risk",
    "Draft a 30-day maintenance schedule",
    "Why is Omega Compressor critical?",
    "Which zone has the highest risk?",
  ];

  async function send(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role:"user", content:text };
    setMessages(p=>[...p,userMsg]);
    setInput(""); setLoading(true); setApiError(null);
    try {
      const effectiveEndpoint = endpoint || AZURE_CONFIG.endpoint;
      const effectiveKey = apiKey || AZURE_CONFIG.apiKey;
      const url = `${effectiveEndpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;
      const history = [...messages, userMsg].map(m=>({role:m.role,content:m.content}));
      const res = await fetch(url,{
        method:"POST",
        headers:{"Content-Type":"application/json","api-key":effectiveKey},
        body:JSON.stringify({ messages:[{role:"system",content:systemPrompt},...history], max_tokens:800, temperature:0.7 })
      });
      if(!res.ok){ const e=await res.text(); throw new Error(`${res.status}: ${e}`); }
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "No response from API.";
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    } catch(err) {
      setApiError(err.message);
      setMessages(p=>[...p,{role:"assistant",content:`⚠️ Azure API Error: ${err.message}\n\nPlease check your API key and endpoint in the Settings panel.`}]);
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">AI Maintenance Advisor</div><div className="card-sub">Powered by Azure GPT-4o · Full fleet context · 20 machines</div></div>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:apiError?"var(--red)":"var(--green)", fontWeight:600 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:apiError?"var(--red)":"var(--green)", display:"inline-block" }}/>
          {apiError ? "API Error" : "Azure GPT-4o"}
        </div>
      </div>
      {(AZURE_CONFIG.apiKey==="YOUR_AZURE_API_KEY_HERE") && (
        <div className="api-banner">⚙️ Configure your Azure API key in the <strong>Settings</strong> panel (sidebar) to activate the AI advisor.</div>
      )}
      <div className="chat-wrap">
        <div className="chat-messages">
          {messages.map((m,i)=>(
            <div key={i} className={`msg ${m.role==="user"?"user":""}`}>
              <div className={`avatar ${m.role==="assistant"?"ai":"user"}`}>{m.role==="assistant"?"AI":"Me"}</div>
              <div className={`bubble ${m.role==="assistant"?"ai":"user"}`} style={{ whiteSpace:"pre-line" }}>{m.content}</div>
            </div>
          ))}
          {loading && <div className="msg"><div className="avatar ai">AI</div><div className="bubble ai"><div className="dots"><span/><span/><span/></div></div></div>}
          <div ref={endRef}/>
        </div>
        <div className="chat-sugs">
          {sugs.map(s=><button key={s} className="sug" onClick={()=>send(s)}>{s}</button>)}
        </div>
        <div className="chat-input-row">
          <textarea className="chat-input" rows={2} placeholder="Ask about any machine, risk, schedule, or maintenance strategy..." value={input}
            onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);} }}/>
          <button className="btn btn-primary" onClick={()=>send(input)} disabled={loading}>{loading?"...":"Send ↑"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({ machines }) {
  const byType={}, byZone={};
  machines.forEach(m=>{
    if(!byType[m.type]) byType[m.type]={count:0,risk:0,cost:0};
    byType[m.type].count++; byType[m.type].risk+=m.risk.riskScore; byType[m.type].cost+=m.risk.costOfDelay;
    if(!byZone[m.location]) byZone[m.location]={count:0,risk:0,cost:0};
    byZone[m.location].count++; byZone[m.location].risk+=m.risk.riskScore; byZone[m.location].cost+=m.risk.costOfDelay;
  });
  const totalCost = machines.reduce((s,m)=>s+m.risk.costOfDelay,0);
  const avgAge = (machines.reduce((s,m)=>s+m.age,0)/machines.length).toFixed(1);
  const totalHrs = machines.reduce((s,m)=>s+m.hoursUsed,0);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:18 }}>
        <Kpi label="Avg Fleet Age" value={`${avgAge} yr`} trend="Combined equipment age" icon="📆" color="var(--purple)"/>
        <Kpi label="Fleet Hours" value={`${Math.round(totalHrs/1000)}K`} trend="Total operational hours" icon="⏱️" color="var(--accent)"/>
        <Kpi label="Total Cost Risk" value={`$${Math.round(totalCost/1000)}K/day`} trend="Worst-case if all deferred" icon="💸" color="var(--red)"/>
      </div>
      <div className="two-col">
        <div className="card">
          <div className="card-header"><div className="card-title">Avg Risk by Machine Type</div></div>
          <div className="card-body">
            {Object.entries(byType).map(([type,d])=>{
              const avg=Math.round(d.risk/d.count);
              const c=avg>=75?"var(--red)":avg>=50?"var(--amber)":avg>=25?"var(--accent)":"var(--green)";
              return <div key={type} className="a-bar-row"><span className="a-bar-lbl">{MACHINE_TYPES[type].icon} {type}</span><div className="a-bar-track"><div className="a-bar-fill" style={{ width:`${avg}%`,background:c }}/></div><span className="a-bar-val" style={{ color:c }}>{avg}%</span></div>;
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Daily Cost Risk by Type</div></div>
          <div className="card-body">
            {Object.entries(byType).sort((a,b)=>b[1].cost-a[1].cost).map(([type,d])=>(
              <div key={type} className="a-bar-row"><span className="a-bar-lbl">{MACHINE_TYPES[type].icon} {type}</span><div className="a-bar-track"><div className="a-bar-fill" style={{ width:`${(d.cost/totalCost)*100}%`,background:"var(--purple)" }}/></div><span className="a-bar-val" style={{ color:"var(--purple)",fontSize:11 }}>${Math.round(d.cost/1000)}K</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Risk &amp; Cost by Zone</div></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:"14px 16px" }}>
          {Object.entries(byZone).map(([zone,d])=>{
            const avg=Math.round(d.risk/d.count);
            const c=avg>=75?"var(--red)":avg>=50?"var(--amber)":avg>=25?"var(--accent)":"var(--green)";
            return (
              <div key={zone} style={{ textAlign:"center", padding:"18px 12px", background:"var(--surface2)", borderRadius:"var(--r-sm)", borderTop:`4px solid ${c}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", marginBottom:6 }}>{zone}</div>
                <div style={{ fontSize:28, fontWeight:700, color:c, fontFamily:"'DM Mono',monospace" }}>{avg}%</div>
                <div style={{ fontSize:11, color:"var(--text3)", marginTop:3 }}>{d.count} machines</div>
                <div style={{ fontSize:11, color:"var(--purple)", fontWeight:700, marginTop:2, fontFamily:"'DM Mono',monospace" }}>${Math.round(d.cost/1000)}K/day</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ apiKey, setApiKey, endpoint, setEndpoint }) {
  const [localKey, setLocalKey] = useState(apiKey||AZURE_CONFIG.apiKey);
  const [localEp, setLocalEp] = useState(endpoint||AZURE_CONFIG.endpoint);
  const [saved, setSaved] = useState(false);
  function save() { setApiKey(localKey); setEndpoint(localEp); setSaved(true); setTimeout(()=>setSaved(false),2000); }
  return (
    <div>
      <div className="card mb16">
        <div className="card-header"><div className="card-title">Azure OpenAI Configuration</div><div className="card-sub">Configure your GPT-4o endpoint for the AI Advisor</div></div>
        <div className="card-body">
          <div className="settings-row">
            <div><div className="settings-lbl">Azure Endpoint URL</div><div className="settings-sub">Your Azure OpenAI resource endpoint</div></div>
            <input className="settings-input" value={localEp} onChange={e=>setLocalEp(e.target.value)} placeholder="https://your-resource.openai.azure.com"/>
          </div>
          <div className="settings-row">
            <div><div className="settings-lbl">API Key</div><div className="settings-sub">Your Azure OpenAI API key</div></div>
            <input className="settings-input" type="password" value={localKey} onChange={e=>setLocalKey(e.target.value)} placeholder="Paste your Azure API key"/>
          </div>
          <div className="settings-row">
            <div><div className="settings-lbl">Deployment Name</div><div className="settings-sub">Azure deployment (fixed)</div></div>
            <input className="settings-input" value={AZURE_CONFIG.deployment} disabled style={{ opacity:.6 }}/>
          </div>
          <div className="settings-row">
            <div><div className="settings-lbl">API Version</div><div className="settings-sub">Azure API version (fixed)</div></div>
            <input className="settings-input" value={AZURE_CONFIG.apiVersion} disabled style={{ opacity:.6 }}/>
          </div>
          <div style={{ marginTop:18, display:"flex", gap:10, alignItems:"center" }}>
            <button className="btn btn-primary" onClick={save}>{saved ? "✓ Saved!" : "Save Configuration"}</button>
            <span style={{ fontSize:12, color:"var(--text3)" }}>Keys are stored in local component state only</span>
          </div>
        </div>
      </div>
      <div className="card mb16">
        <div className="card-header"><div className="card-title">Risk Engine Weights</div><div className="card-sub">How the composite risk score is calculated</div></div>
        <div className="card-body">
          {[["Overdue Ratio (Days since svc ÷ interval)","45%"],["Usage Intensity (operational load)","25%"],["Equipment Age (normalized to 10yr)","15%"],["Total Hours (normalized to 20K)","15%"]].map(([l,w])=>(
            <div key={l} className="settings-row">
              <div><div className="settings-lbl">{l}</div></div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:14, color:"var(--accent)" }}>{w}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Data Sources</div></div>
        <div className="card-body">
          {[["Equipment Usage Logs","20 machines · 6-month synthetic data · CSV format","✅ Active"],["Manufacturer Guidelines","Service intervals, failure modes per machine type","✅ Loaded"],["Maintenance History","Per-machine service events & outcomes","✅ Loaded"],["Real-time Sensor Feed","IoT integration (Phase 2)","🔜 Planned"]].map(([l,s,status])=>(
            <div key={l} className="settings-row">
              <div><div className="settings-lbl">{l}</div><div className="settings-sub">{s}</div></div>
              <span style={{ fontSize:12, fontWeight:600 }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("command");
  const [selected, setSelected] = useState(null);
  const [apiKey, setApiKey] = useState(AZURE_CONFIG.apiKey);
  const [endpoint, setEndpoint] = useState(AZURE_CONFIG.endpoint);
  const machines = ENRICHED;
  const critical = machines.filter(m=>m.risk.tier==="Critical").length;

  const nav = [
    { id:"command",   label:"Command Center",   icon:"🏭" },
    { id:"priority",  label:"Priority Queue",   icon:"📋", badge:critical },
    { id:"schedule",  label:"Schedule Board",   icon:"🗂️" },
    { id:"advisor",   label:"AI Advisor",       icon:"🤖" },
    { id:"analytics", label:"Analytics",        icon:"📊" },
    { id:"settings",  label:"Settings",         icon:"⚙️" },
  ];

  const titles = {
    command:   { title:"Health Command Center",      sub:"Live equipment monitoring · 20 machines · Facility Alpha-7" },
    priority:  { title:"Maintenance Priority Queue", sub:"AI-ranked composite risk · Click ✏️ to override any date" },
    schedule:  { title:"Schedule Board",             sub:"Drag-and-drop planning · AI column assignments · Cost overlay" },
    advisor:   { title:"AI Maintenance Advisor",     sub:"Azure GPT-4o · Full fleet context · Conversational planning" },
    analytics: { title:"Fleet Analytics",            sub:"Risk, cost & performance insights across all zones" },
    settings:  { title:"Settings & Configuration",   sub:"Azure API setup · Risk engine weights · Data sources" },
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-mark">⚙️</div>
            <div>
              <div className="sb-logo-name">MaintainIQ</div>
              <div className="sb-logo-tag">v2 · Azure GPT-4o</div>
            </div>
          </div>
          <nav className="nav">
            <div className="nav-group">Operations</div>
            {nav.map(item=>(
              <div key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}>
                <span className="ni">{item.icon}</span>
                {item.label}
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </div>
            ))}
          </nav>
          <div className="sb-footer">
            <div className="sb-plant-label">Current Facility</div>
            <div className="sb-plant-name">Facility Alpha-7</div>
            <div className="sb-api-status">
              <div className="sb-api-dot" style={{ background: apiKey && apiKey!=="YOUR_AZURE_API_KEY_HERE" ? "var(--green)" : "var(--amber)" }}/>
              {apiKey && apiKey!=="YOUR_AZURE_API_KEY_HERE" ? "Azure GPT-4o ready" : "API key not set"}
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <div className="topbar-title">{titles[view].title}</div>
              <div className="topbar-sub">{titles[view].sub}</div>
            </div>
            <div className="topbar-right">
              <button className="btn btn-ghost">↓ Export CSV</button>
              <button className="btn btn-primary">+ New Work Order</button>
            </div>
          </header>

          <div className="content">
            {view==="command" && (
              <div style={{ display:"flex", gap:18 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <CommandCenter machines={machines} selected={selected} onSelect={setSelected}/>
                </div>
                <div style={{ width:295, flexShrink:0 }}>
                  <MachineDetail machine={selected} onClose={()=>setSelected(null)}/>
                </div>
              </div>
            )}
            {view==="priority"  && <PriorityQueue machines={machines} selected={selected} onSelect={setSelected}/>}
            {view==="schedule"  && <ScheduleBoard machines={machines}/>}
            {view==="advisor"   && <AIAdvisor machines={machines} apiKey={apiKey} endpoint={endpoint}/>}
            {view==="analytics" && <Analytics machines={machines}/>}
            {view==="settings"  && <Settings apiKey={apiKey} setApiKey={setApiKey} endpoint={endpoint} setEndpoint={setEndpoint}/>}
          </div>
        </div>
      </div>
    </>
  );
}
