import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["on_start"] = {
  hat: "cap",
  init: function () {
    this.appendDummyInput("NAME").appendField("on start of the video");
    this.appendStatementInput("DO").setCheck(null);
    this.setStyle("timing_blocks");
    this.setTooltip("Runs whatevers underneath when the video is started");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["on_start"] = function (block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, "DO");
  return `(window.RUNTIME || {}).onStart(async function(context) {\n${statements}});\n`;
};

Blockly.Blocks["wait_seconds"] = {
  init: function () {
    this.appendValueInput("SECONDS").setCheck("Number").appendField("wait");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("timing_blocks");
    this.setTooltip("Pause the script for the given number of seconds");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["wait_seconds"] = function (block: Blockly.Block) {
  const seconds =
    javascriptGenerator.valueToCode(block, "SECONDS", Order.ATOMIC) || "1";
  return `await window.RUNTIME.delay((${seconds}) * 1000);\n`;
};

Blockly.Blocks["timing_getCurrentTime"] = {
  init: function () {
    this.appendDummyInput().appendField("current video time");
    this.setOutput(true, "Number");
    this.setStyle("timing_blocks");
    this.setTooltip(
      "Get the current elapsed time in seconds since the video started",
    );
  },
};

javascriptGenerator.forBlock["timing_getCurrentTime"] = function () {
  return ["window.RUNTIME.getCurrentTime()", Order.ATOMIC];
};

export {};
