"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Sprout, 
  TrendingUp, 
  Globe, 
  Activity, 
  ChevronRight, 
  ArrowUpRight, 
  Cpu, 
  LineChart, 
  Search,
  Database,
  Zap,
  Satellite,
  Brain,
  BarChart3
} from "lucide-react";

// Animated counter hook
function useCounter(end: number, duration: number = 1500, decimals: number = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      setCount(eased * end);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return { count: decimals > 0 ? count.toFixed(decimals) : Math.round(count), ref };
}

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } 
    }
  };

  const districtCounter = useCounter(59, 1800);
  const r2Counter = useCounter(0.661, 1600, 3);
  const rmseCounter = useCounter(0.388, 1400, 3);

  const pipelineSteps = [
    { 
      num: "01", 
      title: "Climate Parameters", 
      desc: "NASA POWER meteorological daily indexes (T2M, PRECTOTCORR, RH2M) aggregated annually.",
      icon: Satellite,
      color: "blue"
    },
    { 
      num: "02", 
      title: "Satellite NDVI", 
      desc: "Sentinel-2 multi-spectral bands query from GEE, extracting annual peak crop greenness.",
      icon: Globe,
      color: "emerald"
    },
    { 
      num: "03", 
      title: "Dynamic Anomaly Scoring", 
      desc: "Computes temperature, rain, and humidity anomaly indexes against historic normals.",
      icon: Zap,
      color: "purple"
    },
    { 
      num: "04", 
      title: "Ensemble Prediction", 
      desc: "Random Forest predictions with SHAP waterfall explainability mapped in real-time.",
      icon: Brain,
      color: "amber"
    }
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; numBg: string; numBorder: string }> = {
    blue: { bg: "bg-blue-950/30", border: "border-blue-800/30", text: "text-blue-400", numBg: "bg-blue-950/50", numBorder: "border-blue-800/40" },
    emerald: { bg: "bg-emerald-950/30", border: "border-emerald-800/30", text: "text-emerald-400", numBg: "bg-emerald-950/50", numBorder: "border-emerald-800/40" },
    purple: { bg: "bg-purple-950/30", border: "border-purple-800/30", text: "text-purple-400", numBg: "bg-purple-950/50", numBorder: "border-purple-800/40" },
    amber: { bg: "bg-amber-950/30", border: "border-amber-800/30", text: "text-amber-400", numBg: "bg-amber-950/50", numBorder: "border-amber-800/40" }
  };

  return (
    <motion.div 
      className="space-y-16 pb-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Banner / Breadcrumb */}
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/25 border border-emerald-900/25 text-xs text-emerald-400 font-medium backdrop-blur-sm">
          <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Active Climate-Aware Forecasting System</span>
          <span className="relative flex h-1.5 w-1.5 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
        </div>
        <div className="text-slate-500 text-xs font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          Last Retrained: May 22, 2026
        </div>
      </motion.div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-8">
          <motion.h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
            variants={itemVariants}
          >
            AgriClimate{" "}
            <span className="animated-gradient-text">AI</span>
          </motion.h1>
          <motion.p 
            className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed"
            variants={itemVariants}
          >
            A research-grade agricultural intelligence platform predicting district-wise crop yield in Uttar Pradesh. Integrates NASA POWER weather data, Google Earth Engine satellite NDVI parameters, and explainable AI algorithms.
          </motion.p>
          <motion.div className="flex flex-wrap gap-4 pt-2" variants={itemVariants}>
            <Link 
              href="/prediction"
              className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:scale-[1.03] active:scale-[0.97] transition-all rounded-xl font-semibold text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/50 duration-300 btn-glow-emerald"
            >
              <span>Launch Yield Predictor</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link 
              href="/dashboard"
              className="group flex items-center gap-2 px-7 py-3.5 glass-panel hover:bg-slate-900/60 hover:scale-[1.03] active:scale-[0.97] transition-all rounded-xl font-semibold text-slate-300 hover:text-white duration-300 gradient-border"
            >
              <span>Explore Analytics</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Visual Panel Hero Right */}
        <motion.div 
          className="lg:col-span-5 relative"
          variants={itemVariants}
        >
          <div className="glass-panel rounded-3xl p-8 relative overflow-hidden animated-border">
            {/* Visual Grid Graphic */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(0,0,0,0))] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">UP Spatial Map Tracker</span>
              </div>
              <span className="text-[10px] bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-semibold">● Live Sync</span>
            </div>

            <div className="min-h-[16rem] py-8 border border-slate-800/40 rounded-2xl bg-slate-950/40 flex flex-col justify-center items-center relative group overflow-hidden">
              {/* Animated dot grid inside */}
              <div className="absolute inset-0 dot-grid opacity-60" />
              
              {/* Floating particles */}
              <div className="absolute w-2 h-2 bg-emerald-500/30 rounded-full top-8 left-12 animate-float-orb" />
              <div className="absolute w-1.5 h-1.5 bg-cyan-500/30 rounded-full top-20 right-16 animate-float-orb-delayed" />
              <div className="absolute w-1 h-1 bg-purple-500/30 rounded-full bottom-12 left-24 animate-float-orb-slow" />
              <div className="absolute w-2.5 h-2.5 bg-emerald-500/20 rounded-full bottom-20 right-12 animate-float-orb" />
              
              <div className="w-full px-8 text-center space-y-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-center mx-auto text-emerald-400 group-hover:scale-110 group-hover:border-emerald-500/50 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-emerald-900/30">
                  <Globe className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Interactive Regional Grid</h3>
                  <p className="text-xs text-slate-500 mt-1">Select from 59 district profiles for localized soil, precipitation, temperature anomalies, and yield output.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <div className="glass-panel p-7 rounded-2xl space-y-4 relative overflow-hidden group glass-panel-hover card-entrance" ref={districtCounter.ref}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300">
              <Globe className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">District Coverage</p>
          </div>
          <h2 className="text-3xl font-extrabold text-white tabular-nums">{districtCounter.count} <span className="text-lg text-slate-500 font-normal">/ 75</span></h2>
          <p className="text-xs text-slate-500">Uttar Pradesh agricultural zones mapped</p>
        </div>

        <div className="glass-panel p-7 rounded-2xl space-y-4 relative overflow-hidden group glass-panel-hover card-entrance" ref={r2Counter.ref}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition-all duration-700" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/30 border border-cyan-800/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Best Model R² Score</p>
          </div>
          <h2 className="text-3xl font-extrabold text-white tabular-nums">{r2Counter.count}</h2>
          <p className="text-xs text-slate-500">Random Forest Regressor ensemble</p>
        </div>

        <div className="glass-panel p-7 rounded-2xl space-y-4 relative overflow-hidden group glass-panel-hover card-entrance" ref={rmseCounter.ref}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full group-hover:bg-blue-500/10 transition-all duration-700" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/30 border border-blue-800/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Model Error (RMSE)</p>
          </div>
          <h2 className="text-3xl font-extrabold text-white tabular-nums">{rmseCounter.count} <span className="text-xs text-slate-400 font-normal">t/ha</span></h2>
          <p className="text-xs text-slate-500">Mean Absolute Error (MAE): 0.284</p>
        </div>

        <div className="glass-panel p-7 rounded-2xl space-y-4 relative overflow-hidden group glass-panel-hover card-entrance">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full group-hover:bg-rose-500/10 transition-all duration-700" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950/30 border border-rose-800/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Climate Instability</p>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Adaptive</h2>
          <p className="text-xs text-slate-500">Real-time correction factor applied</p>
        </div>
      </motion.div>

      {/* Pipeline Visualization */}
      <motion.div 
        className="glass-panel p-8 rounded-3xl space-y-8"
        variants={itemVariants}
      >
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-emerald-400" />
            </span>
            Platform ML Data Pipeline
          </h2>
          <p className="text-sm text-slate-400">The architecture behind AgriClimate AI's precision forecasting models</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting lines (desktop only) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 z-0">
            <svg className="w-full h-4 -mt-2" preserveAspectRatio="none">
              <line x1="12.5%" y1="8" x2="37.5%" y2="8" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" strokeDasharray="6 4" className="animate-flow-dash" />
              <line x1="37.5%" y1="8" x2="62.5%" y2="8" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" strokeDasharray="6 4" className="animate-flow-dash" />
              <line x1="62.5%" y1="8" x2="87.5%" y2="8" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" strokeDasharray="6 4" className="animate-flow-dash" />
            </svg>
          </div>

          {pipelineSteps.map((step, idx) => {
            const colors = colorMap[step.color];
            const Icon = step.icon;
            return (
              <motion.div 
                key={step.num}
                className={`bg-slate-950/50 border border-slate-800/60 p-6 rounded-2xl relative space-y-4 z-10 group hover:border-slate-700/60 transition-all duration-300 hover:-translate-y-1`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${colors.numBg} border ${colors.numBorder} flex items-center justify-center ${colors.text} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${colors.text} opacity-60`}>STEP {step.num}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-slate-100">{step.title}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Model Benchmark & Research */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          className="lg:col-span-6 glass-panel p-8 rounded-3xl space-y-8"
          variants={itemVariants}
        >
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-emerald-400" />
            </span>
            Ensemble Benchmark Results
          </h3>
          <p className="text-xs text-slate-400">Performance evaluations across different ML regression models built on engineered features.</p>
          
          <div className="space-y-5">
            {[
              { name: "Random Forest (Selected)", r2: "0.661", rmse: "0.388", pct: 66.1, active: true },
              { name: "XGBoost Regressor", r2: "0.626", rmse: "0.408", pct: 62.6, active: false },
              { name: "CatBoost Regressor", r2: "0.626", rmse: "0.408", pct: 62.6, active: false },
              { name: "LightGBM Regressor", r2: "0.549", rmse: "0.447", pct: 54.9, active: false },
            ].map((model, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className={model.active ? "text-white font-semibold" : "text-slate-400"}>{model.name}</span>
                  <span className={model.active ? "text-emerald-400 font-bold" : "text-slate-500 font-semibold"}>R²: {model.r2} | RMSE: {model.rmse}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-950 overflow-hidden relative">
                  <motion.div 
                    className={`h-full rounded-full ${model.active ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-emerald-800/40'}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${model.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="lg:col-span-6 glass-panel p-8 rounded-3xl space-y-8"
          variants={itemVariants}
        >
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-cyan-950/30 border border-cyan-800/30 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-cyan-400" />
            </span>
            Key Research Contributions
          </h3>
          
          <div className="space-y-5">
            {[
              { icon: Globe, color: "emerald", title: "Satellite & Climate Integration", desc: "Fusing NASA POWER meteorological parameters with Sentinel-2 NDVI spectral details allows models to account for physical weather conditions alongside actual vegetative stress." },
              { icon: LineChart, color: "cyan", title: "Dynamic Climate Correction", desc: "Calculates deviation profiles for heat and moisture against baseline normals, providing robust anomaly scores which dynamically correct model expectations during climate shocks." },
              { icon: Search, color: "purple", title: "Explainable Prediction Pathways", desc: "Incorporates SHAP waterfall and summary metrics, turning the machine learning model from a black box into a transparent tool for regional policy decisions." },
            ].map((item, idx) => {
              const Icon = item.icon;
              const colorClasses: Record<string, string> = {
                emerald: "bg-emerald-950/20 border-emerald-900/30 text-emerald-400",
                cyan: "bg-cyan-950/20 border-cyan-900/30 text-cyan-400",
                purple: "bg-purple-950/20 border-purple-900/30 text-purple-400",
              };
              return (
                <motion.div 
                  key={idx} 
                  className="flex gap-4 group"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses[item.color]} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
