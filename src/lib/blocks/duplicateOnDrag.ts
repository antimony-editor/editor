import * as Blockly from "blockly/core";

declare module "blockly/core" {
  interface Block {
    duplicateOnDrag?: boolean;
  }
}

const origIsMovable = Blockly.Block.prototype.isMovable;
const origIsDeletable = Blockly.Block.prototype.isDeletable;
// sorry cord lat there's no better way without "as any"
const origOnMouseDown = (Blockly.BlockSvg.prototype as any).onMouseDown;

Blockly.Block.prototype.isMovable = function (this: Blockly.Block) {
  if (this.duplicateOnDrag && this.isShadow()) return true;
  return origIsMovable.call(this);
};

Blockly.Block.prototype.isDeletable = function (this: Blockly.Block) {
  if (this.duplicateOnDrag && this.isShadow()) return true;
  return origIsDeletable.call(this);
};

(Blockly.BlockSvg.prototype as any).onMouseDown = function (
  this: Blockly.BlockSvg,
  e: PointerEvent,
) {
  if (this.duplicateOnDrag && this.isShadow() && this.getParent()) {
    makeClone(this);
  }
  origOnMouseDown.call(this, e);
};

function makeClone(block: Blockly.BlockSvg) {
  const parent = block.getParent();
  if (!parent) return;

  const workspace = block.workspace;
  const blockType = block.type;

  const targetConnection =
    block.outputConnection?.targetConnection ||
    block.previousConnection?.targetConnection;

  if (!targetConnection) return;

  block.setShadow(false);
  block.setMovable(true);
  block.setDeletable(true);

  const replacement = workspace.newBlock(blockType);
  replacement.initSvg();
  replacement.render();

  if (targetConnection) {
    replacement.outputConnection?.connect(targetConnection) ||
      replacement.previousConnection?.connect(targetConnection);
  }

  replacement.setShadow(true);
}
