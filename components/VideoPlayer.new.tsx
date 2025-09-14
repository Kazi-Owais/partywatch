'use client';

import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback } from 'react';

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  currentTime?: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onError: (error: string) => void;
}

export interface VideoPlayerHandle {
  seekTo: (time: number) => void;
}

const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^\"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1&origin=${window.location.origin}`;
    }
    return null;
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
    return null;
  }
};

function YouTubePlayer({ embedUrl, isPlaying, onPlay, onPause }: { embedUrl: string; isPlaying: boolean; onPlay: () => void; onPause: () => void }) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="w-full" style={{ paddingBottom: '56.25%', position: 'relative' }}>
        <iframe
          id="ytplayer"
          src={`${embedUrl}${isPlaying ? '&autoplay=1' : '&autoplay=0'}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
          title="YouTube video player"
          onPlay={onPlay}
          onPause={onPause}
        />
      </div>
    </div>
  );
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  src,
  isPlaying,
  currentTime = 0,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
  onError,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastReportedTime = useRef(0);
  const timeUpdateThrottle = useRef<NodeJS.Timeout | null>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
  }));

  // Check if URL is YouTube and get embed URL
  useEffect(() => {
    if (src) {
      const youtube = isYouTubeUrl(src);
      setIsYouTube(youtube);
      setEmbedUrl(youtube ? getYouTubeEmbedUrl(src) : null);
      setIsReady(false); // Reset ready state when source changes
    } else {
      setIsYouTube(false);
      setEmbedUrl(null);
      setIsReady(false);
    }
  }, [src]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!videoRef.current || !isReady) return;
    
    const video = videoRef.current;
    
    // Handle play/pause state
    if (isPlaying && video.paused) {
      video.play().catch(e => {
        console.error('Play failed:', e);
        onError(`Playback error: ${e.message}`);
        onPause(); // Update state if play fails
      });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, isReady, onError, onPause]);

  // Handle time updates with throttling
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    const currentVideoTime = videoRef.current.currentTime;
    const timeDiff = Math.abs(currentVideoTime - (lastReportedTime.current || 0));
    
    // Only update if significant time difference or first update
    if (timeDiff > 1 || lastReportedTime.current === 0) {
      lastReportedTime.current = currentVideoTime;
      onTimeUpdate(currentVideoTime);
    }
    
    // Throttle updates to at most once per second
    if (!timeUpdateThrottle.current) {
      timeUpdateThrottle.current = setTimeout(() => {
        timeUpdateThrottle.current = null;
        const latestTime = videoRef.current?.currentTime || 0;
        if (Math.abs(latestTime - (lastReportedTime.current || 0)) > 0.1) {
          lastReportedTime.current = latestTime;
          onTimeUpdate(latestTime);
        }
      }, 1000);
    }
  }, [onTimeUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateThrottle.current) {
        clearTimeout(timeUpdateThrottle.current);
      }
    };
  }, []);

  // Handle initial time and source changes
  useEffect(() => {
    if (!videoRef.current || !src) return;
    
    const video = videoRef.current;
    
    // Only update source if it's different
    if (video.src !== src) {
      video.src = src;
      video.load();
    }
    
    // Set initial time if provided
    if (currentTime > 0) {
      video.currentTime = currentTime;
    }
  }, [src, currentTime]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-white p-4 text-center">
          No video source available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black">
      {isYouTube && embedUrl ? (
        <YouTubePlayer 
          embedUrl={embedUrl}
          isPlaying={isPlaying}
          onPlay={onPlay}
          onPause={onPause}
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          onPlay={onPlay}
          onPause={onPause}
          onTimeUpdate={handleTimeUpdate}
          onSeeked={(e) => {
            const time = e.currentTarget.currentTime;
            lastReportedTime.current = time;
            onSeek(time);
          }}
          onError={(e) => {
            const error = e.currentTarget.error;
            const errorMsg = error ? `Video error: ${error.message}` : 'Unknown video error';
            console.error(errorMsg);
            onError(errorMsg);
          }}
        />
      )}
      
      {/* Debug overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded">
          <div>Source: {src}</div>
          <div>Status: {isPlaying ? 'Playing' : 'Paused'}</div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
