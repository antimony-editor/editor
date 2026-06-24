import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { TWEEN_MODE_OPTIONS, TWEENABLE_PROPERTY_OPTIONS } from "../tween";

Blockly.Blocks["effects_shake"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendValueInput("INTENSITY")
      .setCheck("Number")
      .appendField("shake with intensity");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Shake the sprite with specified intensity");
  },
};

javascriptGenerator.forBlock["effects_shake"] = function (
  block: Blockly.Block,
) {
  const intensity =
    javascriptGenerator.valueToCode(block, "INTENSITY", Order.ATOMIC) || "5";
  return `await (async () => {
  const originalX = context.sprite.x;
  const originalY = context.sprite.y;
  for (let i = 0; i < 10; i++) {
    if (window.RUNTIME.isStopped()) return;
    context.sprite.x = originalX + (Math.random() - 0.5) * ${intensity} * 2;
    context.sprite.y = originalY + (Math.random() - 0.5) * ${intensity} * 2;
    await window.RUNTIME.delay(20);
  }
  context.sprite.x = originalX;
  context.sprite.y = originalY;
})();\n`;
};

Blockly.Blocks["effects_spin"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendValueInput("TIMES").setCheck("Number").appendField("spin");
    this.appendDummyInput().appendField("times");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Spin the sprite the specified number of times");
  },
};

javascriptGenerator.forBlock["effects_spin"] = function (block: Blockly.Block) {
  const times =
    javascriptGenerator.valueToCode(block, "TIMES", Order.ATOMIC) || "1";
  return `await (async () => {
  const startRotation = context.sprite.rotation;
  const totalRotation = ${times} * 360;
  const steps = 36;
  const stepSize = totalRotation / steps;
  for (let i = 0; i < steps; i++) {
    if (window.RUNTIME.isStopped()) return;
    context.sprite.rotation = startRotation + (i * stepSize);
    await window.RUNTIME.delay(10);
  }
  context.sprite.rotation = startRotation;
})();\n`;
};

Blockly.Blocks["effects_pulse"] = {
  init: function () {
    this.setMediaTypes("sprite", "video");
    this.appendDummyInput().appendField("pulse");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Make the sprite pulse (grow and shrink)");
  },
};

javascriptGenerator.forBlock["effects_pulse"] = function () {
  return `await (async () => {
  const originalWidth = context.sprite.width;
  const originalHeight = context.sprite.height;
  for (let i = 0; i < 20; i++) {
    if (window.RUNTIME.isStopped()) return;
    const factor = 1 + 0.2 * Math.sin((i / 20) * Math.PI);
    context.sprite.width = originalWidth * factor;
    context.sprite.height = originalHeight * factor;
    await window.RUNTIME.delay(25);
  }
  context.sprite.width = originalWidth;
  context.sprite.height = originalHeight;
})();\n`;
};

Blockly.Blocks["effects_tween"] = {
  init: function () {
    this.setMediaTypes("sprite", "text", "video");
    this.appendDummyInput()
      .appendField("tween")
      .appendField(
        new Blockly.FieldDropdown(TWEENABLE_PROPERTY_OPTIONS),
        "PROPERTY",
      )
      .appendField("to");
    this.appendValueInput("VALUE").setCheck("Number");
    this.appendValueInput("DURATION").setCheck("Number").appendField("over");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip(
      "Smoothly change a sprite property over time using its tween mode",
    );
    this.setInputsInline(true);
  },
};

javascriptGenerator.forBlock["effects_tween"] = function (
  block: Blockly.Block,
) {
  const property = block.getFieldValue("PROPERTY");
  const value =
    javascriptGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "0";
  const duration =
    javascriptGenerator.valueToCode(block, "DURATION", Order.ATOMIC) || "1";
  return `await window.RUNTIME.tween(context, ${JSON.stringify(property)}, (${value}), (${duration}));\n`;
};

Blockly.Blocks["effects_setTweenMode"] = {
  init: function () {
    this.setMediaTypes("sprite", "text", "video");
    this.appendDummyInput()
      .appendField("set tween mode to")
      .appendField(new Blockly.FieldDropdown(TWEEN_MODE_OPTIONS), "MODE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Set the default tween mode for this sprite");
  },
};

javascriptGenerator.forBlock["effects_setTweenMode"] = function (
  block: Blockly.Block,
) {
  const mode = block.getFieldValue("MODE");
  return `context.sprite.tweenMode = ${JSON.stringify(mode)};\n`;
};

