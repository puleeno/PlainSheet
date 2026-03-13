
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { SheetData, CellValue, CSVSettings, AddonContext, AddonManifest } from './types';
import { 
  TableIcon, PlusIcon, TrashIcon, 
  FolderIcon, SaveIcon, SortIcon, SearchIcon,
  SettingsIcon, ChevronDownIcon, ExcelIcon, JsonIcon,
  PuzzleIcon, SparklesIcon
} from './components/Icon';
import { ADDON_LIBRARY as INITIAL_ADDONS } from './services/addonService';

const TRANSLATIONS = {
  en: {
    appTitle: 'PlainSheet Pro',
    newSheet: 'New Spreadsheet',
    openFile: 'Open File...',
    marketplace: 'Plugin Marketplace',
    settings: 'Application Settings',
    reset: 'Reset Environment',
    searchPlaceholder: 'Instant grid search...',
    commands: 'COMMANDS',
    export: 'Export',
    save: 'SAVE',
    saveSuccess: 'Workspace saved locally',
    addRow: 'ADD ROW',
    addCol: 'ADD COLUMN',
    delete: 'DELETE',
    deleteRows: 'DELETE {n} ROWS',
    deleteCols: 'DELETE {n} COLS',
    sort: 'SORT',
    processing: 'Processing',
    idle: 'Idle',
    license: 'ENTERPRISE LICENSE',
    licensedTo: 'Licensed to:',
    stats: 'STATS',
    rows: 'ROWS',
    cols: 'COLS',
    format: 'FORMAT',
    parserSettings: 'Parser Settings',
    delimiter: 'Global Delimiter',
    headerMapping: 'Header Mapping',
    headerMappingSub: 'Treat first row as keys',
    saveChanges: 'Save Changes',
    language: 'Interface Language',
    plugins: 'Plugins',
    activePlugins: 'Active Plugins',
    execute: 'Execute',
    working: 'Working...',
    browseMarket: 'Browse Marketplace',
    tabClosed: 'Tab closed',
    fileImported: 'File imported successfully',
    importFailed: 'Import failed',
    newSheetCreated: 'Created new sheet',
    readyToUse: 'Ready to Use',
    installPlugin: 'Install Plugin',
    installed: 'INSTALLED',
    enterpriseEco: 'Enterprise Ecosystem',
    ecoDesc: 'Premium tools for FinTech, AI, and Compliance',
    management: 'Management',
    documentation: 'Documentation',
    searchStore: 'Search store...',
    closeStore: 'Close Store',
    promptCol: 'Enter new column name:',
    colEmptyError: 'Column name cannot be empty',
    colExistsError: 'Column name already exists',
    cellActive: 'Cell {col}{row} active | Len: {len}',
    rowsSelected: '{n} rows selected',
    colsSelected: '{n} columns selected',
    gridEngine: 'PlainSheet Grid Engine',
    quickAction: 'PlainSheet QuickAction Engine',
    escClose: 'ESC to close',
    whatToDo: 'What do you want to do?',
    enterToExec: 'to execute',
    navKeys: 'to navigate',
    installs: 'Installs',
    category: 'Category',
    menuEdit: 'EDIT',
    menuData: 'DATA',
    menuFind: 'FIND',
    menuTools: 'TOOLS',
    menuHelp: 'HELP',
    clearSelect: 'Clear Selection',
    about: 'About PlainSheet'
  },
  vi: {
    appTitle: 'PlainSheet Pro',
    newSheet: 'Trang tính mới',
    openFile: 'Mở tệp...',
    marketplace: 'Chợ Plugin',
    settings: 'Cài đặt ứng dụng',
    reset: 'Đặt lại môi trường',
    searchPlaceholder: 'Tìm kiếm nhanh...',
    commands: 'LỆNH',
    export: 'Xuất tệp',
    save: 'LƯU',
    saveSuccess: 'Đã lưu không gian làm việc',
    addRow: 'THÊM DÒNG',
    addCol: 'THÊM CỘT',
    delete: 'XÓA',
    deleteRows: 'XÓA {n} DÒNG',
    deleteCols: 'XÓA {n} CỘT',
    sort: 'SẮP XẾP',
    processing: 'Đang xử lý',
    idle: 'Đang chờ',
    license: 'BẢN QUYỀN DOANH NGHIỆP',
    licensedTo: 'Cấp phép cho:',
    stats: 'THỐNG KÊ',
    rows: 'DÒNG',
    cols: 'CỘT',
    format: 'ĐỊNH DẠNG',
    parserSettings: 'Cài đặt bộ phân tích',
    delimiter: 'Dấu phân cách',
    headerMapping: 'Tiêu đề cột',
    headerMappingSub: 'Coi dòng đầu là tên cột',
    saveChanges: 'Lưu thay đổi',
    language: 'Ngôn ngữ giao diện',
    plugins: 'Tiện ích',
    activePlugins: 'Tiện ích đang dùng',
    execute: 'Thực thi',
    working: 'Đang chạy...',
    browseMarket: 'Xem cửa hàng',
    tabClosed: 'Đã đóng tab',
    fileImported: 'Nhập tệp thành công',
    importFailed: 'Nhập tệp thất bại',
    newSheetCreated: 'Đã tạo trang tính mới',
    readyToUse: 'Sẵn sàng',
    installPlugin: 'Cài đặt',
    installed: 'ĐÃ CÀI',
    enterpriseEco: 'Hệ sinh thái doanh nghiệp',
    ecoDesc: 'Công cụ cao cấp cho Tài chính, AI và Tuân thủ',
    management: 'Quản lý',
    documentation: 'Tài liệu',
    searchStore: 'Tìm trong cửa hàng...',
    closeStore: 'Đóng cửa hàng',
    promptCol: 'Nhập tên cột mới:',
    colEmptyError: 'Tên cột không được để trống',
    colExistsError: 'Tên cột đã tồn tại',
    cellActive: 'Ô {col}{row} đang chọn | Độ dài: {len}',
    rowsSelected: 'Đã chọn {n} dòng',
    colsSelected: 'Đã chọn {n} cột',
    gridEngine: 'PlainSheet Grid Engine',
    quickAction: 'PlainSheet QuickAction Engine',
    escClose: 'ESC để đóng',
    whatToDo: 'Bạn muốn làm gì?',
    enterToExec: 'để thực thi',
    navKeys: 'để di chuyển',
    installs: 'Lượt cài',
    category: 'Phân loại',
    menuEdit: 'CHỈNH SỬA',
    menuData: 'DỮ LIỆU',
    menuFind: 'TÌM KIẾM',
    menuTools: 'CÔNG CỤ',
    menuHelp: 'TRỢ GIÚP',
    clearSelect: 'Bỏ chọn tất cả',
    about: 'Về PlainSheet'
  }
};

