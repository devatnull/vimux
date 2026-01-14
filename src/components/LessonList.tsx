"use client";

import { lessons } from "@/lib/lessons";
import { useUserStore } from "@/lib/stores/userStore";
import { Lesson } from "@/lib/types";
import clsx from "clsx";
import { CheckCircle, Clock, ChevronRight } from "lucide-react";

interface LessonListProps {
  category?: "tmux" | "neovim" | "workflow";
  onSelectLesson: (lesson: Lesson) => void;
  compact?: boolean;
}

export function LessonList({ category, onSelectLesson, compact }: LessonListProps) {
  const { user } = useUserStore();
  const filteredLessons = category
    ? lessons.filter((l) => l.category === category)
    : lessons;

  const groupedLessons = filteredLessons.reduce(
    (acc, lesson) => {
      const cat = lesson.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(lesson);
      return acc;
    },
    {} as Record<string, Lesson[]>
  );

  const isLessonCompleted = (lesson: Lesson): boolean => {
    return user.progress[lesson.id]?.completed || false;
  };

  const categoryLabels: Record<string, { label: string; color: string }> = {
    tmux: { label: "tmux", color: "text-[#9ece6a] border-[#9ece6a]" },
    neovim: { label: "Neovim", color: "text-[#7aa2f7] border-[#7aa2f7]" },
    workflow: { label: "Workflows", color: "text-[#bb9af7] border-[#bb9af7]" },
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedLessons).map(([cat, catLessons]) => (
        <div key={cat}>
          <h3
            className={clsx(
              "text-lg font-semibold mb-4 pb-2 border-b",
              categoryLabels[cat]?.color
            )}
          >
            {categoryLabels[cat]?.label || cat}
          </h3>
          <div className={compact ? "space-y-1" : "space-y-2"}>
            {catLessons.map((lesson) => {
              const completed = isLessonCompleted(lesson);

              if (compact) {
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onSelectLesson(lesson)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded transition-all",
                      "flex items-center gap-2",
                      "hover:bg-[#24283b] cursor-pointer",
                      completed && "border-l-2 border-[#9ece6a]"
                    )}
                  >
                    {completed ? (
                      <CheckCircle className="w-4 h-4 text-[#9ece6a] flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#414868] flex-shrink-0" />
                    )}
                    <span className="text-sm text-[#c0caf5] truncate">{lesson.title}</span>
                  </button>
                );
              }

              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson)}
                  className={clsx(
                    "w-full text-left p-4 rounded-lg transition-all",
                    "flex items-center gap-4",
                    "bg-[#24283b] hover:bg-[#2a2f45] cursor-pointer",
                    completed && "border-l-4 border-[#9ece6a]"
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {completed ? (
                      <CheckCircle className="w-6 h-6 text-[#9ece6a]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-[#414868]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[#c0caf5]">
                        {lesson.title}
                      </h4>
                      <span
                        className={clsx(
                          "px-2 py-0.5 text-xs rounded",
                          lesson.difficulty === "beginner" &&
                            "bg-[#9ece6a]/20 text-[#9ece6a]",
                          lesson.difficulty === "intermediate" &&
                            "bg-[#e0af68]/20 text-[#e0af68]",
                          lesson.difficulty === "advanced" &&
                            "bg-[#f7768e]/20 text-[#f7768e]"
                        )}
                      >
                        {lesson.difficulty}
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate text-[#a9b1d6]">
                      {lesson.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#565f89]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lesson.estimatedMinutes} min
                      </span>
                      <span>{lesson.steps.length} steps</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-[#414868] flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
