export {
  initAllBlocks,
  workspaceConfig,
  buildToolboxForSource,
} from "./config";
export {
  isBlockVisibleFor,
  getSourceTypeForSprite,
} from "./blockVisibility";
export type { BlockSourceType } from "./blockVisibility";
export {
  registerExtension,
  activeExtensions,
  extensionBridges,
  extensionHandlers,
  subscribeExtensionChanges,
} from "./extensions/manager";
export type {
  ExtensionBlockDef,
  ExtensionBlockSpecType,
  ExtensionCategoryDef,
  ExtensionCodeHandlers,
  ExtensionFieldSpec,
  ExtensionInstance,
  RegisteredExtension,
} from "./extensions/types";
