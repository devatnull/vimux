import type { TmuxWindow, TmuxPane } from "./types";

export interface BorderPosition {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isActive: boolean;
}

export interface LayoutResult {
  panes: TmuxPane[];
  borderPositions?: BorderPosition[];
}

const MIN_PANE_WIDTH = 10;
const MIN_PANE_HEIGHT = 3;
const BORDER_WIDTH = 1;

interface LayoutNode {
  type: "pane" | "split";
  splitType?: "horizontal" | "vertical";
  paneId?: string;
  children?: LayoutNode[];
  ratio?: number;
}

function buildLayoutTree(panes: TmuxPane[]): LayoutNode {
  if (panes.length === 0) {
    return { type: "pane" };
  }
  if (panes.length === 1) {
    return { type: "pane", paneId: panes[0].id };
  }

  const sorted = [...panes].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const topY = sorted[0].y;
  const topRow = sorted.filter((p) => p.y === topY);
  const bottomRow = sorted.filter((p) => p.y !== topY);

  if (bottomRow.length > 0) {
    const topHeight = topRow[0].height + BORDER_WIDTH;
    const totalHeight = topHeight + (bottomRow[0]?.height || 0);
    return {
      type: "split",
      splitType: "horizontal",
      children: [buildLayoutTree(topRow), buildLayoutTree(bottomRow)],
      ratio: topHeight / totalHeight,
    };
  }

  const leftX = sorted[0].x;
  const leftCol = sorted.filter((p) => p.x === leftX);
  const rightCol = sorted.filter((p) => p.x !== leftX);

  if (rightCol.length > 0) {
    const leftWidth = leftCol[0].width + BORDER_WIDTH;
    const totalWidth = leftWidth + (rightCol[0]?.width || 0);
    return {
      type: "split",
      splitType: "vertical",
      children: [buildLayoutTree(leftCol), buildLayoutTree(rightCol)],
      ratio: leftWidth / totalWidth,
    };
  }

  return { type: "pane", paneId: panes[0].id };
}

function layoutFromTree(
  node: LayoutNode,
  x: number,
  y: number,
  width: number,
  height: number,
  paneMap: Map<string, TmuxPane>
): TmuxPane[] {
  if (node.type === "pane" && node.paneId) {
    const original = paneMap.get(node.paneId);
    if (original) {
      return [
        {
          ...original,
          x,
          y,
          width: Math.max(MIN_PANE_WIDTH, width),
          height: Math.max(MIN_PANE_HEIGHT, height),
        },
      ];
    }
    return [];
  }

  if (node.type === "split" && node.children && node.children.length === 2) {
    const ratio = node.ratio ?? 0.5;

    if (node.splitType === "horizontal") {
      const topHeight = Math.max(
        MIN_PANE_HEIGHT,
        Math.floor((height - BORDER_WIDTH) * ratio)
      );
      const bottomHeight = Math.max(
        MIN_PANE_HEIGHT,
        height - topHeight - BORDER_WIDTH
      );

      const topPanes = layoutFromTree(
        node.children[0],
        x,
        y,
        width,
        topHeight,
        paneMap
      );
      const bottomPanes = layoutFromTree(
        node.children[1],
        x,
        y + topHeight + BORDER_WIDTH,
        width,
        bottomHeight,
        paneMap
      );
      return [...topPanes, ...bottomPanes];
    } else {
      const leftWidth = Math.max(
        MIN_PANE_WIDTH,
        Math.floor((width - BORDER_WIDTH) * ratio)
      );
      const rightWidth = Math.max(
        MIN_PANE_WIDTH,
        width - leftWidth - BORDER_WIDTH
      );

      const leftPanes = layoutFromTree(
        node.children[0],
        x,
        y,
        leftWidth,
        height,
        paneMap
      );
      const rightPanes = layoutFromTree(
        node.children[1],
        x + leftWidth + BORDER_WIDTH,
        y,
        rightWidth,
        height,
        paneMap
      );
      return [...leftPanes, ...rightPanes];
    }
  }

  return [];
}

export function calculatePaneLayout(
  window: TmuxWindow,
  containerWidth: number,
  containerHeight: number
): LayoutResult {
  const { panes } = window;

  if (panes.length === 0) {
    return { panes: [], borderPositions: [] };
  }

  if (panes.length === 1) {
    const pane = panes[0];
    const result: TmuxPane[] = [
      {
        ...pane,
        x: 0,
        y: 0,
        width: Math.max(MIN_PANE_WIDTH, containerWidth),
        height: Math.max(MIN_PANE_HEIGHT, containerHeight),
      },
    ];
    return { panes: result, borderPositions: [] };
  }

  const paneMap = new Map<string, TmuxPane>();
  panes.forEach((p) => paneMap.set(p.id, p));

  const tree = buildLayoutTree(panes);
  const layoutPanes = layoutFromTree(
    tree,
    0,
    0,
    containerWidth,
    containerHeight,
    paneMap
  );

  const borderPositions = getPaneBorderPositions(layoutPanes);

  return { panes: layoutPanes, borderPositions };
}

export function recalculateLayout(
  window: TmuxWindow,
  newWidth: number,
  newHeight: number
): LayoutResult {
  return calculatePaneLayout(window, newWidth, newHeight);
}

export function getPaneBorderPositions(panes: TmuxPane[]): BorderPosition[] {
  const borders: BorderPosition[] = [];

  for (let i = 0; i < panes.length; i++) {
    const pane = panes[i];

    for (let j = i + 1; j < panes.length; j++) {
      const other = panes[j];

      if (pane.x + pane.width + BORDER_WIDTH === other.x) {
        const overlapStart = Math.max(pane.y, other.y);
        const overlapEnd = Math.min(
          pane.y + pane.height,
          other.y + other.height
        );
        if (overlapStart < overlapEnd) {
          borders.push({
            x1: pane.x + pane.width,
            y1: overlapStart,
            x2: pane.x + pane.width,
            y2: overlapEnd - 1,
            isActive: pane.isActive || other.isActive,
          });
        }
      }

      if (other.x + other.width + BORDER_WIDTH === pane.x) {
        const overlapStart = Math.max(pane.y, other.y);
        const overlapEnd = Math.min(
          pane.y + pane.height,
          other.y + other.height
        );
        if (overlapStart < overlapEnd) {
          borders.push({
            x1: other.x + other.width,
            y1: overlapStart,
            x2: other.x + other.width,
            y2: overlapEnd - 1,
            isActive: pane.isActive || other.isActive,
          });
        }
      }

      if (pane.y + pane.height + BORDER_WIDTH === other.y) {
        const overlapStart = Math.max(pane.x, other.x);
        const overlapEnd = Math.min(
          pane.x + pane.width,
          other.x + other.width
        );
        if (overlapStart < overlapEnd) {
          borders.push({
            x1: overlapStart,
            y1: pane.y + pane.height,
            x2: overlapEnd - 1,
            y2: pane.y + pane.height,
            isActive: pane.isActive || other.isActive,
          });
        }
      }

      if (other.y + other.height + BORDER_WIDTH === pane.y) {
        const overlapStart = Math.max(pane.x, other.x);
        const overlapEnd = Math.min(
          pane.x + pane.width,
          other.x + other.width
        );
        if (overlapStart < overlapEnd) {
          borders.push({
            x1: overlapStart,
            y1: other.y + other.height,
            x2: overlapEnd - 1,
            y2: other.y + other.height,
            isActive: pane.isActive || other.isActive,
          });
        }
      }
    }
  }

  return borders;
}
