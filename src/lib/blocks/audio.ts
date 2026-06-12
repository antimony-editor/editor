import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

const getSoundOptions: Blockly.MenuGenerator = function (this: any) {
  const block = this instanceof Blockly.Block ? this : this.getSourceBlock();
  if (!block) return [["", ""]];

  const workspace = block.workspace;
  const spriteId = (workspace as any).spriteId;

  let options: [string, string][] = [];

  if (spriteId && (workspace as any).sprites) {
    const sprite = (workspace as any).sprites.find(
      (s: any) => s.id === spriteId,
    );
    if (sprite && sprite.data.sounds && sprite.data.sounds.length > 0) {
      options = sprite.data.sounds.map((s: any) => [s.name, s.id]);
    }
  }

  const hasSounds = options.length > 0;

  if (!hasSounds) {
    options.push(["", ""]);
  }

  const currentValue = block.getFieldValue("SOUND");
  if (currentValue !== undefined && currentValue !== null) {
    const found = options.find((opt) => opt[1] === currentValue);
    if (!found) {
      const label =
        currentValue === ""
          ? hasSounds
            ? "Select sound..."
            : "no sounds"
          : `missing sound (${currentValue})`;
      options.push([label, currentValue]);
    }
  }

  return options;
};

function soundStatement(soundId: string, body: string) {
  return `{ const _sound = context.sprite.sounds?.find(s => s.id === "${soundId}"); ${body} }\n`;
}

Blockly.Blocks["audio_play"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("play sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Play the selected sound");
  },
};

javascriptGenerator.forBlock["audio_play"] = function (block: Blockly.Block) {
  const soundId = block.getFieldValue("SOUND") || "";
  return soundStatement(
    soundId,
    `if (_sound?.src) window.RUNTIME.playSound(_sound.src, false, "${soundId}", _sound.volume ?? 1);`,
  );
};

Blockly.Blocks["audio_playUntilDone"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("play sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND")
      .appendField("until done");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Play the selected sound and wait for it to finish");
  },
};

javascriptGenerator.forBlock["audio_playUntilDone"] = function (
  block: Blockly.Block,
) {
  const soundId = block.getFieldValue("SOUND") || "";
  return soundStatement(
    soundId,
    `if (_sound?.src) await window.RUNTIME.playSound(_sound.src, false, "${soundId}", _sound.volume ?? 1);`,
  );
};

Blockly.Blocks["audio_loop"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("loop sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Play the selected sound on a loop until it is stopped");
  },
};

javascriptGenerator.forBlock["audio_loop"] = function (block: Blockly.Block) {
  const soundId = block.getFieldValue("SOUND") || "";
  return soundStatement(
    soundId,
    `if (_sound?.src) window.RUNTIME.playSound(_sound.src, true, "${soundId}", _sound.volume ?? 1);`,
  );
};

Blockly.Blocks["audio_stop"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("stop sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Stop the selected sound");
  },
};

javascriptGenerator.forBlock["audio_stop"] = function (block: Blockly.Block) {
  const soundId = block.getFieldValue("SOUND") || "";
  return `window.RUNTIME.stopSound("${soundId}");\n`;
};

Blockly.Blocks["audio_stopAll"] = {
  init: function () {
    this.appendDummyInput().appendField("stop all sounds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Stop all currently playing sounds");
  },
};

javascriptGenerator.forBlock["audio_stopAll"] = function () {
  return `window.RUNTIME.stopAllSounds();\n`;
};

Blockly.Blocks["audio_setVolume"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND")
      .appendField("volume to");
    this.appendValueInput("VOLUME").setCheck("Number");
    this.appendDummyInput().appendField("%");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Set the volume of the selected sound (0-100%)");
  },
};

javascriptGenerator.forBlock["audio_setVolume"] = function (
  block: Blockly.Block,
) {
  const soundId = block.getFieldValue("SOUND") || "";
  const volume =
    javascriptGenerator.valueToCode(block, "VOLUME", Order.ATOMIC) || "100";
  return `window.RUNTIME.setSoundVolume("${soundId}", (${volume}) / 100);\n`;
};

Blockly.Blocks["audio_changeVolume"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("change sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND")
      .appendField("volume by");
    this.appendValueInput("VOLUME").setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip(
      "Change the volume of the selected sound by an amount (in %)",
    );
  },
};

javascriptGenerator.forBlock["audio_changeVolume"] = function (
  block: Blockly.Block,
) {
  const soundId = block.getFieldValue("SOUND") || "";
  const delta =
    javascriptGenerator.valueToCode(block, "VOLUME", Order.ATOMIC) || "10";
  return `window.RUNTIME.changeSoundVolume("${soundId}", (${delta}) / 100);\n`;
};

