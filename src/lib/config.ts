import * as Blockly from "blockly/core";
import { toolbox } from "./toolbox";

const theme = Blockly.Theme.defineTheme('modern_dark', {
    name: 'modern_dark',
    base: Blockly.Themes.Classic,
    blockStyles: {
        logic_blocks: { colourPrimary: '#5C5CFF', colourSecondary: '#4747D1', colourTertiary: '#3333A3' },
        loop_blocks: { colourPrimary: '#00D1D1', colourSecondary: '#00A3A3', colourTertiary: '#007575' },
        math_blocks: { colourPrimary: '#7A29FF', colourSecondary: '#6121CC', colourTertiary: '#481899' },
        text_blocks: { colourPrimary: '#FF2970', colourSecondary: '#CC2159', colourTertiary: '#991843' },
        list_blocks: { colourPrimary: '#FF8000', colourSecondary: '#CC6600', colourTertiary: '#994C00' },
        variable_blocks: { colourPrimary: '#00FF80', colourSecondary: '#00CC66', colourTertiary: '#00994D' },
        procedure_blocks: { colourPrimary: '#FFD100', colourSecondary: '#CCA300', colourTertiary: '#997A00' },
    },
    categoryStyles: {
        logic_category: { colour: '#5C5CFF' },
        loop_category: { colour: '#00D1D1' },
        math_category: { colour: '#7A29FF' },
        text_category: { colour: '#FF2970' },
        list_category: { colour: '#FF8000' },
        variable_category: { colour: '#00FF80' },
        procedure_category: { colour: '#FFD100' },
    },
    componentStyles: {
        workspaceBackgroundColour: '#0F0F0F',
        toolboxBackgroundColour: '#161616',
        toolboxForegroundColour: '#E0E0E0',
        flyoutBackgroundColour: '#1A1A1A',
        flyoutForegroundColour: '#E0E0E0',
        insertionMarkerColour: '#FFFFFF',
        insertionMarkerOpacity: 0.2,
        scrollbarColour: '#2A2A2A',
        scrollbarOpacity: 0.5,
        cursorColour: '#FFFFFF',
    },
    fontStyle: {
        family: '"Inter", "Inter Variable", sans-serif',
        weight: '500',
        size: 11
    },
    startHats: false,
});

export function initAllBlocks() {
    import.meta.glob("./blocks/**/*.ts", { eager: true });
}

export const workspaceConfig: Blockly.BlocklyOptions = {
    renderer: "zelos",
    theme: theme,
    toolbox: toolbox,
    trashcan: true,
    move: {
        scrollbars: {
            horizontal: true,
            vertical: true,
        },
        drag: true,
        wheel: true,
    },
    zoom: {
        controls: true,
        controls: false,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
        startScale: 0.9,
        maxScale: 2,
        minScale: 0.4,
        scaleSpeed: 1.1,
        pinch: true,
    },
    grid: {
        spacing: 30,
        length: 1,
        colour: "#222",
        snap: true,
    },
};
