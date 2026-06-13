import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["functions_argument"] = {
  init: function () {
    this.appendDummyInput().appendField("argument");
    this.setOutput(true, "VariableName");
    this.setStyle("procedure_blocks");
    this.setTooltip("The argument passed into this lambda.");
  },
};

javascriptGenerator.forBlock["functions_argument"] = function () {
  return ["argument", Order.ATOMIC];
};

Blockly.Blocks["functions_lambda"] = {
  init: function () {
    this.appendValueInput("ARG")
      .setCheck("VariableName")
      .appendField("new lambda");
    this.appendStatementInput("BODY");
    this.setOutput(true, null);
    this.setStyle("procedure_blocks");
    this.setTooltip("Create a lambda (function)");
  },
};

javascriptGenerator.forBlock["functions_lambda"] = function (
  block: Blockly.Block,
) {
  const arg =
    javascriptGenerator.valueToCode(block, "ARG", Order.NONE) || "argument";
  const body = javascriptGenerator.statementToCode(block, "BODY");
  return [`((${arg}) => {\n${body}})`, Order.ATOMIC];
};

Blockly.Blocks["functions_execute"] = {
  init: function () {
    this.appendValueInput("FUNC").setCheck(null).appendField("execute");
    this.appendValueInput("ARG").setCheck(null).appendField("with");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setOutput(true, null);
    this.setStyle("procedure_blocks");
    this.setTooltip("Execute a function value with the given argument");
  },
};

javascriptGenerator.forBlock["functions_execute"] = function (
  block: Blockly.Block,
) {
  const fn =
    javascriptGenerator.valueToCode(block, "FUNC", Order.ATOMIC) ||
    "(() => {})";
  const arg =
    javascriptGenerator.valueToCode(block, "ARG", Order.NONE) || "undefined";
  const code = `(${fn})(${arg})`;
  return block.outputConnection?.getSourceBlock() ? [code, Order.ATOMIC] : code;
};

Blockly.Blocks["functions_return"] = {
  init: function () {
    this.appendValueInput("VALUE").appendField("return");
    this.setPreviousStatement(true, null);
    this.setStyle("procedure_blocks");
    this.setTooltip("Return a value from a function");
  },
};

javascriptGenerator.forBlock["functions_return"] = function (
  block: Blockly.Block,
) {
  const val =
    javascriptGenerator.valueToCode(block, "VALUE", Order.NONE) || "undefined";
  return `return (${val});\n`;
};

export {};
