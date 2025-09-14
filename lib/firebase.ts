// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA6_ATUXe48lSTtHTtdC1bvYgQuXZCp25g",
  authDomain: "partywatch-f3b98.firebaseapp.com",
  projectId: "partywatch-f3b98",
  storageBucket: "partywatch-f3b98.firebasestorage.app",
  messagingSenderId: "795647693477",
  appId: "1:795647693477:web:d4c21355ac68a67ae5b34c",
  measurementId: "G-0P24CDYJ2R"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Named exports
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);