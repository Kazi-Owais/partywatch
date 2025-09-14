import { Timestamp } from "firebase/firestore";

export type Profile = {
  username?: string | null;
  photoURL?: string | null;
  createdAt?: Timestamp | null;
};
