"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  HelpCircle, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Layers,
  Award,
  AlertTriangle,
  Cpu,
  BookOpen,
  ArrowUpRight,
  ChevronDown,
  ArrowRight
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

interface ShapResponse {
  district: string;
  year: number;
  yield: number;
  contributions: { [key: string]: number };
}

// Global Feature Importance rankings (pre-calculated from Random Forest model_metadata.json/training)
const GLOBAL_IMPORTANCE = [
  { name: "Vegetation NDVI", value: 0.354, description: "Peak satellite vegetative greenness and crop vigor indicator." },
  { name: "Previous Year Yield", value: 0.248, description: "Historical regional soil baseline productivity memory." },
  { name: "Rolling Rain Avg", value: 0.125, description: "3-year cumulative rainfall water table availability." },
  { name: "Total Anomaly Score", value: 0.089, description: "Combined deviation of weather metrics from normals." },
  { name: "Rolling Temp Avg", value: 0.072, description: "3-year rolling average temperature window." },
  { name: "Precipitation Input", value: 0.045, description: "NASA POWER annual corrected rainfall total." },
  { name: "Temperature Input", value: 0.038, description: "NASA POWER annual mean surface temperature." },
  { name: "Humidity Anomaly", value: 0.015, description: "Deviation of air moisture levels from district baseline." },
  { name: "Rain Anomaly", value: 0.009, description: "Precipitation deviation from historical normals." },
  { name: "Temp Anomaly", value: 0.005, description: "Temperature deviation from historical normals." }
];

const tabs = [
  { id: "local", name: "Local Decisions", icon: Cpu },
  { id: "global", name: "Global Importance", icon: Layers },
  { id: "theory", name: "Explainability Theory", icon: BookOpen }
] as const;

