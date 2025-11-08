import React, { useEffect, useRef, useState } from "react";

/* SMART DASHBOARD — with theme persistence and dark-mode text fix */

const SENSOR_CFG = {
  temp: { label: "Temperature", suffix: "°C", color: "#06b6d4", good: [30, 35], warn: [35, 38], bad: [38, 999] },
  humidity: { label: "Humidity", suffix: "%", color: "#60a5fa", good: [50, 75], warn: [40, 50], bad: [0, 40] },
  mq135: { label: "Air Quality", suffix: "", color: "#fb923c", good: [0, 200], warn: [200, 400], bad: [400, 9999] },
  tcs_green: { label: "Green Index", suffix: "", color: "#34d399", good: [800, 5000], warn: [400, 800], bad: [0, 400] },
  lux: { label: "Light", suffix: "lx", color: "#a78bfa", good: [200, 2000], warn: [100, 200], bad: [0, 100] },
  ph: { label: "pH Level", suffix: "", color: "#f472b6", good: [7, 8.5], warn: [6.5, 7], bad: [0, 6.5] },
};

function evaluateStatus(k, v) {
  const c = SENSOR_CFG[k];
  if (!c || v == null) return { level: "unknown" };
  const [g0, g1] = c.good, [w0, w1] = c.warn, [b0, b1] = c.bad;
  if (v >= g0 && v <= g1) return { level: "good" };
  if (v >= w0 && v <= w1) return { level: "warn" };
  if (v >= b0 && v <= b1) return { level: "bad" };
  return { level: "unknown" };
}

