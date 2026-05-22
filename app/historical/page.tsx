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
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { 
  History, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Info,
  Calendar,
  Layers,
  ArrowUpDown,
  Sliders,
  Thermometer,
  CloudRain
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
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(2px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } }
};

export default function HistoricalTrendsPage() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtA, setDistrictA] = useState("");
  const [districtB, setDistrictB] = useState("");
  const [trendsA, setTrendsA] = useState<TrendRecord[]>([]);
  const [trendsB, setTrendsB] = useState<TrendRecord[]>([]);
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
          setDistrictA(data.includes("Lucknow") ? "Lucknow" : data[0]);
          setDistrictB(data.includes("Agra") ? "Agra" : data[1] || "");
        }
      })
      .catch((err) => {
        setError("API server is offline. Please start the FastAPI backend.");
        setLoading(false);
      });
  }, []);

  // Fetch Trends for District A
  useEffect(() => {
    if (!districtA) return;
    setLoading(true);
    fetch(`${API_BASE}/district-trends/${districtA.toLowerCase()}`)
      .then((res) => res.json())
      .then((data) => {
        setTrendsA(data.trends);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading district A trends");
        setLoading(false);
      });
  }, [districtA]);

  // Fetch Trends for District B
  useEffect(() => {
    if (!districtB) {
      setTrendsB([]);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/district-trends/${districtB.toLowerCase()}`)
      .then((res) => res.json())
      .then((data) => {
        setTrendsB(data.trends);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading district B trends");
        setLoading(false);
      });
  }, [districtB]);

  // Merge datasets for comparison charts
  const mergedComparisonData = trendsA.map((t) => {
    const recordB = trendsB.find((rb) => rb.year === t.year);
    return {
      year: t.year,
      [`${districtA}_yield`]: t.yield_val,
      [`${districtA}_anomaly`]: t.anomaly_score,
      [`${districtA}_rainfall`]: t.rainfall,
      [`${districtA}_temp`]: t.temperature,
      [`${districtA}_ndvi`]: t.ndvi,
      ...(recordB ? {
        [`${districtB}_yield`]: recordB.yield_val,
        [`${districtB}_anomaly`]: recordB.anomaly_score,
        [`${districtB}_rainfall`]: recordB.rainfall,
        [`${districtB}_temp`]: recordB.temperature,
        [`${districtB}_ndvi`]: recordB.ndvi,
      } : {})
    };
  });

  // Calculate yield vs anomaly correlation coordinates for scatter plot
  const scatterDataA = trendsA.map((t) => ({
    x: t.anomaly_score,
    y: t.yield_val,
    year: t.year,
    district: districtA
  }));

  const scatterDataB = trendsB.map((t) => ({
    x: t.anomaly_score,
    y: t.yield_val,
    year: t.year,
    district: districtB
  }));

  // Simple correlation coefficient calculator
  const calculateCorrelation = (data: TrendRecord[]) => {
    if (data.length === 0) return 0;
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    data.forEach((r) => {
      const x = r.anomaly_score;
      const y = r.yield_val;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const corrA = calculateCorrelation(trendsA);
  const corrB = calculateCorrelation(trendsB);

  const isStrongA = corrA < -0.5;
  const isModerateA = corrA < 0;
  const isStrongB = corrB < -0.5;
  const isModerateB = corrB < 0;

  // Custom tooltips
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
          <p className="font-bold text-white">{data.district} ({data.year})</p>
          <p className="text-slate-400">Anomaly Score: <span className="font-mono text-emerald-400 font-bold">{data.x.toFixed(2)}</span></p>
          <p className="text-slate-400">Crop Yield: <span className="font-mono text-cyan-400 font-bold">{data.y.toFixed(3)} t/ha</span></p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-800/40 flex items-center justify-center text-rose-400">
          <History className="w-8 h-8" />
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
          <p className="text-slate-400 text-sm">Aggregating historical variables...</p>
        </div>
      </div>
    );
  }

  const getCorrelationColor = (isStrong: boolean, isMod: boolean) => {
    if (isStrong) return "text-rose-400";
    if (isMod) return "text-amber-400";
    return "text-emerald-400";
  };

  const getCorrelationText = (isStrong: boolean, isMod: boolean) => {
    if (isStrong) return "Strong negative correlation: climate anomalies suppress yield significantly.";
    if (isMod) return "Moderate negative correlation: anomalies introduce yield strain.";
    return "Weak/Positive: crop yield is highly resilient to climate shifts.";
  };

  return (
    <motion.div 
      className="space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header and Controls */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Historical Trends</h1>
        <p className="text-sm text-slate-400 mt-1">Compare regional yield curves, weather deviations, and study yield-climate correlations</p>
      </motion.div>

      {/* Control Panel */}
      <motion.div 
        className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Historical Comparer</h4>
            <p className="text-[10px] text-slate-500">Cross-reference crop yields and weather metrics between districts.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 shrink-0">District A:</span>
            <select
              value={districtA}
              onChange={(e) => setDistrictA(e.target.value)}
              className="glass-select py-1.5 px-3 pr-9 text-xs text-emerald-400 font-semibold border-emerald-500/20 w-44"
            >
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 shrink-0">District B:</span>
            <select
              value={districtB}
              onChange={(e) => setDistrictB(e.target.value)}
              className="glass-select py-1.5 px-3 pr-9 text-xs text-cyan-400 font-semibold border-cyan-500/20 w-48"
            >
              <option value="">-- No Comparison --</option>
              {districts.filter((d) => d !== districtA).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" variants={itemVariants}>
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[150px] group glass-panel-hover">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">District A Correlation</span>
            <h2 className="text-2xl font-bold text-white mt-1 tabular-nums font-mono">r = {corrA.toFixed(3)}</h2>
          </div>
          <p className="text-xs">
            <span className={`font-medium ${getCorrelationColor(isStrongA, isModerateA)}`}>
              {getCorrelationText(isStrongA, isModerateA)}
            </span>
          </p>
        </div>

        {districtB && (
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[150px] border-cyan-950/30 group glass-panel-hover">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">District B Correlation</span>
              <h2 className="text-2xl font-bold text-cyan-400 mt-1 tabular-nums font-mono">r = {corrB.toFixed(3)}</h2>
            </div>
            <p className="text-xs">
              <span className={`font-medium ${getCorrelationColor(isStrongB, isModerateB)}`}>
                {getCorrelationText(isStrongB, isModerateB)}
              </span>
            </p>
          </div>
        )}

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex items-start gap-4 lg:col-span-1 sm:col-span-2 min-h-[150px]">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sliders className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Correlation Coefficient (r)</span>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Measures linear correlation. An <strong>r &lt; -0.5</strong> indicates that increased climate deviation (anomaly score) exhibits a strong, direct suppressive effect on regional crop yields.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        
        {/* Yield overlay curve */}
        <motion.div className="glass-panel p-6 rounded-2xl space-y-4" variants={itemVariants}>
          <div>
            <h3 className="text-base font-bold text-white">Yield Curve Overlay</h3>
            <p className="text-xs text-slate-500">Comparing historical crop yields (tons per hectare) across timelines</p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line name={districtA} type="monotone" dataKey={`${districtA}_yield`} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {districtB && (
                  <Line name={districtB} type="monotone" dataKey={`${districtB}_yield`} stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Scatter Correlation Plot */}
        <motion.div className="glass-panel p-6 rounded-2xl space-y-4" variants={itemVariants}>
          <div>
            <h3 className="text-base font-bold text-white">Climate Anomaly vs. Yield Scatter</h3>
            <p className="text-xs text-slate-500">Deconstructs yield response to increasing climate instability</p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                <XAxis type="number" dataKey="x" name="Anomaly Score" stroke="#64748b" fontSize={11} label={{ value: 'Climate Anomaly Score', position: 'bottom', fill: '#64748b', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="Yield" stroke="#64748b" fontSize={11} domain={['auto', 'auto']} label={{ value: 'Crop Yield (t/ha)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={CustomScatterTooltip} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Scatter name={districtA} data={scatterDataA} fill="#10b981" line={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                {districtB && (
                  <Scatter name={districtB} data={scatterDataB} fill="#06b6d4" line={{ stroke: '#06b6d4', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Rain Comparison */}
        <motion.div className="glass-panel p-6 rounded-2xl space-y-4" variants={itemVariants}>
          <div>
            <h3 className="text-base font-bold text-white">Annual Precipitation Overlay</h3>
            <p className="text-xs text-slate-500">Historical precipitation totals comparison (mm)</p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedComparisonData}>
                <defs>
                  <linearGradient id="colorRainA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  {districtB && (
                    <linearGradient id="colorRainB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area name={districtA} type="monotone" dataKey={`${districtA}_rainfall`} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRainA)" />
                {districtB && (
                  <Area name={districtB} type="monotone" dataKey={`${districtB}_rainfall`} stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRainB)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* NDVI Canopy Comparison */}
        <motion.div className="glass-panel p-6 rounded-2xl space-y-4" variants={itemVariants}>
          <div>
            <h3 className="text-base font-bold text-white">Satellite Peak NDVI Overlay</h3>
            <p className="text-xs text-slate-500">Sentinel-2 peak crop greenness comparisons</p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0.2, 0.6]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line name={districtA} type="monotone" dataKey={`${districtA}_ndvi`} stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                {districtB && (
                  <Line name={districtB} type="monotone" dataKey={`${districtB}_ndvi`} stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