export default function ExplainabilityPage() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [shapData, setShapData] = useState<ShapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"local" | "global" | "theory">("local");

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
          setSelectedDistrict(data.includes("Lucknow") ? "Lucknow" : data[0]);
        }
      })
      .catch((err) => {
        setError("API server is offline. Please start the FastAPI backend.");
        setLoading(false);
      });
  }, []);

  // Fetch SHAP for district
  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    fetch(`${API_BASE}/shap/${selectedDistrict.toLowerCase()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch SHAP explainability records.");
        return res.json();
      })
      .then((data) => {
        setShapData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("SHAP fetch failed:", err);
        setLoading(false);
      });
  }, [selectedDistrict]);

  // Transform SHAP data for chart
  const getChartData = () => {
    if (!shapData) return [];
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

    return Object.entries(shapData.contributions)
      .map(([key, val]) => ({
        rawName: key,
        name: renameMap[key] || key,
        value: Number(val)
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  };

  const chartData = getChartData();

  const totalContributions = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const baseValue = shapData ? shapData.yield - totalContributions : 2.15;

  // Build Waterfall Flow steps
  const getWaterfallSteps = () => {
    if (!shapData) return [];
    
    let currentVal = baseValue;
    const steps: { name: string; impact: number; runningValue: number; type: "base" | "positive" | "negative" | "final" }[] = [{
      name: "Base Model Average",
      impact: 0,
      runningValue: currentVal,
      type: "base"
    }];

    const topContributors = [...chartData].slice(0, 5);
    const othersSum = [...chartData].slice(5).reduce((acc, curr) => acc + curr.value, 0);

    topContributors.forEach((item) => {
      currentVal += item.value;
      steps.push({
        name: item.name,
        impact: item.value,
        runningValue: currentVal,
        type: (item.value >= 0 ? "positive" : "negative") as "positive" | "negative"
      });
    });

    if (chartData.length > 5) {
      currentVal += othersSum;
      steps.push({
        name: "Remaining Features",
        impact: othersSum,
        runningValue: currentVal,
        type: (othersSum >= 0 ? "positive" : "negative") as "positive" | "negative"
      });
    }

    steps.push({
      name: "Final Predicted Yield",
      impact: 0,
      runningValue: shapData.yield,
      type: "final" as const
    });

    return steps;
  };

  const waterfallSteps = getWaterfallSteps();

  if (error) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-800/40 flex items-center justify-center text-rose-400">
          <Layers className="w-8 h-8" />
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
          <p className="text-slate-400 text-sm">Loading SHAP contribution indexes...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Explainable AI (SHAP)</h1>
          <p className="text-sm text-slate-400 mt-1">Deconstruct prediction outcomes to understand mathematical feature contributions</p>
        </div>

        {/* Tab selection with animated underline */}
        <div className="flex bg-slate-950/80 border border-slate-800/60 p-1 rounded-xl shrink-0 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer relative z-10 ${
                  isActive
                    ? "text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-slate-800/80 border border-slate-700/60 rounded-lg shadow-inner"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "local" && (
          <motion.div 
            key="local" 
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* District selector card */}
            <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Select District Profile</h4>
                  <p className="text-[10px] text-slate-500">Deconstructs features for the 2024 cropping cycle.</p>
                </div>
              </div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="glass-select py-2 px-4 pr-10 text-sm font-semibold text-slate-200 w-full sm:w-60"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="h-60 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              </div>
            ) : shapData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Feature Impact Chart (7 cols) */}
                <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Local Feature Impact</h3>
                    <p className="text-xs text-slate-500">Feature contributions pushing yield away from the global model baseline yield ({baseValue.toFixed(2)} t/ha)</p>
                  </div>

                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={10} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={130} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '12px' }} />
                        <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
                        <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                          {chartData.map((entry, index) => {
                            const isPositive = entry.value >= 0;
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isPositive ? "#10b981" : "#f43f5e"} 
                                opacity={isPositive ? 0.9 : 0.8}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Waterfall Pathway (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="glass-panel p-6 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Prediction Pathway</h3>
                      <p className="text-xs text-slate-500">Additive step-by-step SHAP waterfall reconstruction</p>
                    </div>

                    <div className="space-y-1 relative pl-5 border-l border-slate-800/60 ml-1">
                      {waterfallSteps.map((step, idx) => {
                        const dotColor = 
                          step.type === 'base' ? "border-slate-500" :
                          step.type === 'positive' ? "border-emerald-500 bg-emerald-500/20" :
                          step.type === 'negative' ? "border-rose-500 bg-rose-500/20" :
                          "border-cyan-500 bg-cyan-500/20";
                        
                        return (
                          <motion.div 
                            key={idx} 
                            className="flex justify-between items-center text-xs relative group py-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.08, duration: 0.4 }}
                          >
                            {/* Timeline dot */}
                            <div className={`absolute -left-[24px] top-[16px] w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 group-hover:scale-150 ${dotColor}`} />
                            
                            <div className="pr-4">
                              <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors leading-snug">{step.name}</p>
                              {step.impact !== 0 && (
                                <span className={`text-[10px] font-mono block mt-0.5 ${step.impact >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {step.impact >= 0 ? "+" : ""}{step.impact.toFixed(3)} t/ha
                                </span>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-white transition-colors tabular-nums">{step.runningValue.toFixed(3)}</span>
                              <span className="text-[9px] text-slate-500 block">t/ha</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Local Interpretation Card */}
                  <div className="glass-panel p-5 rounded-2xl bg-emerald-950/10 border-emerald-900/20 text-xs text-slate-300 leading-relaxed space-y-2">
                    <div className="flex gap-2 text-emerald-400 font-bold items-center mb-1">
                      <Info className="w-4.5 h-4.5" />
                      <span>Decision Pathway Explained</span>
                    </div>
                    <p>
                      For <strong>{shapData.district}</strong> in the latest model estimation, the baseline crop yield benchmark starts at <strong>{baseValue.toFixed(3)} t/ha</strong>. 
                    </p>
                    <p>
                      {chartData.length > 0 && chartData[0].value >= 0 ? (
                        <span>The single most positive contributor was <strong>{chartData[0].name}</strong>, increasing estimated output by <strong>+{chartData[0].value.toFixed(3)} t/ha</strong>. </span>
                      ) : (
                        <span>The single most severe suppressive contributor was <strong>{chartData[0].name}</strong>, decreasing estimated output by <strong>{chartData[0].value.toFixed(3)} t/ha</strong>. </span>
                      )}
                      Combining all factors, the model aggregates to a final yield prediction of <strong>{shapData.yield.toFixed(3)} t/ha</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "global" && (
          <motion.div 
            key="global"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Global Importance Chart (7 cols) */}
            <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Global Feature Importance (Mean |SHAP|)</h3>
                <p className="text-xs text-slate-500">Average absolute contribution magnitude of each feature across all historical records</p>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={GLOBAL_IMPORTANCE}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={130} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Feature Glossary (5 cols) */}
            <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Feature Influence Glossary</h3>
                <p className="text-xs text-slate-500">Technical definition of core indexes utilized in model estimations</p>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                {GLOBAL_IMPORTANCE.slice(0, 6).map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    className="border-b border-slate-900/60 pb-4 last:border-b-0 space-y-2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.4 }}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white">{item.name}</span>
                      <span className="font-mono text-emerald-400 font-bold">W: {item.value.toFixed(3)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "theory" && (
          <motion.div 
            key="theory"
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
                <Award className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-base font-bold text-white">What is SHAP?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SHAP (SHapley Additive exPlanations) is a game theoretic approach to explain the output of any machine learning model. It connects optimal credit allocation with local explanations using classical Shapley values from cooperative game theory.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                In cooperative game theory, Shapley values distribute payouts fairly among players based on their marginal contributions to the game's outcome. In machine learning, the "players" are features, the "game" is predicting the crop yield, and the "payout" is the deviation of the prediction from the model's base value.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-950/20 border border-cyan-900/30 flex items-center justify-center text-cyan-400">
                <Layers className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-base font-bold text-white">Reading SHAP Values</h3>
              <div className="space-y-3 text-xs">
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <p className="text-slate-400"><strong className="text-emerald-400">Positive SHAP (&gt; 0):</strong> The feature's value pushed the predicted yield higher than the model's baseline average (e.g. higher vegetative canopy NDVI indicates healthy crops, yielding more tons/hectare).</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                  <p className="text-slate-400"><strong className="text-rose-400">Negative SHAP (&lt; 0):</strong> The feature's value suppressed the prediction below the model's baseline average (e.g. severe temperature anomalies indicate heat stress, suppressing yield output).</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0 mt-1" />
                  <p className="text-slate-400"><strong className="text-slate-300">SHAP Additivity:</strong> The sum of all SHAP values plus the model's baseline average yield will EXACTLY equal the final predicted yield for that specific district simulation query.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
