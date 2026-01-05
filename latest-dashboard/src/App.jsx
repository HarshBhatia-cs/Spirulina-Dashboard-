import React, { useEffect, useRef, useState } from "react";

/* ================= SENSOR CONFIG ================= */
const SENSOR_CFG = {
  temp: { labelKey: "temperature", suffix: "°C", color: "#06b6d4", good: [30, 35], warn: [35, 38], bad: [38, 999] },
  humidity: { labelKey: "humidity", suffix: "%", color: "#60a5fa", good: [50, 75], warn: [40, 50], bad: [0, 40] },
  mq135: { labelKey: "airQuality", suffix: "", color: "#fb923c", good: [0, 200], warn: [200, 400], bad: [400, 9999] },
  tcs_green: { labelKey: "greenIndex", suffix: "", color: "#34d399", good: [800, 5000], warn: [400, 800], bad: [0, 400] },
  lux: { labelKey: "light", suffix: "lx", color: "#a78bfa", good: [200, 2000], warn: [100, 200], bad: [0, 100] },
  ph: { labelKey: "phLevel", suffix: "", color: "#f472b6", good: [7, 8.5], warn: [6.5, 7], bad: [0, 6.5] },
};

/* ================= LANGUAGE ================= */
const LANG = {
  en: {
    dashboard: "SMART DASHBOARD",
    subtitle: "Real-time Spirulina Monitor",
    live: "Live",
    alerts: "Alerts",
    recentIssues: "Recent warnings & issues",
    allClear: "All clear — no alerts",
    clear: "Clear",
    flushWater: "Flush Water",
    manualPump: "Manual pump control",
    duration: "Duration (ms)",
    startFlush: "Start Flush",
    running: "Running...",
    perSensor: "Per-Sensor Live Data",
    perSensorSub: "Mini sparkline graphs of each sensor",
    viewProfile: "View Profile",
    settings: "Settings",
    logout: "Logout",
    switchLang: "Switch to Hindi",

    temperature: "Temperature",
    humidity: "Humidity",
    airQuality: "Air Quality",
    greenIndex: "Green Index",
    light: "Light",
    phLevel: "pH Level",
  },
  hi: {
    dashboard: "स्मार्ट डैशबोर्ड",
    subtitle: "रीयल-टाइम स्पाइरुलिना मॉनिटर",
    live: "लाइव",
    alerts: "चेतावनी",
    recentIssues: "हाल की चेतावनियाँ",
    allClear: "सब ठीक है — कोई चेतावनी नहीं",
    clear: "हटाएँ",
    flushWater: "पानी फ्लश करें",
    manualPump: "मैनुअल पंप नियंत्रण",
    duration: "समय (मिलीसेकंड)",
    startFlush: "फ्लश शुरू करें",
    running: "चल रहा है...",
    perSensor: "प्रति-सेंसर लाइव डेटा",
    perSensorSub: "प्रत्येक सेंसर का लाइव ग्राफ",
    viewProfile: "प्रोफ़ाइल देखें",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
    switchLang: "Switch to English",

    temperature: "तापमान",
    humidity: "नमी",
    airQuality: "वायु गुणवत्ता",
    greenIndex: "हरित सूचकांक",
    light: "प्रकाश",
    phLevel: "पीएच स्तर",
  },
};

/* ================= HELPERS ================= */
function evaluateStatus(k, v) {
  const c = SENSOR_CFG[k];
  if (!c || v == null) return "unknown";
  if (v >= c.good[0] && v <= c.good[1]) return "good";
  if (v >= c.warn[0] && v <= c.warn[1]) return "warn";
  if (v >= c.bad[0] && v <= c.bad[1]) return "bad";
  return "unknown";
}

function Sparkline({ points = [], color }) {
  if (!points.length) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  return (
    <svg width="120" height="40">
      {points.map((v, i) => (
        <circle
          key={i}
          cx={(i / points.length) * 120}
          cy={40 - ((v - min) / (max - min || 1)) * 40}
          r="2"
          fill={color}
        />
      ))}
    </svg>
  );
}

/* ================= MAIN ================= */
export default function App() {
  const [sensors, setSensors] = useState({});
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pulse, setPulse] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [flushRunning, setFlushRunning] = useState(false);
  const [flushMs, setFlushMs] = useState(5000);
  const [darkMode, setDarkMode] = useState(JSON.parse(localStorage.getItem("darkMode") || "false"));
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");

  const t = LANG[lang];
  const pollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const SERVER_URL = "http://localhost:5000/sensordata";

    async function fetchData() {
      try {
        const res = await fetch(SERVER_URL);
        const json = await res.json();
        setSensors(json);
        setHistory((p) => [{ ...json }, ...p].slice(0, 30));
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
      } catch {}
    }

    fetchData();
    pollRef.current = setInterval(fetchData, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const sparkData = {};
  Object.keys(SENSOR_CFG).forEach(
    (k) => (sparkData[k] = history.map((h) => h[k]).filter(Number.isFinite))
  );

  return (
    <div className="sd-root">
      {/* HEADER */}
      <header className="sd-top">
        <div>
          <div className="title">{t.dashboard}</div>
          <div className="subtitle">{t.subtitle}</div>
        </div>

        <div className="sd-right">
          <button className="btn demo">{t.live}</button>
          <button className="btn" onClick={() => setDarkMode(!darkMode)}>🌙</button>

          <div className="profile-wrap">
            <button className="profile-btn" onClick={() => setProfileOpen(!profileOpen)}>HB ▾</button>
            {profileOpen && (
              <div className="profile-menu">
                <button className="pm-item">{t.viewProfile}</button>
                <button className="pm-item">{t.settings}</button>
                <button className="pm-item" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
                  🌐 {t.switchLang}
                </button>
                <button className="pm-item">{t.logout}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="sd-main">
        {/* CARDS */}
        <section className="cards">
          {Object.keys(SENSOR_CFG).map((k) => (
            <div key={k} className={`card ${pulse ? "pulse" : ""}`}>
              <div className="mtitle">{t[SENSOR_CFG[k].labelKey]}</div>
              <div className="val">{sensors[k] ?? "—"}</div>
              <Sparkline points={sparkData[k]} color={SENSOR_CFG[k].color} />
            </div>
          ))}
        </section>

        {/* ALERTS + FLUSH */}
        <section className="bottom-row">
          <div className="panel">
            <div className="ph-title">{t.alerts}</div>
            <div className="ph-sub">{t.recentIssues}</div>
            {alerts.length === 0 && <div>{t.allClear}</div>}
          </div>

          <div className="panel">
            <div className="ph-title">{t.flushWater}</div>
            <div className="ph-sub">{t.manualPump}</div>
            <input type="number" value={flushMs} onChange={(e) => setFlushMs(+e.target.value)} />
            <button className="btn flush-btn">
              {flushRunning ? t.running : t.startFlush}
            </button>
          </div>
        </section>

        {/* PER SENSOR */}
        <div className="panel">
          <div className="ph-title">{t.perSensor}</div>
          <div className="ph-sub">{t.perSensorSub}</div>
        </div>
      </main>

      <footer className="sd-foot">Smart Dashboard • Full Features • Bilingual</footer>
    </div>
  );
}
