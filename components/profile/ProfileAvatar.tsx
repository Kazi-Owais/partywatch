"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileAvatarProps {
  uid: string;
  name?: string;
  photoURL?: string;
}

export default function ProfileAvatar({ uid, name: propName, photoURL: propPhotoURL }: ProfileAvatarProps) {
  const [username, setUsername] = useState(propName || "");
  const [photoURL, setPhotoURL] = useState(propPhotoURL || "");

  useEffect(() => {
    // Only fetch if props aren't provided
    if (!propName || !propPhotoURL) {
      const fetchProfile = async () => {
        const snap = await getDoc(doc(db, "profiles", uid));
        if (snap.exists()) {
          const data = snap.data();
          setUsername(data.username || "User");
          setPhotoURL(data.photoURL || "");
        }
      };
      if (uid) fetchProfile();
    } else {
      setUsername(propName);
      setPhotoURL(propPhotoURL);
    }
  }, [uid, propName, propPhotoURL]);

  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src={photoURL} alt={username} />
        <AvatarFallback>{username?.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{username}</span>
    </div>
  );
}
