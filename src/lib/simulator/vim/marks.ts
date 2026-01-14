import type {
  VimState,
  VimMark,
  CursorPosition,
  JumplistEntry,
} from "../types";
import { getActiveBuffer } from "./motions";

export function setMark(
  state: VimState,
  mark: string
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const markData: VimMark = {
    line: buffer.cursorLine,
    col: buffer.cursorCol,
    bufferId: buffer.id,
  };

  if (/^[A-Z]$/.test(mark)) {
    return {
      ...state,
      globalMarks: {
        ...state.globalMarks,
        [mark]: markData,
      },
      message: `Mark '${mark}' set`,
      messageType: "info",
    };
  }

  if (/^[a-z]$/.test(mark)) {
    const updatedBuffer = {
      ...buffer,
      marks: {
        ...buffer.marks,
        [mark]: markData,
      },
    };

    return {
      ...state,
      buffers: state.buffers.map((b) =>
        b.id === buffer.id ? updatedBuffer : b
      ),
      message: `Mark '${mark}' set`,
      messageType: "info",
    };
  }

  return state;
}

export function getMark(
  state: VimState,
  mark: string
): VimMark | null {
  const buffer = getActiveBuffer(state);
  if (!buffer) return null;

  if (/^[A-Z]$/.test(mark)) {
    return state.globalMarks[mark] || null;
  }

  if (/^[a-z]$/.test(mark)) {
    return buffer.marks[mark] || null;
  }

  switch (mark) {
    case ".":
      if (buffer.lastInsertPosition) {
        return {
          line: buffer.lastInsertPosition.line,
          col: buffer.lastInsertPosition.col,
          bufferId: buffer.id,
        };
      }
      return null;

    case "^":
      if (buffer.lastInsertPosition) {
        return {
          line: buffer.lastInsertPosition.line,
          col: buffer.lastInsertPosition.col,
          bufferId: buffer.id,
        };
      }
      return null;

    case '"':
      return buffer.marks['"'] || null;

    case "'":
    case "`": {
      if (state.jumplistPosition > 0 && state.jumplist.length > 0) {
        const prevEntry = state.jumplist[state.jumplistPosition - 1];
        if (prevEntry && prevEntry.bufferId === buffer.id) {
          return {
            line: prevEntry.position.line,
            col: prevEntry.position.col,
            bufferId: prevEntry.bufferId,
          };
        }
      }
      return null;
    }

    case "[":
      return buffer.marks["["] || null;

    case "]":
      return buffer.marks["]"] || null;

    case "<":
      if (state.lastVisualSelection) {
        return {
          line: state.lastVisualSelection.start.line,
          col: state.lastVisualSelection.start.col,
          bufferId: buffer.id,
        };
      }
      return null;

    case ">":
      if (state.lastVisualSelection) {
        return {
          line: state.lastVisualSelection.end.line,
          col: state.lastVisualSelection.end.col,
          bufferId: buffer.id,
        };
      }
      return null;

    default:
      return null;
  }
}

