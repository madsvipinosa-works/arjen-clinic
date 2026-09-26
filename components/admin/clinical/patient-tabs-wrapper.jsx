'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PatientTabsWrapper({
  defaultTab = 'profile',
  tabs = [],
  children,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // Read current active tab from query parameter, with defaultTab fallback
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (val) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', val);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap h-auto gap-1">
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
  );
}
