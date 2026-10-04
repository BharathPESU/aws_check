import React, { useState, useEffect, useRef } from 'react';
import TelemetryCard from './components/TelemetryCard';
import LatestImage from './components/LatestImage';
import ImageHistory from './components/ImageHistory';
import {
  Server,
  Cpu,
  RefreshCw,
  Send,
  Play,
  Square,
  BookOpen,
  CheckCircle2,
  Database,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [latestImage, setLatestImage] = useState(null);
  const [images, setImages] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const simTimerRef = useRef(null);
  const simIndexRef = useRef(0);

  // Fetch all endpoints
  const fetchAllData = async () => {
    try {
      // 1. Health check
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealth(hData);
      }

      // 2. Telemetry
      const teleRes = await fetch('/api/telemetry');
      if (teleRes.ok) {
        const tData = await teleRes.json();
        if (tData.success) {
          setTelemetry(tData.data);
        }
      }

      // 3. Latest Image
      const latestRes = await fetch('/api/images/latest');
      if (latestRes.ok) {
        const lData = await latestRes.json();
        setLatestImage(lData);
      }

      // 4. Image History
      const histRes = await fetch('/api/images?limit=12');
      if (histRes.ok) {
        const hData = await histRes.json();
        if (Array.isArray(hData)) {
          setImages(hData);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Polling loop every 3 seconds (aligns with Raspberry Pi transmit interval)
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Built-in simulator to trigger mock transmissions directly from the UI
  const sendMockPayload = async (customRecord) => {
    const mockRows = [
      { temp: '28.5', fan: 'ON', mist: 'OFF', imgName: 'image001.jpg' },
      { temp: '29.2', fan: 'ON', mist: 'ON', imgName: 'image002.jpg' },
      { temp: '27.8', fan: 'OFF', mist: 'ON', imgName: 'image003.jpg' },
    ];

    const record = customRecord || mockRows[simIndexRef.current % mockRows.length];
    simIndexRef.current += 1;

    try {
      setStatusMessage(`Transmitting ${record.imgName} (${record.temp}°C, Fan: ${record.fan}, Mist: ${record.mist})...`);

      // Fetch the mock JPEG asset to build standard multipart/form-data
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
        setStatusMessage(`Received 201 OK from EC2 backend (Image ID: ${data.imageId})`);
        fetchAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatusMessage(`Error ${res.status}: ${errData.error || res.statusText}`);
      }
    } catch (e) {
      setStatusMessage(`Failed: ${e.message}`);
    }
  };

  // Toggle continuous streaming simulation
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simTimerRef.current);
      setIsSimulating(false);
      setStatusMessage('Simulation stopped.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-base tracking-tight">Maya Monitor</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  AWS IoT Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400">Raspberry Pi 4 Telemetry &amp; S3 Image Stream</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Backend:</span>
              <span className="text-emerald-400 font-semibold">{health?.status === 'ok' ? 'Healthy' : 'Connecting'}</span>
            </div>

            <button
              onClick={() => setShowDocsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Deployment Docs</span>
            </button>

            <button
              onClick={fetchAllData}
              title="Refresh Telemetry"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Simulation and Testing Control Bar */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Raspberry Pi 4 Mock Transmitter</h3>
              <p className="text-xs text-slate-400">
                Send mock CSV telemetry &amp; JPEG camera images directly to <code className="text-emerald-400">POST /api/telemetry</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                isSimulating
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Continuous Stream
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
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-200 rounded-lg transition"
            >
              <Send className="w-3 h-3 text-sky-400" />
              Send Single Record
            </button>
          </div>
        </section>

        {statusMessage && (
          <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage('')} className="text-slate-500 hover:text-slate-300">
              ✕
            </button>
          </div>
        )}

        {/* 1. Current Telemetry Block */}
        <TelemetryCard telemetry={telemetry} isConnected={!!telemetry} />

        {/* 2. Latest Image Received */}
        <LatestImage image={latestImage} loading={loading} />

        {/* 3. Image History Grid */}
        <ImageHistory images={images} onSelectImage={(img) => setLatestImage(img)} />
      </main>

      {/* Deployment & Architecture Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">AWS Production Architecture &amp; Deployment</h3>
                <p className="text-xs text-slate-400">Step-by-step verified instructions for EC2, RDS, S3, and Pi 4</p>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> 1. Architecture Flow
                </h4>
                <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800 leading-relaxed">
                  Raspberry Pi 4<br />
                  &nbsp;&nbsp;└── HTTP POST multipart/form-data (/api/telemetry)<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── AWS EC2 (Node.js Express on Port 5000 / Nginx Port 80)<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── AWS S3: Stores original JPEG images (ap-south-1)<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── AWS RDS PostgreSQL: Stores image ID + s3_key<br />
                  React Dashboard (Port 80 Nginx) &lt;── Polls latest telemetry &amp; S3 presigned URLs
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sky-400 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" /> 2. PostgreSQL RDS Schema
                </h4>
                <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto">
{`CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_images_created_at ON images (created_at DESC);`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> 3. Running Raspberry Pi 4 Sender
                </h4>
                <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
                  <p className="text-slate-400"># On Raspberry Pi 4 terminal:</p>
                  <p>cd pi-client</p>
                  <p>pip3 install -r requirements.txt</p>
                  <p className="text-slate-400"># Test connectivity:</p>
                  <p>curl http://&lt;EC2_PUBLIC_IP&gt;/api/health</p>
                  <p className="text-slate-400"># Launch transmission loop:</p>
                  <p>BACKEND_URL=http://&lt;EC2_PUBLIC_IP&gt;/api/telemetry python3 mock_sender.py</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4" /> 4. EC2 Security Group Inbound Rules
                </h4>
                <table className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-900 text-slate-300">
                    <tr>
                      <th className="p-2 text-left">Port</th>
                      <th className="p-2 text-left">Protocol</th>
                      <th className="p-2 text-left">Source</th>
                      <th className="p-2 text-left">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-400">
                    <tr>
                      <td className="p-2 text-emerald-400">22</td>
                      <td className="p-2">TCP</td>
                      <td className="p-2">Your IP</td>
                      <td className="p-2">SSH Terminal Access</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-emerald-400">80</td>
                      <td className="p-2">TCP</td>
                      <td className="p-2">0.0.0.0/0</td>
                      <td className="p-2">HTTP Nginx (React + API)</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-emerald-400">443</td>
                      <td className="p-2">TCP</td>
                      <td className="p-2">0.0.0.0/0</td>
                      <td className="p-2">HTTPS (Certbot / SSL)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDocsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Maya Monitor — Minimal AWS IoT Architecture (EC2, S3, RDS PostgreSQL, Raspberry Pi 4)</span>
          <span className="font-mono text-slate-400">AWS Region: ap-south-1</span>
        </div>
      </footer>
    </div>
  );
}
