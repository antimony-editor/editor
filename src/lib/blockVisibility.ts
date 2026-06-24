import { blockMediaTypes } from "./patches/media-types";

export type BlockSourceType = "text" | "sprite" | "video" | "stage" | "all";

export function getSourceTypeForSprite(
  spriteType: "text" | "media" | "video",
): BlockSourceType {
  if (spriteType === "text") return "text";
  if (spriteType === "video") return "video";
  return "sprite";
}

export function isBlockVisibleFor(
  blockType: string,
  sourceType: BlockSourceType,
): boolean {
  const types = blockMediaTypes.get(blockType);
  if (!types) return true;
  if (types.includes("all")) return true;
  return types.includes(sourceType);
}