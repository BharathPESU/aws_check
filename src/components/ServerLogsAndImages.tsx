import React, { useState } from 'react';
import {
  ListFilter,
  Image as ImageIcon,
  Terminal,
  Database,
  Cloud,
  ExternalLink,
  Copy,
  Check,
  Search,
  Maximize2,
  X,
  Thermometer,
  Wind,
  Droplets,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { ImageData } from './LatestImage';

export interface SystemLogItem {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

interface ServerLogsAndImagesProps {
  logs: ImageData[];
  systemLogs?: SystemLogItem[];
  totalRecords: number;
  currentLimit: number | string;
  onLimitChange: (newLimit: number | string) => void;
  onRefresh: () => void;
  onSelectImage?: (img: ImageData) => void;
  selectedId?: number | null;
}

export default function ServerLogsAndImages({
  logs,
  systemLogs = [],
  totalRecords,
  currentLimit,
  onLimitChange,
  onRefresh,
  onSelectImage,
  selectedId,
}: ServerLogsAndImagesProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'gallery' | 'system'>('table');
  const [limitInput, setLimitInput] = useState<string>(String(currentLimit));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Keep input in sync if parent changes limit
  React.useEffect(() => {
    setLimitInput(String(currentLimit));
  }, [currentLimit]);

  const handleApplyLimit = (val?: string) => {
    const target = val !== undefined ? val : limitInput;
    if (target.toLowerCase() === 'all') {
      onLimitChange('all');
      return;
    }
    const parsed = parseInt(target, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onLimitChange(parsed);
    } else {
      setLimitInput(String(currentLimit));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter logs by search term
  const filteredLogs = logs
    .filter((log) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const idMatch = String(log.id).includes(term);
      const fileMatch = (log.original_filename || '').toLowerCase().includes(term);
      const s3Match = (log.s3_key || '').toLowerCase().includes(term);
      const tempMatch = log.temperature !== null && log.temperature !== undefined && String(log.temperature).includes(term);
      const fanMatch = (log.fan_status || '').toLowerCase().includes(term);
      const mistMatch = (log.mist_status || '').toLowerCase().includes(term);
      return idMatch || fileMatch || s3Match || tempMatch || fanMatch || mistMatch;
    })
    .sort((a, b) => {
      const idA = a.id || 0;
      const idB = b.id || 0;
      return sortAsc ? idA - idB : idB - idA;
    });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800/80 pb-5 mb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Cloud Telemetry &amp; Image Logs</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-sky-400 border border-slate-700 rounded-full font-semibold">
                RDS PostgreSQL + S3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live index of incoming transmissions with user-configurable fetch limit
            </p>
          </div>
        </div>

        {/* User Limit Control Form */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
            <span className="text-xs font-semibold text-slate-300">Set Limit:</span>
            <input
              type="number"
              min="1"
              max="500"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyLimit();
              }}
              placeholder="e.g. 20"
              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 text-center font-bold"
            />
            <button
              onClick={() => handleApplyLimit()}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition shadow-sm cursor-pointer"
            >
              Apply
            </button>
          </div>

          {/* Quick limit presets */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/90 text-xs font-mono">
            {[10, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setLimitInput(String(preset));
                  handleApplyLimit(String(preset));
                }}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  String(currentLimit) === String(preset)
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
            <button
              onClick={() => {
                setLimitInput('all');
                handleApplyLimit('all');
              }}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                String(currentLimit).toLowerCase() === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Logs from Cloud"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700/80 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Search, View Switcher, Total Records info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/90 w-fit">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'table'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Telemetry &amp; Image Table</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image Grid ({filteredLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'system'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Server Diagnostics</span>
          </button>
        </div>

        {/* Search input & Record counters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs or S3 key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 w-48 sm:w-56"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:block">
            Showing <strong className="text-emerald-400">{filteredLogs.length}</strong> of{' '}
            <strong className="text-slate-200">{totalRecords}</strong> in RDS
          </div>
        </div>
      </div>

      {/* TAB 1: DETAILED TELEMETRY & IMAGE LOGS TABLE */}
      {activeTab === 'table' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800/90 overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-white transition"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    <div className="flex items-center gap-1">
                      <span>#ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5">Image Snapshot</th>
                  <th className="py-3 px-3.5">Temperature</th>
                  <th className="py-3 px-3.5">Fan</th>
                  <th className="py-3 px-3.5">Mist</th>
                  <th className="py-3 px-3.5">Raspberry Pi Time</th>
                  <th className="py-3 px-3.5">S3 Object Key</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No matching log records found in RDS. Try adjusting your filter or send telemetry from the Pi.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => {
                    const isSelected = selectedId === item.id;
                    const temp = item.temperature;
                    const isHighTemp = temp !== null && temp !== undefined && temp >= 29;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-900/60 transition ${
                          isSelected ? 'bg-emerald-950/20 border-l-2 border-emerald-500' : ''
                        }`}
                      >
                        {/* ID */}
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-200">
                          #{item.id}
                        </td>

                        {/* Image Preview Thumbnail */}
                        <td className="py-2.5 px-3.5">
                          <div
                            onClick={() => setPreviewImage(item)}
                            className="group relative w-16 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer hover:border-emerald-500 transition shadow-sm shrink-0"
                          >
                            {item.url ? (
                              <img
                                src={item.url}
                                alt={item.original_filename || 'Pi Capture'}
                                className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                                No img
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        </td>

                        {/* Temperature */}
                        <td className="py-2.5 px-3.5 font-mono">
                          {temp !== null && temp !== undefined ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                                isHighTemp
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              <Thermometer className="w-3 h-3" />
                              {temp.toFixed(1)} °C
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Fan Status */}
                        <td className="py-2.5 px-3.5 font-mono">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.fan_status === 'ON'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Wind className="w-3 h-3" />
                            {item.fan_status || 'N/A'}
                          </span>
                        </td>

                        {/* Mist Status */}
                        <td className="py-2.5 px-3.5 font-mono">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.mist_status === 'ON'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Droplets className="w-3 h-3" />
                            {item.mist_status || 'N/A'}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-2.5 px-3.5 font-mono text-slate-300 text-[11px]">
                          {item.recorded_at ? (
                            <div className="flex flex-col">
                              <span>{new Date(item.recorded_at).toLocaleTimeString()}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(item.recorded_at).toLocaleDateString()}
                              </span>
                            </div>
                          ) : item.created_at ? (
                            <span className="text-slate-400">
                              {new Date(item.created_at).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* S3 Key with Copy */}
                        <td className="py-2.5 px-3.5 font-mono text-[11px] max-w-[220px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="truncate text-slate-300" title={item.s3_key || ''}>
                              {item.s3_key}
                            </span>
                            {item.s3_key && (
                              <button
                                onClick={() => copyToClipboard(item.s3_key!)}
                                title="Copy S3 Key"
                                className="p-1 hover:text-white text-slate-500 transition shrink-0"
                              >
                                {copiedKey === item.s3_key ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {onSelectImage && (
                            <button
                              onClick={() => onSelectImage(item)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition cursor-pointer"
                            >
                              Show in Feed
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewImage(item)}
                            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMAGE GRID GALLERY */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredLogs.map((img) => {
            const isSelected = selectedId === img.id;
            return (
              <div
                key={img.id}
                onClick={() => {
                  if (onSelectImage) onSelectImage(img);
                  setPreviewImage(img);
                }}
                className={`group cursor-pointer bg-slate-950 border rounded-xl overflow-hidden transition-all duration-200 flex flex-col ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="aspect-video w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.original_filename || `Record #${img.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-[10px] text-slate-500">Image #{img.id}</div>
                  )}

                  <span className="absolute top-1.5 left-1.5 bg-black/80 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
                    #{img.id}
                  </span>

                  {img.temperature !== null && img.temperature !== undefined && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {img.temperature} °C
                    </span>
                  )}
                </div>

                <div className="p-2.5 flex flex-col gap-1 text-[11px] bg-slate-950">
                  <span className="font-mono text-slate-200 truncate font-semibold">
                    {img.original_filename || 'capture.jpg'}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Fan: {img.fan_status || 'N/A'}</span>
                    <span>Mist: {img.mist_status || 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: SERVER SYSTEM DIAGNOSTICS LOGS */}
      {activeTab === 'system' && (
        <div className="bg-black/80 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-2 max-h-96 overflow-y-auto shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px] text-slate-500">
            <span>Server Process Event Stream</span>
            <span>{systemLogs.length} events recorded</span>
          </div>
          {systemLogs.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No server system logs recorded yet. Incoming requests will stream here.
            </div>
          ) : (
            systemLogs.map((sys) => (
              <div key={sys.id} className="flex items-start gap-2.5 py-1 border-b border-slate-900/80">
                <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">
                  {new Date(sys.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    sys.level === 'error'
                      ? 'bg-rose-500/20 text-rose-400'
                      : sys.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {sys.level}
                </span>
                <span className="text-slate-200 break-all">{sys.message}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: FULL RESOLUTION IMAGE INSPECTOR */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">
                  Record #{previewImage.id}: {previewImage.original_filename || 'snapshot.jpg'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  AWS S3 Verified
                </span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image View */}
            <div className="bg-black/90 flex items-center justify-center p-2 min-h-[300px] max-h-[500px] overflow-hidden">
              {previewImage.url ? (
                <img
                  src={previewImage.url}
                  alt={previewImage.original_filename || 'Snapshot'}
                  className="max-h-[480px] w-auto object-contain rounded"
                />
              ) : (
                <div className="text-slate-500 text-sm">Image preview unavailable</div>
              )}
            </div>

            {/* Modal Metadata Grid */}
            <div className="p-5 bg-slate-950 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-slate-500 text-[10px]">Temperature</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">
                  {previewImage.temperature !== null && previewImage.temperature !== undefined
                    ? `${previewImage.temperature} °C`
                    : 'N/A'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-slate-500 text-[10px]">Fan Status</div>
                <div className="text-sky-400 font-bold text-sm mt-0.5">
                  {previewImage.fan_status || 'N/A'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-slate-500 text-[10px]">Mist Status</div>
                <div className="text-indigo-400 font-bold text-sm mt-0.5">
                  {previewImage.mist_status || 'N/A'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-slate-500 text-[10px]">Recorded Time</div>
                <div className="text-slate-300 font-bold text-xs mt-0.5 truncate">
                  {previewImage.recorded_at
                    ? new Date(previewImage.recorded_at).toLocaleTimeString()
                    : 'N/A'}
                </div>
              </div>

              {/* S3 Key Detail */}
              <div className="col-span-2 sm:col-span-4 p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-slate-500 text-[10px]">S3 Storage Path</div>
                  <div className="text-emerald-300 text-xs truncate mt-0.5">{previewImage.s3_key}</div>
                </div>
                {previewImage.url && (
                  <a
                    href={previewImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shrink-0 transition"
                  >
                    <span>Open Raw</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
