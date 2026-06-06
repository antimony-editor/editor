import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["motion_moveRight"] = {
  init: function () {
    this.appendValueInput("STEPS")
      .setCheck("Number")
      .appendField("move right");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Move the sprite to the right by the specified number of steps");
  },
};

javascriptGenerator.forBlock["motion_moveRight"] = function (block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, "STEPS", Order.ATOMIC) || "10";
  return `context.sprite.x += ${steps};\n`;
};

Blockly.Blocks["motion_moveLeft"] = {
  init: function () {
    this.appendValueInput("STEPS")
      .setCheck("Number")
      .appendField("move left");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Move the sprite to the left by the specified number of steps");
  },
};

javascriptGenerator.forBlock["motion_moveLeft"] = function (block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, "STEPS", Order.ATOMIC) || "10";
  return `context.sprite.x -= ${steps};\n`;
};

Blockly.Blocks["motion_moveUp"] = {
  init: function () {
    this.appendValueInput("STEPS")
      .setCheck("Number")
      .appendField("move up");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Move the sprite up by the specified number of steps");
  },
};

javascriptGenerator.forBlock["motion_moveUp"] = function (block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, "STEPS", Order.ATOMIC) || "10";
  return `context.sprite.y -= ${steps};\n`;
};

Blockly.Blocks["motion_moveDown"] = {
  init: function () {
    this.appendValueInput("STEPS")
      .setCheck("Number")
      .appendField("move down");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Move the sprite down by the specified number of steps");
  },
};

javascriptGenerator.forBlock["motion_moveDown"] = function (block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, "STEPS", Order.ATOMIC) || "10";
  return `context.sprite.y += ${steps};\n`;
};

Blockly.Blocks["motion_rotate"] = {
  init: function () {
    this.appendValueInput("ANGLE")
      .setCheck("Number")
      .appendField("rotate");
    this.appendDummyInput()
      .appendField(
        new Blockly.FieldDropdown([
          ["clockwise", "clockwise"],
          ["counter-clockwise", "counter-clockwise"],
        ]),
        "DIRECTION"
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Rotate the sprite by the specified angle");
  },
};

javascriptGenerator.forBlock["motion_rotate"] = function (block: Blockly.Block) {
  const angle = javascriptGenerator.valueToCode(block, "ANGLE", Order.ATOMIC) || "15";
  const direction = block.getFieldValue("DIRECTION");
  const delta = direction === "clockwise" ? `${angle}` : `-(${angle})`;
  return `context.sprite.rotation = (context.sprite.rotation + (${delta})) % 360;\n`;
};

Blockly.Blocks["motion_goToPosition"] = {
  init: function () {
    this.appendValueInput("X")
      .setCheck("Number")
      .appendField("go to position X:");
    this.appendValueInput("Y")
      .setCheck("Number")
      .appendField("Y:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Move the sprite to a specific position");
  },
};

javascriptGenerator.forBlock["motion_goToPosition"] = function (block: Blockly.Block) {
  const x = javascriptGenerator.valueToCode(block, "X", Order.ATOMIC) || "0";
  const y = javascriptGenerator.valueToCode(block, "Y", Order.ATOMIC) || "0";
  return `context.sprite.x = ${x};\ncontext.sprite.y = ${y};\n`;
};

Blockly.Blocks["motion_positionX"] = {
  init: function () {
    this.appendDummyInput().appendField("position X");
    this.setOutput(true, "Number");
    this.setStyle("motion_blocks");
    this.setTooltip("Get the X position of the sprite");
  },
};

javascriptGenerator.forBlock["motion_positionX"] = function (block: Blockly.Block) {
  return ["context.sprite.x", Order.ATOMIC];
};

Blockly.Blocks["motion_positionY"] = {
  init: function () {
    this.appendDummyInput().appendField("position Y");
    this.setOutput(true, "Number");
    this.setStyle("motion_blocks");
    this.setTooltip("Get the Y position of the sprite");
  },
};

javascriptGenerator.forBlock["motion_positionY"] = function (block: Blockly.Block) {
  return ["context.sprite.y", Order.ATOMIC];
};

export { };
