'use client';

import React from 'react';
import { Users, Baby, AlertTriangle, HeartPulse, Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * ClinicalFilterChips
 * Magic UI & 21st.dev inspired clinical quick-filter bar with pill chips,
 * live alert beacons, and integrated search input.
 */
export function ClinicalFilterChips({
  activeFilter = 'all',
  onSelectFilter,
  stats = { total: 0, prenatal: 0, highRisk: 0, postpartum: 0 },
  searchQuery = '',
  onSearchChange,
  onClearSearch,
}) {
  const chips = [
    {
      id: 'all',
      label: 'All Patients',
      count: stats.total,
      icon: Users,
      activeClass: 'bg-gray-900 text-white border-gray-900 shadow-sm',
      inactiveClass: 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
      badgeActiveClass: 'bg-white/20 text-white',
      badgeInactiveClass: 'bg-gray-100 text-gray-600',
    },
    {
      id: 'prenatal',
      label: 'Active Prenatal',
      count: stats.prenatal,
      icon: Baby,
      activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200',
      inactiveClass: 'bg-white text-gray-700 border-gray-200 hover:border-rose-300 hover:bg-rose-50/50',
      badgeActiveClass: 'bg-white/20 text-white',
      badgeInactiveClass: 'bg-rose-50 text-rose-600 border border-rose-100',
    },
    {
      id: 'high_risk',
      label: 'High Risk Only',
      count: stats.highRisk,
      icon: AlertTriangle,
      hasPulse: stats.highRisk > 0,
      activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200',
      inactiveClass: 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50',
      badgeActiveClass: 'bg-white/20 text-white',
      badgeInactiveClass: 'bg-amber-50 text-amber-700 border border-amber-100',
    },
    {
      id: 'postpartum',
      label: 'Postpartum (Past 6 Wks)',
      count: stats.postpartum,
      icon: HeartPulse,
      activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200',
      inactiveClass: 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50',
      badgeActiveClass: 'bg-white/20 text-white',
      badgeInactiveClass: 'bg-purple-50 text-purple-700 border border-purple-100',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-2xs">
      {/* Quick Filter Pill Chips */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-gray-400 shrink-0">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="hidden sm:inline">Filters:</span>
        </div>

        {chips.map((chip) => {
          const Icon = chip.icon;
          const isActive = activeFilter === chip.id;

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onSelectFilter?.(chip.id)}
              className={cn(
                "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border select-none shrink-0",
                "active:scale-[0.98]",
                isActive ? chip.activeClass : chip.inactiveClass
              )}
            >
              {/* Optional live alert ping */}
              {chip.hasPulse && (
                <span className="relative flex h-2 w-2">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    isActive ? "bg-white" : "bg-amber-400"
                  )} />
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isActive ? "bg-white" : "bg-amber-500"
                  )} />
                </span>
              )}

              <Icon className={cn(
                "w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-white" : "text-gray-500"
              )} />

              <span>{chip.label}</span>

              {/* Count badge */}
              <span
                className={cn(
                  "text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums transition-colors",
                  isActive ? chip.badgeActiveClass : chip.badgeInactiveClass
                )}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Instant Search Bar */}
      <div className="relative w-full lg:w-72 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search by name, contact, address..."
          className="pl-9 pr-8 h-9 text-xs bg-gray-50/70 border-gray-200 focus-visible:bg-white focus-visible:ring-rose-500 rounded-xl"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
