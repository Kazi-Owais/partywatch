"use client";
import { useEffect, useRef, useState } from "react";
import {
  doc, onSnapshot, updateDoc, getDoc,
  collection, addDoc, query, orderBy, serverTimestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageBubble from "@/components/chat/MessageBubble";

interface RoomPageProps {
  roomCode: string;
}

// Helper functions for error reporting
function getErrorName(code?: number): string {
  if (code === undefined) return 'UNKNOWN';
  const errorNames: {[key: number]: string} = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
  };
  return errorNames[code] || `UNKNOWN_ERROR_${code}`;
}

function getNetworkStateName(state: number): string {
  const states = [
    'NETWORK_EMPTY',
    'NETWORK_IDLE',
    'NETWORK_LOADING',
    'NETWORK_NO_SOURCE'
  ];
  return states[state] || `UNKNOWN_NETWORK_STATE_${state}`;
}

function getReadyStateName(state: number): string {
  const states = [
    'HAVE_NOTHING',
    'HAVE_METADATA',
    'HAVE_CURRENT_DATA',
    'HAVE_FUTURE_DATA',
    'HAVE_ENOUGH_DATA'
  ];
  return states[state] || `UNKNOWN_READY_STATE_${state}`;
}

export default function RoomPage({ roomCode }: RoomPageProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  const id = roomCode;
  const [user] = useAuthState(auth);   // ✅ Firebase auth
  const playerRef = useRef<HTMLVideoElement>(null);

  const [url, setUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{width?: number, height?: number, duration?: number}>({});
  const [retryCount, setRetryCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    { id: string; text: string; sender: string }[]
  >([]);

  /* ---- Video sync ---- */
  useEffect(() => {
    if (!id) return;
    
    const roomRef = doc(db, "rooms", id as string);
    setIsLoading(true);
    setError(null);

    // Initial load
    getDoc(roomRef)
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.videoUrl) {
            setVideoUrl(d.videoUrl);
            setIsPlaying(!!d.isPlaying);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading video:', err);
        setError('Failed to load video. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Real-time updates
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setError('Room not found');
          return;
        }
        
        const d = snap.data();
        if (d.videoUrl && d.videoUrl !== videoUrl) {
          setVideoUrl(d.videoUrl);
        }
        setIsPlaying(!!d.isPlaying);

        // Sync playback position
        if (playerRef.current && typeof d.currentTime === "number") {
          const diff = Math.abs((playerRef.current.currentTime || 0) - d.currentTime);
          if (diff > 1) {
            playerRef.current.currentTime = d.currentTime;
          }
        }
      },
      (err) => {
        console.error('Error in video sync:', err);
        setError('Error syncing video state');
      }
    );

    return () => unsub();
  }, [id]);

  const updateVideoState = async (changes: object) => {
    if (!id) return;
    
    try {
      await updateDoc(doc(db, "rooms", id as string), changes);
    } catch (err) {
      console.error('Error updating video state:', err);
      setError('Failed to update video. Please try again.');
    }
  };

 /* ---- Chat ---- */
useEffect(() => {
  if (!id) {
    console.log("No room ID found");
    return;
  }

  const messagesRef = collection(db, "rooms", id as string, "messages");
  const q = query(messagesRef, orderBy("createdAt"));

  console.log("Setting up chat listener for room:", id);

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      console.log("New chat messages received:", snap.docs.length);
      const msgs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text || "",
          sender: data.sender || "unknown",
          senderName: data.senderName || "",
          senderPhoto: data.senderPhoto || "",
        };
      });
      setMessages(msgs);
    },
    (error) => {
      console.error("Error fetching messages:", error);
    }
  );

  return () => {
    console.log("Cleaning up chat listener");
    unsubscribe();
  };
}, [id]);

