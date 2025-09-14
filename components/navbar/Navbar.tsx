"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("User");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Real-time profile updates
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || "User");
        setPhotoURL(data.photoURL || null);
      }
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login"); // redirect to login page
  };

  if (!user) return null; // login na ho to navbar hide

  return (
    <div className="w-full flex justify-between items-center px-6 py-3 bg-gray-900 text-white shadow">
      <h1
        className="text-lg font-bold cursor-pointer"
        onClick={() => router.push("/dashboard")}
      >
        🎉 PartyWatch
      </h1>

      <div className="flex items-center gap-4">
        <button 
          className="flex items-center gap-2 focus:outline-none"
          onClick={() => router.push("/profile")}
        >
          {photoURL ? (
            <Image
              src={photoURL}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              {username[0]?.toUpperCase()}
            </div>
          )}
          <span>{username}</span>
        </button>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
