'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { Printer, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AutoPrintTrigger({ patientId, backUrl, autoPrint = true }) {
  const [isReady, setIsReady] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [, startTransition] = useTransition();

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }

      // Allow 2 animation frames for browser paint & layout calculation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
          setIsPrinting(false);
        });
      });
    } catch (err) {
      console.error('Print initialization failed:', err);
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    let timeoutId;
    const prepare = async () => {
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }
        setIsReady(true);

        if (autoPrint) {
          timeoutId = setTimeout(() => {
            handlePrint();
          }, 300);
        }
      } catch (err) {
        console.error('Preparation failed:', err);
        setIsReady(true);
      }
    };

    prepare();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [autoPrint]);

  const returnUrl = backUrl || (patientId ? `/admin/patients/${patientId}` : '/admin/patients');

  return (
    <div className="no-print sticky top-0 z-50 mb-6 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm rounded-2xl flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={returnUrl}>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs font-semibold hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
            Back to Patient Record
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          {isReady ? (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Document Formatted (A4)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 text-[11px] font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Preparing Layout...
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          className="gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full px-5 shadow-sm text-xs font-bold"
        >
          {isPrinting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          {isPrinting ? 'Opening Print Dialog...' : 'Print / Save as PDF'}
        </Button>
      </div>
    </div>
  );
}
