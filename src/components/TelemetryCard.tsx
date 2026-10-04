import React from 'react';
import { Thermometer, Fan, Droplets, Clock, Radio, Activity } from 'lucide-react';

export interface TelemetryData {
  temperature: number;
  fan_status: 'ON' | 'OFF' | string;
  mist_status: 'ON' | 'OFF' | string;
  timestamp: string;
  device_id?: string;
  last_updated?: string;
  packets_received?: number;
}

interface TelemetryCardProps {
  telemetry: TelemetryData | null;
  isConnected: boolean;
}

export default function TelemetryCard({ telemetry, isConnected }: TelemetryCardProps) {
  const temp = telemetry?.temperature !== undefined ? `${telemetry.temperature.toFixed(1)} °C` : '--.- °C';
  const fan = telemetry?.fan_status || 'OFF';
  const mist = telemetry?.mist_status || 'OFF';

  const isFanOn = fan === 'ON';
  const isMistOn = mist === 'ON';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 mb-6 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-800/80 rounded-lg text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Current Telemetry</h2>
            <p className="text-xs text-slate-400">Raspberry Pi 4 Sensor Telemetry Stream</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs font-medium">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
              }`}
            />
            <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {isConnected ? 'Device Connected' : 'Awaiting Telemetry'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Temperature Block */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Ambient Temperature</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white font-mono tracking-tight my-1">
            {temp}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
            <span>Target Threshold</span>
            <span className="font-mono text-slate-300">22.0°C – 29.5°C</span>
          </div>
        </div>

        {/* Fan Status Block */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Ventilation Fan</span>
            <div className={`p-1.5 rounded-lg ${isFanOn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              <Fan className={`w-4 h-4 ${isFanOn ? 'animate-spin' : ''}`} />
            </div>
          </div>
          <div className="flex items-center gap-3 my-1">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${isFanOn ? 'text-emerald-400' : 'text-slate-400'}`}>
              {fan}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase border ${
                isFanOn
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isFanOn ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
            <span>EC2 Relay Command</span>
            <span className="font-mono text-slate-300">{isFanOn ? 'GPIO PIN 17 HIGH' : 'GPIO PIN 17 LOW'}</span>
          </div>
        </div>

        {/* Mist Sprayer Block */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Mist Sprayer</span>
            <div className={`p-1.5 rounded-lg ${isMistOn ? 'bg-sky-500/10 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
              <Droplets className={`w-4 h-4 ${isMistOn ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div className="flex items-center gap-3 my-1">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${isMistOn ? 'text-sky-400' : 'text-slate-400'}`}>
              {mist}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase border ${
                isMistOn
                  ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isMistOn ? 'SPRAYING' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
            <span>Humidity Actuator</span>
            <span className="font-mono text-slate-300">{isMistOn ? 'NOZZLE VALVE OPEN' : 'NOZZLE VALVE CLOSED'}</span>
          </div>
        </div>
      </div>

      {telemetry?.timestamp && (
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Device Timestamp:</span>
            <span className="font-mono text-slate-200">{telemetry.timestamp}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Packets: <strong className="text-slate-200 font-mono">{telemetry.packets_received || 0}</strong></span>
            </div>
            {telemetry.device_id && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-mono">
                {telemetry.device_id}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
