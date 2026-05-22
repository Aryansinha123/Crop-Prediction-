"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Thermometer, 
  CloudRain, 
  Droplets, 
  Layers, 
  ArrowUpDown, 
  Info, 
  CheckCircle, 
  ArrowRight,
  TrendingDown,
  X,
  Shield
} from "lucide-react";

interface AnomalyBreakdown {
  temp_anomaly: number;
  rain_anomaly: number;
  humidity_anomaly: number;
}

interface ClimateRisk {
  district: string;
  year: number;
  anomaly_score: number;
  risk_level: string;
  breakdown: AnomalyBreakdown;
  message: string;
}

const API_BASE = "http://localhost:8000";

// Animated SVG score ring for the drawer
function ScoreRing({ score, maxScore = 15, riskLevel }: { score: number; maxScore?: number; riskLevel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / maxScore, 1);
  const offset = circumference - pct * circumference;
  
  const getColor = (level: string) => {
    if (level === "Normal") return "#10b981";
    if (level === "Moderate Risk") return "#f59e0b";
    return "#f43f5e";
  };

  const color = getColor(riskLevel);

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
        <motion.circle
          cx="66" cy="66" r={radius} fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 10px ${color}60)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-3xl font-extrabold text-white tabular-nums font-mono"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score.toFixed(2)}
        </motion.span>
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">Anomaly</span>
      </div>
    </div>
  );
}