Blockly.Blocks["audio_getVolume"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("volume of sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND");
    this.setOutput(true, "Number");
    this.setStyle("audio_blocks");
    this.setTooltip("Returns the volume of the selected sound (0-100%)");
  },
};

javascriptGenerator.forBlock["audio_getVolume"] = function (
  block: Blockly.Block,
) {
  const soundId = block.getFieldValue("SOUND") || "";
  return [`(window.RUNTIME.getSoundVolume("${soundId}") * 100)`, Order.ATOMIC];
};

Blockly.Blocks["audio_fade"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("fade sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND")
      .appendField("to");
    this.appendValueInput("VOLUME").setCheck("Number");
    this.appendDummyInput().appendField("% over");
    this.appendValueInput("SECONDS").setCheck("Number");
    this.appendDummyInput().appendField("seconds");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Smoothly fade the selected sound to a target volume");
  },
};

javascriptGenerator.forBlock["audio_fade"] = function (block: Blockly.Block) {
  const soundId = block.getFieldValue("SOUND") || "";
  const volume =
    javascriptGenerator.valueToCode(block, "VOLUME", Order.ATOMIC) || "0";
  const seconds =
    javascriptGenerator.valueToCode(block, "SECONDS", Order.ATOMIC) || "1";
  return `window.RUNTIME.fadeSound("${soundId}", (${volume}) / 100, ${seconds});\n`;
};

Blockly.Blocks["audio_setPitch"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND")
      .appendField("pitch to");
    this.appendValueInput("PITCH").setCheck("Number");
    this.appendDummyInput().appendField("%");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip(
      "Set the playback pitch/speed of the selected sound (100% = normal)",
    );
  },
};

javascriptGenerator.forBlock["audio_setPitch"] = function (
  block: Blockly.Block,
) {
  const soundId = block.getFieldValue("SOUND") || "";
  const pitch =
    javascriptGenerator.valueToCode(block, "PITCH", Order.ATOMIC) || "100";
  return `window.RUNTIME.setSoundPitch("${soundId}", (${pitch}) / 100);\n`;
};

Blockly.Blocks["audio_setProjectVolume"] = {
  init: function () {
    this.appendValueInput("VOLUME")
      .setCheck("Number")
      .appendField("set project volume to");
    this.appendDummyInput().appendField("%");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Set the overall volume for all sounds (0-100%)");
  },
};

javascriptGenerator.forBlock["audio_setProjectVolume"] = function (
  block: Blockly.Block,
) {
  const volume =
    javascriptGenerator.valueToCode(block, "VOLUME", Order.ATOMIC) || "100";
  return `window.RUNTIME.setMasterVolume((${volume}) / 100);\n`;
};

Blockly.Blocks["audio_changeProjectVolume"] = {
  init: function () {
    this.appendValueInput("VOLUME")
      .setCheck("Number")
      .appendField("change project volume by");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("audio_blocks");
    this.setTooltip("Change the overall volume by an amount (in %)");
  },
};

javascriptGenerator.forBlock["audio_changeProjectVolume"] = function (
  block: Blockly.Block,
) {
  const delta =
    javascriptGenerator.valueToCode(block, "VOLUME", Order.ATOMIC) || "10";
  return `window.RUNTIME.changeMasterVolume((${delta}) / 100);\n`;
};

Blockly.Blocks["audio_getProjectVolume"] = {
  init: function () {
    this.appendDummyInput().appendField("project volume %");
    this.setOutput(true, "Number");
    this.setStyle("audio_blocks");
    this.setTooltip("Returns the overall volume (0-100%)");
  },
};

javascriptGenerator.forBlock["audio_getProjectVolume"] = function () {
  return [`(window.RUNTIME.getMasterVolume() * 100)`, Order.ATOMIC];
};

Blockly.Blocks["audio_isPlaying"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("is sound")
      .appendField(new Blockly.FieldDropdown(getSoundOptions), "SOUND")
      .appendField("playing");
    this.setOutput(true, "Boolean");
    this.setStyle("audio_blocks");
    this.setTooltip("Returns whether a sound is currently playing");
  },
};

javascriptGenerator.forBlock["audio_isPlaying"] = function (
  block: Blockly.Block,
) {
  const soundId = block.getFieldValue("SOUND") || "";
  return [`window.RUNTIME.isSoundPlaying("${soundId}")`, Order.FUNCTION_CALL];
};
