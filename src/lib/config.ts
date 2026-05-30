import * as Blockly from "blockly/core";
import toolboxXml from "./toolbox.xml?raw";

const blockColors = {
    logic_blocks: '#6f8ff7',
    loop_blocks: '#6faaf7',
    math_blocks: '#e4aa2e',
    text_blocks: '#5dce40',
    list_blocks: '#eb4e4e',
    variable_blocks: '#eb8724',
    procedure_blocks: '#eb458a',
    other_blocks: '#7a7a7a',
    motion_blocks: '#4C97FF',
    appearance_blocks: '#9966FF',
    timing_blocks: '#FFBF00',
    effects_blocks: '#FFAB19',
    layers_blocks: '#4CBFE6',
    audio_blocks: '#D65CD6',
};

function mapValues<K extends string, V, R>(
    obj: Record<K, V>,
    fn: (value: V, key: K) => R
): Record<K, R> {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, fn(v as V, k as K)])
    ) as Record<K, R>;
}

const theme = Blockly.Theme.defineTheme('modern_dark', {
    name: 'modern_dark',
    base: Blockly.Themes.Classic,
    blockStyles: mapValues(blockColors, (colour) => ({ colourPrimary: colour })),
    categoryStyles: mapValues(blockColors, (colour) => ({ colour })),
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