/* Sparkline Graph */
function Sparkline({ points = [], color = "#06b6d4", w = 260, h = 60 }) {
  if (!points.length) return <svg width={w} height={h}></svg>;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  const lastX = (points.length - 1) * step;
  const lastY = h - ((points.at(-1) - min) / range) * (h - 6) - 3;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

/* Format data */
function fmt(k, v) {
  if (v == null) return "—";
  if (k === "temp") return `${v.toFixed(1)} °C`;
  if (k === "humidity") return `${Math.round(v)} %`;
  if (k === "lux") return `${Math.round(v)} lx`;
  if (k === "ph") return `${v.toFixed(2)}`;
  return `${Math.round(v)}`;
}

export default function App() {
  const [sensors, setSensors] = useState({});
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dummyOn, setDummyOn] = useState(true);
  const [flushRunning, setFlushRunning] = useState(false);
  const [flushMs, setFlushMs] = useState(5000);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const dummyRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (dummyOn) {
      const fn = () => onSensorData(generateDummy());
      fn();
      dummyRef.current = setInterval(fn, 5000);
    }
    return () => clearInterval(dummyRef.current);
  }, [dummyOn]);

  function onSensorData(data) {
    setSensors((p) => ({ ...p, ...data }));
    setHistory((p) => [{ ts: Date.now(), ...data }, ...p].slice(0, 400));

    // Pulse glow animation
    setPulse(true);
    setTimeout(() => setPulse(false), 800);

    const newAlerts = [];
    for (const k of Object.keys(SENSOR_CFG)) {
      const s = evaluateStatus(k, data[k]);
      if (s.level === "warn" || s.level === "bad") {
        newAlerts.push({
          id: `${k}-${Date.now()}`,
          label: SENSOR_CFG[k].label,
          value: data[k],
          level: s.level,
          ts: Date.now(),
        });
      }
    }
    if (newAlerts.length) setAlerts((p) => [...newAlerts, ...p].slice(0, 100));
  }

  async function triggerFlush(ms = flushMs) {
    if (flushRunning) return;
    setFlushRunning(true);
    await new Promise((r) => setTimeout(r, Math.min(ms, 6000)));
    setFlushRunning(false);
    setAlerts((p) => [{ id: `flush-${Date.now()}`, label: "Flush Completed", value: ms, level: "info", ts: Date.now() }, ...p]);
  }

  const sparkData = {};
  Object.keys(SENSOR_CFG).forEach((k) => {
    sparkData[k] = history.slice(0, 30).map((h) => h[k]).reverse().filter(Number.isFinite);
  });

  return (
    <div className="sd-root">
      {/* Header */}
      <header className="sd-top">
        <div className="sd-brand">
          <div className="title">SMART DASHBOARD</div>
          <div className="subtitle">Real-time Spirulina Monitor</div>
        </div>
        <div className="sd-right">
          <button className={`btn demo ${dummyOn ? "on" : ""}`} onClick={() => setDummyOn(!dummyOn)}>
            {dummyOn ? "Demo ON" : "Demo OFF"}
          </button>
          <div className="profile-wrap">
            <button className="profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="avatar">HB</div>
              <div className="name">Harsh Bhatia</div>
              <div className="caret">▾</div>
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <button className="pm-item">View Profile</button>
                <button className="pm-item">Settings</button>
                <button className="pm-item" onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </button>
                <button className="pm-item">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="sd-main">
        {/* Overview Cards */}
        <section className="cards">
          {Object.keys(SENSOR_CFG).map((k) => {
            const v = sensors[k];
            const st = evaluateStatus(k, v);
            return (
              <div className={`card ${st.level} ${pulse ? "pulse" : ""}`} key={k}>
                <div className="card-head">
                  <div className="meta">
                    <div className="mtitle">{SENSOR_CFG[k].label}</div>
                    <div className="msub">Good: {SENSOR_CFG[k].good[0]}–{SENSOR_CFG[k].good[1]}</div>
                  </div>
                  <div className={`status ${st.level}`}>{st.level.toUpperCase()}</div>
                </div>
                <div className="card-mid">
                  <div className="val">{fmt(k, v)}</div>
                  <div className="spark"><Sparkline points={sparkData[k]} color={SENSOR_CFG[k].color} /></div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Bottom Section */}
        <section className="bottom-row">
          <div className="left-col">
            {/* Alerts */}
            <div className="panel alerts-panel">
              <div className="panel-head">
                <div>
                  <div className="ph-title">Alerts</div>
                  <div className="ph-sub">Recent warnings & issues</div>
                </div>
                <button className="btn clear-btn" onClick={() => setAlerts([])}>Clear</button>
              </div>
              <div className="alerts-list">
                {alerts.length === 0 && <div className="muted">All clear — no alerts</div>}
                {alerts.map((a) => (
                  <div className={`alert-item ${a.level}`} key={a.id}>
                    <strong>{a.label}</strong>
                    <div className="muted">{new Date(a.ts).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Sensor Graphs */}
            <div className="panel per-sensor">
              <div className="panel-head">
                <div>
                  <div className="ph-title">Per-Sensor Live Data</div>
                  <div className="ph-sub">Mini sparkline graphs of each sensor</div>
                </div>
              </div>
              <div className="sensor-grid">
                {Object.keys(SENSOR_CFG).map((k) => {
                  const cfg = SENSOR_CFG[k];
                  return (
                    <div className={`sensor-card ${pulse ? "pulse" : ""}`} key={k} style={{
                      borderTop: `4px solid ${cfg.color}`,
                      boxShadow: `0 4px 20px ${cfg.color}22`,
                    }}>
                      <div className="sensor-info">
                        <h3 className="sensor-title">{cfg.label}</h3>
                        <div className="sensor-spark"><Sparkline points={sparkData[k]} color={cfg.color} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Flush Section */}
          <aside className="right-col">
            <div className="panel flush-panel">
              <div className="panel-head">
                <div>
                  <div className="ph-title">Flush Water</div>
                  <div className="ph-sub">Manual pump control</div>
                </div>
              </div>
              <div className="control-stack">
                <label className="field">
                  <div className="f-label">Duration (ms)</div>
                  <input type="number" value={flushMs} onChange={(e) => setFlushMs(Number(e.target.value))} />
                </label>
                <button className={`btn flush-btn ${flushRunning ? "running" : ""}`} onClick={() => triggerFlush(flushMs)}>
                  {flushRunning ? "Running..." : "Start Flush"}
                </button>
                {flushRunning && <div className="flush-progress"><div className="fp-bar"></div></div>}
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="sd-foot">Smart Dashboard • Theme Memory • Responsive Layout</footer>
    </div>
  );
}

/* Dummy data generator */
function generateDummy() {
  const t = Date.now() / 1000;
  const temp = 31 + Math.sin(t / 60) * 2 + (Math.random() - 0.5);
  const humidity = 58 + Math.cos(t / 47) * 5 + (Math.random() - 0.5);
  const mq135 = 150 + Math.abs(Math.sin(t / 37)) * 80 + (Math.random() - 0.5) * 40;
  const tcs_green = 1200 + Math.abs(Math.cos(t / 25)) * 220 + (Math.random() - 0.5) * 160;
  const lux = 900 + Math.abs(Math.sin(t / 77)) * 400 + (Math.random() - 0.5) * 220;
  const ph = 7.2 + (Math.sin(t / 40) * 0.3) + (Math.random() - 0.5) * 0.15;
  return { temp, humidity, mq135, tcs_green, lux, ph };
}
