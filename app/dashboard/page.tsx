"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  Thermometer, 
  Droplets, 
  CloudRain, 
  Eye, 
  AlertTriangle, 
  TrendingUp, 
  Globe, 
  Info,
  Calendar,
  Layers
} from "lucide-react";

interface TrendRecord {
  year: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  ndvi: number;
  yield_val: number;
  anomaly_score: number;
  risk_level: string;
}

const API_BASE = "http://localhost:8000";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(3px)" },
  visible: { 
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }
};

export default function Dashboard() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [compareDistrict, setCompareDistrict] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [trends, setTrends] = useState<TrendRecord[]>([]);
  const [compareTrends, setCompareTrends] = useState<TrendRecord[]>([]);
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch districts list
  useEffect(() => {
    fetch(`${API_BASE}/districts`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch districts list.");
        return res.json();
      })
      .then((data) => {
        setDistricts(data);
        if (data.length > 0) {
          const defaultDist = data.includes("Lucknow") ? "Lucknow" : data[0];
          setSelectedDistrict(defaultDist);
        }
      })
      .catch((err) => {
        setError("API server is offline. Please start the FastAPI backend.");
        setLoading(false);
      });
  }, []);

  // Fetch data for selected district
  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    
    fetch(`${API_BASE}/district-trends/${selectedDistrict.toLowerCase()}`)
      .then((res) => res.json())
      .then((data) => {
        setTrends(data.trends);
        return fetch(`${API_BASE}/climate-risk/${selectedDistrict.toLowerCase()}`);
      })
      .then((res) => res.json())
      .then((data) => {
        setRiskData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Error loading district details.");
        setLoading(false);
      });
  }, [selectedDistrict]);

  // Fetch data for comparison district
  useEffect(() => {
    if (!compareDistrict) {
      setCompareTrends([]);
      return;
    }
    fetch(`${API_BASE}/district-trends/${compareDistrict.toLowerCase()}`)
      .then((res) => res.json())
      .then((data) => {
        setCompareTrends(data.trends);
      })
      .catch((err) => console.error("Error loading comparison trends"));
  }, [compareDistrict]);

  const activeRecord = trends.find((r) => r.year === selectedYear) || trends[trends.length - 1];

  const getRiskColor = (level: string) => {
    if (level === "Normal") return "text-emerald-400 bg-emerald-950/20 border-emerald-900/40";
    if (level === "Moderate Risk") return "text-amber-400 bg-amber-950/20 border-amber-900/40";
    return "text-rose-400 bg-rose-950/20 border-rose-900/40";
  };

  // Merge trends for comparison chart
  const mergedComparisonData = trends.map((t) => {
    const compRecord = compareTrends.find((cr) => cr.year === t.year);
    return {
      year: t.year,
      [selectedDistrict]: t.yield_val,
      ...(compRecord ? { [compareDistrict]: compRecord.yield_val } : {})
    };
  });

  const metricCards = activeRecord ? [
    { icon: Thermometer, label: "Temperature", value: `${activeRecord.temperature}°C`, color: "orange" },
    { icon: Droplets, label: "Humidity", value: `${activeRecord.humidity}%`, color: "cyan" },
    { icon: CloudRain, label: "Rainfall", value: `${activeRecord.rainfall} mm`, color: "blue" },
    { icon: Eye, label: "NDVI Index", value: `${activeRecord.ndvi}`, color: "emerald" },
    { icon: Layers, label: "Anomaly Score", value: `${activeRecord.anomaly_score}`, color: "purple" },
  ] : [];

  const colorClasses: Record<string, string> = {
    orange: "bg-orange-950/20 border-orange-900/30 text-orange-400",
    cyan: "bg-cyan-950/20 border-cyan-900/30 text-cyan-400",
    blue: "bg-blue-950/20 border-blue-900/30 text-blue-400",
    emerald: "bg-emerald-950/20 border-emerald-900/30 text-emerald-400",
    purple: "bg-purple-950/20 border-purple-900/30 text-purple-400",
  };

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

  if (loading && districts.length === 0) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Synchronizing agricultural metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-10 pb-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header and Controls */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">District Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Analyze historic micro-climate data, vegetation indices, and regional crop risk</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-5 glass-panel p-4 rounded-2xl">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Target District</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="glass-select min-w-[140px]"
            >
              {districts.map((d) => (
                <option key={d} value={d} className="bg-slate-950 text-slate-200">{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Compare With</span>
            <select
              value={compareDistrict}
              onChange={(e) => setCompareDistrict(e.target.value)}
              className="glass-select min-w-[170px]"
            >
              <option value="">-- No Comparison --</option>
              {districts.filter(d => d !== selectedDistrict).map((d) => (
                <option key={d} value={d} className="bg-slate-950 text-slate-200">{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Metric Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="glass-select min-w-[90px]"
            >
              {trends.map((t) => (
                <option key={t.year} value={t.year} className="bg-slate-950 text-slate-200">{t.year}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {activeRecord && (
        <>
          {/* Key Metrics Cards Grid */}
          <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" variants={itemVariants}>
            {metricCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div 
                  key={idx}
                  className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 group glass-panel-hover"
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses[card.color]} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{card.label}</p>
                    <h4 className="text-base font-bold text-white mt-0.5 tabular-nums">{card.value}</h4>
                  </div>
                </motion.div>
              );
            })}

            {/* Risk Card - special */}
            <motion.div 
              className={`glass-panel p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 border group ${getRiskColor(activeRecord.risk_level)}`}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900/60 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Climate Risk</p>
                <h4 className="text-xs font-bold uppercase tracking-wider mt-0.5">{activeRecord.risk_level.split(" ")[0]}</h4>
              </div>
            </motion.div>
          </motion.div>

          {/* Anomaly breakdown alert */}
          {riskData && (
            <motion.div 
              className={`p-5 rounded-2xl border ${getRiskColor(activeRecord.risk_level)} flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}
              variants={itemVariants}
            >
              <div className="flex gap-3">
                <Info className="w-5 h-5 mt-0.5 md:mt-0 shrink-0" />
                <div>
                  <h5 className="font-bold text-white text-sm">Climatic Risk Level: {activeRecord.risk_level}</h5>
                  <p className="text-xs text-slate-300 mt-0.5">{riskData.message}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="glass-panel px-3 py-1.5 rounded-lg">Temp: <span className={riskData.breakdown.temp_anomaly > 0 ? "text-rose-400" : "text-emerald-400"}>{riskData.breakdown.temp_anomaly > 0 ? "+" : ""}{riskData.breakdown.temp_anomaly}°C</span></div>
                <div className="glass-panel px-3 py-1.5 rounded-lg">Rain: <span className={riskData.breakdown.rain_anomaly > 0 ? "text-emerald-400" : "text-rose-400"}>{riskData.breakdown.rain_anomaly > 0 ? "+" : ""}{riskData.breakdown.rain_anomaly} mm</span></div>
                <div className="glass-panel px-3 py-1.5 rounded-lg">Humid: <span className={riskData.breakdown.humidity_anomaly > 0 ? "text-cyan-400" : "text-rose-400"}>{riskData.breakdown.humidity_anomaly > 0 ? "+" : ""}{riskData.breakdown.humidity_anomaly}%</span></div>
              </div>
            </motion.div>
          )}

          {/* Main Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Yield Trend / Comparison */}
            <motion.div className="glass-panel p-7 rounded-2xl space-y-5" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Crop Yield Trend</h3>
                  <p className="text-xs text-slate-500">Historical prediction models comparison (tons per hectare)</p>
                </div>
                {compareDistrict && (
                  <div className="flex gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded bg-emerald-500" />{selectedDistrict}</span>
                    <span className="flex items-center gap-1.5 text-cyan-400"><span className="w-2.5 h-2.5 rounded bg-cyan-500" />{compareDistrict}</span>
                  </div>
                )}
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {compareDistrict ? (
                    <LineChart data={mergedComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey={selectedDistrict} stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey={compareDistrict} stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="5 5" />
                    </LineChart>
                  ) : (
                    <AreaChart data={trends}>
                      <defs>
                        <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="yield_val" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Anomaly Trend Chart */}
            <motion.div className="glass-panel p-7 rounded-2xl space-y-5" variants={itemVariants}>
              <div>
                <h3 className="text-base font-bold text-white">Climate Anomaly Score</h3>
                <p className="text-xs text-slate-500">Historical combined score profile over time</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                    <Bar dataKey="anomaly_score" radius={[4, 4, 0, 0]}>
                      {trends.map((entry, index) => {
                        let fill = "#10b981";
                        if (entry.anomaly_score >= 7.5) fill = "#f43f5e";
                        else if (entry.anomaly_score >= 3.5) fill = "#f59e0b";
                        return <Cell key={`bar-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Satellite NDVI Trend */}
            <motion.div className="glass-panel p-7 rounded-2xl space-y-5" variants={itemVariants}>
              <div>
                <h3 className="text-base font-bold text-white">Satellite NDVI Peak Greenness</h3>
                <p className="text-xs text-slate-500">Sentinel-2 peak crop chlorophyll absorption profiles</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0.2, 0.6]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="ndvi" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Precipitation Trend */}
            <motion.div className="glass-panel p-7 rounded-2xl space-y-5" variants={itemVariants}>
              <div>
                <h3 className="text-base font-bold text-white">Precipitation Trend</h3>
                <p className="text-xs text-slate-500">NASA POWER total corrected annual rainfall (mm)</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="rainfall" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRain)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </div>
        </>
      )}
    </motion.div>
  );
}