const mockMarketplaceAddons = [
  { id: 'bank-acc-mapping', name: 'Accounting Mapper', desc: 'Auto-map bank statements to standard formats.', category: 'Format', icon: '🏦', price: 'Free', installs: '12k' },
  { id: 'ai-architect', name: 'AI Data Architect', desc: 'Uses Gemini to normalize and clean your spreadsheet data.', category: 'AI', icon: '✨', price: '$9.99', installs: '4.2k' },
  { id: 'gdpr-anonymizer', name: 'GDPR Data Scrubber', desc: 'Mask PII and ensure compliance with GDPR/SOC2.', category: 'Data', icon: '🛡️', price: '$24/mo', installs: '800' },
  { id: 'trimmer', name: 'The Great Trimmer', desc: 'Remove leading/trailing whitespace across all cells.', category: 'Data', icon: '🧹', price: 'Free', installs: '25k' },
  { id: 'sentiment-analyzer', name: 'Sentiment Analysis', desc: 'Analyze text columns for emotional tone and polarity.', category: 'Analysis', icon: '🧠', price: '$4.99', installs: '1.5k' },
  { id: 'currency-conv', name: 'Forex Converter', desc: 'Real-time currency conversion for financial data.', category: 'Data', icon: '💵', price: 'Free', installs: '9k' }
];

const ROW_HEIGHT = 32;
const VISIBLE_BUFFER = 15;