export function gotoMark(
  state: VimState,
  mark: string,
  exact: boolean = false
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const markData = getMark(state, mark);
  if (!markData) {
    return {
      ...state,
      message: `Mark '${mark}' not set`,
      messageType: "error",
    };
  }

  if (markData.bufferId && markData.bufferId !== buffer.id) {
    const targetBuffer = state.buffers.find((b) => b.id === markData.bufferId);
    if (!targetBuffer) {
      return {
        ...state,
        message: `Buffer for mark '${mark}' not found`,
        messageType: "error",
      };
    }

    const prevPosition: JumplistEntry = {
      bufferId: buffer.id,
      position: { line: buffer.cursorLine, col: buffer.cursorCol },
    };

    const jumplist = [...state.jumplist];
    jumplist.push(prevPosition);
    if (jumplist.length > 100) {
      jumplist.shift();
    }

    let targetCol = exact ? markData.col : 0;
    if (!exact) {
      const targetLine = targetBuffer.content[markData.line] || "";
      for (let i = 0; i < targetLine.length; i++) {
        if (targetLine[i] !== " " && targetLine[i] !== "\t") {
          targetCol = i;
          break;
        }
      }
    }

    const updatedTargetBuffer = {
      ...targetBuffer,
      cursorLine: Math.min(
        markData.line,
        Math.max(0, targetBuffer.content.length - 1)
      ),
      cursorCol: Math.min(
        targetCol,
        Math.max(0, (targetBuffer.content[markData.line] || "").length - 1)
      ),
    };

    return {
      ...state,
      activeBufferId: targetBuffer.id,
      buffers: state.buffers.map((b) =>
        b.id === targetBuffer.id ? updatedTargetBuffer : b
      ),
      jumplist,
      jumplistPosition: jumplist.length,
    };
  }

  const prevPosition: JumplistEntry = {
    bufferId: buffer.id,
    position: { line: buffer.cursorLine, col: buffer.cursorCol },
  };

  const jumplist = [...state.jumplist];
  jumplist.push(prevPosition);
  if (jumplist.length > 100) {
    jumplist.shift();
  }

  let targetCol = exact ? markData.col : 0;
  if (!exact) {
    const targetLine = buffer.content[markData.line] || "";
    for (let i = 0; i < targetLine.length; i++) {
      if (targetLine[i] !== " " && targetLine[i] !== "\t") {
        targetCol = i;
        break;
      }
    }
  }

  const updatedBuffer = {
    ...buffer,
    cursorLine: Math.min(
      markData.line,
      Math.max(0, buffer.content.length - 1)
    ),
    cursorCol: Math.min(
      targetCol,
      Math.max(0, (buffer.content[markData.line] || "").length - 1)
    ),
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
    jumplist,
    jumplistPosition: jumplist.length,
  };
}

export function gotoMarkLine(state: VimState, mark: string): VimState {
  return gotoMark(state, mark, false);
}

export function gotoMarkExact(state: VimState, mark: string): VimState {
  return gotoMark(state, mark, true);
}

export function gotoPreviousPosition(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  if (state.jumplistPosition <= 0 || state.jumplist.length === 0) {
    return {
      ...state,
      message: "Already at oldest position",
      messageType: "info",
    };
  }

  const newPosition = state.jumplistPosition - 1;
  const entry = state.jumplist[newPosition];

  if (!entry) {
    return state;
  }

  const currentPosition: JumplistEntry = {
    bufferId: buffer.id,
    position: { line: buffer.cursorLine, col: buffer.cursorCol },
  };

  const jumplist = [...state.jumplist];
  if (state.jumplistPosition === jumplist.length) {
    jumplist.push(currentPosition);
  }

  if (entry.bufferId !== buffer.id) {
    const targetBuffer = state.buffers.find((b) => b.id === entry.bufferId);
    if (!targetBuffer) {
      return state;
    }

    const updatedTargetBuffer = {
      ...targetBuffer,
      cursorLine: Math.min(
        entry.position.line,
        Math.max(0, targetBuffer.content.length - 1)
      ),
      cursorCol: Math.min(
        entry.position.col,
        Math.max(
          0,
          (targetBuffer.content[entry.position.line] || "").length - 1
        )
      ),
    };

    return {
      ...state,
      activeBufferId: targetBuffer.id,
      buffers: state.buffers.map((b) =>
        b.id === targetBuffer.id ? updatedTargetBuffer : b
      ),
      jumplist,
      jumplistPosition: newPosition,
    };
  }

  const updatedBuffer = {
    ...buffer,
    cursorLine: Math.min(
      entry.position.line,
      Math.max(0, buffer.content.length - 1)
    ),
    cursorCol: Math.min(
      entry.position.col,
      Math.max(0, (buffer.content[entry.position.line] || "").length - 1)
    ),
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
    jumplist,
    jumplistPosition: newPosition,
  };
}