export default function ClimateRiskPage() {
  const [risks, setRisks] = useState<ClimateRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "score-desc" | "score-asc">("score-desc");
  const [selectedDistrict, setSelectedDistrict] = useState<ClimateRisk | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/climate-risk`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch climate risk profiles.");
        return res.json();
      })
      .then((data: ClimateRisk[]) => {
        setRisks(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("API server is offline. Please start the FastAPI backend.");
        setLoading(false);
      });
  }, []);

  const getRiskColor = (level: string) => {
    if (level === "Normal") return "text-emerald-400 border-emerald-950/40 bg-emerald-950/10";
    if (level === "Moderate Risk") return "text-amber-400 border-amber-950/40 bg-amber-950/10";
    return "text-rose-400 border-rose-950/40 bg-rose-950/10";
  };

  const getRiskGlowClass = (level: string) => {
    if (level === "Normal") return "glow-border-emerald border-emerald-500/30";
    if (level === "Moderate Risk") return "glow-border-orange border-amber-500/30";
    return "glow-border-rose border-rose-500/30";
  };

  const getRiskBadge = (level: string) => {
    if (level === "Normal") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (level === "Moderate Risk") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  const handleDistrictSelect = (risk: ClimateRisk) => {
    setSelectedDistrict(risk);
  };

  // Filter and sort logic
  const filteredRisks = risks
    .filter((r) => {
      const matchesSearch = r.district.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedRiskFilter === "All" || r.risk_level === selectedRiskFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.district.localeCompare(b.district);
      if (sortBy === "score-desc") return b.anomaly_score - a.anomaly_score;
      if (sortBy === "score-asc") return a.anomaly_score - b.anomaly_score;
      return 0;
    });

  // Calculate statistics
  const totalCount = risks.length;
  const highRiskCount = risks.filter((r) => r.risk_level === "High Risk").length;
  const modRiskCount = risks.filter((r) => r.risk_level === "Moderate Risk").length;
  const normalCount = risks.filter((r) => r.risk_level === "Normal").length;

  if (error) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-800/40 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">System Connectivity Issue</h2>
          <p className="text-slate-400 max-w-md text-sm">{error}</p>
        </div>
        <div className="text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-slate-500 font-mono text-left space-y-1">
          <p>To launch the backend, run in a separate terminal:</p>
          <p className="text-emerald-400 font-semibold mt-1">venv\Scripts\uvicorn backend.main:app --reload --port 8000</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Aggregating provincial risk matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-10 pb-16 relative min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Climate Risk Map</h1>
        <p className="text-sm text-slate-400 mt-1">Regional micro-climate instability matrix and district risk categorization</p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Monitored Regions", value: `${totalCount} Districts`, sub: "Uttar Pradesh target grid", color: "slate", icon: Shield },
          { label: "High Risk Zones", value: `${highRiskCount} Districts`, sub: "Yield suppresses > 15%", color: "rose", icon: AlertTriangle, pulse: true },
          { label: "Moderate Risk Zones", value: `${modRiskCount} Districts`, sub: "Yield fluctuations expected", color: "amber", icon: AlertTriangle },
          { label: "Normal Status", value: `${normalCount} Districts`, sub: "Climatic trends within normal", color: "emerald", icon: CheckCircle },
        ].map((card, idx) => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            slate: "text-slate-400",
            rose: "text-rose-400",
            amber: "text-amber-400",
            emerald: "text-emerald-400",
          };
          return (
            <motion.div 
              key={idx}
              className="glass-panel p-5 rounded-2xl space-y-2.5 relative overflow-hidden card-entrance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${colorMap[card.color]}`}>
                {card.pulse && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                )}
                {card.label}
              </span>
              <h2 className={`text-2xl font-bold ${colorMap[card.color] === "text-slate-400" ? "text-white" : colorMap[card.color]}`}>{card.value}</h2>
              <p className="text-xs text-slate-500">{card.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row gap-5 items-center justify-between glass-panel p-4 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-950/60 rounded-xl p-1 border border-slate-800/60">
            {["All", "High Risk", "Moderate Risk", "Normal"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedRiskFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRiskFilter === filter
                    ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {filter === "All" ? "All" : filter.split(" ")[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 ml-auto md:ml-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-select py-1.5 px-3 pr-8 text-xs text-slate-300 border-slate-800/60"
            >
              <option value="score-desc">Highest Anomaly</option>
              <option value="score-asc">Lowest Anomaly</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {filteredRisks.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <Info className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-white font-bold">No results found</h3>
          <p className="text-slate-500 text-xs max-w-xs mx-auto">No district matches your filter and search criteria. Adjust settings to see records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRisks.map((risk, idx) => (
            <motion.div
              key={risk.district}
              onClick={() => handleDistrictSelect(risk)}
              className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer flex flex-col justify-between min-h-[200px] border group"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.03, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors duration-200">{risk.district}</h3>
                    <p className="text-[10px] font-mono text-slate-600">UP-{(risk.district.length * 3) % 100}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase shrink-0 ${getRiskBadge(risk.risk_level)}`}>
                    {risk.risk_level.split(" ")[0]}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-800/30 pt-3">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 font-semibold block uppercase">Temp</span>
                    <span className={`text-xs font-mono font-semibold ${risk.breakdown.temp_anomaly > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {risk.breakdown.temp_anomaly > 0 ? "+" : ""}{risk.breakdown.temp_anomaly.toFixed(1)}°
                    </span>
                  </div>
                  <div className="text-center border-x border-slate-800/20">
                    <span className="text-[9px] text-slate-500 font-semibold block uppercase">Precip</span>
                    <span className={`text-xs font-mono font-semibold ${risk.breakdown.rain_anomaly > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {risk.breakdown.rain_anomaly > 0 ? "+" : ""}{risk.breakdown.rain_anomaly.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 font-semibold block uppercase">Humid</span>
                    <span className={`text-xs font-mono font-semibold ${risk.breakdown.humidity_anomaly > 0 ? "text-cyan-400" : "text-rose-400"}`}>
                      {risk.breakdown.humidity_anomaly > 0 ? "+" : ""}{risk.breakdown.humidity_anomaly.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/30 pt-3 mt-auto">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Anomaly</span>
                <span className="text-sm font-bold text-white font-mono tabular-nums">{risk.anomaly_score.toFixed(2)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Overlay Sidebar */}
      <AnimatePresence>
        {selectedDistrict && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDistrict(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />

            {/* Sidebar Draw */}
            <motion.div
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-[#090e1a] border-l border-slate-800/60 shadow-2xl z-50 p-8 overflow-y-auto space-y-8 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-5 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${getRiskBadge(selectedDistrict.risk_level)}`}>
                      {selectedDistrict.risk_level}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-2">{selectedDistrict.district}</h2>
                </div>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="space-y-8 flex-1">
                {/* Animated Score Ring */}
                <div className={`p-6 rounded-2xl border text-center space-y-3 relative overflow-hidden ${getRiskGlowClass(selectedDistrict.risk_level)} bg-slate-950/40`}>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(16,185,129,0.04),rgba(0,0,0,0))] pointer-events-none" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Climate Anomaly Score</p>
                  <ScoreRing score={selectedDistrict.anomaly_score} riskLevel={selectedDistrict.risk_level} />
                  <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1 leading-relaxed">
                    Calculated by summing temp, rain, and humidity deviations from long-term district normals.
                  </p>
                </div>

                {/* Explanation Message */}
                <div className="glass-panel p-5 rounded-xl bg-slate-950/30 border-slate-800 text-xs text-slate-300 leading-relaxed flex gap-3">
                  <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p>{selectedDistrict.message}</p>
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Meteorological Deviations</h4>
                  
                  <div className="space-y-3">
                    {[
                      { icon: Thermometer, label: "Temperature", color: "orange", value: selectedDistrict.breakdown.temp_anomaly, unit: "°C", positive: selectedDistrict.breakdown.temp_anomaly > 0 ? false : true, barScale: 20 },
                      { icon: CloudRain, label: "Rainfall (Corrected)", color: "blue", value: selectedDistrict.breakdown.rain_anomaly, unit: " mm", positive: selectedDistrict.breakdown.rain_anomaly > 0, barScale: 0.4 },
                      { icon: Droplets, label: "Relative Humidity", color: "cyan", value: selectedDistrict.breakdown.humidity_anomaly, unit: " %", positive: selectedDistrict.breakdown.humidity_anomaly > 0, barScale: 5 },
                    ].map((metric, idx) => {
                      const Icon = metric.icon;
                      const iconColor: Record<string, string> = { orange: "text-orange-400", blue: "text-blue-400", cyan: "text-cyan-400" };
                      return (
                        <motion.div 
                          key={idx} 
                          className="glass-panel p-4 rounded-xl space-y-2.5"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + idx * 0.1, duration: 0.4 }}
                        >
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <Icon className={`w-4 h-4 ${iconColor[metric.color]}`} />
                              {metric.label}
                            </span>
                            <span className={`font-mono ${metric.positive ? "text-emerald-400" : "text-rose-400"}`}>
                              {metric.value > 0 ? "+" : ""}{metric.value.toFixed(2)}{metric.unit}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden relative">
                            <motion.div 
                              className={`h-full rounded-full ${metric.positive ? "bg-emerald-500" : "bg-rose-500"}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.abs(metric.value) * metric.barScale)}%` }}
                              transition={{ duration: 0.8, delay: 0.5 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                              style={{ 
                                marginLeft: !metric.positive && metric.value < 0 ? "auto" : "0"
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Agronomic Recommendations */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Agronomic Recommendations</h4>
                  <div className="space-y-3 text-xs">
                    {selectedDistrict.risk_level === "High Risk" && (
                      <>
                        <div className="p-4 rounded-xl border border-rose-500/10 border-l-4 border-l-rose-500 bg-rose-500/5 flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-white">Adjust Sowing Schedules</h5>
                            <p className="text-slate-400 leading-relaxed">Extreme dry/wet rainfall anomalies indicate shifted monsoon patterns. Retard planting dates by 10-14 days to prevent early stage flooding or drought stress.</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-emerald-500/10 border-l-4 border-l-emerald-500 bg-emerald-500/5 flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-white">Drought-Resistant Cultivars</h5>
                            <p className="text-slate-400 leading-relaxed">Select heat-tolerant and short-duration crop hybrids (e.g. Sahbhagi Dhan rice) to withstand elevated temperature anomalies.</p>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedDistrict.risk_level === "Moderate Risk" && (
                      <>
                        <div className="p-4 rounded-xl border border-amber-500/10 border-l-4 border-l-amber-500 bg-amber-500/5 flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-white">Optimize Soil Irrigation</h5>
                            <p className="text-slate-400 leading-relaxed">Minor precipitation anomalies detected. Practice micro-drip irrigation and apply straw mulching to preserve ground soil moisture profiles.</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-emerald-500/10 border-l-4 border-l-emerald-500 bg-emerald-500/5 flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-white">Targeted Nitrogen Applications</h5>
                            <p className="text-slate-400 leading-relaxed">Slight moisture variations limit nutrient absorption. Splitting fertilizer schedules into smaller, crop-demand-aligned cycles preserves yield.</p>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedDistrict.risk_level === "Normal" && (
                      <>
                        <div className="p-4 rounded-xl border border-emerald-500/10 border-l-4 border-l-emerald-500 bg-emerald-500/5 flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-white">Optimal Cultivation Window</h5>
                            <p className="text-slate-400 leading-relaxed">Environmental conditions are fully aligned with historical crop expectations. Maintain standard agronomic schedules and optimize input distributions.</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-cyan-500/10 border-l-4 border-l-cyan-500 bg-cyan-500/5 flex items-start gap-3">
                          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="font-bold text-white">Continuous Canopy Tracking</h5>
                            <p className="text-slate-400 leading-relaxed">Monitor weekly Sentinel-2 NDVI anomalies to verify that active crop canopy development remains on track with target yield guidelines.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-800/60 shrink-0">
                <button
                  onClick={() => {
                    window.location.href = `/prediction?district=${selectedDistrict.district}`;
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/45 cursor-pointer text-xs uppercase tracking-wider btn-glow-emerald"
                >
                  <span>Launch Predictor Simulator</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
