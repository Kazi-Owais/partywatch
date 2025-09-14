import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 🎥 Convert normal YouTube URL → embed URL
export function getYouTubeEmbedUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Handle youtube.com/watch?v=abc
    if (urlObj.hostname.includes("youtube.com") && urlObj.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${urlObj.searchParams.get("v")}`;
    }

    // Handle youtu.be/abc
    if (urlObj.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${urlObj.pathname}`;
    }

    return url; // fallback (agar invalid ya non-YouTube link ho)
  } catch {
    return url; // invalid URL ho to original return kare
  }
}
