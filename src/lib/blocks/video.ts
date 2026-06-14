import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["video_play"] = {
  init: function () {
    this.appendDummyInput().appendField("play video");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Start playing the video");
  },
};

javascriptGenerator.forBlock["video_play"] = function () {
  return `context.sprite.play();\n`;
};

Blockly.Blocks["video_pause"] = {
  init: function () {
    this.appendDummyInput().appendField("pause video");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Pause the video");
  },
};

javascriptGenerator.forBlock["video_pause"] = function () {
  return `context.sprite.pause();\n`;
};

Blockly.Blocks["video_setPlaybackRate"] = {
  init: function () {
    this.appendValueInput("RATE")
      .setCheck("Number")
      .appendField("set video speed to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Set the playback speed (1.0 = normal)");
  },
};

javascriptGenerator.forBlock["video_setPlaybackRate"] = function (block: Blockly.Block) {
  const rate = javascriptGenerator.valueToCode(block, "RATE", Order.ATOMIC) || "1";
  return `context.sprite.videoPlaybackRate = ${rate};\n`;
};

Blockly.Blocks["video_setVolume"] = {
  init: function () {
    this.appendValueInput("VOLUME")
      .setCheck("Number")
      .appendField("set video volume to");
    this.appendDummyInput().appendField("%");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Set the video volume (0-100)");
  },
};

javascriptGenerator.forBlock["video_setVolume"] = function (block: Blockly.Block) {
  const volume = javascriptGenerator.valueToCode(block, "VOLUME", Order.ATOMIC) || "100";
  return `context.sprite.videoVolume = ${volume} / 100;\n`;
};

Blockly.Blocks["video_setLoop"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set video loop")
      .appendField(new Blockly.FieldCheckbox("TRUE"), "LOOP");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Set whether the video should loop");
  },
};

javascriptGenerator.forBlock["video_setLoop"] = function (block: Blockly.Block) {
  const loop = block.getFieldValue("LOOP") === "TRUE";
  return `context.sprite.videoLoop = ${loop};\n`;
};

Blockly.Blocks["video_setCurrentTime"] = {
  init: function () {
    this.appendValueInput("TIME")
      .setCheck("Number")
      .appendField("set video time to");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Set the current playback position in seconds");
  },
};

javascriptGenerator.forBlock["video_setCurrentTime"] = function (block: Blockly.Block) {
  const time = javascriptGenerator.valueToCode(block, "TIME", Order.ATOMIC) || "0";
  return `context.sprite.videoCurrentTime = ${time};\n`;
};

Blockly.Blocks["video_getCurrentTime"] = {
  init: function () {
    this.appendDummyInput().appendField("video time");
    this.setOutput(true, "Number");
    this.setStyle("appearance_blocks");
    this.setTooltip("Get the current playback position in seconds");
  },
};

javascriptGenerator.forBlock["video_getCurrentTime"] = function () {
  return ["context.sprite.videoCurrentTime", Order.ATOMIC];
};

Blockly.Blocks["video_getDuration"] = {
  init: function () {
    this.appendDummyInput().appendField("video duration");
    this.setOutput(true, "Number");
    this.setStyle("appearance_blocks");
    this.setTooltip("Get the total duration of the video in seconds");
  },
};

javascriptGenerator.forBlock["video_getDuration"] = function () {
  return ["context.sprite.videoDuration", Order.ATOMIC];
};

Blockly.Blocks["video_setVideoIndex"] = {
  init: function () {
    this.appendValueInput("INDEX")
      .setCheck("Number")
      .appendField("switch video to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Switch to a video by number");
  },
};

javascriptGenerator.forBlock["video_setVideoIndex"] = function (block: Blockly.Block) {
  const index = javascriptGenerator.valueToCode(block, "INDEX", Order.ATOMIC) || "1";
  return `context.sprite.videoIndex = ${index};\n`;
};

Blockly.Blocks["video_setVideoName"] = {
  init: function () {
    this.appendValueInput("NAME")
      .setCheck("String")
      .appendField("switch video named");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Switch to a video by name");
  },
};

javascriptGenerator.forBlock["video_setVideoName"] = function (block: Blockly.Block) {
  const name = javascriptGenerator.valueToCode(block, "NAME", Order.ATOMIC) || "''";
  return `context.sprite.videoName = ${name};\n`;
};

Blockly.Blocks["video_nextVideo"] = {
  init: function () {
    this.appendDummyInput().appendField("next video");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("appearance_blocks");
    this.setTooltip("Switch to the next video");
  },
};

javascriptGenerator.forBlock["video_nextVideo"] = function () {
  return `context.sprite.videoIndex = context.sprite.videoCount > 0 ? (context.sprite.videoIndex % context.sprite.videoCount) + 1 : 0;\n`;
};

export {};
