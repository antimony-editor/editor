import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["layers_sendToFront"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendDummyInput().appendField("send to front");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("layers_blocks");
    this.setTooltip("Move the sprite to the front of the layer stack");
  },
};

javascriptGenerator.forBlock["layers_sendToFront"] = function () {
  return `(() => {
  const sprites = context.getSprites();
  context.dispatch({ type: 'REORDER_SPRITE', id: context.spriteId, newIndex: sprites.length - 1 });
})();\n`;
};

Blockly.Blocks["layers_sendToBack"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendDummyInput().appendField("send to back");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("layers_blocks");
    this.setTooltip("Move the sprite to the back of the layer stack");
  },
};

javascriptGenerator.forBlock["layers_sendToBack"] = function () {
  return `context.dispatch({ type: 'REORDER_SPRITE', id: context.spriteId, newIndex: 0 });\n`;
};

Blockly.Blocks["layers_sendForward"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendValueInput("Z").setCheck("Number").appendField("send");
    this.appendDummyInput().appendField("layers forward");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("layers_blocks");
    this.setTooltip("Move the sprite a specific amount of layers forward");
  },
};

javascriptGenerator.forBlock["layers_sendForward"] = function (block) {
  const z = javascriptGenerator.valueToCode(block, "Z", Order.ATOMIC) || "0";
  return `(() => {
  const sprites = context.getSprites();
  const idx = sprites.findIndex(s => s.id === context.spriteId);
  if (idx !== -1) context.dispatch({ type: 'REORDER_SPRITE', id: context.spriteId, newIndex: Math.min(idx + ${z}, sprites.length - 1) });
})();\n`;
};

Blockly.Blocks["layers_setZIndex"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendValueInput("Z").setCheck("Number").appendField("go to layer");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("layers_blocks");
    this.setTooltip("Set the exact layer position (z index) of the sprite");
  },
};

javascriptGenerator.forBlock["layers_setZIndex"] = function (
  block: Blockly.Block,
) {
  const z = javascriptGenerator.valueToCode(block, "Z", Order.ATOMIC) || "0";
  return `context.dispatch({ type: 'REORDER_SPRITE', id: context.spriteId, newIndex: Math.max(0, ${z}) });\n`;
};

Blockly.Blocks["layers_getZIndex"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendDummyInput().appendField("z index");
    this.setOutput(true, "Number");
    this.setStyle("layers_blocks");
    this.setTooltip("Get the current layer position (z index) of the sprite");
  },
};

javascriptGenerator.forBlock["layers_getZIndex"] = function () {
  return ["context.sprite.zIndex", Order.ATOMIC];
};

export {};
