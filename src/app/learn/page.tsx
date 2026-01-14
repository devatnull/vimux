"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { LessonList } from "@/components/LessonList";
import { Terminal } from "@/components/Terminal";
import { KeyboardHandler } from "@/components/KeyboardHandler";
import { KeyboardVisualizer } from "@/components/KeyboardVisualizer";
import { useSimulatorStore, useUserStore } from "@/lib/store";
import { Lesson } from "@/lib/types";
import { lessons, getNextLesson } from "@/lib/lessons";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X, List, CheckCircle, RotateCcw } from "lucide-react";

type Tab = "all" | "tmux" | "neovim" | "workflow";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonList, setShowLessonList] = useState(false);
  const { currentStepIndex, feedback, setLesson, resetSimulator, nextStep } = useSimulatorStore();
  const { markLessonComplete, user } = useUserStore();

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLesson(lesson);
    resetSimulator();
    setShowLessonList(false);
  };

  const handleBack = () => {
    setSelectedLesson(null);
    setLesson(null);
    resetSimulator();
  };

  const handleComplete = () => {
    if (selectedLesson) {
      markLessonComplete(selectedLesson.id);
      const next = getNextLesson(selectedLesson.id);
      if (next) {
        handleSelectLesson(next);
      } else {
        handleBack();
      }
    }
  };

  const handlePrevLesson = () => {
    if (!selectedLesson) return;
    const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
    if (currentIndex > 0) {
      handleSelectLesson(lessons[currentIndex - 1]);
    }
  };

  const handleNextLesson = () => {
    if (!selectedLesson) return;
    const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
    if (currentIndex < lessons.length - 1) {
      handleSelectLesson(lessons[currentIndex + 1]);
    }
  };

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: "all", label: "All", color: "text-[#c0caf5]" },
    { id: "tmux", label: "tmux", color: "text-[#9ece6a]" },
    { id: "neovim", label: "Neovim", color: "text-[#7aa2f7]" },
    { id: "workflow", label: "Workflows", color: "text-[#bb9af7]" },
  ];

  const currentStep = selectedLesson?.steps[currentStepIndex];
  const progress = selectedLesson 
    ? ((currentStepIndex + 1) / selectedLesson.steps.length) * 100 
    : 0;
  const isLastStep = selectedLesson && currentStepIndex >= selectedLesson.steps.length - 1;
  const isComplete = user.progress[selectedLesson?.id || ""]?.completed;

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col">
      <Navigation />
      <KeyboardHandler />

      {selectedLesson ? (
        // Full IDE View
        <div className="flex-1 flex flex-col pt-16">
          {/* Top Bar with lesson info */}
          <div className="bg-[#24283b] border-b border-[#414868] px-4 py-2 flex items-center gap-4">
            <button
              onClick={() => setShowLessonList(!showLessonList)}
              className="p-2 rounded hover:bg-[#414868] text-[#a9b1d6]"
              title="Lesson list"
            >
              <List className="w-5 h-5" />
            </button>
            
            <button
              onClick={handlePrevLesson}
              className="p-1 rounded hover:bg-[#414868] text-[#565f89] hover:text-[#a9b1d6]"
              title="Previous lesson"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "px-2 py-0.5 text-xs rounded font-medium",
                    selectedLesson.category === "tmux" && "bg-[#9ece6a] text-[#1a1b26]",
                    selectedLesson.category === "neovim" && "bg-[#7aa2f7] text-[#1a1b26]",
                    selectedLesson.category === "workflow" && "bg-[#bb9af7] text-[#1a1b26]"
                  )}
                >
                  {selectedLesson.category}
                </span>
                <h1 className="text-[#c0caf5] font-medium">{selectedLesson.title}</h1>
                {isComplete && <CheckCircle className="w-4 h-4 text-[#9ece6a]" />}
              </div>
            </div>

            <button
              onClick={handleNextLesson}
              className="p-1 rounded hover:bg-[#414868] text-[#565f89] hover:text-[#a9b1d6]"
              title="Next lesson"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleBack}
              className="p-2 rounded hover:bg-[#414868] text-[#565f89] hover:text-[#a9b1d6]"
              title="Exit lesson"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex relative">
            {/* Lesson list sidebar */}
            {showLessonList && (
              <div className="absolute left-0 top-0 bottom-0 w-80 bg-[#1a1b26] border-r border-[#414868] z-10 overflow-y-auto">
                <div className="p-4">
                  <div className="flex gap-1 mb-4">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                          "px-2 py-1 rounded text-xs font-medium transition-colors",
                          activeTab === tab.id
                            ? "bg-[#24283b] " + tab.color
                            : "text-[#565f89] hover:text-[#a9b1d6]"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <LessonList
                    category={activeTab === "all" ? undefined : activeTab}
                    onSelectLesson={handleSelectLesson}
                    compact
                  />
                </div>
              </div>
            )}

            {/* Terminal - takes full width */}
            <div className="flex-1 p-4 flex flex-col">
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-5xl">
                  <Terminal />
                </div>
              </div>
              
              {/* Keyboard visualizer */}
              <div className="mt-4 flex justify-center">
                <KeyboardVisualizer />
              </div>
            </div>
          </div>

          {/* Bottom lesson step bar */}
          <div className="bg-[#24283b] border-t border-[#414868]">
            {/* Progress bar */}
            <div className="h-1 bg-[#1a1b26]">
              <div 
                className="h-full bg-[#7aa2f7] transition-all duration-300" 
                style={{ width: `${progress}%` }} 
              />
            </div>

            <div className="px-4 py-3 flex items-center gap-4">
              {/* Step info */}
              <div className="flex items-center gap-2 text-sm text-[#565f89]">
                <span>Step {currentStepIndex + 1}/{selectedLesson.steps.length}</span>
              </div>

              {/* Current instruction */}
              {currentStep && (
                <div className="flex-1 flex items-center gap-4">
                  <span className="text-[#a9b1d6]">{currentStep.instruction}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#565f89]">Press:</span>
                    {currentStep.expectedKeys.map((key, i) => (
                      <span key={i} className="key">
                        {formatKeyDisplay(key)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  className={clsx(
                    "px-3 py-1 rounded text-sm",
                    feedback.type === "success" && "bg-[#9ece6a]/20 text-[#9ece6a]",
                    feedback.type === "error" && "bg-[#f7768e]/20 text-[#f7768e]"
                  )}
                >
                  {feedback.type === "success" ? "✓ " : "✗ "}
                  {feedback.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSimulator}
                  className="p-2 rounded hover:bg-[#414868] text-[#565f89] hover:text-[#a9b1d6]"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                
                {isLastStep ? (
                  <button
                    onClick={handleComplete}
                    className="px-4 py-2 text-sm rounded bg-[#9ece6a] text-[#1a1b26] font-medium hover:bg-[#b9db84] transition-colors"
                  >
                    {isComplete ? "Next Lesson →" : "Complete ✓"}
                  </button>
                ) : (
                  <button
                    onClick={() => nextStep()}
                    className="px-4 py-2 text-sm rounded bg-[#414868] text-[#a9b1d6] hover:bg-[#565f89] transition-colors"
                  >
                    Skip Step →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Lesson List View
        <main className="flex-1 pt-20 pb-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#c0caf5] mb-2">
                Learn tmux & Neovim
              </h1>
              <p className="text-[#a9b1d6]">
                Pick any lesson. No bullshit progression - jump wherever you want.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-[#414868] pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-[#24283b] " + tab.color
                      : "text-[#565f89] hover:text-[#a9b1d6]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Lessons */}
            <LessonList
              category={activeTab === "all" ? undefined : activeTab}
              onSelectLesson={handleSelectLesson}
            />
          </div>
        </main>
      )}
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
