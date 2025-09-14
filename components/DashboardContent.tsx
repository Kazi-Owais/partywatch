"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

export default function DashboardContent() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleCreateRoom = async () => {
    if (!user) return;
    try {
      const roomRef = await addDoc(collection(db, "rooms"), {
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        videoUrl: "", // 👈 ye line add karo
      });
  
      router.push(`/room/${roomRef.id}`);
    } catch (err) {
      console.error("Error creating room:", err);
    }
  };
  

  const handleJoinRoom = async () => {
    if (!roomCode) return;

    try {
      const roomRef = doc(db, "rooms", roomCode);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        router.push(`/room/${roomCode}`);
      } else {
        alert("Room not found!");
      }
    } catch (err) {
      console.error("Error joining room:", err);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-[400px] shadow-xl">
        <CardHeader>
          <CardTitle>Partywatch Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={handleCreateRoom}>
            Create Room
          </Button>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <Button onClick={handleJoinRoom}>Join</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
