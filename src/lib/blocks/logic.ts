import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import Checkbox from "../patches/checkbox";

Blockly.Blocks["checkbox"] = {
    init: function () {
        this.appendDummyInput().appendField(new Checkbox("false"), "BOOL");
        this.setOutput(true, "Boolean");
        this.setStyle("logic_blocks");
    },
};

javascriptGenerator.forBlock["checkbox"] = function (block: any) {
    return [block.getFieldValue("BOOL") === "TRUE" ? "true" : "false", Order.ATOMIC];
};
