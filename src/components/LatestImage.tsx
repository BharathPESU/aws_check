import React from 'react';
import { Camera, Image as ImageIcon, Cloud, Database, ExternalLink, ShieldCheck } from 'lucide-react';

export interface ImageData {
  id: number | null;
  original_filename?: string | null;
  s3_key: string | null;
  url: string | null;
  created_at?: string;
  message?: string;
}

interface LatestImageProps {
  image: ImageData | null;
  loading: boolean;
}

export default function LatestImage({ image, loading }: LatestImageProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 mb-5 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-800/80 rounded-lg text-emerald-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Latest Image</h2>
            <p className="text-xs text-slate-400">AWS S3 Stored Object via Backend Presigned URL</p>
          </div>
        </div>

        {image?.id && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-lg">
              <Database className="w-3 h-3 text-sky-400" />
              RDS Image ID #{image.id}
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800/90 overflow-hidden min-h-[340px] flex flex-col justify-center items-center">
        {loading && !image?.url ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Resolving image from AWS S3...</p>
          </div>
        ) : image?.url ? (
          <div className="w-full flex flex-col">
            <div className="relative bg-black/60 flex items-center justify-center overflow-hidden min-h-[280px] max-h-[500px]">
              <img
                src={image.url}
                alt={image.original_filename || 'Raspberry Pi capture'}
                className="w-full h-auto max-h-[500px] object-contain"
                loading="eager"
              />
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 shadow-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>LIVE FEED</span>
              </div>
            </div>

            {/* S3 & RDS Metadata Bar */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300 min-w-0">
                <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-500 font-medium">S3 Key:</span>
                <span className="font-mono text-emerald-300 truncate" title={image.s3_key || ''}>
                  {image.s3_key}
                </span>
              </div>

              <div className="flex items-center gap-4 text-slate-400 shrink-0">
                {image.original_filename && (
                  <span className="font-mono text-slate-300">
                    File: <span className="text-white">{image.original_filename}</span>
                  </span>
                )}
                {image.created_at && (
                  <span className="font-mono text-slate-400">
                    {new Date(image.created_at).toLocaleTimeString()}
                  </span>
                )}
                {image.url && (
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <ImageIcon className="w-12 h-12 text-slate-700 stroke-1" />
            <div>
              <p className="text-base font-semibold text-slate-300">No Image Transmitted Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                The Raspberry Pi 4 streams multipart JPEG images alongside sensor records. Start the Python mock sender or click "Simulate Streaming Pi".
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
