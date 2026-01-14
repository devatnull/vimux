"use client";

import { useSimulatorStore, useUserStore } from "@/lib/store";
import { Lesson } from "@/lib/types";
import clsx from "clsx";
import { ChevronRight, CheckCircle, Circle, Lightbulb, RotateCcw } from "lucide-react";

interface LessonPanelProps {
  lesson: Lesson;
  onComplete?: () => void;
  onBack?: () => void;
}

export function LessonPanel({ lesson, onComplete, onBack }: LessonPanelProps) {
  const { currentStepIndex, feedback, resetSimulator } = useSimulatorStore();
  const { user } = useUserStore();
  const currentStep = lesson.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / lesson.steps.length) * 100;
  const isComplete = currentStepIndex >= lesson.steps.length - 1 && feedback?.type === "success";

  return (
    <div className="bg-[#24283b] rounded-lg p-6 max-w-md">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={clsx(
              "px-2 py-0.5 text-xs rounded font-medium",
              lesson.category === "tmux" && "bg-[#9ece6a] text-[#1a1b26]",
              lesson.category === "neovim" && "bg-[#7aa2f7] text-[#1a1b26]",
              lesson.category === "workflow" && "bg-[#bb9af7] text-[#1a1b26]"
            )}
          >
            {lesson.category.toUpperCase()}
          </span>
          <span
            className={clsx(
              "px-2 py-0.5 text-xs rounded",
              lesson.difficulty === "beginner" && "bg-[#414868] text-[#9ece6a]",
              lesson.difficulty === "intermediate" && "bg-[#414868] text-[#e0af68]",
              lesson.difficulty === "advanced" && "bg-[#414868] text-[#f7768e]"
            )}
          >
            {lesson.difficulty}
          </span>
        </div>
        <h2 className="text-xl font-bold text-[#c0caf5]">{lesson.title}</h2>
        <p className="text-sm text-[#a9b1d6] mt-1">{lesson.description}</p>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-[#565f89] mb-1">
          <span>
            Step {currentStepIndex + 1} of {lesson.steps.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-4">
        {lesson.steps.map((step, index) => (
          <div
            key={step.id}
            className={clsx(
              "flex items-start gap-2 p-2 rounded",
              index === currentStepIndex && "bg-[#1a1b26]",
              index < currentStepIndex && "opacity-60"
            )}
          >
            {index < currentStepIndex ? (
              <CheckCircle className="w-4 h-4 text-[#9ece6a] mt-0.5 flex-shrink-0" />
            ) : index === currentStepIndex ? (
              <ChevronRight className="w-4 h-4 text-[#7aa2f7] mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[#414868] mt-0.5 flex-shrink-0" />
            )}
            <span
              className={clsx(
                "text-sm",
                index === currentStepIndex ? "text-[#c0caf5]" : "text-[#565f89]"
              )}
            >
              {step.instruction}
            </span>
          </div>
        ))}
      </div>

      {/* Current Step Detail */}
      {currentStep && (
        <div className="bg-[#1a1b26] rounded-lg p-4 mb-4">
          <div className="text-sm text-[#a9b1d6] mb-3">
            {currentStep.instruction}
          </div>
          
          {/* Expected keys */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[#565f89]">Press:</span>
            {currentStep.expectedKeys.map((key, i) => (
              <span key={i} className="key">
                {formatKeyDisplay(key)}
              </span>
            ))}
          </div>

          {/* Hint */}
          {currentStep.hint && user.preferences.showHints && (
            <div className="flex items-start gap-2 p-2 bg-[#24283b] rounded text-sm">
              <Lightbulb className="w-4 h-4 text-[#e0af68] mt-0.5 flex-shrink-0" />
              <span className="text-[#a9b1d6]">{currentStep.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={clsx(
            "feedback mb-4",
            feedback.type === "success" && "success",
            feedback.type === "error" && "error"
          )}
        >
          {feedback.type === "success" ? "✓ " : "✗ "}
          {feedback.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm rounded bg-[#414868] text-[#a9b1d6] hover:bg-[#565f89] transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={resetSimulator}
          className="px-4 py-2 text-sm rounded bg-[#414868] text-[#a9b1d6] hover:bg-[#565f89] transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
        {isComplete && onComplete && (
          <button
            onClick={onComplete}
            className="px-4 py-2 text-sm rounded bg-[#9ece6a] text-[#1a1b26] font-medium hover:bg-[#b9db84] transition-colors ml-auto"
          >
            Complete Lesson
          </button>
        )}
      </div>
    </div>
  );
}

function formatKeyDisplay(key: string): string {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  return key
    .replace("Ctrl-", isMac ? "⌃" : "Ctrl+")
    .replace("Alt-", isMac ? "⌥" : "Alt+")
    .replace("Shift-", isMac ? "⇧" : "Shift+")
    .replace("Meta-", isMac ? "⌘" : "Win+")
    .replace("Space", "␣");
}
