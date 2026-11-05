"use client";

import { Toaster as Sonner } from "sonner";

/** GAMINOS dark neon toaster (sonner). Use `import { toast } from "sonner"`. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "rgba(16, 22, 39, 0.95)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          color: "#e7eaf3",
        },
      }}
    />
  );
}
