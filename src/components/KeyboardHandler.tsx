"use client";

import {
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { useSimulatorStore } from "@/lib/store";
import clsx from "clsx";

export interface KeyboardHandlerRef {
  focus: () => void;
}

interface KeyboardHandlerProps {
  children?: ReactNode;
  className?: string;
}

export const KeyboardHandler = forwardRef<KeyboardHandlerRef, KeyboardHandlerProps>(
  function KeyboardHandler({ children, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const handleKeyPress = useSimulatorStore((s) => s.handleKeyPress);

    useImperativeHandle(ref, () => ({
      focus: () => containerRef.current?.focus(),
    }));

    // Auto-focus on mount
    useEffect(() => {
      containerRef.current?.focus();
    }, []);

    const handleClick = useCallback(() => {
      containerRef.current?.focus();
    }, []);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Keys that should always prevent default browser behavior
        const shouldPrevent = [
          "Tab",
          "Escape",
          " ",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Backspace",
          "Delete",
          "Enter",
          "F1",
          "F2",
          "F3",
          "F4",
          "F5",
          "F6",
          "F7",
          "F8",
          "F9",
          "F10",
          "F11",
          "F12",
        ].includes(e.key);

        // Handle Ctrl/Meta combinations
        if (e.ctrlKey || e.metaKey) {
          // Allow Ctrl+C, Ctrl+V for system clipboard
          if (e.key === "c" || e.key === "v") {
            return;
          }
          // Prevent default for all other Ctrl/Meta combinations (vim/tmux bindings)
          e.preventDefault();
        } else if (shouldPrevent) {
          e.preventDefault();
        }

        // Map arrow key names to simpler format
        let key = e.key;
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

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        className={clsx(
          "outline-none cursor-text transition-shadow duration-150",
          isFocused
            ? "ring-2 ring-[#7aa2f7] ring-offset-2 ring-offset-[#1a1b26]"
            : "ring-1 ring-transparent hover:ring-[#414868]",
          className
        )}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    );
  }
);
