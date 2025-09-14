"use client";

import { useEffect, useRef, useState, useCallback, MutableRefObject } from "react";
import { VideoPlayer } from "./VideoPlayer";
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageBubble from "@/components/chat/MessageBubble";

interface RoomPageProps {
  roomCode: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName?: string;
  senderPhoto?: string;
  createdAt?: Date;
}

interface RoomData {
  videoUrl?: string;
  isPlaying?: boolean;
  currentTime?: number;
  lastUpdated?: number;
  updatedAt?: any; // For Firestore timestamp
}

export default function RoomPage({ roomCode }: RoomPageProps) {
  const [user] = useAuthState(auth);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video state
  const [videoState, setVideoState] = useState({
    url: "",
    isPlaying: false,
    currentTime: 0,
    lastUpdated: 0, // Timestamp of last update to prevent race conditions
  });
  
  // UI state
  const [urlInput, setUrlInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Derived state
  const roomId = roomCode;
  const [isMounted, setIsMounted] = useState(false);
  const { url, isPlaying, currentTime } = videoState;

  // Set isMounted to true after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track if we're currently updating the video state to prevent feedback loops
  const isUpdatingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const syncDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const syncVideoState = useCallback((data: RoomData) => {
    if (!videoRef.current) return;
    if (isUpdatingRef.current) return; // Skip if we're the ones who triggered this update

    const now = Date.now();
    if (now - lastSyncTimeRef.current < 100) return; // Rate limit syncs to 100ms
    
    const video = videoRef.current;
    const currentTime = video.currentTime || 0;
    const remoteTime = data.currentTime || 0;
    const timeDiff = Math.abs(currentTime - remoteTime);
    
    // Only sync if there's a significant time difference or play state change
    const shouldSeek = data.currentTime !== undefined && 
                     (timeDiff > 1 || 
                      (data.isPlaying !== undefined && data.isPlaying !== !video.paused));

    console.log('Syncing video state:', { 
      currentTime, 
      remoteTime: data.currentTime,
      timeDiff,
      shouldSeek,
      isPlaying: data.isPlaying,
      videoPaused: video.paused,
      urlChanged: data.videoUrl && data.videoUrl !== videoState.url
    });

    // Always update the URL if it changed
    if (data.videoUrl && data.videoUrl !== videoState.url) {
      console.log('URL changed, updating video source');
      setVideoState(prev => ({
        ...prev,
        url: data.videoUrl || prev.url
      }));
    }

    // Handle seeking and play/pause state changes
    if (shouldSeek) {
      // If time difference is significant, seek
      if (timeDiff > 0.5) {
        console.log(`Seeking from ${currentTime} to ${remoteTime} (diff: ${timeDiff.toFixed(2)}s)`);
        video.currentTime = remoteTime;
      }

      // Sync play/pause state
      if (data.isPlaying !== undefined) {
        if (data.isPlaying && video.paused) {
          console.log('Resuming playback');
          video.play().catch(e => {
            console.error('Failed to play after sync:', e);
            setError(`Playback error: ${e.message}`);
          });
        } else if (!data.isPlaying && !video.paused) {
          console.log('Pausing playback');
          video.pause();
        }
      }
    }
    
    lastSyncTimeRef.current = now;
  }, [videoState.url]);

  // Initialize room and set up realtime updates
  useEffect(() => {
    if (!roomId) {
      setError('Room ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const roomRef = doc(db, 'rooms', roomId);
    let isMounted = true;

    // Initial load
    getDoc(roomRef)
      .then((snap) => {
        if (!isMounted || !snap.exists()) return;
        syncVideoState(snap.data() as RoomData);
      })
      .catch(err => {
        console.error('Error loading room:', err);
        setError('Failed to load room data');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Realtime updates with debouncing
    const unsubscribe = onSnapshot(roomRef, (snap) => {
      if (!isMounted || !snap.exists()) return;
      syncVideoState(snap.data() as RoomData);
    });

    return () => {
      isMounted = false;
      if (syncDebounceTimeout.current) {
        clearTimeout(syncDebounceTimeout.current);
      }
      unsubscribe();
    };
  }, [roomId]);

  const updateVideoState = useCallback(async (changes: Partial<RoomData>) => {
    const now = Date.now();
    
    // Skip if this update is too soon after the last one to prevent rapid updates
    if (now - videoState.lastUpdated < 100) {
      return;
    }
    if (!roomId || isUpdatingRef.current) return;
    
    try {
      isUpdatingRef.current = true;
      console.log('Updating video state:', changes);
      
      // Update local state immediately for better UX
      if (changes.videoUrl !== undefined || changes.isPlaying !== undefined || changes.currentTime !== undefined) {
        setVideoState(prev => ({
          ...prev,
          ...changes,
          lastUpdated: now
        }));
      }
      
      // Debounce rapid updates to Firestore
      if (syncDebounceTimeout.current) {
        clearTimeout(syncDebounceTimeout.current);
      }
      
      syncDebounceTimeout.current = setTimeout(async () => {
        try {
          // Don't update if we're already at the desired state
          const roomDoc = await getDoc(doc(db, 'rooms', roomId));
          const currentData = roomDoc.data() as RoomData | undefined;
          
          if (!currentData || 
              currentData.videoUrl !== changes.videoUrl || 
              currentData.isPlaying !== changes.isPlaying || 
              (changes.currentTime !== undefined && 
               Math.abs((currentData.currentTime || 0) - (changes.currentTime || 0)) > 1)) {
                
            await updateDoc(doc(db, 'rooms', roomId), {
              ...changes,
              updatedAt: serverTimestamp()
            });
          }
          
          lastSyncTimeRef.current = Date.now();
        } catch (err) {
          console.error('Error updating video state:', err);
          setError('Failed to update video. Please try again.');
        } finally {
          isUpdatingRef.current = false;
        }
      }, 300); // 300ms debounce
      
    } catch (err) {
      console.error('Error in updateVideoState:', err);
      isUpdatingRef.current = false;
      setError('An error occurred while updating the video.');
    }
  }, [roomId]);

  // Handle video events for synchronization
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let timeUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastSyncTime = 0;
    let isSeeking = false;

    const handlePlay = () => {
      if (isUpdatingRef.current) return;
      console.log('Video play event');
      updateVideoState({ 
        isPlaying: true,
        currentTime: video.currentTime 
      });
    };

    const handlePause = () => {
      if (isUpdatingRef.current) return;
      console.log('Video pause event');
      updateVideoState({ 
        isPlaying: false,
        currentTime: video.currentTime 
      });
    };

    const handleSeeking = () => {
      isSeeking = true;
    };

    const handleSeeked = () => {
      if (isUpdatingRef.current) return;
      console.log('Video seeked to:', video.currentTime);
      updateVideoState({ 
        currentTime: video.currentTime,
        isPlaying: !video.paused
      });
      isSeeking = false;
    };

    const handleTimeUpdate = () => {
      if (video.paused || isUpdatingRef.current || isSeeking) return;
      
      const now = Date.now();
      if (now - lastSyncTime < 500) return; // Sync more frequently (every 500ms)

      // Clear any pending time updates
      if (timeUpdateTimeout) {
        clearTimeout(timeUpdateTimeout);
      }
      
      timeUpdateTimeout = setTimeout(() => {
        if (!video.paused && !isSeeking) {
          updateVideoState({ 
            currentTime: video.currentTime,
            isPlaying: true,
            lastUpdated: now // Add timestamp to help with sync
          });
        }
      }, 150); // Reduced delay for more responsive sync
      
      lastSyncTime = now;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (timeUpdateTimeout) clearTimeout(timeUpdateTimeout);
    };
  }, [updateVideoState]);

  // Chat functionality
  useEffect(() => {
    if (!roomId) return;

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text || '',
        sender: doc.data().sender || 'unknown',
        senderName: doc.data().senderName,
        senderPhoto: doc.data().senderPhoto,
        createdAt: doc.data().createdAt?.toDate(),
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [roomId]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || !roomId) return;

    try {
      const messageRef = collection(db, 'rooms', roomId, 'messages');
      await addDoc(messageRef, {
        text: chatInput.trim(),
        sender: user.uid,
        senderName: user.displayName || "Anonymous",
        senderPhoto: user.photoURL || "",
        createdAt: serverTimestamp(),
      });
      setChatInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };


  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 text-black overflow-hidden">
      {/* Video section */}
      <div className="w-full md:w-3/4 flex flex-col bg-white">
        <div className="p-4">
          {isMounted && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const newUrl = urlInput.trim();
                if (newUrl) {
                  try {
                    // Update local state immediately for better UX
                    setVideoState(prev => ({
                      ...prev,
                      url: newUrl,
                      currentTime: 0,
                      isPlaying: true
                    }));
                    
                    // Update Firestore
                    await updateVideoState({
                      videoUrl: newUrl,
                      currentTime: 0,
                      isPlaying: true,
                    });
                    
                    // Clear any previous errors
                    setError(null);
                  } catch (err) {
                    console.error('Error setting video URL:', err);
                    setError('Failed to set video URL. Please try again.');
                  }
                }
              }}
              className="flex flex-col space-y-2"
            >
              <div className="flex space-x-2">
                <Input
                  className="flex-1 bg-white text-black border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Paste YouTube/MP4 URL…"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Set
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Player */}
        <div className="flex-1 relative bg-black">
          {error && (
            <div className="h-full flex items-center justify-center text-red-500 p-4 text-center">
              {error}
            </div>
          )}

          {!error && url ? (
            <div className="w-full h-full">
              <div className="react-player-wrapper">
                <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <VideoPlayer
                      src={url}
                      isPlaying={isPlaying}
                      currentTime={videoState.currentTime}
                      onPlay={() => updateVideoState({ isPlaying: true })}
                      onPause={() => updateVideoState({ isPlaying: false })}
                      onSeek={(time) => updateVideoState({ currentTime: time })}
                      onTimeUpdate={(time) => {
                        // Only update if the time change is significant to prevent too many updates
                        if (Math.abs(time - videoState.currentTime) > 0.5) {
                          updateVideoState({ currentTime: time });
                        }
                      }}
                      onError={(error) => setError(error)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Enter a video URL above to start watching</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat section */}
      <div className="w-full md:w-1/4 border-t md:border-l border-gray-300 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-semibold text-lg">Chat</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isMounted && messages.length > 0 ? (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                sender={message.sender}
                text={message.text}
              />
            ))
          ) : (
            <div className="text-gray-500 text-center py-8">
              No messages yet. Say hello! 👋
            </div>
          )}
        </div>

        {isMounted && (
          <div className="p-3 border-t border-gray-300">
            <div className="flex space-x-2">
              <Input
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
