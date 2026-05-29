import * as Blockly from "blockly/core";
import toolboxXml from "./toolbox.xml?raw";

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
        other_blocks: { colourPrimary: '#7a7a7a', colourSecondary: '#636363', colourTertiary: '#464646' },
    },
    categoryStyles: {
        logic_category: { colour: '#5C5CFF' },
        loop_category: { colour: '#00D1D1' },
        math_category: { colour: '#7A29FF' },
        text_category: { colour: '#FF2970' },
        list_category: { colour: '#FF8000' },
        variable_category: { colour: '#00FF80' },
        procedure_category: { colour: '#FFD100' },
        motion_category: { colour: '#4C97FF' },
        appearance_category: { colour: '#9966FF' },
        timing_category: { colour: '#FFBF00' },
        effects_category: { colour: '#FFAB19' },
        layers_category: { colour: '#4CBFE6' },
        audio_category: { colour: '#D65CD6' },
        other_category: { colour: '#7a7a7a' },
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
    import.meta.glob("./patches/**/*.ts", { eager: true });
    import.meta.glob("./blocks/**/*.ts", { eager: true });
}

type ShadowFieldValue = string | number | boolean;

type ShadowTemplate = {
    type: string;
    fields?: Record<string, ShadowFieldValue>;
};

const toolboxShadowTemplates: Record<string, Record<string, ShadowTemplate>> = {
    controls_if: {
        IF0: { type: "checkbox", fields: { BOOL: "FALSE" } },
    },
    controls_ifelse: {
        IF0: { type: "checkbox", fields: { BOOL: "FALSE" } },
        IF1: { type: "checkbox", fields: { BOOL: "FALSE" } },
    },
    logic_compare: {
        A: { type: "math_number", fields: { NUM: 0 } },
        B: { type: "math_number", fields: { NUM: 0 } },
    },
    logic_operation: {
        A: { type: "checkbox", fields: { BOOL: "FALSE" } },
        B: { type: "checkbox", fields: { BOOL: "FALSE" } },
    },
    logic_negate: {
        BOOL: { type: "checkbox", fields: { BOOL: "FALSE" } },
    },
    logic_ternary: {
        IF: { type: "checkbox", fields: { BOOL: "FALSE" } },
        THEN: { type: "text", fields: { TEXT: "" } },
        ELSE: { type: "text", fields: { TEXT: "" } },
    },
    controls_repeat_ext: {
        TIMES: { type: "math_number", fields: { NUM: 10 } },
    },
    controls_whileUntil: {
        BOOL: { type: "checkbox", fields: { BOOL: "FALSE" } },
    },
    controls_for: {
        FROM: { type: "math_number", fields: { NUM: 1 } },
        TO: { type: "math_number", fields: { NUM: 10 } },
        BY: { type: "math_number", fields: { NUM: 1 } },
    },
    math_arithmetic: {
        A: { type: "math_number", fields: { NUM: 1 } },
        B: { type: "math_number", fields: { NUM: 1 } },
    },
    math_single: {
        NUM: { type: "math_number", fields: { NUM: 9 } },
    },
    math_trig: {
        NUM: { type: "math_number", fields: { NUM: 45 } },
    },
    math_number_property: {
        NUMBER_TO_CHECK: { type: "math_number", fields: { NUM: 0 } },
    },
    math_round: {
        NUM: { type: "math_number", fields: { NUM: 3.1 } },
    },
    math_modulo: {
        DIVIDEND: { type: "math_number", fields: { NUM: 64 } },
        DIVISOR: { type: "math_number", fields: { NUM: 10 } },
    },
    math_constrain: {
        VALUE: { type: "math_number", fields: { NUM: 50 } },
        LOW: { type: "math_number", fields: { NUM: 1 } },
        HIGH: { type: "math_number", fields: { NUM: 100 } },
    },
    math_random_int: {
        FROM: { type: "math_number", fields: { NUM: 1 } },
        TO: { type: "math_number", fields: { NUM: 100 } },
    },
    text_append: {
        TEXT: { type: "text", fields: { TEXT: "" } },
    },
    text_length: {
        VALUE: { type: "text", fields: { TEXT: "abc" } },
    },
    text_isEmpty: {
        VALUE: { type: "text", fields: { TEXT: "" } },
    },
    text_indexOf: {
        VALUE: { type: "text", fields: { TEXT: "" } },
        FIND: { type: "text", fields: { TEXT: "" } },
    },
    text_charAt: {
        VALUE: { type: "text", fields: { TEXT: "" } },
        AT: { type: "math_number", fields: { NUM: 0 } },
    },
    text_getSubstring: {
        STRING: { type: "text", fields: { TEXT: "" } },
        AT1: { type: "math_number", fields: { NUM: 0 } },
        AT2: { type: "math_number", fields: { NUM: 0 } },
    },
    text_changeCase: {
        TEXT: { type: "text", fields: { TEXT: "" } },
    },
    text_trim: {
        TEXT: { type: "text", fields: { TEXT: "" } },
    },
    text_print: {
        TEXT: { type: "text", fields: { TEXT: "abc" } },
    },
    text_prompt_ext: {
        TEXT: { type: "text", fields: { TEXT: "" } },
    },
    lists_repeat: {
        NUM: { type: "math_number", fields: { NUM: 5 } },
    },
};

function normalizeToolboxXml(toolboxRoot: Element) {
    const xmlDocument = toolboxRoot.ownerDocument;

    if (!xmlDocument) {
        return toolboxRoot;
    }

    const namespace = toolboxRoot.namespaceURI ?? "https://developers.google.com/blockly/xml";

    for (const block of Array.from(toolboxRoot.querySelectorAll("block"))) {
        const blockType = block.getAttribute("type");

        if (!blockType) {
            continue;
        }

        const shadowTemplates = toolboxShadowTemplates[blockType];

        if (!shadowTemplates) {
            continue;
        }

        for (const [inputName, template] of Object.entries(shadowTemplates)) {
            const valueElement = block.querySelector(`value[name="${inputName}"]`);

            if (!valueElement) {
                continue;
            }

            const shadowElement = xmlDocument.createElementNS(namespace, "shadow");
            shadowElement.setAttribute("type", template.type);

            for (const [fieldName, fieldValue] of Object.entries(template.fields ?? {})) {
                const fieldElement = xmlDocument.createElementNS(namespace, "field");
                fieldElement.setAttribute("name", fieldName);
                fieldElement.textContent = String(fieldValue);
                shadowElement.appendChild(fieldElement);
            }

            while (valueElement.firstChild) {
                valueElement.removeChild(valueElement.firstChild);
            }

            valueElement.appendChild(shadowElement);
        }
    }

    return toolboxRoot;
}

const toolboxDom = normalizeToolboxXml(
    new DOMParser().parseFromString(toolboxXml, "text/xml").documentElement,
);

export const workspaceConfig: Blockly.BlocklyOptions = {
    renderer: "zelos",
    theme: theme,
    toolbox: toolboxDom,
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
        wheel: true,
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