export function deleteMark(state: VimState, mark: string): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  if (/^[A-Z]$/.test(mark)) {
    const { [mark]: _removed, ...remainingMarks } = state.globalMarks;
    void _removed;
    return {
      ...state,
      globalMarks: remainingMarks,
      message: `Mark '${mark}' deleted`,
      messageType: "info",
    };
  }

  if (/^[a-z]$/.test(mark)) {
    const { [mark]: _removed, ...remainingMarks } = buffer.marks;
    void _removed;
    const updatedBuffer = {
      ...buffer,
      marks: remainingMarks,
    };

    return {
      ...state,
      buffers: state.buffers.map((b) =>
        b.id === buffer.id ? updatedBuffer : b
      ),
      message: `Mark '${mark}' deleted`,
      messageType: "info",
    };
  }

  return state;
}

export function deleteMarks(state: VimState, marks: string): VimState {
  let updatedState = state;

  for (const mark of marks) {
    updatedState = deleteMark(updatedState, mark);
  }

  return {
    ...updatedState,
    message: `Marks deleted: ${marks}`,
    messageType: "info",
  };
}

export function deleteAllMarks(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const updatedBuffer = {
    ...buffer,
    marks: {},
  };

  return {
    ...state,
    globalMarks: {},
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
    message: "All marks deleted",
    messageType: "info",
  };
}

