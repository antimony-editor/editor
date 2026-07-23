import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import {
  createPolymorphicDualMixin,
  type DualBlock,
} from "../patches/dual-blocks";

Blockly.Blocks["functions_argument"] = {
  init: function () {
    this.appendDummyInput().appendField("argument");
    this.setOutput(true, null);
    this.setStyle("procedure_blocks");
    this.setTooltip("The argument passed into this lambda.");
    this.duplicateOnDrag = true;
  },
};

javascriptGenerator.forBlock["functions_argument"] = function () {
  return ["argument", Order.ATOMIC];
};

Blockly.Blocks["functions_lambda"] = {
  init: function () {
    this.appendValueInput("ARG").setCheck(null).appendField("new lambda");
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
  // A dual block: reports the call's result when plugged into a value slot, runs
  // it as a statement when stacked. The mixin morphs its connections to whatever
  // context it lands in, so it never carries an unused reporter cap in a stack.
  ...createPolymorphicDualMixin("default"),
  init: function (this: DualBlock) {
    this.appendValueInput("FUNC").setCheck(null).appendField("execute");
    this.appendValueInput("ARG").setCheck(null).appendField("with");
    this.setInputsInline(true);
    this.setStyle("procedure_blocks");
    this.setTooltip("Execute a function value with the given argument");
    this.mode_ = "inert";
    this.updateShape_();
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
  // In input mode the block has an output plug; otherwise it runs as a statement.
  return block.outputConnection
    ? [code, Order.ATOMIC]
    : `${code};\n`;
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
