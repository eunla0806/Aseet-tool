export interface FrameOffsetCatalog {
  actions: Record<string, { frames: { fileName: string }[] }>;
}

export interface OffsetPoint {
  x: number;
  y: number;
}

export type OffsetGroupScope = 'currentAction' | 'frontLike' | 'backLike' | 'selectedRange';

const BACK_FRAME_PREFIXES = ['ladder_', 'rope_'];

export const normalizeFrameName = (fileName: string) => fileName.replace(/\.png$/i, '');

export const isBackLikeFrameName = (frameName: string) =>
  BACK_FRAME_PREFIXES.some((prefix) => frameName.startsWith(prefix));

export const getFrameNamesForAction = (
  catalog: FrameOffsetCatalog,
  actionName: string
) => {
  return catalog.actions[actionName]?.frames.map((frame) => normalizeFrameName(frame.fileName)) ?? [];
};

export const getFrameNamesForScope = (
  catalog: FrameOffsetCatalog,
  scope: OffsetGroupScope,
  activeAction: string
) => {
  if (scope === 'currentAction') {
    return getFrameNamesForAction(catalog, activeAction);
  }

  // Future scopes:
  // frontLike: all non-ladder/rope frames.
  // backLike: ladder/rope frames.
  // selectedRange: manually selected frame range.
  const allFrameNames = Object.values(catalog.actions).flatMap((action) =>
    action.frames.map((frame) => normalizeFrameName(frame.fileName))
  );

  if (scope === 'frontLike') {
    return allFrameNames.filter((frameName) => !isBackLikeFrameName(frameName));
  }

  if (scope === 'backLike') {
    return allFrameNames.filter(isBackLikeFrameName);
  }

  return [];
};

export const applyOffsetDeltaToFrames = ({
  offsets,
  frameNames,
  deltaX,
  deltaY,
  getFallbackOffset,
}: {
  offsets: Record<string, OffsetPoint>;
  frameNames: string[];
  deltaX: number;
  deltaY: number;
  getFallbackOffset: (frameName: string) => OffsetPoint;
}) => {
  const nextOffsets = { ...offsets };

  frameNames.forEach((frameName) => {
    const baseOffset = offsets[frameName] ?? getFallbackOffset(frameName);
    nextOffsets[frameName] = {
      x: baseOffset.x + deltaX,
      y: baseOffset.y + deltaY,
    };
  });

  return nextOffsets;
};
