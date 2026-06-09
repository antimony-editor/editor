export type BlockSourceType = "text" | "sprite" | "stage" | "all";

export function getSourceTypeForSprite(
  spriteType: "text" | "media",
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
  appearance_setImageIndex: { visibleFor: ["sprite"] },
  appearance_setImageName: { visibleFor: ["sprite"] },
  appearance_nextImage: { visibleFor: ["sprite"] },
  appearance_getImageIndex: { visibleFor: ["sprite"] },
  appearance_getImageName: { visibleFor: ["sprite"] },
  appearance_getImageCount: { visibleFor: ["sprite"] },

  effects_shake: { visibleFor: ["sprite"] },
  effects_spin: { visibleFor: ["sprite"] },
  effects_pulse: { visibleFor: ["sprite"] },
  effects_tween: { visibleFor: ["sprite", "text"] },
  effects_setTweenMode: { visibleFor: ["sprite", "text"] },
  effects_setPropertyTweenMode: { visibleFor: ["sprite", "text"] },
  effects_resetPropertyTweenMode: { visibleFor: ["sprite", "text"] },

  layers_sendToFront: { visibleFor: ["sprite"] },
  layers_sendToBack: { visibleFor: ["sprite"] },
  layers_sendForward: { visibleFor: ["sprite"] },
  layers_sendBackward: { visibleFor: ["sprite"] },
  layers_setZIndex: { visibleFor: ["sprite"] },
  layers_getZIndex: { visibleFor: ["sprite"] },

  text_setText: { visibleFor: ["text"] },
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
