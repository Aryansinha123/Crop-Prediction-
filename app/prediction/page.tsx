"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sprout, 
  HelpCircle, 
  TrendingUp, 
  Cpu, 
  Info, 
  Activity,
  AlertTriangle,
  RotateCcw,
  Zap
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

const API_BASE = "http://localhost:8000";

interface ShapData {
  name: string;
  value: number;
}

// Circular confidence gauge component
function ConfidenceGauge({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = (v: number) => {
    if (v >= 80) return "#10b981";
    if (v >= 60) return "#06b6d4";
    if (v >= 40) return "#f59e0b";
    return "#f43f5e";
  };

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={getColor(value)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-ring"
          style={{ filter: `drop-shadow(0 0 8px ${getColor(value)}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white tabular-nums">{value.toFixed(1)}%</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Confidence</span>
      </div>
    </div>
  );
}

export default function PredictionPage() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [temperature, setTemperature] = useState(26.0);
  const [humidity, setHumidity] = useState(53.0);
  const [rainfall, setRainfall] = useState(850.0);
  const [ndvi, setNdvi] = useState(0.38);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  // Fetch districts list
  useEffect(() => {
    fetch(`${API_BASE}/districts`)
      .then((res) => {
        if (!res.ok) throw new Error("API server is offline.");
        return res.json();
      })
      .then((data) => {
        setDistricts(data);
        if (data.length > 0) {
          // Default to Lucknow or first item
          setSelectedDistrict(data.includes("Lucknow") ? "Lucknow" : data[0]);
        }
      })
      .catch((err) => {
        setError("API server is offline. Please start the FastAPI backend.");
      });
  }, []);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrict) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district: selectedDistrict,
          temperature,
          humidity,
          rainfall,
          ndvi,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Prediction failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during prediction.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTemperature(26.0);
    setHumidity(53.0);
    setRainfall(850.0);
    setNdvi(0.38);
    setResult(null);
  };

  // Convert feature contributions dictionary into Recharts list
  const getShapChartData = (): ShapData[] => {
    if (!result || !result.feature_contributions) return [];
    
    // Feature rename map for clarity
    const renameMap: { [key: string]: string } = {
      'T2M': 'Temperature Input',
      'RH2M': 'Humidity Input',
      'PRECTOTCORR': 'Precipitation Input',
      'NDVI': 'Vegetation NDVI',
      'Temp_Anomaly': 'Temp Anomaly',
      'Rain_Anomaly': 'Precip Anomaly',
      'Humidity_Anomaly': 'Humidity Anomaly',
      'Climate_Anomaly_Score': 'Total Anomaly Score',
      'Previous_Year_Yield': 'Previous Year Yield',
      'Rolling_Temp_Avg': 'Rolling Temp',
      'Rolling_Rainfall_Avg': 'Rolling Rain',
      'District_Encoded': 'Regional Encoding'
    };

    return Object.entries(result.feature_contributions)
      .map(([key, val]) => ({
        name: renameMap[key] || key,
        value: Number(val),
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // Sort by impact magnitude
  };

  const shapData = getShapChartData();

  // Slider config for DRY rendering
  const sliders = [
    { label: "Temperature (T2M)", value: temperature, setter: setTemperature, min: 20, max: 35, step: 0.1, unit: "°C", minLabel: "20°C (Cold stress)", maxLabel: "35°C (Heat stress)", format: (v: number) => v.toFixed(1), gradient: "from-blue-500 via-amber-500 to-rose-500" },
    { label: "Relative Humidity (RH2M)", value: humidity, setter: setHumidity, min: 30, max: 80, step: 0.5, unit: "%", minLabel: "30% (Dry environment)", maxLabel: "80% (High moisture)", format: (v: number) => v.toFixed(1), gradient: "from-amber-600 via-cyan-500 to-blue-500" },
    { label: "Total Corrected Rainfall (PRECTOTCORR)", value: rainfall, setter: setRainfall, min: 200, max: 2000, step: 10, unit: "mm", minLabel: "200 mm (Drought risk)", maxLabel: "2000 mm (Flooding risk)", format: (v: number) => v.toFixed(0), gradient: "from-amber-600 via-emerald-500 to-blue-500" },
    { label: "Peak Vegetation Index (NDVI)", value: ndvi, setter: setNdvi, min: 0.10, max: 0.60, step: 0.01, unit: "", minLabel: "0.10 (Poor crop growth)", maxLabel: "0.60 (Vigorous canopy)", format: (v: number) => v.toFixed(2), gradient: "from-rose-600 via-amber-500 to-emerald-500" },
  ];

  return (
    <motion.div 
      className="space-y-12 pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Yield Prediction Console</h1>
        <p className="text-sm text-slate-400 mt-1">Simulate micro-climates and satellite values to forecast crop output with explainable AI metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Form Inputs (6 cols) */}
        <form onSubmit={handlePredict} className="lg:col-span-6 glass-panel p-8 rounded-2xl space-y-7">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <h3 className="font-bold text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center">
                <Cpu className="w-4.5 h-4.5 text-emerald-400" />
              </span>
              Simulation Inputs
            </h3>
            <button 
              type="button" 
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-all hover:bg-slate-900/40 px-2.5 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <div className="space-y-5">
            {/* District Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Target Region (Uttar Pradesh District)</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="glass-select w-full"
                required
              >
                {districts.map((d) => (
                  <option key={d} value={d} className="bg-slate-950 text-slate-200">{d}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Sliders */}
            {sliders.map((s, idx) => {
              const pct = ((s.value - s.min) / (s.max - s.min)) * 100;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="text-emerald-400 font-mono text-sm tabular-nums">{s.format(s.value)} {s.unit}</span>
                  </div>
                  <div className="relative">
                    {/* Gradient track fill */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[6px] rounded-full overflow-hidden pointer-events-none w-full">
                      <div 
                        className={`h-full bg-gradient-to-r ${s.gradient} rounded-full opacity-50`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.value}
                      onChange={(e) => s.setter(parseFloat(e.target.value))}
                      className="glass-range relative z-10"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                    <span>{s.minLabel}</span>
                    <span>{s.maxLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-800 disabled:to-emerald-800 disabled:text-slate-400 transition-all rounded-xl font-bold text-white shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 cursor-pointer btn-glow-emerald relative overflow-hidden"
          >
            {loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-400/20 to-emerald-600/0 animate-[shimmer_1.5s_infinite]" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running ML Prediction...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Predict Expected Yield
                </>
              )}
            </span>
          </button>
        </form>

        {/* Prediction Results (6 cols) */}
        <div className="lg:col-span-6 space-y-8">
          <AnimatePresence mode="wait">
            {!result && !error && (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel p-8 rounded-2xl min-h-[580px] h-full flex flex-col items-center justify-center text-center space-y-5"
              >
                <div className="w-20 h-20 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400 relative">
                  <Sprout className="w-9 h-9" />
                  <div className="absolute inset-0 rounded-2xl border border-emerald-400/20 animate-pulse-ring" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Prediction Console Idle</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">Adjust the meteorological and NDVI canopy sliders, then click the predict button to generate estimate outputs.</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel p-8 rounded-2xl min-h-[580px] h-full flex flex-col items-center justify-center text-center space-y-5 border-rose-950/40"
              >
                <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-900/40 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Simulation Error</h3>
                  <p className="text-xs text-slate-400 mt-1">{error}</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Yield + Confidence */}
                <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col sm:grid sm:grid-cols-2 gap-6 items-center sm:items-start text-center sm:text-left relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_80%,rgba(16,185,129,0.06),transparent)] pointer-events-none" />
                  <div className="space-y-2 relative z-10">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Predicted Crop Yield</p>
                    <motion.h2 
                      className="text-4xl font-extrabold text-white glow-emerald tabular-nums"
                      initial={{ opacity: 0, filter: "blur(8px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      {result.predicted_yield.toFixed(3)}
                      <span className="text-xs text-slate-400 font-normal ml-1.5">t/ha</span>
                    </motion.h2>
                    <p className="text-[10px] text-slate-500 mt-1">Tons per hectare output</p>
                  </div>
                  <div className="relative z-10 w-full flex justify-center sm:justify-end">
                    <ConfidenceGauge value={result.confidence_score} />
                  </div>
                </div>

                {/* Explanation text */}
                <div className="glass-panel p-5 rounded-2xl bg-emerald-950/10 border-emerald-900/20 text-xs text-slate-300 leading-relaxed flex gap-3">
                  <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p>{result.climate_explanation}</p>
                </div>

                {/* SHAP Feature Contribution Chart */}
                <div className="glass-panel p-8 rounded-2xl space-y-5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-emerald-400" />
                    </span>
                    Explainable AI (SHAP Impact Contributions)
                  </h4>
                  <p className="text-[10px] text-slate-500">Visualizes how feature deviations push final predicted crop yield up (+) or down (-) relative to global baseline average yields.</p>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={shapData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={9} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={130} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '12px' }} />
                        <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
                        <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                          {shapData.map((entry, index) => {
                            const isPositive = entry.value >= 0;
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isPositive ? "#10b981" : "#f43f5e"} 
                                opacity={isPositive ? 0.85 : 0.8}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
