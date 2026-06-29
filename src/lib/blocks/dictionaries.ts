import * as Blockly from "blockly/core";
import { JavascriptGenerator, javascriptGenerator, Order } from "blockly/javascript";
import { defineExpandableBlock, type ExpandableBlock } from "./expandable";

const dictDefaultKeys = ["key1", "key2", "key3", "key4", "key5", "key6"];
const dictDefaultValues = ["value1", "value2", "value3", "value4", "value5", "value6"];

defineExpandableBlock({
  type: "dicts_create_with",
  style: "dict_blocks",
  output: "Object",
  outputShape: 3,
  initialItemCount: 2,
  minItemCount: 0,
  maxItemCount: Infinity,
  emptyLabel: "empty dictionary",
  firstInputLabel: "create dictionary with",
  inputsInline: true,
  tooltip: "Create a dictionary with any number of key-value pairs.",
  slots: [
    {
      prefix: "KEY",
      check: "String",
      shadow: index => ({
        type: "text",
        fields: { TEXT: dictDefaultKeys[index] ?? "key" }
      })
    },
    {
      prefix: "VALUE",
      shadow: index => ({
        type: "text",
        fields: { TEXT: dictDefaultValues[index] ?? "value" }
      }),
      appendLabels: [":"]
    }
  ]
});

javascriptGenerator.forBlock["dicts_create_with"] = function (block: Blockly.Block) {
  const expandableBlock = block as ExpandableBlock;
  const pairs: string[] = [];

  for (let i = 0; i < expandableBlock.itemCount_; i++) {
    const keyCode = javascriptGenerator.valueToCode(block, `KEY${i}`, Order.NONE) || "''";
    const valueCode =
      javascriptGenerator.valueToCode(block, `VALUE${i}`, Order.NONE) || "''";
    pairs.push(`${keyCode}:${valueCode}`);
  }

  return [`{${pairs.join(",")}}`, Order.ATOMIC];
};

Blockly.Blocks["dicts_get_value"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("in dictionary");
    this.appendValueInput("KEY").setCheck("String").appendField("get value of key");
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setStyle("dict_blocks");
    this.setTooltip("Get a value from a dictionary by key");
  }
};

javascriptGenerator.forBlock["dicts_get_value"] = function (block: Blockly.Block) {
  const dictCode =
    javascriptGenerator.valueToCode(block, "DICT", Order.MEMBER) || "Object.create(null)";
  const keyCode = javascriptGenerator.valueToCode(block, "KEY", Order.NONE) || "''";
  return [`${dictCode}[${keyCode}]`, Order.MEMBER];
};

Blockly.Blocks["dicts_delete_key"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("in dictionary");
    this.appendValueInput("KEY").setCheck("String").appendField("delete key");
    this.setInputsInline(true);
    this.setOutput(true, "Object");
    this.setStyle("dict_blocks");
    this.setTooltip("Delete a key in a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_delete_key"] = function (block, generator) {
  const funcName = generator.provideFunction_("deleteKeyFromDictionary", [
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(dict, key) {
      const temp = Object.assign({}, dict);
      delete temp[key];
      return temp;
    }`
  ]);

  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  const keyCode = generator.valueToCode(block, "KEY", Order.NONE) || "''";

  const code = `${funcName}(${dictCode}, ${keyCode})`;
  return [code, Order.FUNCTION_CALL];
};

Blockly.Blocks["dicts_set_value"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("in dictionary");
    this.appendValueInput("KEY").setCheck("String").appendField("set key");
    this.appendValueInput("VALUE").appendField("to");
    this.setInputsInline(true);
    this.setOutput(true, "Object");
    this.setStyle("dict_blocks");
    this.setTooltip("Set a value for a key in a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_set_value"] = function (block, generator) {
  const funcName = generator.provideFunction_("setKeyInDictionary", [
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(dict, key, value) {
      return Object.assign({}, dict, {[key]: value});
    }`
  ]);
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  const keyCode = generator.valueToCode(block, "KEY", Order.NONE) || "''";
  const valueCode = generator.valueToCode(block, "VALUE", Order.NONE) || "''";
  return [`${funcName}(${dictCode}, ${keyCode}, ${valueCode})`, Order.FUNCTION_CALL];
};

Blockly.Blocks["dicts_has_key"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("in dictionary");
    this.appendValueInput("KEY").setCheck("String").appendField("has key");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setStyle("dict_blocks");
    this.setTooltip("Check if a key exists in a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_has_key"] = function (block, generator) {
  const funcName = generator.provideFunction_("hasKeyInDictionary", [
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(dict, key) {
      return key in dict;
    }`
  ]);
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  const keyCode = generator.valueToCode(block, "KEY", Order.NONE) || "''";
  return [`${funcName}(${dictCode}, ${keyCode})`, Order.FUNCTION_CALL];
};

Blockly.Blocks["dicts_length"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("length of dictionary");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setStyle("dict_blocks");
    this.setTooltip("Get the number of entries in a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_length"] = function (block, generator) {
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  return [`Object.keys(${dictCode}).length`, Order.MEMBER];
};

Blockly.Blocks["dicts_isEmpty"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("dictionary is empty");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setStyle("dict_blocks");
    this.setTooltip("Check if a dictionary has no entries");
  }
};

javascriptGenerator.forBlock["dicts_isEmpty"] = function (block, generator) {
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  return [`Object.keys(${dictCode}).length === 0`, Order.NONE];
};

Blockly.Blocks["dicts_get_keys"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("keys of dictionary");
    this.setInputsInline(true);
    this.setOutput(true, "Array");
    this.setStyle("dict_blocks");
    this.setTooltip("Get all keys of a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_get_keys"] = function (block, generator) {
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  return [`Object.keys(${dictCode})`, Order.FUNCTION_CALL];
};

Blockly.Blocks["dicts_get_values"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("values of dictionary");
    this.setInputsInline(true);
    this.setOutput(true, "Array");
    this.setStyle("dict_blocks");
    this.setTooltip("Get all values of a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_get_values"] = function (block, generator) {
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  return [`Object.values(${dictCode})`, Order.FUNCTION_CALL];
};

Blockly.Blocks["dicts_clear"] = {
  init: function () {
    this.appendValueInput("DICT").setCheck("Object").appendField("clear dictionary");
    this.setInputsInline(true);
    this.setOutput(true, "Object");
    this.setStyle("dict_blocks");
    this.setTooltip("Remove all entries from a dictionary");
  }
};

javascriptGenerator.forBlock["dicts_clear"] = function (block, generator) {
  const dictCode =
    generator.valueToCode(block, "DICT", Order.NONE) || "Object.create(null)";
  return [`Object.assign({}, ${dictCode}, {})`, Order.FUNCTION_CALL];
};

Blockly.Blocks["dicts_merge"] = {
  init: function () {
    this.appendValueInput("DICT1").setCheck("Object").appendField("merge dictionary");
    this.appendValueInput("DICT2").setCheck("Object").appendField("with");
    this.setInputsInline(true);
    this.setOutput(true, "Object");
    this.setStyle("dict_blocks");
    this.setTooltip("Merge two dictionaries into a new one");
  }
};

javascriptGenerator.forBlock["dicts_merge"] = function (block, generator) {
  const dict1 =
    generator.valueToCode(block, "DICT1", Order.NONE) || "Object.create(null)";
  const dict2 =
    generator.valueToCode(block, "DICT2", Order.NONE) || "Object.create(null)";
  return [`Object.assign({}, ${dict1}, ${dict2})`, Order.FUNCTION_CALL];
};

export {};
