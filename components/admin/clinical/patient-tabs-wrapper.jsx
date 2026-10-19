'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const PatientTabsContext = React.createContext({
  currentTab: 'profile',
  switchTab: () => {},
});

export function usePatientTabs() {
  return React.useContext(PatientTabsContext);
}

export function PatientTabsWrapper({
  defaultTab = 'profile',
  tabs = [],
  children,
}) {
  const [currentTab, setCurrentTab] = useState(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setCurrentTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabChange = (val) => {
    setCurrentTab(val);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', val);
        window.history.replaceState(null, '', url.toString());
      } catch (err) {
        console.warn('[PatientTabsWrapper] URL update fallback:', err);
      }
    }
  };

  return (
    <PatientTabsContext.Provider value={{ currentTab, switchTab: handleTabChange }}>
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-wrap h-auto gap-1.5">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-5 py-2.5 data-active:bg-rose-500 data-active:text-white data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {children}
      </Tabs>
    </PatientTabsContext.Provider>
  );
}
