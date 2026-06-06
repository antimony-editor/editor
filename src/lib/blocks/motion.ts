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

Blockly.Blocks["motion_rotate"] = {
  init: function () {
    this.appendValueInput("ANGLE")
      .setCheck("Number")
      .appendField("turn");
    this.appendDummyInput().appendField("degrees");
    this.appendDummyInput()
      .appendField(
        new Blockly.FieldDropdown([
          ["clockwise", "clockwise"],
          ["anticlockwise", "anticlockwise"],
        ]),
        "DIRECTION"
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Turn the sprite by the specified angle in the chosen direction");
    this.setInputsInline(true);
  },
};

javascriptGenerator.forBlock["motion_rotate"] = function (block: Blockly.Block) {
  const angle = javascriptGenerator.valueToCode(block, "ANGLE", Order.ATOMIC) || "15";
  const direction = block.getFieldValue("DIRECTION");
  const delta = direction === "clockwise" ? `${angle}` : `-(${angle})`;
  return `context.sprite.rotation = (context.sprite.rotation + (${delta})) % 360;\n`;
};

Blockly.Blocks["motion_pointDirection"] = {
  init: function () {
    this.appendValueInput("ANGLE")
      .setCheck("Number")
      .appendField("point in direction");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Point the sprite in the given direction");
  },
};

javascriptGenerator.forBlock["motion_pointDirection"] = function (block: Blockly.Block) {
  const angle = javascriptGenerator.valueToCode(block, "ANGLE", Order.ATOMIC) || "90";
  return `context.sprite.rotation = (${angle}) % 360;\n`;
};

Blockly.Blocks["motion_goToPosition"] = {
  init: function () {
    this.appendValueInput("X")
      .setCheck("Number")
      .appendField("move to X");
    this.appendValueInput("Y")
      .setCheck("Number")
      .appendField("Y");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setInputsInline(true);
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

javascriptGenerator.forBlock["motion_positionX"] = function () {
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

javascriptGenerator.forBlock["motion_positionY"] = function () {
  return ["context.sprite.y", Order.ATOMIC];
};

Blockly.Blocks["motion_getXY"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("get")
      .appendField(new Blockly.FieldDropdown([
        ["x", "X"],
        ["y", "Y"],
      ]), "AXIS");
    this.setOutput(true, "Number");
    this.setStyle("motion_blocks");
    this.setTooltip("Get the X or Y position of the sprite");
  },
};

javascriptGenerator.forBlock["motion_getXY"] = function (block: Blockly.Block) {
  const axis = block.getFieldValue("AXIS");
  if (axis === "X") return ["context.sprite.x", Order.ATOMIC];
  return ["context.sprite.y", Order.ATOMIC];
};

export { };

Blockly.Blocks["motion_moveBy"] = {
  init: function () {
    this.appendValueInput("DX")
      .setCheck("Number")
      .appendField("change x by:");
    this.appendValueInput("DY")
      .setCheck("Number")
      .appendField("y:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Move the sprite by the given X and Y amounts");
    this.setInputsInline(true);
  },
};

javascriptGenerator.forBlock["motion_moveBy"] = function (block: Blockly.Block) {
  const dx = javascriptGenerator.valueToCode(block, "DX", Order.ATOMIC) || "0";
  const dy = javascriptGenerator.valueToCode(block, "DY", Order.ATOMIC) || "0";
  return `context.sprite.x += ${dx};\ncontext.sprite.y += ${dy};\n`;
};

Blockly.Blocks["motion_setXY"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set")
      .appendField(new Blockly.FieldDropdown([
        ["x", "X"],
        ["y", "Y"]
      ]), "AXIS")
      .appendField("to");
    this.appendValueInput("VALUE").setCheck("Number");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Set the sprite's X or Y position to the given value");
    this.setInputsInline(true);
  },
};

javascriptGenerator.forBlock["motion_setXY"] = function (block: Blockly.Block) {
  const axis = block.getFieldValue("AXIS");
  const val = javascriptGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "0";
  if (axis === "X") {
    return `context.sprite.x = ${val};\n`;
  }
  return `context.sprite.y = ${val};\n`;
};

Blockly.Blocks["motion_glideSecsTo"] = {
  init: function () {
    this.appendValueInput("SECS").setCheck("Number").appendField("glide");
    this.appendDummyInput().appendField("secs to x:");
    this.appendValueInput("X").setCheck("Number");
    this.appendDummyInput().appendField("y:");
    this.appendValueInput("Y").setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("motion_blocks");
    this.setTooltip("Glide to the given x/y over the specified seconds");
  },
};

javascriptGenerator.forBlock["motion_glideSecsTo"] = function (block: Blockly.Block) {
  const secs = javascriptGenerator.valueToCode(block, "SECS", Order.NONE) || "0";
  const x = javascriptGenerator.valueToCode(block, "X", Order.NONE) || "0";
  const y = javascriptGenerator.valueToCode(block, "Y", Order.NONE) || "0";
  return `(async function(context){\n  const duration = (${secs}) * 1000;\n  const targetX = (${x});\n  const targetY = (${y});\n  const startX = context.sprite.x;\n  const startY = context.sprite.y;\n  const dx = targetX - startX;\n  const dy = targetY - startY;\n  const stepMs = 20;\n  const steps = Math.max(1, Math.ceil(duration / stepMs));\n  for (let i = 1; i <= steps; i++) {\n    const t = i / steps;\n    context.sprite.x = startX + dx * t;\n    context.sprite.y = startY + dy * t;\n    await window.RUNTIME.delay(duration / steps);\n  }\n})(context);\n`;
};