const sendMessage = async () => {
  if (!chatInput.trim()) {
    console.log("No message to send");
    return;
  }
  if (!user) {
    console.error("No authenticated user");
    return;
  }
  if (!id) {
    console.error("No room ID");
    return;
  }

  try {
    console.log("Sending message to room:", id);
    const messageRef = collection(db, "rooms", id as string, "messages");
    await addDoc(messageRef, {
      text: chatInput.trim(),
      sender: user.uid,
      senderName: user.displayName || "Anonymous",
      senderPhoto: user.photoURL || "",
      createdAt: serverTimestamp(),
    });
    console.log("Message sent successfully");
    setChatInput("");
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

  return (
    <div className="flex flex-col h-screen bg-white-900 text-black overflow-hidden">
      {/* Video section - full width on mobile, 3/4 on desktop */}
      <div className="w-full md:w-3/4 p-2 md:p-4 flex flex-col">
        <div className="flex flex-col space-y-2 md:space-y-4 max-w-6xl w-full mx-auto flex-1">
        {isClient && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (url.trim()) {
              try {
                await updateVideoState({ 
                  videoUrl: url.trim(), 
                  currentTime: 0,
                  isPlaying: true
                });
              } catch (error) {
                console.error('Error setting video URL:', error);
                setError('Failed to set video URL. Please try again.');
              }
            }
          }} className="flex space-x-2">
            <Input
              className="flex-1 bg-white text-black"
              placeholder="Paste YouTube/MP4 URL…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="flex space-x-2 flex-wrap gap-2">
              <Button type="submit" className="flex-shrink-0">Set</Button>
              <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0">
              <Button 
                type="button" 
                variant="outline"
                size="sm"
                onClick={() => {
                  const testUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                  console.log('Loading test video:', testUrl);
                  setUrl(testUrl);
                  updateVideoState({ 
                    videoUrl: testUrl,
                    currentTime: 0,
                    isPlaying: true
                  });
                }}
              >
                Test Video 1 (MP4)
              </Button>
              <Button 
                type="button" 
                variant="outline"
                size="sm"
                onClick={() => {
                  const testUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
                  console.log('Loading test video:', testUrl);
                  setUrl(testUrl);
                  updateVideoState({ 
                    videoUrl: testUrl,
                    currentTime: 0,
                    isPlaying: true
                  });
                }}
              >
                Test Video 2 (MP4)
              </Button>
              </div>
            </div>
          </form>
        )}

        <div className="flex-1 rounded-xl overflow-hidden bg-black relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white-500"></div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-500 p-4 text-center">
              {error}
            </div>
          ) : videoUrl ? (
            <>
              <video
                ref={playerRef}
                key={`${videoUrl}-${retryCount}`} // Force re-render on retry
                className="w-full h-full"
                controls
                autoPlay={isPlaying}
                playsInline
                preload="auto"
                onLoadStart={() => {
                  console.log('Video load started');
                  setIsLoading(true);
                  setError(null);
                }}
                onCanPlay={() => {
                  console.log('Video can play');
                  setIsLoading(false);
                }}
                onCanPlayThrough={() => {
                  console.log('Video can play through');
                  setIsLoading(false);
                }}
                onWaiting={() => {
                  console.log('Video waiting');
                  setIsLoading(true);
                }}
                onStalled={() => {
                  console.log('Video stalled');
                  setIsLoading(true);
                }}
                onSuspend={() => {
                  console.log('Video loading suspended');
                }}
                onAbort={() => {
                  console.log('Video loading aborted');
                }}
                onEmptied={() => {
                  console.log('Video emptied');
                }}
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  console.log('Video metadata loaded:', {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration
                  });
                  setVideoInfo({
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration
                  });
                }}
                onPlay={() => updateVideoState({
                  isPlaying: true,
                  currentTime: playerRef.current?.currentTime || 0,
                })}
                onPause={() => updateVideoState({
                  isPlaying: false,
                  currentTime: playerRef.current?.currentTime || 0,
                })}
                onTimeUpdate={() => {
                  if (playerRef.current) {
                    updateVideoState({
                      currentTime: playerRef.current.currentTime || 0,
                    });
                  }
                }}
                onError={(e) => {
                  try {
                    const video = e.target as HTMLVideoElement;
                    console.log('Video element error:', {
                      error: video.error,
                      currentSrc: video.currentSrc,
                      networkState: video.networkState,
                      readyState: video.readyState,
                      videoWidth: video.videoWidth,
                      videoHeight: video.videoHeight
                    });
                    
                    // Directly log the error object
                    console.log('Raw error object:', video.error);
                    
                    // Try to get basic error info
                    let errorMessage = 'Failed to load video. ';
                    if (video.error) {
                      errorMessage += `Error ${video.error.code}: ${video.error.message}`;
                    } else {
                      errorMessage += 'No error details available.';
                    }
                    
                    setError(errorMessage);
                    
}
}}
onError={(e) => {
try {
const video = e.target as HTMLVideoElement;
console.log('Video element error:', {
error: video.error,
currentSrc: video.currentSrc,
networkState: video.networkState,
readyState: video.readyState,
videoWidth: video.videoWidth,
videoHeight: video.videoHeight
});

// Directly log the error object
console.log('Raw error object:', video.error);

// Try to get basic error info
let errorMessage = 'Failed to load video. ';
if (video.error) {
errorMessage += `Error ${video.error.code}: ${video.error.message}`;
} else {
errorMessage += 'No error details available.';
}

setError(errorMessage);

// Auto-retry with a delay
if (retryCount < 2) {
const delay = 1000 * (retryCount + 1);
console.log(`Retrying in ${delay}ms...`);
setTimeout(() => {
console.log('Retrying video load...');
setRetryCount(prev => prev + 1);
}, delay);
}
} catch (err) {
console.error('Error in error handler:', err);
setError('Failed to load video. Please check the URL and try again.');
}
}}
>
<source 
src={`/api/proxy-video?url=${encodeURIComponent(videoUrl)}`} 
type="video/mp4" 
/>
Your browser does not support the video tag.
</video>
</>
) : (
<div className="text-white text-center p-4">
<p>Enter a video URL above to start watching</p>
</div>
);
