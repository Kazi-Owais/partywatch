"use client";

import { useEffect, useState } from "react";
import { auth, storage, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 🔹 Fetch user profile data from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setUsername(data.username || "");
          setProfilePic(data.photoURL || "");
        }
      }
    };
    fetchProfile();
  }, [user]);

  if (!mounted) return null; // avoid hydration error
  if (!user) return <p>Please log in first.</p>;

  // 🔹 Retry upload
  const retryUpload = async () => {
    if (!selectedFile || !user) return;
    await uploadFile(selectedFile);
  };

  // 🔹 Upload file function (reusable)
  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      console.log("Starting upload for file:", file.name);
      const storageRef = ref(storage, `profilePics/${user!.uid}`);

      console.log("Uploading to storage with progress monitoring...");
      setUploadProgress(25);

      // Use resumable upload for better progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Monitor upload progress
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const scaledProgress = 25 + (progress * 0.5); // Scale from 25-75%
          console.log('Upload progress:', progress + '% (scaled:', scaledProgress + '%)');
          setUploadProgress(scaledProgress);

          switch (snapshot.state) {
            case 'paused':
              console.log('Upload is paused');
              break;
            case 'running':
              console.log('Upload is running');
              break;
          }
        },
        (error) => {
          console.error('Upload error during progress monitoring:', error);
          throw error;
        },
        () => {
          console.log('Upload completed via progress monitoring');
        }
      );

      // Wait for upload to complete with timeout
      const timeoutPromise = new Promise((_, reject) => {
        console.log("Setting upload timeout (60 seconds)...");
        setTimeout(() => reject(new Error("Upload timeout - please try again (60 seconds)")), 60000);
      });

      console.log("Waiting for upload to complete...");
      try {
        await Promise.race([uploadTask, timeoutPromise]);
        console.log("Upload task completed successfully");
      } catch (resumableError) {
        console.warn("Resumable upload failed, trying simple upload...", resumableError);
        setUploadProgress(30);

        // Fallback to simple upload
        const simpleUploadPromise = uploadBytes(storageRef, file);
        const simpleTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Simple upload timeout")), 30000);
        });

        await Promise.race([simpleUploadPromise, simpleTimeoutPromise]);
        console.log("Simple upload completed as fallback");
      }
      setUploadProgress(75);

      console.log("Getting download URL...");
      setUploadProgress(90);
      const url = await getDownloadURL(storageRef);

      console.log("Setting profile pic URL:", url);
      setProfilePic(url);

      // Auto-save after upload
      console.log("Saving to Firestore...");
      setUploadProgress(95);
      await setDoc(doc(db, "users", user!.uid), {
        username,
        photoURL: url,
        email: user!.email,
      }, { merge: true });

      console.log("Upload and save completed successfully!");
      setUploadProgress(100);
      alert("Profile picture updated successfully! ✅");
    } catch (error) {
      console.error("Upload failed with error:", error);

      // Check for Firebase Storage specific errors
      let errorMessage = "Please try again.";
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        // Handle specific Firebase Storage errors
        if (error.message.includes('storage/unauthorized')) {
          errorMessage = "Storage access denied. Please check Firebase Storage rules.";
        } else if (error.message.includes('storage/canceled')) {
          errorMessage = "Upload was canceled.";
        } else if (error.message.includes('storage/quota-exceeded')) {
          errorMessage = "Storage quota exceeded.";
        } else if (error.message.includes('storage/invalid-format')) {
          errorMessage = "Invalid file format.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }

      setUploadError(errorMessage);
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      console.log("Setting uploading to false");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 🔹 Upload profile picture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      console.log("No files selected");
      return;
    }
    if (!user) {
      console.log("No user authenticated");
      alert("Please log in first.");
      return;
    }
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadError(null);

    console.log("File selected:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Test Firebase Storage connection and permissions
    console.log("Testing Firebase Storage connection...");
    try {
      const testRef = ref(storage, `test/${user.uid}/test.txt`);
      console.log("Storage reference created successfully:", testRef.fullPath);

      // Try to check if we can access storage
      console.log("Testing storage permissions...");
      // We'll test actual upload permissions during the upload process
    } catch (error) {
      console.error("Storage reference creation failed:", error);
      alert("Firebase Storage connection failed. Please check your configuration.");
      return;
    }

    // Check file size (reduced to 1MB for faster uploads)
    if (file.size > 1024 * 1024) {
      alert("File size too large. Please choose a file smaller than 1MB.");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file.");
      return;
    }

    await uploadFile(file);
  };

  // 🔹 Save username only
  const handleSave = async () => {
    if (!user || !username.trim()) {
      alert("Please enter a username");
      return;
    }
    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          username: username.trim(),
          photoURL: profilePic,
          email: user.email,
        },
        { merge: true }
      );
      alert("Profile updated ✅");
      router.push("/dashboard");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Save failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profilePic} alt="Profile Pic" />
              <AvatarFallback className="text-lg">
                {username[0]?.toUpperCase() || user.email?.[0].toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="mb-2"
              />
              {uploading && (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Uploading... {uploadProgress}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {uploadError && !uploading && selectedFile && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-600">{uploadError}</p>
                  <Button
                    onClick={retryUpload}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    🔄 Retry Upload
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleSave} 
              disabled={loading || !username.trim()} 
              className="w-full"
            >
              {loading ? "Saving..." : "Save Profile"}
            </Button>

            <Button 
              variant="outline" 
              onClick={() => signOut(auth)}
              className="w-full"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
