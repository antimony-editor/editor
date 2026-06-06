import * as Blockly from "blockly/core";
import ColorWheelField from "blockly-field-color-wheel";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["appearance_show"] = {
  init: function () {
    this.appendDummyInput().appendField("show");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Make the sprite visible");
  },
};

javascriptGenerator.forBlock["appearance_show"] = function () {
  return `context.sprite.visible = true;\n`;
};

Blockly.Blocks["appearance_hide"] = {
  init: function () {
    this.appendDummyInput().appendField("hide");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Make the sprite invisible");
  },
};

javascriptGenerator.forBlock["appearance_hide"] = function () {
  return `context.sprite.visible = false;\n`;
};

Blockly.Blocks["appearance_setSize"] = {
  init: function () {
    this.appendValueInput("SIZE")
      .setCheck("Number")
      .appendField("set size to");
    this.appendDummyInput().appendField("%");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Change the size of the sprite (100 = normal size)");
  },
};

javascriptGenerator.forBlock["appearance_setSize"] = function (block: Blockly.Block) {
  const size = javascriptGenerator.valueToCode(block, "SIZE", Order.ATOMIC) || "100";
  return `context.sprite._originalWidth = context.sprite._originalWidth ?? context.sprite.width;
context.sprite._originalHeight = context.sprite._originalHeight ?? context.sprite.height;
context.sprite.width = context.sprite._originalWidth * (${size} / 100);
context.sprite.height = context.sprite._originalHeight * (${size} / 100);\n`;
};

Blockly.Blocks["appearance_setOpacity"] = {
  init: function () {
    this.appendValueInput("OPACITY")
      .setCheck("Number")
      .appendField("set opacity to");
    this.appendDummyInput().appendField("%");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Set how transparent the sprite is (0 = invisible, 100 = opaque)");
  },
};

javascriptGenerator.forBlock["appearance_setOpacity"] = function (block: Blockly.Block) {
  const opacity = javascriptGenerator.valueToCode(block, "OPACITY", Order.ATOMIC) || "100";
  return `context.sprite.opacity = ${opacity} / 100;\n`;
};

Blockly.Blocks["appearance_setColor"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set color to")
      .appendField(new ColorWheelField("#FF0000"), "COLOR");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Change the color of the text");
  },
};

javascriptGenerator.forBlock["appearance_setColor"] = function (block: Blockly.Block) {
  const color = block.getFieldValue("COLOR");
  return `context.sprite.color = ${JSON.stringify(color)};\n`;
};

Blockly.Blocks["appearance_changeSize"] = {
  init: function () {
    this.appendValueInput("CHANGE")
      .setCheck("Number")
      .appendField("change size by");
    this.appendDummyInput().appendField("%");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Increase or decrease the sprite size");
  },
};

javascriptGenerator.forBlock["appearance_changeSize"] = function (block: Blockly.Block) {
  const change = javascriptGenerator.valueToCode(block, "CHANGE", Order.ATOMIC) || "10";
  return `context.sprite.width *= (1 + ${change} / 100); context.sprite.height *= (1 + ${change} / 100);\n`;
};

Blockly.Blocks["appearance_getSize"] = {
  init: function () {
    this.appendDummyInput().appendField("size %");
    this.setOutput(true, "Number");
    this.setStyle("appearance_blocks");
    this.setTooltip("Get the current size of the sprite");
  },
};

javascriptGenerator.forBlock["appearance_getSize"] = function () {
  return ["(context.sprite._originalWidth ? (context.sprite.width / context.sprite._originalWidth) * 100 : 100)", Order.ATOMIC];
};

Blockly.Blocks["appearance_getOpacity"] = {
  init: function () {
    this.appendDummyInput().appendField("opacity %");
    this.setOutput(true, "Number");
    this.setStyle("appearance_blocks");
    this.setTooltip("Get the current opacity of the sprite");
  },
};

javascriptGenerator.forBlock["appearance_getOpacity"] = function () {
  return ["(context.sprite.opacity * 100)", Order.ATOMIC];
};

Blockly.Blocks["appearance_flip"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("flip")
      .appendField(
        new Blockly.FieldDropdown([
          ["horizontally", "x"],
          ["vertically", "y"],
        ]),
        "DIRECTION"
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Flip the sprite in the specified direction");
  },
};

javascriptGenerator.forBlock["appearance_flip"] = function (block: Blockly.Block) {
  const direction = block.getFieldValue("DIRECTION");
  if (direction === "x") {
    return `context.sprite.flipX = !context.sprite.flipX;\n`;
  } else {
    return `context.sprite.flipY = !context.sprite.flipY;\n`;
  }
};

export { };
