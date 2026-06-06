import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["effects_shake"] = {
  init: function () {
    this.appendValueInput("INTENSITY")
      .setCheck("Number")
      .appendField("shake with intensity");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Shake the sprite with specified intensity");
  },
};

javascriptGenerator.forBlock["effects_shake"] = function (block: Blockly.Block) {
  const intensity = javascriptGenerator.valueToCode(block, "INTENSITY", Order.ATOMIC) || "5";
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
    this.appendValueInput("TIMES")
      .setCheck("Number")
      .appendField("spin");
    this.appendDummyInput().appendField("times");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Spin the sprite the specified number of times");
  },
};

javascriptGenerator.forBlock["effects_spin"] = function (block: Blockly.Block) {
  const times = javascriptGenerator.valueToCode(block, "TIMES", Order.ATOMIC) || "1";
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

Blockly.Blocks["effects_fadeIn"] = {
  init: function () {
    this.appendValueInput("DURATION")
      .setCheck("Number")
      .appendField("fade in over");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Make the sprite gradually appear");
  },
};

javascriptGenerator.forBlock["effects_fadeIn"] = function (block: Blockly.Block) {
  const duration = javascriptGenerator.valueToCode(block, "DURATION", Order.ATOMIC) || "1";
  return `await (async () => {
  const startOpacity = context.sprite.opacity;
  context.sprite.opacity = 0;
  const steps = 20;
  const stepDuration = (${duration} * 1000) / steps;
  for (let i = 0; i < steps; i++) {
    if (window.RUNTIME.isStopped()) return;
    context.sprite.opacity = (i / steps) * startOpacity;
    await window.RUNTIME.delay(stepDuration);
  }
  context.sprite.opacity = startOpacity;
})();\n`;
};

Blockly.Blocks["effects_fadeOut"] = {
  init: function () {
    this.appendValueInput("DURATION")
      .setCheck("Number")
      .appendField("fade out over");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Make the sprite gradually disappear");
  },
};

javascriptGenerator.forBlock["effects_fadeOut"] = function (block: Blockly.Block) {
  const duration = javascriptGenerator.valueToCode(block, "DURATION", Order.ATOMIC) || "1";
  return `await (async () => {
  const startOpacity = context.sprite.opacity;
  const steps = 20;
  const stepDuration = (${duration} * 1000) / steps;
  for (let i = 0; i < steps; i++) {
    if (window.RUNTIME.isStopped()) return;
    context.sprite.opacity = startOpacity * (1 - i / steps);
    await window.RUNTIME.delay(stepDuration);
  }
  context.sprite.opacity = 0;
})();\n`;
};

Blockly.Blocks["effects_scaleAnimation"] = {
  init: function () {
    this.appendValueInput("SCALE")
      .setCheck("Number")
      .appendField("scale to");
    this.appendValueInput("DURATION")
      .setCheck("Number")
      .appendField("over");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Smoothly change the sprite size");
  },
};

javascriptGenerator.forBlock["effects_scaleAnimation"] = function (block: Blockly.Block) {
  const scale = javascriptGenerator.valueToCode(block, "SCALE", Order.ATOMIC) || "1.5";
  const duration = javascriptGenerator.valueToCode(block, "DURATION", Order.ATOMIC) || "1";
  return `await (async () => {
  const startWidth = context.sprite.width;
  const startHeight = context.sprite.height;
  const targetScale = ${scale};
  const steps = 20;
  const stepDuration = (${duration} * 1000) / steps;
  for (let i = 0; i < steps; i++) {
    if (window.RUNTIME.isStopped()) return;
    const progress = i / steps;
    context.sprite.width = startWidth * (1 + (targetScale - 1) * progress);
    context.sprite.height = startHeight * (1 + (targetScale - 1) * progress);
    await window.RUNTIME.delay(stepDuration);
  }
  context.sprite.width = startWidth * targetScale;
  context.sprite.height = startHeight * targetScale;
})();\n`;
};

Blockly.Blocks["effects_rotateTo"] = {
  init: function () {
    this.appendValueInput("ANGLE")
      .setCheck("Number")
      .appendField("rotate to");
    this.appendValueInput("DURATION")
      .setCheck("Number")
      .appendField("degrees over");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("effects_blocks");
    this.setTooltip("Smoothly rotate the sprite to a specific angle");
  },
};

javascriptGenerator.forBlock["effects_rotateTo"] = function (block: Blockly.Block) {
  const angle = javascriptGenerator.valueToCode(block, "ANGLE", Order.ATOMIC) || "90";
  const duration = javascriptGenerator.valueToCode(block, "DURATION", Order.ATOMIC) || "1";
  return `await (async () => {
  const startRotation = context.sprite.rotation;
  const targetRotation = ${angle};
  const steps = 20;
  const stepDuration = (${duration} * 1000) / steps;
  for (let i = 0; i < steps; i++) {
    if (window.RUNTIME.isStopped()) return;
    const progress = i / steps;
    context.sprite.rotation = startRotation + (targetRotation - startRotation) * progress;
    await window.RUNTIME.delay(stepDuration);
  }
  context.sprite.rotation = targetRotation;
})();\n`;
};

export { };
