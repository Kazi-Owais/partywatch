import "./globals.css";
import type { Metadata } from "next";
import ConditionalNavbar from "@/components/navbar/ConditionalNavbar";

export const metadata: Metadata = {
  title: "PartyWatch",
  description: "Watch together with friends 🎉",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100" suppressHydrationWarning={true}>
        <ConditionalNavbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
