// src/components/StatusBadge.jsx

import React from 'react';

export const StatusBadge = ({ status, label }) => {
  const str = String(status).toLowerCase().trim();
  const isActive = status === true || str === 'active' || str === 'true' || str === 'completed' || str === 'done' || str === 'paid' || str === 'approved';
  const isPending = str === 'pending' || str === 'in progress' || str === 'in_progress' || str === 'under review';
  const displayLabel = label || (isActive ? 'Active' : isPending ? 'Pending' : 'Inactive');

  let style = 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400 dark:bg-rose-950/30';
  let dotStyle = 'bg-rose-500';

  if (isActive) {
    style = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30';
    dotStyle = 'bg-emerald-500';
  } else if (isPending) {
    style = 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 dark:bg-amber-950/30';
    dotStyle = 'bg-amber-500';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full border transition-all duration-200 ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
      <span className="capitalize">{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
