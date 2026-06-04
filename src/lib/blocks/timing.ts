import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';

Blockly.Blocks['on_start'] = {
    init: function () {
        this.appendDummyInput('NAME').appendField('on start of the video');
        this.appendStatementInput('DO').setCheck(null);
        this.setStyle('timing_category');
        (this as Blockly.Block & { hat?: string }).hat = 'cap';
        this.setTooltip('Runs whatevers underneath when the video is started');
        this.setHelpUrl('');
    }
};

javascriptGenerator.forBlock['on_start'] = function (block: Blockly.Block) {
    const statements = javascriptGenerator.statementToCode(block, 'DO');
    return `(window.RUNTIME || {}).onStart(async function(context){\n${statements}\n});\n`;
};

export { };
