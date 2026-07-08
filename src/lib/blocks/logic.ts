import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import Checkbox from "../patches/checkbox";

Blockly.Blocks["checkbox"] = {
  init: function () {
    this.appendDummyInput().appendField(new Checkbox("false"), "BOOL");
    this.setOutput(true, "Boolean");
    this.setStyle("logic_blocks");
  }
};

javascriptGenerator.forBlock["checkbox"] = function (block: Blockly.Block) {
  return [block.getFieldValue("BOOL") === "TRUE" ? "true" : "false", Order.ATOMIC];
};

javascriptGenerator.forBlock["controls_whileUntil"] = function (block: Blockly.Block) {
  const condition = javascriptGenerator.valueToCode(block, "BOOL", Order.NONE) || "false";

  const statements = javascriptGenerator.statementToCode(block, "DO");

  const mode = block.getFieldValue("MODE");
  const isUntil = mode === "UNTIL";

  const actualCondition = isUntil ? `!(${condition})` : condition;

  return `await (async () => {
  let _whileIterations = 0;
  while (${actualCondition}) {
    if (window.RUNTIME.isStopped()) break;
    ${statements}
    if (++_whileIterations % 100 === 0) await window.RUNTIME.delay(0);
  }
})();\n`;
};

Blockly.Blocks["logic_switch"] = {
  init: function () {
    this.appendValueInput("VALUE").appendField("switch");
    this.appendStatementInput("CASES").setCheck("switchCase");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("logic_blocks");
    this.setTooltip("Switch on a value with case/default blocks inside");
  }
};

javascriptGenerator.forBlock["logic_switch"] = function (block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, "VALUE", Order.NONE) || "null";
  const cases = javascriptGenerator.statementToCode(block, "CASES");
  const safeId = (block.id || "").toString().replace(/\W/g, "_");
  const label = `SWITCH_${safeId}`;
  return `${label}: {\n  const __switch_val = ${value};\n  let __fallthrough = false;\n  ${cases}\n}\n`;
};

Blockly.Blocks["logic_case"] = {
  init: function () {
    this.appendValueInput("VALUE").setCheck(null).appendField("case");
    this.appendStatementInput("DO");
    this.setPreviousStatement(true, "switchCase");
    this.setNextStatement(true, "switchCase");
    this.setStyle("logic_blocks");
    this.setTooltip(
      "Case for switch: runs its body if value matches (or when fallthrough)"
    );
  }
};

javascriptGenerator.forBlock["logic_case"] = function (block: Blockly.Block) {
  const val = javascriptGenerator.valueToCode(block, "VALUE", Order.NONE) || "null";
  const stm = javascriptGenerator.statementToCode(block, "DO");
  let parent = block.getSurroundParent && block.getSurroundParent();
  while (parent && parent.type !== "logic_switch")
    parent = parent.getSurroundParent && parent.getSurroundParent();
  if (!parent) {
    return `if (__switch_val === (${val})) {\n${stm}\n}\n`;
  }
  const safeId = (parent.id || "").toString().replace(/\W/g, "_");
  const label = `SWITCH_${safeId}`;
  return `if (__fallthrough || __switch_val === (${val})) {\n  __fallthrough = false;\n  ${stm}\n  break ${label};\n}\n`;
};

Blockly.Blocks["logic_default"] = {
  init: function () {
    this.appendDummyInput().appendField("default");
    this.appendStatementInput("DO");
    this.setPreviousStatement(true, "switchCase");
    this.setNextStatement(true, "switchCase");
    this.setStyle("logic_blocks");
    this.setTooltip("Default case for switch");
  }
};

javascriptGenerator.forBlock["logic_default"] = function (block: Blockly.Block) {
  const stm = javascriptGenerator.statementToCode(block, "DO");
  let parent = block.getSurroundParent && block.getSurroundParent();
  while (parent && parent.type !== "logic_switch")
    parent = parent.getSurroundParent && parent.getSurroundParent();
  if (!parent) {
    return `{\n${stm}\n}\n`;
  }
  const safeId = (parent.id || "").toString().replace(/\W/g, "_");
  const label = `SWITCH_${safeId}`;
  return `if (__fallthrough) {\n  __fallthrough = false;\n  ${stm}\n  break ${label};\n}\n`;
};

Blockly.Blocks["logic_exit_case"] = {
  init: function () {
    this.appendDummyInput().appendField("exit case");
    this.setPreviousStatement(true, "default");
    this.setNextStatement(true, "default");
    this.setStyle("logic_blocks");
    this.setTooltip("Exit the current case (break)");
  }
};

javascriptGenerator.forBlock["logic_exit_case"] = function (block: Blockly.Block) {
  let parent = block.getSurroundParent && block.getSurroundParent();
  while (parent && parent.type !== "logic_switch")
    parent = parent.getSurroundParent && parent.getSurroundParent();
  if (!parent) return "break;\n";
  const safeId = (parent.id || "").toString().replace(/\W/g, "_");
  const label = `SWITCH_${safeId}`;
  return `break ${label};\n`;
};

Blockly.Blocks["logic_runNextCaseWhen"] = {
  init: function () {
    this.appendDummyInput().appendField("run next case when");
    this.appendValueInput("VALUE").setCheck(null);
    this.setPreviousStatement(true, "switchCase");
    this.setNextStatement(true, "switchCase");
    this.setStyle("logic_blocks");
    this.setTooltip(
      "If the switch value matches, cause the next case to run (fallthrough)"
    );
    this.setInputsInline(true);
  }
};

javascriptGenerator.forBlock["logic_runNextCaseWhen"] = function (block: Blockly.Block) {
  const val = javascriptGenerator.valueToCode(block, "VALUE", Order.NONE) || "null";
  return `if (__switch_val === (${val})) { __fallthrough = true; }\n`;
};

Blockly.Blocks["logic_ternary"] = {
  init: function () {
    this.appendValueInput("IF").setCheck("Boolean").appendField("if");
    this.appendValueInput("THEN").setCheck(null).appendField("then");
    this.appendValueInput("ELSE").setCheck(null).appendField("else");
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setStyle("logic_blocks");
  }
};

javascriptGenerator.forBlock["logic_ternary"] = function (block, generator) {
  const IF = generator.valueToCode(block, "IF", Order.NONE);
  const THEN = generator.valueToCode(block, "THEN", Order.NONE);
  const ELSE = generator.valueToCode(block, "ELSE", Order.NONE);
  return [`${IF} ? ${THEN} : ${ELSE}`, Order.ATOMIC];
};
