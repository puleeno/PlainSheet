
import React from 'react';

export type CellValue = string | number | boolean | null;

export interface SheetData {
  id: string;
  name: string;
  columns: string[];
  rows: Record<string, CellValue>[];
}

export interface CSVSettings {
  delimiter: string;
  quoteChar: string;
  hasHeader: boolean;
  encoding: string;
  skipEmptyLines: boolean | 'greedy';
}

export interface AddonContext {
  data: SheetData;
  selectedRows: Set<number>;
  selectedCols: Set<string>;
  updateData: (newData: Partial<SheetData>) => void;
  setIsProcessing: (loading: boolean) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface AddonManifest {
  id: string;
  name: string;
  description: string;
  category: 'AI' | 'Data' | 'Format' | 'Analysis';
  icon: React.ReactNode;
  execute: (ctx: AddonContext) => Promise<void>;
}