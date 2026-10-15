'use client';

import React, { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteAttachment } from '@/app/actions';

export function DeleteAttachmentButton({ attachmentId, fileUrl, filePath, patientId }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const fd = new FormData();
    fd.append('id', attachmentId);
    if (fileUrl) fd.append('file_url', fileUrl);
    if (filePath) fd.append('file_path', filePath);
    fd.append('patient_id', patientId);
    startTransition(async () => {
      await deleteAttachment(fd);
      setConfirming(false);
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-lg animate-in fade-in">
        <span className="text-[10px] font-bold text-red-700 pl-1">Delete?</span>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
          className="h-6 px-1.5 text-[10px] font-bold rounded cursor-pointer"
        >
          {isPending ? '...' : 'Yes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          className="h-6 px-1.5 text-[10px] font-bold text-gray-500 rounded cursor-pointer"
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setConfirming(true)}
      className="p-1.5 h-auto text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
      title="Delete document attachment"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