const App: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'vi'>('en');
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const [sheets, setSheets] = useState<SheetData[]>([
    {
      id: 'initial',
      name: 'untitled_data.csv',
      columns: ['A', 'B', 'C', 'D'],
      rows: Array.from({ length: 100 }, () => ({ A: '', B: '', C: '', D: '' }))
    }
  ]);
  const [activeSheetId, setActiveSheetId] = useState<string>('initial');

  const activeSheet = useMemo(() => 
    sheets.find(s => s.id === activeSheetId) || sheets[0], 
    [sheets, activeSheetId]
  );
  
  const [csvSettings, setCsvSettings] = useState<CSVSettings>({
    delimiter: ',',
    quoteChar: '"',
    hasHeader: true,
    encoding: 'UTF-8',
    skipEmptyLines: 'greedy'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddonSystem, setShowAddonSystem] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [addonSystemTab, setAddonSystemTab] = useState<'management' | 'marketplace' | 'document'>('marketplace');
  const [isAddonPanelOpen, setIsAddonPanelOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ row: number, col: string } | null>(null);
  
  const [installedAddons, setInstalledAddons] = useState<AddonManifest[]>(INITIAL_ADDONS);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [lastSelectedRow, setLastSelectedRow] = useState<number | null>(null);
  const [lastSelectedCol, setLastSelectedCol] = useState<string | null>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifications, setNotifications] = useState<{id: number, text: string, type: string}[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return activeSheet.rows;
    const q = searchQuery.toLowerCase();
    return activeSheet.rows.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(q))
    );
  }, [activeSheet, searchQuery]);

  const activeCellLength = useMemo(() => {
    if (!activeCell || !filteredRows[activeCell.row]) return 0;
    const value = filteredRows[activeCell.row][activeCell.col];
    return value ? String(value).length : 0;
  }, [activeCell, filteredRows]);

  // Persistent Storage Logic
  useEffect(() => {
    const savedData = localStorage.getItem('plainsheet_workspace');
    if (savedData) {
      try {
        const { sheets: s, activeSheetId: aId, csvSettings: settings } = JSON.parse(savedData);
        if (s) setSheets(s);
        if (aId) setActiveSheetId(aId);
        if (settings) setCsvSettings(settings);
      } catch (e) {
        console.error('Failed to restore workspace', e);
      }
    }
  }, []);

  const handleSave = () => {
    const workspace = {
      sheets,
      activeSheetId,
      csvSettings
    };
    localStorage.setItem('plainsheet_workspace', JSON.stringify(workspace));
    addNotification(t.saveSuccess, 'success');
  };

  // Global Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sheets, activeSheetId, csvSettings]);

  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => commandInputRef.current?.focus(), 10);
    } else {
      setCommandQuery('');
    }
  }, [showCommandPalette]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) setContainerHeight(containerRef.current.clientHeight);
    };
    window.addEventListener('resize', updateHeight);
    updateHeight();
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const addNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const updateActiveSheetData = (newData: Partial<SheetData>) => {
    setSheets(prev => prev.map(s => 
      s.id === activeSheetId ? { ...s, ...newData } : s
    ));
  };

  const handleExport = (format: 'csv' | 'xlsx' | 'json' | 'tsv' | 'md') => {
    let content: any;
    let mimeType = 'text/plain';
    let fileName = activeSheet.name.split('.')[0] || 'export';

    try {
      if (format === 'csv' || format === 'tsv') {
        content = Papa.unparse({ fields: activeSheet.columns, data: activeSheet.rows }, { 
          delimiter: format === 'tsv' ? '\t' : (csvSettings.delimiter === 'auto' ? ',' : csvSettings.delimiter), 
          header: csvSettings.hasHeader 
        });
        mimeType = 'text/csv;charset=utf-8;';
        fileName += `.${format}`;
      } else if (format === 'json') {
        content = JSON.stringify(activeSheet.rows, null, 2);
        mimeType = 'application/json';
        fileName += '.json';
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(activeSheet.rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        addNotification('Excel file exported!', 'success');
        return; 
      } else if (format === 'md') {
        const head = `| ${activeSheet.columns.join(' | ')} |`;
        const sep = `| ${activeSheet.columns.map(() => '---').join(' | ')} |`;
        const body = activeSheet.rows.map(row => `| ${activeSheet.columns.map(c => row[c] ?? '').join(' | ')} |`).join('\n');
        content = `${head}\n${sep}\n${body}`;
        mimeType = 'text/markdown';
        fileName += '.md';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      addNotification(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      addNotification('Export failed: ' + (err as Error).message, 'error');
    }
  };

  const sortData = useCallback((col: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === col && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const sortedRows = [...activeSheet.rows].sort((a, b) => {
      const valA = a[col];
      const valB = b[col];
      if (valA === valB) return 0;
      if (valA === null || valA === "") return 1;
      if (valB === null || valB === "") return -1;
      
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    updateActiveSheetData({ rows: sortedRows });
    setSortConfig({ key: col, direction });
    addNotification(`Sorted by ${col} (${direction})`, 'info');
  }, [activeSheet.rows, sortConfig, activeSheetId]);

  const handleBulkDelete = () => {
    let newRows = [...activeSheet.rows];
    let newCols = [...activeSheet.columns];

    if (selectedRows.size > 0) {
      const rowsToDelete = Array.from(selectedRows).map(idx => filteredRows[idx]);
      newRows = newRows.filter(row => !rowsToDelete.includes(row));
    }

    if (selectedCols.size > 0) {
      newCols = newCols.filter(col => !selectedCols.has(col));
      newRows = newRows.map(row => {
        const newRow = { ...row };
        selectedCols.forEach(col => delete newRow[col]);
        return newRow;
      });
    }

    if (selectedRows.size === 0 && selectedCols.size === 0 && activeCell) {
      const targetRow = filteredRows[activeCell.row];
      newRows = newRows.filter(row => row !== targetRow);
    }

    updateActiveSheetData({ rows: newRows, columns: newCols });
    setSelectedRows(new Set());
    setSelectedCols(new Set());
    setActiveCell(null);
    addNotification('Selected items deleted', 'info');
  };

  const runAddon = async (addonId: string) => {
    const addon = installedAddons.find(a => a.id === addonId);
    if (!addon) return;

    const context: AddonContext = {
      data: activeSheet,
      selectedRows,
      selectedCols,
      updateData: updateActiveSheetData,
      setIsProcessing,
      notify: addNotification
    };

    await addon.execute(context);
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleRows = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
    const end = Math.min(filteredRows.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + VISIBLE_BUFFER);
    return { start, end };
  }, [scrollTop, containerHeight, filteredRows.length]);

  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    const newRows = [...activeSheet.rows];
    const targetRow = filteredRows[rowIndex];
    const originalIndex = activeSheet.rows.indexOf(targetRow);
    if (originalIndex !== -1) {
      newRows[originalIndex] = { ...newRows[originalIndex], [colKey]: value };
    }
    updateActiveSheetData({ rows: newRows });
  };

  const handleRenameColumn = (oldName: string, newName: string) => {
    if (oldName === newName) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      addNotification(t.colEmptyError, 'error');
      return;
    }
    if (activeSheet.columns.includes(trimmed)) {
      addNotification(t.colExistsError, 'error');
      return;
    }

    const newColumns = activeSheet.columns.map(c => c === oldName ? trimmed : c);
    const newRows = activeSheet.rows.map(row => {
      const newRow = { ...row };
      newRow[trimmed] = newRow[oldName];
      delete newRow[oldName];
      return newRow;
    });

    updateActiveSheetData({ columns: newColumns, rows: newRows });
    addNotification(`Renamed "${oldName}" to "${trimmed}"`, 'info');
  };

  const handleRowClick = (index: number, e: React.MouseEvent) => {
    const newSelected = new Set(e.ctrlKey || e.metaKey ? selectedRows : new Set<number>());
    if (e.shiftKey && lastSelectedRow !== null) {
      const start = Math.min(lastSelectedRow, index);
      const end = Math.max(lastSelectedRow, index);
      for (let i = start; i <= end; i++) newSelected.add(i);
    } else {
      if (newSelected.has(index)) newSelected.delete(index);
      else newSelected.add(index);
      setLastSelectedRow(index);
    }
    setSelectedRows(newSelected);
    setSelectedCols(new Set());
    setActiveCell(null);
  };

  const handleColClick = (col: string, e: React.MouseEvent) => {
    const newSelected = new Set(e.ctrlKey || e.metaKey ? selectedCols : new Set<string>());
    if (e.shiftKey && lastSelectedCol !== null) {
      const startIndex = activeSheet.columns.indexOf(lastSelectedCol);
      const endIndex = activeSheet.columns.indexOf(col);
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      for (let i = start; i <= end; i++) newSelected.add(activeSheet.columns[i]);
    } else {
      if (newSelected.has(col)) newSelected.delete(col);
      else newSelected.add(col);
      setLastSelectedCol(col);
    }
    setSelectedCols(newSelected);
    setSelectedRows(new Set());
    setActiveCell(null);
  };

  const handleAddColumn = () => {
    const colName = window.prompt(t.promptCol, `${t.cols} ${activeSheet.columns.length + 1}`);
    if (colName === null) return; 
    
    const trimmedName = colName.trim();
    if (!trimmedName) {
      addNotification(t.colEmptyError, 'error');
      return;
    }

    if (activeSheet.columns.includes(trimmedName)) {
      addNotification(t.colExistsError, 'error');
      return;
    }

    const newColumns = [...activeSheet.columns, trimmedName];
    const newRows = activeSheet.rows.map(row => ({ ...row, [trimmedName]: '' }));
    
    updateActiveSheetData({ columns: newColumns, rows: newRows });
    addNotification(`${t.cols} "${trimmedName}" added`, 'success');
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const sheetId = `${file.name}-${Date.now()}`;

    try {
      if (extension === 'xlsx' || extension === 'xls' || extension === 'ods') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: csvSettings.hasHeader ? undefined : 1 });
        let cols: string[] = [];
        let rows: any[] = [];
        if (csvSettings.hasHeader) {
          rows = jsonData;
          cols = Object.keys(rows[0] || {});
        } else {
          rows = (jsonData as any[]).map(r => {
            const obj: any = {};
            (r as any[]).forEach((val, idx) => {
              const colName = String.fromCharCode(65 + idx);
              obj[colName] = val;
              if (!cols.includes(colName)) cols.push(colName);
            });
            return obj;
          });
        }
        setSheets(prev => [...prev, { id: sheetId, name: file.name, columns: cols, rows }]);
      } else {
        Papa.parse(file, {
          header: csvSettings.hasHeader,
          delimiter: csvSettings.delimiter === 'auto' ? '' : csvSettings.delimiter,
          complete: (results) => {
            const cols = csvSettings.hasHeader ? (results.meta.fields || []) : Array.from({ length: (results.data[0] as any)?.length || 0 }, (_, i) => String.fromCharCode(65 + i));
            setSheets(prev => [...prev, {
              id: sheetId,
              name: file.name,
              columns: cols,
              rows: results.data as any[]
            }]);
          }
        });
      }
      setActiveSheetId(sheetId);
      addNotification(t.fileImported, 'success');
    } catch (err) { addNotification(t.importFailed, 'error'); }
    finally { setIsProcessing(false); }
  };

  const createNewSheet = () => {
    const id = String(Date.now());
    setSheets(prev => [...prev, {
      id,
      name: `new_sheet_${prev.length}.csv`,
      columns: ['A', 'B', 'C', 'D'],
      rows: Array.from({ length: 50 }, () => ({ A: '', B: '', C: '', D: '' }))
    }]);
    setActiveSheetId(id);
    addNotification(t.newSheetCreated, 'info');
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sheets.length === 1) return;
    const newSheets = sheets.filter(s => s.id !== id);
    setSheets(newSheets);
    if (activeSheetId === id) {
      setActiveSheetId(newSheets[0].id);
    }
    addNotification(t.tabClosed, 'info');
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
    setSelectedCols(new Set());
    setActiveCell(null);
    addNotification(t.clearSelect, 'info');
  };

  // Command System Registry
  const commands = useMemo(() => [
    { name: t.addRow, desc: 'Insert new blank row at top', icon: <PlusIcon />, action: () => updateActiveSheetData({ rows: [{}, ...activeSheet.rows] }) },
    { name: t.addCol, desc: 'Append a new column to the grid', icon: <PlusIcon />, action: handleAddColumn },
    { name: t.sort, desc: 'Sort by currently active column', icon: <SortIcon />, action: () => activeCell && sortData(activeCell.col), disabled: !activeCell },
    { name: t.delete, desc: 'Remove all selected rows/cols', icon: <TrashIcon />, action: handleBulkDelete, disabled: selectedRows.size === 0 && selectedCols.size === 0 && !activeCell },
    { name: 'Export CSV', desc: 'Download as standard CSV', icon: <TableIcon />, action: () => handleExport('csv') },
    { name: 'Export Excel', desc: 'Download as XLSX Worksheet', icon: <ExcelIcon />, action: () => handleExport('xlsx') },
    { name: 'Export JSON', desc: 'Download as JSON objects', icon: <JsonIcon />, action: () => handleExport('json') },
    { name: t.save, desc: 'Persist current workspace to browser storage', icon: <SaveIcon />, action: handleSave },
    { name: t.marketplace, desc: 'Browse available plugins', icon: <PuzzleIcon />, action: () => { setShowAddonSystem(true); setAddonSystemTab('marketplace'); } },
    { name: t.clearSelect, desc: 'Reset all active highlights', icon: <SparklesIcon />, action: clearSelection },
    ...installedAddons.map(addon => ({
      name: `${t.execute} ${addon.name}`,
      desc: addon.description,
      icon: <span className="text-sm">{addon.icon}</span>,
      action: () => runAddon(addon.id)
    }))
  ], [activeSheet, activeCell, selectedRows, selectedCols, installedAddons, activeSheetId, t, csvSettings]);

  const filteredCommands = useMemo(() => {
    if (!commandQuery) return commands;
    return commands.filter(c => c.name.toLowerCase().includes(commandQuery.toLowerCase()));
  }, [commands, commandQuery]);

  const installAddon = (addon: any) => {
    if (installedAddons.some(a => a.id === addon.id)) {
      addNotification(`${addon.name} is already installed`, 'info');
      return;
    }
    const baseAddon = INITIAL_ADDONS.find(a => a.id === addon.id);
    const addonToInstall: AddonManifest = baseAddon || {
      id: addon.id,
      name: addon.name,
      description: addon.desc,
      category: addon.category as any,
      icon: addon.icon,
      execute: async (ctx) => { ctx.notify(`${addon.name} functionality limited in demo mode.`, 'info'); }
    };
    setInstalledAddons([...installedAddons, addonToInstall]);
    addNotification(`${addon.name} added to your workspace!`, 'success');
  };

  const uninstallAddon = (id: string) => {
    setInstalledAddons(installedAddons.filter(a => a.id !== id));
    addNotification('Addon removed', 'info');
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-50 overflow-hidden font-sans text-zinc-900 selection:bg-blue-100">
      <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} className="hidden" accept=".csv,.xlsx,.xls,.json,.txt,.tsv" />
      
      {/* 1. BRAND HEADER - MIDNIGHT OBSIDIAN THEME */}
      <header className="h-14 flex items-center justify-between px-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-indigo-500/20 z-50 shadow-lg shadow-black/20">
        <div className="flex items-center gap-4 min-w-[240px]">
          <div className="relative group">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl cursor-pointer transform hover:translate-x-1 transition-all">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] transform group-hover:scale-110 transition-transform">
                <TableIcon />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-widest leading-none text-white uppercase">{t.appTitle}</span>
                  <ChevronDownIcon />
                </div>
                <span className="text-[9px] font-bold text-indigo-300/60 tracking-wider truncate max-w-[120px] uppercase text-left">{activeSheet.name}</span>
              </div>
            </div>
            
            {/* Quick Access Dropdown on Brand */}
            <div className="dropdown-content left-0 mt-1 w-60 shadow-2xl border border-white/10 bg-slate-900/95 rounded-2xl overflow-hidden py-1 backdrop-blur-xl z-[100]">
              <button onClick={createNewSheet} className="flex items-center gap-3 w-full px-5 py-3 text-[10px] font-black text-zinc-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-[0.2em] text-left">
                <PlusIcon /> {t.newSheet}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-5 py-3 text-[10px] font-black text-zinc-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-[0.2em] text-left">
                <FolderIcon /> {t.openFile}
              </button>
              <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
              <button onClick={() => { setShowAddonSystem(true); setAddonSystemTab('marketplace'); }} className="flex items-center gap-3 w-full px-5 py-3 text-[10px] font-black text-zinc-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-[0.2em] text-left">
                <PuzzleIcon /> {t.marketplace}
              </button>
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 w-full px-5 py-3 text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-colors uppercase tracking-[0.2em] text-left">
                <SettingsIcon /> {t.settings}
              </button>
              <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
              <button onClick={() => window.location.reload()} className="flex items-center gap-3 w-full px-5 py-3 text-[10px] font-black text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors uppercase tracking-[0.2em] text-left">
                <SparklesIcon /> {t.reset}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-2xl px-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3.5 flex items-center text-indigo-300/40 group-focus-within:text-blue-400 transition-colors"><SearchIcon /></div>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={t.searchPlaceholder}
              className="w-full bg-white/5 border border-white/10 focus:bg-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-11 pr-4 py-2 text-sm font-medium text-zinc-100 transition-all placeholder:text-zinc-500 backdrop-blur-md" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[240px] justify-end">
          <button onClick={() => setShowCommandPalette(true)} className="flex items-center gap-2 px-3 py-2 text-[9px] font-black tracking-[0.2em] bg-white/5 text-indigo-200/60 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/5">
            {t.commands} <span className="opacity-40 border border-white/20 rounded px-1 ml-1 font-sans">⌘K</span>
          </button>
          
          {/* SAVE BUTTON */}
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-gradient-to-br from-indigo-600 to-violet-700 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] rounded-lg transition-all transform active:scale-95 uppercase tracking-widest">
            <SaveIcon /> {t.save}
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-white text-slate-950 hover:bg-indigo-50 rounded-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] uppercase tracking-widest">
              <FolderIcon /> <span className="hidden lg:inline">{t.export}</span> <ChevronDownIcon />
            </button>
            <div className="dropdown-content right-0 mt-2 w-48 shadow-2xl border border-white/10 bg-slate-900 rounded-xl overflow-hidden py-1 backdrop-blur-xl">
              <div className="py-2 text-left">
                <button onClick={() => handleExport('csv')} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-zinc-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest text-left"><TableIcon /> CSV</button>
                <button onClick={() => handleExport('xlsx')} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-zinc-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest text-left"><ExcelIcon /> Excel</button>
                <button onClick={() => handleExport('json')} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-zinc-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest text-left"><JsonIcon /> JSON</button>
                <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
                <button onClick={() => handleExport('md')} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors uppercase tracking-widest text-left">Markdown</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MENU BAR - OBSIDIAN SUB-BAR - ALL LEFT ALIGNED */}
      <nav className="h-9 bg-zinc-900 border-b border-indigo-500/10 flex items-center px-6 gap-8 z-40 shadow-md justify-start">
        <div className="group relative">
          <button className="text-[10px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-all py-2 flex items-center gap-2 uppercase text-left">File <ChevronDownIcon /></button>
          <div className="dropdown-content left-0 mt-0 w-56 shadow-2xl border border-zinc-700/50 bg-zinc-900 rounded-xl overflow-hidden py-1 backdrop-blur-xl">
            <button onClick={createNewSheet} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><PlusIcon /> {t.newSheet}</button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><FolderIcon /> {t.openFile}</button>
            <button onClick={handleSave} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-indigo-400 hover:bg-white/5 transition-colors text-left"><SaveIcon /> {t.save}</button>
            <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
            <button onClick={() => window.location.reload()} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-500 hover:bg-white/5 transition-colors text-left"><SparklesIcon /> {t.reset}</button>
          </div>
        </div>

        <div className="group relative">
          <button className="text-[10px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-all py-2 flex items-center gap-2 uppercase text-left">{t.menuEdit} <ChevronDownIcon /></button>
          <div className="dropdown-content left-0 mt-0 w-56 shadow-2xl border border-zinc-700/50 bg-zinc-900 rounded-xl overflow-hidden py-1 backdrop-blur-xl">
            <button onClick={() => updateActiveSheetData({ rows: [{}, ...activeSheet.rows] })} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><PlusIcon /> {t.addRow}</button>
            <button onClick={handleAddColumn} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><PlusIcon /> {t.addCol}</button>
            <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
            <button onClick={handleBulkDelete} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors text-left"><TrashIcon /> {t.delete}</button>
            <button onClick={clearSelection} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><SparklesIcon /> {t.clearSelect}</button>
          </div>
        </div>

        <div className="group relative">
          <button className="text-[10px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-all py-2 flex items-center gap-2 uppercase text-left">{t.menuData} <ChevronDownIcon /></button>
          <div className="dropdown-content left-0 mt-0 w-64 shadow-2xl border border-zinc-700/50 bg-zinc-900 rounded-xl overflow-hidden py-1 backdrop-blur-xl">
            <button onClick={() => activeCell && sortData(activeCell.col)} disabled={!activeCell} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors disabled:opacity-30 text-left"><SortIcon /> {t.sort} (Active Col)</button>
            <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
            {installedAddons.filter(a => a.category === 'Data' || a.category === 'Format').map(addon => (
              <button key={addon.id} onClick={() => runAddon(addon.id)} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left">
                <span className="text-sm">{addon.icon}</span> {addon.name}
              </button>
            ))}
          </div>
        </div>

        <div className="group relative">
          <button className="text-[10px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-all py-2 flex items-center gap-2 uppercase text-left">{t.menuTools} <ChevronDownIcon /></button>
          <div className="dropdown-content left-0 mt-0 w-64 shadow-2xl border border-zinc-700/50 bg-zinc-900 rounded-xl overflow-hidden py-1 backdrop-blur-xl">
            <button onClick={() => { setShowAddonSystem(true); setAddonSystemTab('marketplace'); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><PuzzleIcon /> {t.marketplace}</button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left"><SettingsIcon /> {t.settings}</button>
            <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
            {installedAddons.filter(a => a.category === 'AI' || a.category === 'Analysis').map(addon => (
              <button key={addon.id} onClick={() => runAddon(addon.id)} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-colors text-left">
                <span className="text-sm">{addon.icon}</span> {addon.name}
              </button>
            ))}
          </div>
        </div>

        <div className="group relative">
          <button className="text-[10px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-all py-2 flex items-center gap-2 uppercase text-left">{t.menuHelp} <ChevronDownIcon /></button>
          <div className="dropdown-content left-0 mt-0 w-56 shadow-2xl border border-zinc-700/50 bg-zinc-900 rounded-xl overflow-hidden py-1 backdrop-blur-xl">
            <button onClick={() => { setShowAddonSystem(true); setAddonSystemTab('document'); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left">{t.documentation}</button>
            <button onClick={() => addNotification(t.appTitle + " v2.5.0", 'info')} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5 transition-colors text-left">{t.about}</button>
          </div>
        </div>
      </nav>

      {/* 3. TAB BAR - BRIGHT TAB SYSTEM */}
      <div className="h-10 bg-zinc-100 flex items-center px-4 gap-1 border-b border-zinc-200 shrink-0 overflow-x-auto no-scrollbar">
        {sheets.map(sheet => (
          <div 
            key={sheet.id}
            onClick={() => {
              setActiveSheetId(sheet.id);
              clearSelection();
            }}
            className={`group h-8 px-5 min-w-[120px] max-w-[220px] flex items-center justify-between gap-3 rounded-t-lg text-[10px] font-black cursor-pointer transition-all border-b-2 ${activeSheetId === sheet.id ? 'bg-white text-zinc-900 border-indigo-600 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]' : 'text-zinc-400 hover:bg-zinc-200 border-transparent'}`}
          >
            <div className="flex items-center gap-2 truncate uppercase tracking-widest text-left">
              <TableIcon />
              <span className="truncate">{sheet.name}</span>
            </div>
            {sheets.length > 1 && (
              <button onClick={(e) => closeTab(e, sheet.id)} className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full flex items-center justify-center hover:bg-zinc-200 text-zinc-400 hover:text-zinc-900 transition-all font-sans text-xs text-left">&times;</button>
            )}
          </div>
        ))}
        <button onClick={createNewSheet} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-all" title={t.newSheet}><PlusIcon /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Spreadsheet Core */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
          <main className="flex-1 relative overflow-hidden flex flex-col">
            <div className="spreadsheet-grid bg-zinc-50 border-b border-zinc-200 sticky top-0 z-30" style={{ '--col-count': activeSheet.columns.length } as any}>
              <div className="h-9 flex items-center justify-center border-r border-zinc-100 font-black text-zinc-300 text-[10px] uppercase">#</div>
              {activeSheet.columns.map((col) => (
                <div key={col} onClick={(e) => handleColClick(col, e)} className={`h-9 flex items-center border-r border-zinc-100 font-black text-[10px] tracking-widest uppercase truncate cursor-pointer select-none transition-all ${selectedCols.has(col) ? 'bg-indigo-600 text-white shadow-inner' : 'text-zinc-500 hover:bg-zinc-200'}`}>
                   {csvSettings.hasHeader ? (
                     <input 
                       className="bg-transparent border-none w-full h-full px-4 outline-none text-[10px] font-black tracking-widest uppercase text-inherit focus:bg-white/20"
                       defaultValue={col}
                       onBlur={(e) => handleRenameColumn(col, e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                     />
                   ) : (
                     <span className="px-4">{col}</span>
                   )}
                </div>
              ))}
            </div>

            <div ref={containerRef} className="virtual-scroll-container" onScroll={handleScroll}>
              <div style={{ height: filteredRows.length * ROW_HEIGHT, position: 'relative' }}>
                {filteredRows.slice(visibleRows.start, visibleRows.end).map((row, i) => {
                  const absoluteIndex = visibleRows.start + i;
                  return (
                    <div key={`${activeSheetId}-${absoluteIndex}`} className={`spreadsheet-grid border-b border-zinc-100 absolute w-full transition-colors ${selectedRows.has(absoluteIndex) ? 'bg-indigo-50/50' : 'hover:bg-zinc-50/50'}`} style={{ height: ROW_HEIGHT, top: absoluteIndex * ROW_HEIGHT, '--col-count': activeSheet.columns.length } as any}>
                      <div onClick={(e) => handleRowClick(absoluteIndex, e)} className={`h-8 flex items-center justify-center border-r border-zinc-100 font-bold text-[9px] cursor-pointer ${selectedRows.has(absoluteIndex) ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-200'}`}>{absoluteIndex + 1}</div>
                      {activeSheet.columns.map((col) => (
                        <div key={col} className={`h-8 border-r border-zinc-50 relative ${selectedCols.has(col) ? 'bg-indigo-50/20' : ''}`}>
                          <input className="cell-input w-full h-full px-4 text-[12px] bg-transparent focus:bg-white transition-colors text-left" value={row[col] as string || ''} onChange={(e) => handleCellChange(absoluteIndex, col, e.target.value)} onFocus={() => { setActiveCell({ row: absoluteIndex, col }); setSelectedRows(new Set()); setSelectedCols(new Set()); }} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>

        {/* Addon Gallery Side Panel */}
        <aside className={`w-[320px] bg-white border-l border-zinc-200 flex flex-col transition-all duration-300 transform ${isAddonPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none fixed right-0 h-full shadow-2xl'}`}>
          <div className="h-14 border-b border-zinc-100 flex items-center px-6 justify-between bg-zinc-50/50">
            <h2 className="text-xs font-black tracking-widest uppercase flex items-center gap-2 text-left"><PuzzleIcon /> {t.plugins}</h2>
            <button onClick={() => setIsAddonPanelOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-left block">{t.activePlugins}</span>
              <div className="grid grid-cols-1 gap-3">
                {installedAddons.map(addon => (
                  <div key={addon.id} className="group p-4 bg-white border border-zinc-100 rounded-xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-indigo-50 transition-all shadow-sm">{addon.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-xs font-bold text-zinc-900 tracking-tight text-left">{addon.name}</h3>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed line-clamp-2 text-left">{addon.description}</p>
                        <button 
                          onClick={() => runAddon(addon.id)}
                          disabled={isProcessing}
                          className="mt-3 w-full py-2 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50"
                        >
                          {isProcessing ? t.working : t.execute}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setShowAddonSystem(true); setAddonSystemTab('marketplace'); }} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:border-indigo-400 hover:text-indigo-600 transition-all flex flex-col items-center gap-2">
                   <PlusIcon /> {t.browseMarket}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[24px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col border border-white/20">
            <div className="flex items-center px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
              <SearchIcon />
              <input 
                ref={commandInputRef}
                type="text" 
                placeholder={t.whatToDo}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium px-4 placeholder:text-zinc-300 text-left"
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
              />
              <span className="text-[10px] font-black text-zinc-300 tracking-[0.2em] uppercase">{t.escClose}</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2">
              {filteredCommands.length > 0 ? filteredCommands.map((cmd, i) => (
                <button 
                  key={i} 
                  disabled={cmd.disabled}
                  onClick={() => { cmd.action(); setShowCommandPalette(false); }}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-indigo-50 rounded-xl transition-all group disabled:opacity-30 disabled:hover:bg-transparent text-left"
                >
                  <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 group-hover:bg-white group-hover:shadow-md transition-all">
                    {cmd.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">{cmd.name}</h4>
                    <p className="text-xs text-zinc-400 font-medium">{cmd.desc}</p>
                  </div>
                </button>
              )) : (
                <div className="py-12 text-center text-zinc-400">
                  <p className="text-sm font-medium">No matching commands found.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
               <div className="flex gap-4">
                 <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                   <span className="bg-white border rounded px-1.5 py-0.5 shadow-sm text-zinc-600">Enter</span> {t.enterToExec}
                 </div>
                 <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                   <span className="bg-white border rounded px-1.5 py-0.5 shadow-sm text-zinc-600">↑↓</span> {t.navKeys}
                 </div>
               </div>
               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">{t.quickAction}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. PROFESSIONAL STATUS BAR - RESTORED FULL INFORMATION */}
      <footer className="h-7 bg-zinc-950 text-white flex items-center px-6 justify-between text-[9px] font-black tracking-widest z-50">
        <div className="flex items-center gap-6 overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-zinc-900/50 rounded border border-white/5 shadow-inner">
            <span className={isProcessing ? "text-amber-400 animate-pulse" : "text-indigo-400"}>●</span>
            <span className="uppercase opacity-80">{isProcessing ? t.processing : t.idle}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 opacity-40 truncate hover:opacity-100 transition-opacity uppercase text-left">
             <FolderIcon /> <span>{activeSheet.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-2.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
             <span className="text-indigo-400">✓</span>
             <span className="uppercase opacity-90 text-indigo-200">{t.license}</span>
          </div>
        </div>

        <div className="flex-1 px-8 truncate text-left border-l border-white/5 ml-4">
           {selectedRows.size > 0 ? (
             <span className="text-indigo-400 shadow-indigo-500/20 uppercase">{t.rowsSelected.replace('{n}', selectedRows.size.toString())}</span>
           ) : selectedCols.size > 0 ? (
             <span className="text-indigo-400 uppercase">{t.colsSelected.replace('{n}', selectedCols.size.toString())}</span>
           ) : activeCell ? (
             <span className="opacity-80 text-zinc-300 uppercase">{t.cellActive.replace('{col}', activeCell.col).replace('{row}', (activeCell.row + 1).toString()).replace('{len}', activeCellLength.toString())}</span>
           ) : (
             <span className="opacity-30 uppercase tracking-[0.4em]">{t.gridEngine}</span>
           )}
        </div>

        <div className="flex items-center gap-6 justify-end">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-0.5 bg-zinc-900/50 rounded border border-white/5">
             <span className="opacity-40 uppercase">{t.format}:</span>
             <span className="opacity-90">[{csvSettings.delimiter === '\t' ? 'TAB' : csvSettings.delimiter}]</span>
             <span className="opacity-20 mx-1">/</span>
             <span className="opacity-90">{csvSettings.encoding}</span>
             <span className="opacity-20 mx-1">/</span>
             <span className={csvSettings.hasHeader ? "text-indigo-400" : "text-amber-400"}>HDR:{csvSettings.hasHeader ? 'ON' : 'OFF'}</span>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 opacity-60">
               <span className="text-zinc-500 uppercase">{t.stats}:</span>
               <span className="text-zinc-200">{activeSheet.rows.length.toLocaleString()} {t.rows}</span>
             </div>
             <div className="w-[1px] h-3 bg-white/10"></div>
             <div className="flex items-center gap-1.5 opacity-60">
               <span className="text-zinc-200">{activeSheet.columns.length} {t.cols}</span>
             </div>
          </div>

          <div className="hidden xl:block opacity-20 uppercase tracking-[0.2em]">PRO v2.5.0 [{lang}]</div>
        </div>
      </footer>

      {/* Notifications Toast */}
      <div className="fixed bottom-12 right-6 flex flex-col gap-3 z-[200]">
        {notifications.map(n => (
          <div key={n.id} className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md text-[11px] font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-right-full duration-300 ${n.type === 'error' ? 'bg-red-500/95 border-red-400 text-white shadow-red-500/20' : n.type === 'success' ? 'bg-indigo-600/95 border-indigo-400 text-white shadow-indigo-500/20' : 'bg-slate-900/95 border-white/10 text-white shadow-black/20'}`}>
             <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-xs">
               {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'ℹ'}
             </div>
             {n.text}
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h3 className="font-black text-xs tracking-[0.2em] uppercase text-zinc-500 text-left">{t.parserSettings}</h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-zinc-600 text-3xl leading-none">&times;</button>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-left block">{t.language}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLang('en')} className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${lang === 'en' ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-900/20' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>English</button>
                  <button onClick={() => setLang('vi')} className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${lang === 'vi' ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-900/20' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>Tiếng Việt</button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-left block">{t.delimiter}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[',', ';', '\t', '|'].map(d => (
                    <button key={d} onClick={() => setCsvSettings(s => ({...s, delimiter: d}))} className={`py-3 text-[10px] font-black rounded-xl border transition-all ${csvSettings.delimiter === d ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                      {d === '\t' ? 'Tab' : d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black uppercase tracking-tight text-indigo-900">{t.headerMapping}</span>
                  <span className="text-[10px] font-medium text-indigo-400">{t.headerMappingSub}</span>
                </div>
                <button onClick={() => setCsvSettings(s => ({...s, hasHeader: !s.hasHeader}))} className={`w-12 h-7 rounded-full p-1.5 transition-all ${csvSettings.hasHeader ? 'bg-indigo-600' : 'bg-zinc-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${csvSettings.hasHeader ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="p-8 bg-zinc-50 border-t border-zinc-100">
              <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-lg">{t.saveChanges}</button>
            </div>
          </div>
        </div>
      )}

      {/* Addon System Modal */}
      {showAddonSystem && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[110] flex items-center justify-center p-4 lg:p-12 animate-in fade-in zoom-in-105 duration-300">
          <div className="bg-white rounded-[40px] shadow-[0_0_100px_rgba(99,102,241,0.2)] w-full max-w-6xl h-full flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
             <div className="px-12 py-10 flex items-center justify-between bg-zinc-50/80 border-b border-zinc-100">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-zinc-950 rounded-3xl flex items-center justify-center text-white text-3xl shadow-2xl shadow-zinc-950/20">
                  <PuzzleIcon />
                </div>
                <div className="flex flex-col text-left">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-900">{t.enterpriseEco}</h2>
                  <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest opacity-60">{t.ecoDesc}</p>
                </div>
              </div>
              <button onClick={() => setShowAddonSystem(false)} className="w-14 h-14 flex items-center justify-center bg-zinc-200/50 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all text-3xl leading-none shadow-inner">&times;</button>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="px-12 py-6 flex items-center justify-between border-b bg-white/80 sticky top-0 z-10">
                <div className="flex gap-10 text-[11px] font-black uppercase tracking-[0.3em]">
                  {[
                    { id: 'marketplace', label: t.marketplace },
                    { id: 'management', label: t.management },
                    { id: 'document', label: t.documentation }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setAddonSystemTab(tab.id as any)}
                      className={`py-3 border-b-4 transition-all ${addonSystemTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-zinc-50/30">
                {addonSystemTab === 'marketplace' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                    {mockMarketplaceAddons
                      .filter(a => a.name.toLowerCase().includes(marketplaceSearch.toLowerCase()))
                      .map((addon, i) => (
                      <div key={i} className="bg-white p-10 rounded-[40px] border border-zinc-100 shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all group relative overflow-hidden flex flex-col text-left">
                        {installedAddons.some(a => a.id === addon.id) && (
                          <div className="absolute top-6 right-6 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg z-10 tracking-widest uppercase">{t.installed}</div>
                        )}
                        <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:bg-indigo-50 transition-all shadow-inner">
                          {addon.icon}
                        </div>
                        <div className="flex items-start justify-between mb-4">
                           <h4 className="font-black text-lg uppercase tracking-tight text-zinc-900 pr-2">{addon.name}</h4>
                           <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${addon.price.includes('$') ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>{addon.price}</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-400 mb-8 leading-relaxed flex-1">{addon.desc}</p>
                        
                        <div className="flex items-center gap-6 mb-8 py-6 border-t border-zinc-50">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-1">{t.installs}</span>
                            <span className="text-sm font-black text-zinc-900">{addon.installs}</span>
                          </div>
                          <div className="w-[1px] h-8 bg-zinc-100"></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-1">{t.category}</span>
                            <span className="text-sm font-black text-zinc-900">{addon.category}</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => installAddon(addon)}
                          disabled={installedAddons.some(a => a.id === addon.id)}
                          className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${installedAddons.some(a => a.id === addon.id) ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-zinc-950 text-white hover:bg-indigo-600 hover:shadow-2xl shadow-indigo-500/40 hover:-translate-y-1'}`}
                        >
                          {installedAddons.some(a => a.id === addon.id) ? t.readyToUse : t.installPlugin}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-12 py-8 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-zinc-400 tracking-[0.4em] uppercase">Enterprise Engine v2.5.0 STABLE</span>
              <button onClick={() => setShowAddonSystem(false)} className="px-12 py-4 bg-zinc-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl shadow-zinc-950/20">{t.closeStore}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
