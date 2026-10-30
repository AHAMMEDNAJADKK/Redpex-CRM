// src/components/StatsCard.jsx

import React from 'react';
import { motion } from 'framer-motion';

const colorMap = {
  indigo: {
    bg: 'from-[#be1e2d]/10 to-rose-500/10 dark:from-[#be1e2d]/20 dark:to-rose-500/20',
    border: 'border-[#be1e2d]/20 dark:border-[#be1e2d]/30',
    text: 'text-[#be1e2d] dark:text-red-400',
    glow: 'shadow-[#be1e2d]/10'
  },
  emerald: {
    bg: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-emerald-500/10'
  },
  rose: {
    bg: 'from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20',
    border: 'border-rose-500/20 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
    glow: 'shadow-rose-500/10'
  },
  amber: {
    bg: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-500/10'
  }
};

export const StatsCard = ({ title, value, icon: Icon, color = 'indigo', loading = false }) => {
  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden rounded-xl p-5 bg-white dark:bg-[#131c2e] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase truncate">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {value}
            </h3>
          )}
        </div>

        <div className={`p-3 rounded-xl bg-gradient-to-tr ${scheme.bg} border ${scheme.border} ${scheme.text} flex items-center justify-center shrink-0 shadow-sm`}>
          {Icon && <Icon size={20} className="stroke-[2.2px]" />}
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
