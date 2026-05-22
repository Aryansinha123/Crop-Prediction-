"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Settings, 
  Database, 
  Terminal, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Clock, 
  FileText,
  HelpCircle,
  TrendingUp,
  Sliders,
  Sprout,
  Zap
} from "lucide-react";

interface PredictionLog {
  timestamp: string;
  district: string;
  inputs: {
    temperature: number;
    humidity: number;
    rainfall: number;
    ndvi: number;
  };
  predicted_yield: number;
  confidence_score: number;
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

export default function AdminPage() {
  const [logs, setLogs] = useState<PredictionLog[]>([]);
  const [dbConnected, setDbConnected] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [metrics, setMetrics] = useState<{ mae: number; rmse: number; r2: number } | null>(null);
  const [error, setError] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Fetch db status and logs
  const fetchStatusAndLogs = () => {
    fetch(`${API_BASE}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Backend offline.");
        return res.json();
      })
      .then((data) => {
        setDbConnected(data.mongodb_connected);
      })
      .catch((err) => {
        setError("API server is offline. Please start the FastAPI backend.");
      });

    setLoadingLogs(true);
    fetch(`${API_BASE}/admin/logs`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch admin logs.");
        return res.json();
      })
      .then((data) => {
        setLogs(data);
        setLoadingLogs(false);
      })
      .catch((err) => {
        setLoadingLogs(false);
      });
  };

  useEffect(() => {
    fetchStatusAndLogs();
  }, []);

  // Retrain Trigger
  const triggerRetraining = async () => {
    if (retraining) return;
    setRetraining(true);
    setMetrics(null);
    setTerminalLines(["$ Initializing ML Retraining Pipeline..."]);

    const appendLine = (line: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setTerminalLines((prev) => [...prev, line]);
          resolve();
        }, delay);
      });
    };

    await appendLine("> [INFO] Fetching historical district metrics from feature_engineered_dataset.csv...", 600);
    await appendLine("> [INFO] Parsing 59 Uttar Pradesh districts crop cycles...", 600);
    await appendLine("> [INFO] Performing feature scaling and anomaly encoding...", 500);
    await appendLine("> [INFO] Splitting dataset: 8% test, 92% train cross-validation fold...", 600);
    await appendLine("> [INFO] Spawning Random Forest Regressor (300 estimator trees)...", 600);
    await appendLine("> [INFO] Training ensemble. Computing feature importances and leaf nodes...", 800);

    try {
      const response = await fetch(`${API_BASE}/admin/retrain`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error("Retraining execution failed.");
      }

      const data = await response.json();

      await appendLine("> [SUCCESS] Random Forest ensemble fit completed successfully.", 400);
      await appendLine(`> [METRICS] R²: ${data.r2.toFixed(4)} | RMSE: ${data.rmse.toFixed(4)} t/ha | MAE: ${data.mae.toFixed(4)} t/ha`, 400);
      await appendLine("> [INFO] Serializing trained_models/best_model.pkl and trained_models/model_metadata.json...", 400);
      await appendLine("$ ML Model retraining sync complete! Engine running on updated parameters.", 400);
      
      setMetrics({
        mae: data.mae,
        rmse: data.rmse,
        r2: data.r2
      });
    } catch (err: any) {
      await appendLine(`> [ERROR] Model fitting exception: ${err.message || "Execution error"}`, 200);
      await appendLine("$ Pipeline terminated with exit code 1.", 200);
    } finally {
      setRetraining(false);
      fetchStatusAndLogs();
    }
  };

  const getRiskBadge = (level: string) => {
    if (level === "Normal") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (level === "Moderate Risk") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  };

  const getLineColor = (line: string) => {
    if (line.includes("[SUCCESS]")) return "text-emerald-400 font-bold";
    if (line.includes("[ERROR]")) return "text-rose-400 font-bold";
    if (line.includes("[METRICS]")) return "text-cyan-400 font-bold";
    if (line.startsWith("$")) return "text-white font-semibold";
    return "text-slate-400";
  };

  if (error) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-800/40 flex items-center justify-center text-rose-400">
          <Settings className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
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

  return (
    <motion.div 
      className="space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin & Diagnostics</h1>
        <p className="text-sm text-slate-400 mt-1">Monitor prediction logs, configure database syncs, and trigger model retraining</p>
      </motion.div>

      {/* Grid: Diagnostics Database + ML Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Retraining Terminal (7 cols) */}
        <motion.div className="lg:col-span-7 space-y-6" variants={itemVariants}>
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center">
                  <Terminal className="w-4.5 h-4.5 text-emerald-400" />
                </span>
                <h3 className="font-bold text-white text-sm">ML Retraining Terminal</h3>
              </div>
              <button
                onClick={triggerRetraining}
                disabled={retraining}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-800/50 disabled:to-emerald-800/50 disabled:text-slate-400 transition-all rounded-lg text-xs font-bold text-white shadow shadow-emerald-950/40 cursor-pointer btn-glow-emerald"
              >
                {retraining ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Fitting Model...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Trigger Retrain</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Screen */}
            <div 
              ref={terminalRef}
              className="h-80 rounded-xl bg-black/40 border border-slate-800/50 p-4 font-mono text-xs space-y-1 overflow-y-auto select-text relative"
            >
              {/* Dot indicators top bar */}
              <div className="absolute top-3 left-4 flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              
              <div className="pt-4">
                {terminalLines.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 pt-24">
                    <span className="terminal-cursor">Terminal idle. Click &quot;Trigger Retrain&quot; to compile pipeline</span>
                  </div>
                ) : (
                  terminalLines.map((line, idx) => (
                    <motion.div 
                      key={idx} 
                      className={getLineColor(line)}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {line}
                    </motion.div>
                  ))
                )}
                {retraining && (
                  <span className="terminal-cursor text-slate-500"> </span>
                )}
              </div>
            </div>

            {/* Metrics display */}
            {metrics && (
              <motion.div 
                className="grid grid-cols-3 gap-4 pt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-slate-950/50 border border-slate-800/50 p-3.5 rounded-xl text-center">
                  <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">{metrics.r2.toFixed(4)}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase mt-0.5">Model R²</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/50 p-3.5 rounded-xl text-center">
                  <span className="text-base font-bold text-cyan-400 font-mono tabular-nums">{metrics.rmse.toFixed(3)} <span className="text-[10px] text-slate-500 font-normal">t/ha</span></span>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase mt-0.5">RMSE Error</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/50 p-3.5 rounded-xl text-center">
                  <span className="text-base font-bold text-slate-300 font-mono tabular-nums">{metrics.mae.toFixed(3)} <span className="text-[10px] text-slate-500 font-normal">t/ha</span></span>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase mt-0.5">MAE Error</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* DB Connection & Details (5 cols) */}
        <motion.div className="lg:col-span-5 space-y-6" variants={itemVariants}>
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <h3 className="font-bold text-white text-sm flex items-center gap-2.5 border-b border-slate-800/60 pb-4">
              <span className="w-8 h-8 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-center justify-center">
                <Database className="w-4.5 h-4.5 text-cyan-400" />
              </span>
              Database Status
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Database Engine:</span>
                <span className="text-xs text-white font-semibold">MongoDB Atlas</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Sync Connection:</span>
                {dbConnected ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-900/30 px-2.5 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    CONNECTED
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-950/30 border border-amber-900/30 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    LOCAL FALLBACK
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs text-slate-400 leading-relaxed">
                {dbConnected ? (
                  <p>Prediction query audits are fully synced with MongoDB Atlas. Logs are aggregated in the cloud repository for spatial analysis.</p>
                ) : (
                  <p>MONGODB_URI is not set. Prediction logs are temporarily cached in backend local memory (up to last 100 entries). Caching resets on server restarts.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Prediction Query Logs Section */}
      <motion.div className="glass-panel p-6 rounded-2xl space-y-5" variants={itemVariants}>
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-emerald-400" />
            </span>
            <h3 className="font-bold text-white text-sm">Prediction Query Audits</h3>
          </div>
          <button
            onClick={fetchStatusAndLogs}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-all px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadingLogs ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-700" />
            <p className="text-xs">No query logs cached. Execute a simulation in the Prediction Console to generate audit entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-5 text-left">Time</th>
                  <th className="py-4 px-5 text-left">District</th>
                  <th className="py-4 px-5 text-left">Inputs (T / H / R / NDVI)</th>
                  <th className="py-4 px-5 text-left">Predicted Yield</th>
                  <th className="py-4 px-5 text-left">Confidence</th>
                  <th className="py-4 px-5 text-right">Climate Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/20">
                {logs.map((log, idx) => (
                  <motion.tr 
                    key={idx} 
                    className="hover:bg-slate-900/20 text-slate-300 transition-all duration-150"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                  >
                    <td className="py-4 px-5 font-mono text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(log.timestamp)}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-semibold text-white">{log.district}</td>
                    <td className="py-4 px-5 font-mono text-slate-400 tabular-nums">
                      {log.inputs.temperature.toFixed(1)}°C / {log.inputs.humidity.toFixed(0)}% / {log.inputs.rainfall.toFixed(0)}mm / {log.inputs.ndvi.toFixed(2)}
                    </td>
                    <td className="py-4 px-5 font-bold text-emerald-400 font-mono tabular-nums">{log.predicted_yield.toFixed(3)} t/ha</td>
                    <td className="py-4 px-5 font-mono tabular-nums">{log.confidence_score.toFixed(1)}%</td>
                    <td className="py-4 px-5 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getRiskBadge(log.risk_level)}`}>
                        {log.risk_level}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}
