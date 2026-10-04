import React from 'react';
import { Camera, Image as ImageIcon, Database, Cloud } from 'lucide-react';

export default function LatestImage({ image, loading }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Latest Image</h2>
        </div>
        {image?.id && (
          <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 font-mono rounded">
            RDS ID: #{image.id}
          </span>
        )}
      </div>

      <div className="bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
        {loading && !image?.url ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Fetching latest image from AWS S3...</p>
          </div>
        ) : image?.url ? (
          <div className="w-full relative group">
            <img
              src={image.url}
              alt="Latest Raspberry Pi capture"
              className="w-full max-h-[460px] object-contain bg-black/40"
              loading="eager"
            />
            <div className="p-3 bg-slate-950/95 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono text-slate-300 break-all">{image.s3_key}</span>
              </div>
              {image.created_at && (
                <span className="text-slate-500 font-mono">
                  {new Date(image.created_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <ImageIcon className="w-12 h-12 stroke-1 text-slate-600 mb-1" />
            <p className="text-sm font-medium text-slate-400">No images received yet</p>
            <p className="text-xs max-w-sm">
              Start the Raspberry Pi mock sender or trigger a test transmission to stream images into S3 and RDS.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
