import React from 'react';
import { History, Cloud, Database, ExternalLink } from 'lucide-react';
import { ImageData } from './LatestImage';

interface ImageHistoryProps {
  images: ImageData[];
  onSelectImage: (image: ImageData) => void;
  selectedId?: number | null;
}

export default function ImageHistory({ images, onSelectImage, selectedId }: ImageHistoryProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 mb-5 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-800/80 rounded-lg text-sky-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Image History</h2>
            <p className="text-xs text-slate-400">Historical Objects Indexed in PostgreSQL RDS</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Records Stored: <strong className="text-slate-100 font-mono">{images.length}</strong>
          </span>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No historical images found in RDS. Run the Raspberry Pi sender to push telemetry.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {images.map((img) => {
            const isSelected = selectedId === img.id;
            return (
              <div
                key={img.id}
                onClick={() => onSelectImage(img)}
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
                </div>

                <div className="p-2.5 flex flex-col gap-1 text-[11px] bg-slate-950">
                  <span className="font-mono text-slate-200 truncate font-semibold">
                    {img.original_filename || 'capture.jpg'}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>
                      {img.created_at ? new Date(img.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                    </span>
                    <span className="text-emerald-500 group-hover:underline">View</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
