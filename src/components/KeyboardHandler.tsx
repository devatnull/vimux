"use client";

import { useEffect, useCallback } from "react";
import { useSimulatorStore } from "@/lib/store";

export function KeyboardHandler() {
  const handleKeyPress = useSimulatorStore((s) => s.handleKeyPress);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Prevent default for most keys we handle
      const shouldPrevent = [
        "Tab",
        "Escape",
        " ",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key);

      if (e.ctrlKey || e.metaKey || shouldPrevent) {
        // Allow Ctrl+C, Ctrl+V for system clipboard
        if (e.ctrlKey && (e.key === "c" || e.key === "v")) {
          return;
        }
        e.preventDefault();
      }

      // Map key names
      let key = e.key;
      if (key === " ") key = " ";
      if (key === "ArrowLeft") key = "Left";
      if (key === "ArrowRight") key = "Right";
      if (key === "ArrowUp") key = "Up";
      if (key === "ArrowDown") key = "Down";

      handleKeyPress(key, {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      });
    },
    [handleKeyPress]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return null;
}