export function getAllMarks(state: VimState): Array<{
  name: string;
  line: number;
  col: number;
  file: string;
  text: string;
  isGlobal: boolean;
}> {
  const buffer = getActiveBuffer(state);
  if (!buffer) return [];

  const marks: Array<{
    name: string;
    line: number;
    col: number;
    file: string;
    text: string;
    isGlobal: boolean;
  }> = [];

  for (const [name, mark] of Object.entries(buffer.marks)) {
    if (/^[a-z]$/.test(name)) {
      const lineContent = buffer.content[mark.line] || "";
      marks.push({
        name,
        line: mark.line + 1,
        col: mark.col,
        file: buffer.filename,
        text: lineContent.substring(0, 50),
        isGlobal: false,
      });
    }
  }

  for (const [name, mark] of Object.entries(state.globalMarks)) {
    const targetBuffer = state.buffers.find((b) => b.id === mark.bufferId);
    const filename = targetBuffer?.filename || "unknown";
    const lineContent = targetBuffer?.content[mark.line] || "";
    marks.push({
      name,
      line: mark.line + 1,
      col: mark.col,
      file: filename,
      text: lineContent.substring(0, 50),
      isGlobal: true,
    });
  }

  const specialMarks: Array<{ name: string; getter: () => VimMark | null }> = [
    { name: ".", getter: () => getMark(state, ".") },
    { name: "^", getter: () => getMark(state, "^") },
    { name: '"', getter: () => getMark(state, '"') },
    { name: "[", getter: () => getMark(state, "[") },
    { name: "]", getter: () => getMark(state, "]") },
    { name: "<", getter: () => getMark(state, "<") },
    { name: ">", getter: () => getMark(state, ">") },
  ];

  for (const { name, getter } of specialMarks) {
    const mark = getter();
    if (mark) {
      const targetBuffer = mark.bufferId
        ? state.buffers.find((b) => b.id === mark.bufferId)
        : buffer;
      const filename = targetBuffer?.filename || buffer.filename;
      const lineContent = targetBuffer?.content[mark.line] || "";
      marks.push({
        name,
        line: mark.line + 1,
        col: mark.col,
        file: filename,
        text: lineContent.substring(0, 50),
        isGlobal: false,
      });
    }
  }

  marks.sort((a, b) => {
    if (a.isGlobal !== b.isGlobal) return a.isGlobal ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return marks;
}

export function formatMarksDisplay(state: VimState): string {
  const marks = getAllMarks(state);
  if (marks.length === 0) {
    return "No marks set";
  }

  const lines: string[] = ["mark line  col file/text"];

  for (const mark of marks) {
    const line = mark.line.toString().padStart(5);
    const col = mark.col.toString().padStart(4);
    lines.push(` ${mark.name}  ${line}${col} ${mark.text}`);
  }

  return lines.join("\n");
}

export function setLastChangePosition(
  state: VimState,
  position: CursorPosition
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const updatedBuffer = {
    ...buffer,
    marks: {
      ...buffer.marks,
      ".": {
        line: position.line,
        col: position.col,
        bufferId: buffer.id,
      },
    },
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
  };
}

export function setChangeRange(
  state: VimState,
  start: CursorPosition,
  end: CursorPosition
): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const updatedBuffer = {
    ...buffer,
    marks: {
      ...buffer.marks,
      "[": {
        line: start.line,
        col: start.col,
        bufferId: buffer.id,
      },
      "]": {
        line: end.line,
        col: end.col,
        bufferId: buffer.id,
      },
    },
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
  };
}

export function setLastExitPosition(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const updatedBuffer = {
    ...buffer,
    marks: {
      ...buffer.marks,
      '"': {
        line: buffer.cursorLine,
        col: buffer.cursorCol,
        bufferId: buffer.id,
      },
    },
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
  };
}

export function navigateJumplistBackward(state: VimState): VimState {
  return gotoPreviousPosition(state);
}

export function navigateJumplistForward(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  if (state.jumplistPosition >= state.jumplist.length - 1) {
    return {
      ...state,
      message: "Already at newest position",
      messageType: "info",
    };
  }

  const newPosition = state.jumplistPosition + 1;
  const entry = state.jumplist[newPosition];

  if (!entry) {
    return state;
  }

  if (entry.bufferId !== buffer.id) {
    const targetBuffer = state.buffers.find((b) => b.id === entry.bufferId);
    if (!targetBuffer) {
      return state;
    }

    const updatedTargetBuffer = {
      ...targetBuffer,
      cursorLine: Math.min(
        entry.position.line,
        Math.max(0, targetBuffer.content.length - 1)
      ),
      cursorCol: Math.min(
        entry.position.col,
        Math.max(
          0,
          (targetBuffer.content[entry.position.line] || "").length - 1
        )
      ),
    };

    return {
      ...state,
      activeBufferId: targetBuffer.id,
      buffers: state.buffers.map((b) =>
        b.id === targetBuffer.id ? updatedTargetBuffer : b
      ),
      jumplistPosition: newPosition,
    };
  }

  const updatedBuffer = {
    ...buffer,
    cursorLine: Math.min(
      entry.position.line,
      Math.max(0, buffer.content.length - 1)
    ),
    cursorCol: Math.min(
      entry.position.col,
      Math.max(0, (buffer.content[entry.position.line] || "").length - 1)
    ),
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
    jumplistPosition: newPosition,
  };
}

export function navigateChangelistBackward(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const relevantChanges = state.changelist.filter(
    (c) => c.bufferId === buffer.id
  );

  if (relevantChanges.length === 0) {
    return {
      ...state,
      message: "No changes to navigate",
      messageType: "info",
    };
  }

  const newPosition = Math.max(0, buffer.changelistPosition - 1);
  const entry = relevantChanges[newPosition];

  if (!entry) {
    return state;
  }

  const updatedBuffer = {
    ...buffer,
    cursorLine: Math.min(
      entry.position.line,
      Math.max(0, buffer.content.length - 1)
    ),
    cursorCol: Math.min(
      entry.position.col,
      Math.max(0, (buffer.content[entry.position.line] || "").length - 1)
    ),
    changelistPosition: newPosition,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
  };
}

export function navigateChangelistForward(state: VimState): VimState {
  const buffer = getActiveBuffer(state);
  if (!buffer) return state;

  const relevantChanges = state.changelist.filter(
    (c) => c.bufferId === buffer.id
  );

  if (relevantChanges.length === 0) {
    return {
      ...state,
      message: "No changes to navigate",
      messageType: "info",
    };
  }

  const newPosition = Math.min(
    relevantChanges.length - 1,
    buffer.changelistPosition + 1
  );
  const entry = relevantChanges[newPosition];

  if (!entry) {
    return state;
  }

  const updatedBuffer = {
    ...buffer,
    cursorLine: Math.min(
      entry.position.line,
      Math.max(0, buffer.content.length - 1)
    ),
    cursorCol: Math.min(
      entry.position.col,
      Math.max(0, (buffer.content[entry.position.line] || "").length - 1)
    ),
    changelistPosition: newPosition,
  };

  return {
    ...state,
    buffers: state.buffers.map((b) =>
      b.id === buffer.id ? updatedBuffer : b
    ),
  };
}
