import React from 'react';
import { Thermometer, Fan, Droplets, Clock, Radio } from 'lucide-react';

export default function TelemetryCard({ telemetry, isConnected }) {
  const temp = telemetry?.temperature !== undefined ? `${telemetry.temperature} °C` : '--.- °C';
  const fan = telemetry?.fan_status || 'UNKNOWN';
  const mist = telemetry?.mist_status || 'UNKNOWN';

  const isFanOn = fan === 'ON';
  const isMistOn = mist === 'ON';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Latest Telemetry</span>
        </h2>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
            {isConnected ? 'Raspberry Pi Online' : 'Awaiting Connection'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Temperature Block */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span className="font-medium">Temperature</span>
            <Thermometer className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{temp}</div>
          <div className="text-xs text-slate-500 mt-2">Target Range: 22°C - 30°C</div>
        </div>

        {/* Fan Status Block */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span className="font-medium">Fan Status</span>
            <Fan className={`w-5 h-5 ${isFanOn ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl font-extrabold font-mono ${
                isFanOn ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {fan}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isFanOn ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isFanOn ? 'VENTILATING' : 'IDLE'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">Circulation Intake / Exhaust</div>
        </div>

        {/* Mist Status Block */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
            <span className="font-medium">Mist Sprayer</span>
            <Droplets className={`w-5 h-5 ${isMistOn ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl font-extrabold font-mono ${
                isMistOn ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              {mist}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isMistOn ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isMistOn ? 'SPRAYING' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">Humidity & Moisture Control</div>
        </div>
      </div>

      {telemetry?.timestamp && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Telemetry Timestamp: <strong className="text-slate-300 font-mono">{telemetry.timestamp}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500" />
            <span>Packets Received: <strong className="text-slate-300">{telemetry.packets_received || 0}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
