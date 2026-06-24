import * as Blockly from "blockly/core";
import { type BlockSourceType } from "../blockVisibility";

export const blockMediaTypes = new Map<string, BlockSourceType[]>();

(Blockly.Block.prototype as any).setMediaTypes = function (
  this: Blockly.Block,
  ...types: BlockSourceType[]
) {
  blockMediaTypes.set(this.type, types);
};
