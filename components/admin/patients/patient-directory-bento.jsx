'use client';

import React from 'react';
import { Users, Baby, AlertTriangle, HeartPulse, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PatientDirectoryBento
 * Magic UI Bento Grid showcasing the 4 high-level clinical metrics
 * with instant filter trigger capability.
 */
export function PatientDirectoryBento({
  stats = {
    total: 0,
    prenatal: 0,
    highRisk: 0,
    postpartum: 0,
  },
  activeFilter = 'all',
  onSelectFilter,
}) {
  const cards = [
    {
      id: 'all',
      title: 'Total Census',
      subtitle: 'Registered Patients',
      count: stats.total,
      icon: Users,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      activeRing: 'ring-2 ring-slate-400 bg-slate-50/50',
      badgeText: 'All Cohorts',
      gradient: 'from-slate-500/10 to-transparent',
    },
    {
      id: 'prenatal',
      title: 'Active Prenatal',
      subtitle: 'Carrying Active Pregnancy',
      count: stats.prenatal,
      icon: Baby,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      activeRing: 'ring-2 ring-rose-500 bg-rose-50/40',
      badgeText: 'LMP-Tracked',
      gradient: 'from-rose-500/10 to-transparent',
    },
    {
      id: 'high_risk',
      title: 'High-Risk Vigilance',
      subtitle: 'Priority Clinical Monitoring',
      count: stats.highRisk,
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/40',
      badgeText: 'Urgent Care',
      gradient: 'from-amber-500/10 to-transparent',
      hasPing: stats.highRisk > 0,
    },
    {
      id: 'postpartum',
      title: 'Postpartum Care',
      subtitle: 'Recent Deliveries (Past 6 Wks)',
      count: stats.postpartum,
      icon: HeartPulse,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      activeRing: 'ring-2 ring-purple-500 bg-purple-50/40',
      badgeText: 'DOH EINC',
      gradient: 'from-purple-500/10 to-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectFilter?.(card.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectFilter?.(card.id);
              }
            }}
            className={cn(
              "group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer select-none",
              "bg-white border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300",
              isActive ? card.activeRing : "hover:-translate-y-0.5"
            )}
          >
            {/* Top decorative gradient glow */}
            <div
              className={cn(
                "absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-300",
                `bg-gradient-to-br ${card.gradient}`,
                isActive ? "opacity-100" : "opacity-40 group-hover:opacity-80"
              )}
            />

            <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
                      card.iconBg,
                      card.iconColor
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  {card.hasPing && (
                    <span className="relative flex h-2.5 w-2.5" title="Requires clinician attention">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors",
                    isActive
                      ? "bg-white border-gray-300 text-gray-900 shadow-2xs"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  )}
                >
                  {card.badgeText}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight tabular-nums">
                    {card.count}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">pts</span>
                </div>
                <h4 className="text-sm font-bold text-gray-800 mt-0.5 tracking-tight group-hover:text-rose-600 transition-colors">
                  {card.title}
                </h4>
                <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                  {card.subtitle}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-gray-400 group-hover:text-rose-600 transition-colors">
                <span>{isActive ? 'Filtered View Active' : 'Filter by this cohort'}</span>
                <ChevronRight className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isActive ? "rotate-90 text-rose-600" : "group-hover:translate-x-1"
                )} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
