export type BlockSourceType = "text" | "sprite" | "video" | "stage" | "all";

export function getSourceTypeForSprite(
  spriteType: "text" | "media" | "video",
): BlockSourceType {
  if (spriteType === "text") return "text";
  if (spriteType === "video") return "video";
  return "sprite";
}

export interface BlockVisibilityConfig {
  [blockType: string]: {
    visibleFor?: BlockSourceType[];
    hiddenFor?: BlockSourceType[];
  };
}

export const blockVisibilityConfig: BlockVisibilityConfig = {
  motion_moveRight: { visibleFor: ["sprite", "text", "video"] },
  motion_moveLeft: { visibleFor: ["sprite", "text", "video"] },
  motion_moveUp: { visibleFor: ["sprite", "text", "video"] },
  motion_moveDown: { visibleFor: ["sprite", "text", "video"] },
  motion_rotate: { visibleFor: ["sprite", "text", "video"] },
  motion_goToPosition: { visibleFor: ["sprite", "text", "video"] },
  motion_positionX: { visibleFor: ["sprite", "text", "video"] },
  motion_positionY: { visibleFor: ["sprite", "text", "video"] },
  motion_setCharPosition: { visibleFor: ["text"] },
  motion_tweenCharPosition: { visibleFor: ["text"] },
  motion_forEachCharacter: { visibleFor: ["text"] },
  motion_forEachCharacter_var: { visibleFor: ["text"] },

  appearance_show: { visibleFor: ["sprite", "text", "video"] },
  appearance_hide: { visibleFor: ["sprite", "text", "video"] },
  appearance_setSize: { visibleFor: ["sprite", "text", "video"] },
  appearance_setOpacity: { visibleFor: ["sprite", "text", "video"] },
  appearance_setColor: { visibleFor: ["text"] },
  appearance_changeSize: { visibleFor: ["sprite", "text", "video"] },
  appearance_getSize: { visibleFor: ["sprite", "text", "video"] },
  appearance_getOpacity: { visibleFor: ["sprite", "text", "video"] },
  appearance_flip: { visibleFor: ["sprite", "video"] },
  appearance_setImageIndex: { visibleFor: ["sprite"] },
  appearance_setImageName: { visibleFor: ["sprite"] },
  appearance_nextImage: { visibleFor: ["sprite"] },
  appearance_getImageIndex: { visibleFor: ["sprite"] },
  appearance_getImageName: { visibleFor: ["sprite"] },
  appearance_getImageCount: { visibleFor: ["sprite"] },

  video_play: { visibleFor: ["video"] },
  video_pause: { visibleFor: ["video"] },
  video_setPlaybackRate: { visibleFor: ["video"] },
  video_setVolume: { visibleFor: ["video"] },
  video_setLoop: { visibleFor: ["video"] },
  video_setCurrentTime: { visibleFor: ["video"] },
  video_getCurrentTime: { visibleFor: ["video"] },
  video_getDuration: { visibleFor: ["video"] },
  video_setVideoIndex: { visibleFor: ["video"] },
  video_setVideoName: { visibleFor: ["video"] },
  video_nextVideo: { visibleFor: ["video"] },

  effects_shake: { visibleFor: ["sprite", "video"] },
  effects_spin: { visibleFor: ["sprite", "video"] },
  effects_pulse: { visibleFor: ["sprite", "video"] },
  effects_tween: { visibleFor: ["sprite", "text", "video"] },
  effects_setTweenMode: { visibleFor: ["sprite", "text", "video"] },
  effects_setPropertyTweenMode: { visibleFor: ["sprite", "text", "video"] },
  effects_resetPropertyTweenMode: { visibleFor: ["sprite", "text", "video"] },

  layers_sendToFront: { visibleFor: ["sprite", "video"] },
  layers_sendToBack: { visibleFor: ["sprite", "video"] },
  layers_sendForward: { visibleFor: ["sprite", "video"] },
  layers_sendBackward: { visibleFor: ["sprite", "video"] },
  layers_setZIndex: { visibleFor: ["sprite", "video"] },
  layers_getZIndex: { visibleFor: ["sprite", "video"] },

  sensors_mouseX: { visibleFor: ["sprite", "text", "video"] },
  sensors_mouseY: { visibleFor: ["sprite", "text", "video"] },
  sensors_mouseDown: { visibleFor: ["sprite", "text", "video"] },
  sensors_keyPressed: { visibleFor: ["sprite", "text", "video"] },
  sensors_keyJustPressed: { visibleFor: ["sprite", "text", "video"] },
  sensors_resetTimer: { visibleFor: ["sprite", "text", "video"] },
  sensors_getTimer: { visibleFor: ["sprite", "text", "video"] },
  sensors_distanceToMouse: { visibleFor: ["sprite", "text", "video"] },
  sensors_distanceToSprite: { visibleFor: ["sprite", "text", "video"] },
  sensors_touchingMouse: { visibleFor: ["sprite", "text", "video"] },
  sensors_touchingSprite: { visibleFor: ["sprite", "text", "video"] },
  sensors_touchingEdge: { visibleFor: ["sprite", "text", "video"] },
  sensors_stageWidth: { visibleFor: ["sprite", "text", "video"] },
  sensors_stageHeight: { visibleFor: ["sprite", "text", "video"] },

  text_setText: { visibleFor: ["text"] },
};

export function isBlockVisibleFor(
  blockType: string,
  sourceType: BlockSourceType,
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
  sourceType: BlockSourceType,
): string[] {
  return blockTypes.filter((blockType) =>
    isBlockVisibleFor(blockType, sourceType),
  );
}

export function getVisibleBlocksForSource(
  sourceType: BlockSourceType,
): string[] {
  return Object.keys(blockVisibilityConfig).filter((blockType) =>
    isBlockVisibleFor(blockType, sourceType),
  );
}