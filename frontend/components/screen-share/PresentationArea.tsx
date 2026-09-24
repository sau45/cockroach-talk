'use client';

import React, { useRef, useEffect } from 'react';
import { Monitor, Maximize2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PresentationAreaProps {
  stream: MediaStream | null;
  isPresenter: boolean;
  presenterName?: string;
  onStopPresenting?: () => void;
}

export function PresentationArea({
  stream,
  isPresenter,
  presenterName = 'Screen Share',
  onStopPresenting
}: PresentationAreaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  if (!stream) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-brutal-md border-3 border-primary bg-black overflow-hidden shadow-brutal-lg mb-4"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <Monitor className="h-4 w-4 text-primary" />
          <span>{presenterName}</span>
        </div>

        <div className="flex items-center gap-2">
          {isPresenter && (
            <Button
              onClick={onStopPresenting}
              variant="destructive"
              size="sm"
              className="text-xs h-7"
            >
              <Square className="h-3 w-3 mr-1 fill-current" />
              Stop Presenting
            </Button>
          )}

          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="p-1.5 rounded bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="flex items-center justify-center min-h-[300px] max-h-[600px] bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isPresenter} // Host muted locally to prevent echo
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
