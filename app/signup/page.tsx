"use client";
import { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  // Email/Password Signup
  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      alert("✅ Signup successful! You can now login.");
      router.push("/login");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "auth/email-already-in-use"
      ) {
        alert("⚠️ Account already exists. Please login instead.");
        router.push("/login");
      } else {
        const message =
          typeof error === "object" &&
          error !== null &&
          "message" in error
            ? (error as { message: string }).message
            : "An unknown error occurred.";
        alert("❌ " + message);
      }
    }
  };

  // Google Signup
  const handleGoogleSignup = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "auth/account-exists-with-different-credential"
      ) {
        alert("⚠️ Account already exists. Please login instead.");
        router.push("/login");
      } else {
        const message =
          typeof error === "object" &&
          error !== null &&
          "message" in error
            ? (error as { message: string }).message
            : "An unknown error occurred.";
        alert("❌ " + message);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <h1 className="text-2xl font-bold">Sign Up</h1>

      <input
        type="text"
        placeholder="Name"
        className="border p-2 w-64"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        className="border p-2 w-64"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="border p-2 w-64"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleSignup}
        className="bg-green-500 text-white px-4 py-2 rounded w-64"
      >
        Sign Up with Email
      </button>

      <div className="flex items-center w-64">
        <hr className="flex-grow border-gray-400" />
        <span className="px-2 text-gray-500">OR</span>
        <hr className="flex-grow border-gray-400" />
      </div>

      <button
        onClick={handleGoogleSignup}
        className="bg-red-500 text-white px-4 py-2 rounded w-64"
      >
        Sign Up with Google
      </button>

      <p className="mt-4 text-gray-600">
        Already have an account?{" "}
        <span
          onClick={() => router.push("/login")}
          className="text-blue-600 cursor-pointer underline"
        >
          Login
        </span>
      </p>
    </div>
  );
}
