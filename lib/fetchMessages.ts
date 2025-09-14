'use client';
// lib/fetchMessages.ts
import { db } from "./firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
}

export async function getLastMessages(roomId: string): Promise<Message[]> {
  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("timestamp", "asc"),
    limit(20)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];
}
