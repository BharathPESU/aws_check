import React from 'react';
import { History, ExternalLink, Calendar } from 'lucide-react';

export default function ImageHistory({ images, onSelectImage }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Image History</h2>
        </div>
        <span className="text-xs text-slate-400">
          Total in RDS: <strong className="text-slate-200">{images?.length || 0}</strong>
        </span>
      </div>

      {!images || images.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          No historical images recorded in RDS database yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => onSelectImage && onSelectImage(img)}
              className="group cursor-pointer bg-slate-950 border border-slate-800 rounded-lg overflow-hidden hover:border-emerald-500/60 transition-all duration-200 flex flex-col"
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
                  <span className="text-[10px] text-slate-600">Pending URL</span>
                )}
                <span className="absolute top-1 left-1 bg-black/70 text-slate-200 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  #{img.id}
                </span>
              </div>
              <div className="p-2 text-[11px] text-slate-400 flex flex-col gap-0.5">
                <span className="truncate text-slate-200 font-medium font-mono">
                  {img.original_filename || 'capture.jpg'}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {img.created_at ? new Date(img.created_at).toLocaleTimeString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
