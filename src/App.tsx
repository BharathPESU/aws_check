import React, { useState, useEffect, useRef } from 'react';
import TelemetryCard, { TelemetryData } from './components/TelemetryCard';
import LatestImage, { ImageData } from './components/LatestImage';
import ImageHistory from './components/ImageHistory';
import ArchitectureModal from './components/ArchitectureModal';
import {
  Server,
  Cpu,
  RefreshCw,
  Send,
  Play,
  Square,
  BookOpen,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
  database?: {
    connected: boolean;
    type: string;
  };
  storage?: {
    s3_configured: boolean;
    bucket: string;
    region: string;
  };
}

export default function App() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [latestImage, setLatestImage] = useState<ImageData | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const simTimerRef = useRef<any>(null);
  const simIndexRef = useRef<number>(0);

  // Helper to safely fetch JSON without choking on unexpected HTML responses
  const safeFetchJson = async <T,>(url: string): Promise<T | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      return (await res.json()) as T;
    } catch (_e) {
      return null;
    }
  };

  // Fetch all endpoints
  const fetchAllData = async () => {
    try {
      // 1. Health check
      const hData = await safeFetchJson<HealthData>('/api/health');
      if (hData) {
        setHealth(hData);
      }

      // 2. Current Telemetry
      const tData = await safeFetchJson<{ success: boolean; data: TelemetryData }>('/api/telemetry');
      if (tData?.success && tData.data) {
        setTelemetry(tData.data);
      }

      // 3. Latest Image
      const lData = await safeFetchJson<ImageData>('/api/images/latest');
      if (lData) {
        setLatestImage(lData);
      }

      // 4. Image History
      const hList = await safeFetchJson<ImageData[]>('/api/images?limit=12');
      if (Array.isArray(hList)) {
        setImages(hList);
      }
    } catch (_err) {
      // Graceful fallback during server transitions
    } finally {
      setLoading(false);
    }
  };

  // Poll every 3 seconds (aligning with default Raspberry Pi transmit rate)
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Built-in simulator to trigger mock transmissions matching mock_data.csv
  const sendMockPayload = async (customRecord?: any) => {
    const mockRows = [
      { temp: '28.5', fan: 'ON', mist: 'OFF', imgName: 'image001.jpg' },
      { temp: '29.2', fan: 'ON', mist: 'ON', imgName: 'image002.jpg' },
      { temp: '27.8', fan: 'OFF', mist: 'ON', imgName: 'image003.jpg' },
      { temp: '26.4', fan: 'OFF', mist: 'OFF', imgName: 'image001.jpg' },
      { temp: '30.1', fan: 'ON', mist: 'ON', imgName: 'image002.jpg' },
      { temp: '28.0', fan: 'ON', mist: 'OFF', imgName: 'image003.jpg' },
    ];

    const record = customRecord || mockRows[simIndexRef.current % mockRows.length];
    simIndexRef.current += 1;
    setIsSending(true);

    try {
      setStatusMessage(`Transmitting record: ${record.imgName} (${record.temp}°C, Fan: ${record.fan}, Mist: ${record.mist})...`);

      // Load mock JPEG asset
      const imgRes = await fetch(`/images/${record.imgName}`);
      const blob = await imgRes.blob();
      const file = new File([blob], record.imgName, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('timestamp', new Date().toISOString());
      formData.append('temperature', record.temp);
      formData.append('fan_status', record.fan);
      formData.append('mist_status', record.mist);
      formData.append('image', file);

      const res = await fetch('/api/telemetry', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage(`Received 201 Created from EC2 Backend (RDS Image ID: #${data.imageId}, S3 Key: ${data.s3_key})`);
        fetchAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatusMessage(`Error ${res.status}: ${errData.error || res.statusText}`);
      }
    } catch (e: any) {
      setStatusMessage(`Transmission error: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle continuous streaming simulation
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simTimerRef.current);
      setIsSimulating(false);
      setStatusMessage('Simulation paused.');
    } else {
      setIsSimulating(true);
      sendMockPayload();
      simTimerRef.current = setInterval(sendMockPayload, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">Maya Monitor</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  AWS IoT Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400">Raspberry Pi 4 Telemetry &amp; S3 Storage System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Indicators */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs font-mono">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">API:</span>
              <span className={health?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'}>
                {health?.status === 'ok' ? 'ONLINE (200 OK)' : 'CONNECTING...'}
              </span>
            </div>

            <button
              onClick={() => setShowDocsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition shadow-sm border border-slate-700/80 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>AWS Deployment Guide</span>
            </button>

            <button
              onClick={fetchAllData}
              title="Refresh Dashboard"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700/80 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Raspberry Pi Mock Sender Control Bar */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 sm:mt-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Raspberry Pi 4 Mock Transmitter</h3>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  pi-client/mock_sender.py
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Streams multipart CSV telemetry &amp; JPEG camera images to <code className="text-emerald-400 font-mono">POST /api/telemetry</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition shadow cursor-pointer ${
                isSimulating
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Mock Stream
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Simulate Streaming Pi (3s Loop)
                </>
              )}
            </button>

            <button
              onClick={() => sendMockPayload()}
              disabled={isSimulating || isSending}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 rounded-xl transition border border-slate-700/80 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              Send Single Record
            </button>
          </div>
        </section>

        {/* Transmission Notification Banner */}
        {statusMessage && (
          <div className="px-4 py-2.5 bg-slate-900/90 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage('')}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: Current Telemetry (Temperature, Fan, Mist) */}
        <TelemetryCard telemetry={telemetry} isConnected={!!telemetry} />

        {/* Section 2: Latest Image */}
        <LatestImage image={latestImage} loading={loading} />

        {/* Section 3: Image History Grid */}
        <ImageHistory
          images={images}
          onSelectImage={(img) => setLatestImage(img)}
          selectedId={latestImage?.id}
        />

        {/* Infrastructure & Architecture Overview Panel */}
        <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm text-xs text-slate-400 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>AWS Cloud Topology Status</span>
            </div>
            <div className="font-mono text-slate-500 text-[11px]">
              Region: <span className="text-slate-300 font-bold">ap-south-1 (Mumbai)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs">Edge IoT Device</div>
                <div className="text-[11px] text-slate-400 truncate">Raspberry Pi 4 Model B</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">HTTP POST multipart/form-data</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs">AWS S3 Bucket</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {health?.storage?.s3_configured ? health.storage.bucket : 'images/YYYY/MM/DD/'}
                </div>
                <div className="text-[10px] text-sky-400 font-mono mt-0.5">Presigned URLs (Private Bucket)</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs">AWS RDS PostgreSQL</div>
                <div className="text-[11px] text-slate-400 truncate">Table: "images" (id, s3_key, created_at)</div>
                <div className="text-[10px] text-purple-400 font-mono mt-0.5">VPC Security Group Isolation</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Deployment & Setup Modal */}
      {showDocsModal && <ArchitectureModal onClose={() => setShowDocsModal(false)} />}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Maya Monitor</span>
            <span>—</span>
            <span>Minimal AWS End-to-End IoT Deployment Prototype</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>EC2 Ubuntu</span>
            <span>•</span>
            <span>Node.js Express</span>
            <span>•</span>
            <span>AWS S3</span>
            <span>•</span>
            <span>RDS PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
