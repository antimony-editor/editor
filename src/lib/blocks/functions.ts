import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["functions_lambda"] = {
    init: function () {
        this.appendDummyInput()
            .appendField("new lambda")

        this.appendStatementInput("BODY");
        this.setOutput(true, null);
        this.setStyle("procedure_blocks");
        this.setTooltip("Create a lambda (function)");
    },
};

javascriptGenerator.forBlock["functions_lambda"] = function (block: Blockly.Block) {
    const body = javascriptGenerator.statementToCode(block, "BODY");
    return [`(function() {\n${body}\n})`, Order.ATOMIC];
};

Blockly.Blocks["functions_execute"] = {
    init: function () {
        this.appendValueInput("FUNC").setCheck(null).appendField("execute");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setOutput(true, null);
        this.setStyle("procedure_blocks");
        this.setTooltip("Execute a function value with the given argument");
    },
};

javascriptGenerator.forBlock["functions_execute"] = function (block: Blockly.Block) {
    const fn = javascriptGenerator.valueToCode(block, "FUNC", Order.NONE) || "(function(){})";
    const arg = javascriptGenerator.valueToCode(block, "ARG", Order.NONE) || "undefined";
    return `${fn}(${arg});\n`;
};

Blockly.Blocks["functions_execute_reporter"] = {
    init: function () {
        this.appendValueInput("FUNC").setCheck(null).appendField("execute");
        this.setInputsInline(true);
        this.setOutput(true, null);
        this.setStyle("procedure_blocks");
        this.setTooltip("Call a function value with the given argument and return its result");
    },
};

javascriptGenerator.forBlock["functions_execute_reporter"] = function (block: Blockly.Block) {
    const fn = javascriptGenerator.valueToCode(block, "FUNC", Order.NONE) || "(function(){})";
    const arg = javascriptGenerator.valueToCode(block, "ARG", Order.NONE) || "undefined";
    return [`${fn}(${arg})`, Order.ATOMIC];
};

Blockly.Blocks["functions_return"] = {
    init: function () {
        this.appendValueInput("VALUE").appendField("return");
        this.setPreviousStatement(true, null);
        this.setStyle("procedure_blocks");
        this.setTooltip("Return a value from a function");
    },
};

javascriptGenerator.forBlock["functions_return"] = function (block: Blockly.Block) {
    const val = javascriptGenerator.valueToCode(block, "VALUE", Order.NONE) || "undefined";
    return `return ${val};\n`;
};

export { };
