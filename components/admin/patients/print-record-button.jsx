'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function PrintRecordButton({ patientId, variant = 'outline', size = 'sm', className = '' }) {
  const handlePrint = () => {
    window.open(`/admin/patients/${patientId}/print`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handlePrint}
      className={`gap-2 rounded-full font-bold shadow-sm transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 ${className}`}
    >
      <Printer className="h-4 w-4" />
      <span>Print Clinical Record</span>
    </Button>
  );
}
