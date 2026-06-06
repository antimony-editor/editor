export type BlockSourceType = "text" | "sprite" | "stage" | "all";

export function getSourceTypeForSprite(
  spriteType: "text" | "shape" | "image",
): BlockSourceType {
  return spriteType === "text" ? "text" : "sprite";
}

export interface BlockVisibilityConfig {
  [blockType: string]: {
    visibleFor?: BlockSourceType[];
    hiddenFor?: BlockSourceType[];
  };
}

export const blockVisibilityConfig: BlockVisibilityConfig = {
  motion_moveRight: { visibleFor: ["sprite", "text"] },
  motion_moveLeft: { visibleFor: ["sprite", "text"] },
  motion_moveUp: { visibleFor: ["sprite", "text"] },
  motion_moveDown: { visibleFor: ["sprite", "text"] },
  motion_rotate: { visibleFor: ["sprite", "text"] },
  motion_goToPosition: { visibleFor: ["sprite", "text"] },
  motion_positionX: { visibleFor: ["sprite", "text"] },
  motion_positionY: { visibleFor: ["sprite", "text"] },

  appearance_show: { visibleFor: ["sprite", "text"] },
  appearance_hide: { visibleFor: ["sprite", "text"] },
  appearance_setSize: { visibleFor: ["sprite", "text"] },
  appearance_setOpacity: { visibleFor: ["sprite", "text"] },
  appearance_setColor: { visibleFor: ["text"] },
  appearance_changeSize: { visibleFor: ["sprite", "text"] },
  appearance_getSize: { visibleFor: ["sprite", "text"] },
  appearance_getOpacity: { visibleFor: ["sprite", "text"] },
  appearance_flip: { visibleFor: ["sprite"] },

  effects_shake: { visibleFor: ["sprite"] },
  effects_spin: { visibleFor: ["sprite"] },
  effects_pulse: { visibleFor: ["sprite"] },
  effects_fadeIn: { visibleFor: ["sprite", "text"] },
  effects_fadeOut: { visibleFor: ["sprite", "text"] },
  effects_scaleAnimation: { visibleFor: ["sprite", "text"] },
  effects_rotateTo: { visibleFor: ["sprite"] },

  layers_sendToFront: { visibleFor: ["sprite"] },
  layers_sendToBack: { visibleFor: ["sprite"] },
  layers_sendForward: { visibleFor: ["sprite"] },
  layers_sendBackward: { visibleFor: ["sprite"] },
  layers_setZIndex: { visibleFor: ["sprite"] },
  layers_getZIndex: { visibleFor: ["sprite"] },
};

export function isBlockVisibleFor(
  blockType: string,
  sourceType: BlockSourceType
): boolean {
  const config = blockVisibilityConfig[blockType];

  if (!config) {
    return true;
  }

  if (config.visibleFor) {
    if (config.visibleFor.includes("all")) {
      return true;
    }
    return config.visibleFor.includes(sourceType);
  }

  if (config.hiddenFor) {
    return !config.hiddenFor.includes(sourceType);
  }

  return true;
}

export function filterBlocksForSource(
  blockTypes: string[],
  sourceType: BlockSourceType
): string[] {
  return blockTypes.filter((blockType) =>
    isBlockVisibleFor(blockType, sourceType)
  );
}

export function getVisibleBlocksForSource(
  sourceType: BlockSourceType
): string[] {
  return Object.keys(blockVisibilityConfig).filter((blockType) =>
    isBlockVisibleFor(blockType, sourceType)
  );
}
