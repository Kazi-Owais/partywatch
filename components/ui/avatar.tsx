// components/ui/avatar.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export function Avatar({
  className,
  size = 32,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 text-gray-700",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function AvatarImage({ className, src, ...props }: AvatarImageProps) {
  if (!src) return null;

  return (
    <img
      className={cn("w-full h-full object-contain", className)} // ✅ show full image
      src={src}
      {...props}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement>;

export function AvatarFallback({
  className,
  children,
  ...props
}: AvatarFallbackProps) {
  return (
    <span
      className={cn(
        "w-full h-full flex items-center justify-center text-xs font-semibold text-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

