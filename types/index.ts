import { Timestamp, FieldValue } from "firebase/firestore";

export interface Room {
  id: string;
  createdAt?: Timestamp | FieldValue; // 👈 Proper union
  createdBy: string;
  videoUrl?: string;
}

export type Message = {
  id: string;
  text: string;
  sender: string;
  username?: string;
  photoURL?: string;
  createdAt: Timestamp | FieldValue;
};
// react-player.d.ts
import "react-player";