Blockly.Blocks["effects_setPropertyTweenMode"] = {
  init: function () {
    this.setMediaTypes("sprite", "text", "video");
    this.appendDummyInput()
      .appendField("set tween mode for")
      .appendField(
        new Blockly.FieldDropdown(TWEENABLE_PROPERTY_OPTIONS),
        "PROPERTY",
      )
      .appendField("to")
      .appendField(new Blockly.FieldDropdown(TWEEN_MODE_OPTIONS), "MODE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Override the tween mode for a specific property");
  },
};

javascriptGenerator.forBlock["effects_setPropertyTweenMode"] = function (
  block: Blockly.Block,
) {
  const property = block.getFieldValue("PROPERTY");
  const mode = block.getFieldValue("MODE");
  return `context.sprite.tweenModes = { ...context.sprite.tweenModes, ${JSON.stringify(property)}: ${JSON.stringify(mode)} };\n`;
};

Blockly.Blocks["effects_resetPropertyTweenMode"] = {
  init: function () {
    this.setMediaTypes("sprite", "text", "video");
    this.appendDummyInput()
      .appendField("reset tween mode for")
      .appendField(
        new Blockly.FieldDropdown(TWEENABLE_PROPERTY_OPTIONS),
        "PROPERTY",
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip(
      "Use the sprite default tween mode for this property again",
    );
  },
};

javascriptGenerator.forBlock["effects_resetPropertyTweenMode"] = function (
  block: Blockly.Block,
) {
  const property = block.getFieldValue("PROPERTY");
  return `(() => { const _next = { ...context.sprite.tweenModes }; delete _next[${JSON.stringify(property)}]; context.sprite.tweenModes = _next; })();\n`;
};

export {};

const EFFECT_OPTIONS: [string, string][] = [
  ["blur", "blur"],
  ["contrast", "contrast"],
  ["saturation", "saturation"],
  ["color shift", "color_shift"],
  ["brightness", "brightness"],
  ["invert", "invert"],
  ["sepia", "sepia"],
  ["transparency", "transparency"],
];

Blockly.Blocks["effects_set_canvas"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set canvas")
      .appendField(new Blockly.FieldDropdown(EFFECT_OPTIONS), "EFFECT")
      .appendField("to");
    this.appendValueInput("VALUE").setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Set a global canvas effect value");
  },
};

javascriptGenerator.forBlock["effects_set_canvas"] = function (
  block: Blockly.Block,
) {
  const effect = block.getFieldValue("EFFECT");
  const val =
    javascriptGenerator.valueToCode(block, "VALUE", Order.ATOMIC) || "0";
  return `window.RUNTIME.setCanvasEffect(${JSON.stringify(effect)}, (${val}));\n`;
};

Blockly.Blocks["effects_get_canvas"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("get canvas")
      .appendField(new Blockly.FieldDropdown(EFFECT_OPTIONS), "EFFECT");
    this.setOutput(true, "Number");
    this.setStyle("effects_blocks");
    this.setTooltip("Get a global canvas effect value");
  },
};

javascriptGenerator.forBlock["effects_get_canvas"] = function (
  block: Blockly.Block,
) {
  const effect = block.getFieldValue("EFFECT");
  return [
    `window.RUNTIME.getCanvasEffect(${JSON.stringify(effect)})`,
    Order.ATOMIC,
  ];
};

Blockly.Blocks["effects_clear_canvas"] = {
  init: function () {
    this.appendDummyInput().appendField("clear canvas effects");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Clear all global canvas effects");
  },
};

javascriptGenerator.forBlock["effects_clear_canvas"] = function () {
  return `window.RUNTIME.clearCanvasEffects();\n`;
};

Blockly.Blocks["effects_change_canvas"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("change canvas")
      .appendField(new Blockly.FieldDropdown(EFFECT_OPTIONS), "EFFECT")
      .appendField("by");
    this.appendValueInput("DELTA").setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Change a global canvas effect by a delta");
  },
};

javascriptGenerator.forBlock["effects_change_canvas"] = function (
  block: Blockly.Block,
) {
  const effect = block.getFieldValue("EFFECT");
  const delta =
    javascriptGenerator.valueToCode(block, "DELTA", Order.ATOMIC) || "0";
  return `window.RUNTIME.changeCanvasEffect(${JSON.stringify(effect)}, (${delta}));\n`;
};
