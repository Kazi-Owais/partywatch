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

export default function RoomPage({ roomCode }: RoomPageProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const id = roomCode;
  const [user] = useAuthState(auth);
  const playerRef = useRef<HTMLVideoElement>(null);

  const [url, setUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{width?: number; height?: number; duration?: number}>({});
  const [retryCount, setRetryCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    { id: string; text: string; sender: string }[]
  >([]);

  /* ---- Video sync ---- */
  useEffect(() => {
    if (!id) return;

    const roomRef = doc(db, "rooms", id);
    setIsLoading(true);
    setError(null);

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
      .catch(() => setError("Failed to load video. Please try again."))
      .finally(() => setIsLoading(false));

    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setError("Room not found");
          return;
        }
        const d = snap.data();
        if (d.videoUrl && d.videoUrl !== videoUrl) setVideoUrl(d.videoUrl);
        setIsPlaying(!!d.isPlaying);

        if (playerRef.current && typeof d.currentTime === "number") {
          const diff = Math.abs((playerRef.current.currentTime || 0) - d.currentTime);
          if (diff > 1) playerRef.current.currentTime = d.currentTime;
        }
      },
      () => setError("Error syncing video state")
    );

    return () => unsub();
  }, [id, videoUrl]);

  const updateVideoState = async (changes: object) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "rooms", id), changes);
    } catch {
      setError("Failed to update video. Please try again.");
    }
  };

  /* ---- Chat ---- */
  useEffect(() => {
    if (!id) return;
    const messagesRef = collection(db, "rooms", id, "messages");
    const q = query(messagesRef, orderBy("createdAt"));

    const unsubscribe = onSnapshot(q, (snap) => {
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
    });

    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || !id) return;
    const messageRef = collection(db, "rooms", id, "messages");
    await addDoc(messageRef, {
      text: chatInput.trim(),
      sender: user.uid,
      senderName: user.displayName || "Anonymous",
      senderPhoto: user.photoURL || "",
      createdAt: serverTimestamp(),
    });
    setChatInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-white-900 text-black overflow-hidden">
      {/* Video input & controls */}
      <div className="w-full md:w-3/4 p-2 md:p-4 flex flex-col">
        <div className="flex flex-col space-y-2 md:space-y-4 max-w-6xl w-full mx-auto flex-1">
          {isClient && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (url.trim()) {
                  await updateVideoState({
                    videoUrl: url.trim(),
                    currentTime: 0,
                    isPlaying: true,
                  });
                }
              }}
              className="flex space-x-2"
            >
              <Input
                className="flex-1 bg-white text-black"
                placeholder="Paste YouTube/MP4 URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button type="submit" className="flex-shrink-0">Set</Button>
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
              <video
                ref={playerRef}
                key={`${videoUrl}-${retryCount}`}
                className="w-full h-full"
                controls
                autoPlay={isPlaying}
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const v = e.target as HTMLVideoElement;
                  setVideoInfo({
                    width: v.videoWidth,
                    height: v.videoHeight,
                    duration: v.duration,
                  });
                }}
                onPlay={() =>
                  updateVideoState({
                    isPlaying: true,
                    currentTime: playerRef.current?.currentTime || 0,
                  })
                }
                onPause={() =>
                  updateVideoState({
                    isPlaying: false,
                    currentTime: playerRef.current?.currentTime || 0,
                  })
                }
                onTimeUpdate={() => {
                  if (playerRef.current) {
                    updateVideoState({
                      currentTime: playerRef.current.currentTime || 0,
                    });
                  }
                }}
                onError={(e) => {
                  try {
                    const v = e.target as HTMLVideoElement;
                    let errorMessage = "Failed to load video. ";
                    if (v.error) {
                      errorMessage += `Error ${v.error.code}: ${v.error.message}`;
                    } else {
                      errorMessage += "No error details available.";
                    }
                    setError(errorMessage);

                    // Auto-retry
                    if (retryCount < 2) {
                      const delay = 1000 * (retryCount + 1);
                      setTimeout(() => setRetryCount((p) => p + 1), delay);
                    }
                  } catch {
                    setError("Failed to load video. Please check the URL.");
                  }
                }}
              >
                <source
                  src={`/api/proxy-video?url=${encodeURIComponent(videoUrl)}`}
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="text-white text-center p-4">
                <p>Enter a video URL above to start watching</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
