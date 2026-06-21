import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["sensors_mouseX"] = {
  init: function () {
    this.appendDummyInput().appendField("mouse x");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the mouse pointer's x position on the stage");
  },
};

javascriptGenerator.forBlock["sensors_mouseX"] = function () {
  return ["window.RUNTIME.getMouseX()", Order.ATOMIC];
};

Blockly.Blocks["sensors_mouseY"] = {
  init: function () {
    this.appendDummyInput().appendField("mouse y");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the mouse pointer's y position on the stage");
  },
};

javascriptGenerator.forBlock["sensors_mouseY"] = function () {
  return ["window.RUNTIME.getMouseY()", Order.ATOMIC];
};

Blockly.Blocks["sensors_mouseDown"] = {
  init: function () {
    this.appendDummyInput().appendField("mouse down?");
    this.setOutput(true, "Boolean");
    this.setStyle("sensors_blocks");
    this.setTooltip("True while the mouse button is held down");
  },
};

javascriptGenerator.forBlock["sensors_mouseDown"] = function () {
  return ["window.RUNTIME.isMouseDown()", Order.ATOMIC];
};

Blockly.Blocks["sensors_keyPressed"] = {
  init: function () {
    this.appendValueInput("KEY")
      .setCheck("String")
      .appendField("key")
      .appendField(new Blockly.FieldDropdown([
        ["space", "space"],
        ["up arrow", "arrowup"],
        ["down arrow", "arrowdown"],
        ["left arrow", "arrowleft"],
        ["right arrow", "arrowright"],
        ["any", "any"],
        ["custom", "custom"],
      ]), "PRESET")
      .appendField("pressed?");
    this.setOutput(true, "Boolean");
    this.setStyle("sensors_blocks");
    this.setTooltip("True while the given key is held down");
  },
};

javascriptGenerator.forBlock["sensors_keyPressed"] = function (
  block: Blockly.Block,
) {
  const preset = block.getFieldValue("PRESET");
  const custom =
    javascriptGenerator.valueToCode(block, "KEY", Order.ATOMIC) || "''";
  if (preset === "any") {
    return ["window.RUNTIME.isAnyKeyPressed()", Order.ATOMIC];
  }
  const key = preset === "custom" ? custom : JSON.stringify(preset);
  return [`window.RUNTIME.isKeyPressed(${key})`, Order.ATOMIC];
};

Blockly.Blocks["sensors_keyJustPressed"] = {
  init: function () {
    this.appendValueInput("KEY")
      .setCheck("String")
      .appendField("key")
      .appendField(new Blockly.FieldDropdown([
        ["space", "space"],
        ["up arrow", "arrowup"],
        ["down arrow", "arrowdown"],
        ["left arrow", "arrowleft"],
        ["right arrow", "arrowright"],
        ["custom", "custom"],
      ]), "PRESET")
      .appendField("just pressed?");
    this.setOutput(true, "Boolean");
    this.setStyle("sensors_blocks");
    this.setTooltip(
      "True for a single frame, the moment the key is first pressed",
    );
  },
};

javascriptGenerator.forBlock["sensors_keyJustPressed"] = function (
  block: Blockly.Block,
) {
  const preset = block.getFieldValue("PRESET");
  const custom =
    javascriptGenerator.valueToCode(block, "KEY", Order.ATOMIC) || "''";
  const key = preset === "custom" ? custom : JSON.stringify(preset);
  return [`window.RUNTIME.isKeyJustPressed(${key})`, Order.ATOMIC];
};

Blockly.Blocks["sensors_resetTimer"] = {
  init: function () {
    this.appendDummyInput().appendField("reset timer");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("sensors_blocks");
    this.setTooltip("Reset the stage timer back to zero");
  },
};

javascriptGenerator.forBlock["sensors_resetTimer"] = function () {
  return `window.RUNTIME.resetTimer();\n`;
};

Blockly.Blocks["sensors_getTimer"] = {
  init: function () {
    this.appendDummyInput().appendField("timer");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the number of seconds since the timer was reset");
  },
};

javascriptGenerator.forBlock["sensors_getTimer"] = function () {
  return ["window.RUNTIME.getTimer()", Order.ATOMIC];
};

Blockly.Blocks["sensors_distanceToMouse"] = {
  init: function () {
    this.appendDummyInput().appendField("distance to mouse pointer");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the distance between this sprite and the mouse pointer");
  },
};

javascriptGenerator.forBlock["sensors_distanceToMouse"] = function () {
  return [
    "Math.hypot(context.sprite.x - window.RUNTIME.getMouseX(), context.sprite.y - window.RUNTIME.getMouseY())",
    Order.ATOMIC,
  ];
};

Blockly.Blocks["sensors_distanceToSprite"] = {
  init: function () {
    this.appendValueInput("NAME")
      .setCheck("String")
      .appendField("distance to sprite");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the distance between this sprite and another sprite by name");
  },
};

javascriptGenerator.forBlock["sensors_distanceToSprite"] = function (
  block: Blockly.Block,
) {
  const name =
    javascriptGenerator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
  return [
    `window.RUNTIME.distanceToSprite(context.sprite, ${name})`,
    Order.ATOMIC,
  ];
};

Blockly.Blocks["sensors_touchingMouse"] = {
  init: function () {
    this.appendDummyInput().appendField("touching mouse pointer?");
    this.setOutput(true, "Boolean");
    this.setStyle("sensors_blocks");
    this.setTooltip("True if the mouse pointer is over this sprite");
  },
};

javascriptGenerator.forBlock["sensors_touchingMouse"] = function () {
  return [
    "window.RUNTIME.isTouchingPoint(context.sprite, window.RUNTIME.getMouseX(), window.RUNTIME.getMouseY())",
    Order.ATOMIC,
  ];
};

Blockly.Blocks["sensors_touchingSprite"] = {
  init: function () {
    this.appendValueInput("NAME")
      .setCheck("String")
      .appendField("touching sprite");
    this.setOutput(true, "Boolean");
    this.setStyle("sensors_blocks");
    this.setTooltip("True if this sprite is overlapping another sprite by name");
  },
};

javascriptGenerator.forBlock["sensors_touchingSprite"] = function (
  block: Blockly.Block,
) {
  const name =
    javascriptGenerator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
  return [
    `window.RUNTIME.isTouchingSprite(context.sprite, ${name})`,
    Order.ATOMIC,
  ];
};

Blockly.Blocks["sensors_touchingEdge"] = {
  init: function () {
    this.appendDummyInput().appendField("touching edge of stage?");
    this.setOutput(true, "Boolean");
    this.setStyle("sensors_blocks");
    this.setTooltip("True if this sprite is touching the edge of the stage");
  },
};

javascriptGenerator.forBlock["sensors_touchingEdge"] = function () {
  return ["window.RUNTIME.isTouchingEdge(context.sprite)", Order.ATOMIC];
};

Blockly.Blocks["sensors_stageWidth"] = {
  init: function () {
    this.appendDummyInput().appendField("stage width");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the width of the stage");
  },
};

javascriptGenerator.forBlock["sensors_stageWidth"] = function () {
  return ["window.RUNTIME.getStageSize().width", Order.ATOMIC];
};

Blockly.Blocks["sensors_stageHeight"] = {
  init: function () {
    this.appendDummyInput().appendField("stage height");
    this.setOutput(true, "Number");
    this.setStyle("sensors_blocks");
    this.setTooltip("Get the height of the stage");
  },
};

javascriptGenerator.forBlock["sensors_stageHeight"] = function () {
  return ["window.RUNTIME.getStageSize().height", Order.ATOMIC];
};

export {};
