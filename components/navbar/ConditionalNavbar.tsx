"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on room pages
  const isRoomPage = pathname?.startsWith("/room/");
  
  if (isRoomPage) {
    return null;
  }
  
  return <Navbar />;
}
