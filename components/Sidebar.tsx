"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Home, 
  LayoutDashboard, 
  Sprout, 
  AlertTriangle, 
  Activity, 
  History, 
  Settings, 
  Database,
  Cpu,
  Menu,
  X
} from "lucide-react";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "District Analytics", href: "/dashboard", icon: LayoutDashboard },
  { name: "Yield Prediction", href: "/prediction", icon: Sprout },
  { name: "Climate Risk Map", href: "/risk", icon: AlertTriangle },
  { name: "SHAP Explainability", href: "/explainability", icon: Activity },
  { name: "Historical Trends", href: "/historical", icon: History },
  { name: "Admin Control", href: "/admin", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating hamburger menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-5 z-50 lg:hidden bg-[#090e1a]/85 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all shadow-lg shadow-black/50 backdrop-blur-md cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`w-64 sidebar-panel flex flex-col h-screen shrink-0 z-45 transition-transform duration-300 fixed inset-y-0 left-0 lg:sticky lg:top-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        {/* Decorative gradient line on left edge */}
        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent pointer-events-none" />
        
        {/* Header / Logo */}
        <div className="p-7 border-b border-slate-800/60 flex items-center gap-3.5 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 relative">
            <Sprout className="w-5.5 h-5.5 text-white" />
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-xl border border-emerald-400/30 animate-pulse-ring" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-wide">
              Agri<span className="animated-gradient-text">Climate</span> <span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Climate Intel Platform</p>
          </div>
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto mt-12">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-all group duration-250 relative overflow-hidden ${
                  isActive
                    ? "text-emerald-400 border border-emerald-800/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent hover:translate-x-0.5"
                }`}
              >
                {/* Active background gradient */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-950/50 via-emerald-950/30 to-transparent rounded-xl"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                
                {/* Active left accent bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeAccent"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                
                <Icon className={`w-4 h-4 transition-all duration-250 group-hover:scale-110 relative z-10 ${
                  isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400"
                }`} />
                <span className="relative z-10">{item.name}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto relative z-10">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Status footer */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/30 text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              ML Engine:
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              RF (0.66)
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-500" />
              Database:
            </span>
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              Atlas (Live)
            </span>
          </div>
          <div className="pt-2 text-center border-t border-slate-900/60">
            <span className="text-[9px] text-slate-600 font-mono tracking-wider">UP Prediction Engine v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
