import * as Blockly from "blockly";
import toolboxXml from "./toolbox.xml?raw";
import { isBlockVisibleFor, type BlockSourceType } from "./blockVisibility";
import { appendExtensionCategories } from "./extensions/manager";

const blockColors = {
  logic_blocks: "#6f8ff7",
  loop_blocks: "#6faaf7",
  math_blocks: "#e4aa2e",
  text_blocks: "#5dce40",
  list_blocks: "#eb4e4e",
  dict_blocks: "#f36bec",
  variable_blocks: "#eb8724",
  procedure_blocks: "#eb458a",
  other_blocks: "#7a7a7a",
  motion_blocks: "#4C97FF",
  appearance_blocks: "#9966FF",
  timing_blocks: "#FFBF00",
  effects_blocks: "#FFAB19",
  layers_blocks: "#4CBFE6",
  audio_blocks: "#D65CD6",
  sensors_blocks: "#FF6680",
};

function mapValues<K extends string, V, R>(
  obj: Record<K, V>,
  fn: (value: V) => R,
): Record<K, R> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, fn(v as V)]),
  ) as Record<K, R>;
}

const theme = Blockly.Theme.defineTheme("modern_dark", {
  name: "modern_dark",
  base: Blockly.Themes.Classic,
  blockStyles: mapValues(blockColors, (colour) => ({ colourPrimary: colour })),
  categoryStyles: mapValues(blockColors, (colour) => ({ colour })),
  componentStyles: {
    workspaceBackgroundColour: "#0F0F0F",
    toolboxBackgroundColour: "#1c1c20",
    toolboxForegroundColour: "#E0E0E0",
    flyoutBackgroundColour: "#1A1A1A",
    flyoutForegroundColour: "#E0E0E0",
    insertionMarkerColour: "#FFFFFF",
    insertionMarkerOpacity: 0.2,
    scrollbarColour: "#2A2A2A",
    scrollbarOpacity: 0.5,
    cursorColour: "#FFFFFF",
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

const shadowDefaultsByType: Record<string, ShadowTemplate> = {
  Boolean: { type: "checkbox", fields: { BOOL: "FALSE" } },
  Number: { type: "math_number", fields: { NUM: 0 } },
  String: { type: "text", fields: { TEXT: "" } },
  Array: { type: "lists_create_empty" },
  Colour: { type: "colour_picker", fields: { COLOUR: "#89abdb" } },
};

const fallbackShadowTemplate: ShadowTemplate = {
  type: "text",
  fields: { TEXT: "" },
};

function findChildElement(element: Element, selector: string) {
  return element.querySelector(`:scope > ${selector}`);
}

function getExistingShadowTemplate(
  valueElement: Element | null,
): ShadowTemplate | null {
  const shadowElement = valueElement
    ? findChildElement(valueElement, "shadow")
    : null;

  if (!shadowElement) {
    return null;
  }

  const type = shadowElement.getAttribute("type");

  if (!type) {
    return null;
  }

  const fields: Record<string, ShadowFieldValue> = {};

  for (const fieldElement of Array.from(
    shadowElement.querySelectorAll(":scope > field"),
  )) {
    const fieldName = fieldElement.getAttribute("name");

    if (fieldName) {
      fields[fieldName] = fieldElement.textContent ?? "";
    }
  }

  return Object.keys(fields).length > 0 ? { type, fields } : { type };
}

function getShadowTemplateForChecks(
  checks: string[] | null,
  existing: ShadowTemplate | null,
) {
  if (checks) {
    for (const check of checks) {
      const template = shadowDefaultsByType[check];

      if (template) {
        return template;
      }
    }
  }

  return existing ?? fallbackShadowTemplate;
}

function appendShadowElement(
  xmlDocument: XMLDocument,
  namespace: string,
  valueElement: Element,
  template: ShadowTemplate,
) {
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

function getValueInputsForBlock(blockType: string) {
  const blockDef = Blockly.Blocks[blockType];

  if (!blockDef) {
    return [];
  }

  const mockBlock = {
    inputList: [] as any[],
    appendValueInput(name: string) {
      const conn = {
        type: Blockly.ConnectionType.INPUT_VALUE,
        check: null as string[] | null,
        getCheck() {
          return this.check;
        },
      };
      const input = {
        name,
        connection: conn,
        setCheck(c: string | string[]) {
          conn.check = Array.isArray(c) ? c : [c];
          return input;
        },
        setAlign() {
          return input;
        },
        appendField() {
          return input;
        },
      };
      this.inputList.push(input);
      return input;
    },
    appendDummyInput() {
      return {
        setAlign() {
          return this;
        },
        appendField() {
          return this;
        },
      };
    },
    appendStatementInput(_name: string) {
      return {
        setCheck() {
          return this;
        },
        appendField() {
          return this;
        },
      };
    },
    setColour() {},
    setTooltip() {},
    setHelpUrl() {},
    setOutput() {},
    setPreviousStatement() {},
    setNextStatement() {},
    appendField() {
      return this;
    },
    interpolate_() {},
  };

  try {
    blockDef.init?.call(mockBlock);
    return mockBlock.inputList
      .filter(
        (input) =>
          input.connection?.type === Blockly.ConnectionType.INPUT_VALUE,
      )
      .map((input) => ({
        name: input.name,
        checks: input.connection.getCheck() ?? null,
      }));
  } catch {
    return [];
  }
}

function shouldSkipShadowForInput(blockType: string, inputName: string) {
  if (blockType === "functions_lambda") {
    return inputName === "ARG";
  }

  if (blockType === "controls_if") {
    return inputName === "IF0";
  }

  if (blockType === "controls_ifelse") {
    return inputName === "IF0" || inputName === "IF1";
  }

  return false;
}

function normalizeToolboxXml(toolboxRoot: Element) {
  const xmlDocument = toolboxRoot.ownerDocument;

  if (!xmlDocument) {
    return toolboxRoot;
  }

  const namespace =
    toolboxRoot.namespaceURI ?? "https://developers.google.com/blockly/xml";

  for (const block of Array.from(toolboxRoot.querySelectorAll("block"))) {
    const blockType = block.getAttribute("type");

    if (!blockType) {
      continue;
    }

    for (const input of getValueInputsForBlock(blockType)) {
      if (blockType === "controls_forLoop" && input.name === "VAR") {
        continue;
      }

      if (shouldSkipShadowForInput(blockType, input.name)) {
        continue;
      }

      let valueElement = findChildElement(block, `value[name="${input.name}"]`);

      if (!valueElement) {
        valueElement = xmlDocument.createElementNS(namespace, "value");
        valueElement.setAttribute("name", input.name);
        block.appendChild(valueElement);
      }

      const template = getShadowTemplateForChecks(
        input.checks,
        getExistingShadowTemplate(valueElement),
      );
      appendShadowElement(xmlDocument, namespace, valueElement, template);
    }
  }

  return toolboxRoot;
}

initAllBlocks();

const toolboxDom = normalizeToolboxXml(
  new DOMParser().parseFromString(toolboxXml, "text/xml").documentElement,
);

export function buildToolboxForSource(sourceType: BlockSourceType): Element {
  const toolbox = toolboxDom.cloneNode(true) as Element;

  for (const block of Array.from(toolbox.querySelectorAll("block"))) {
    const blockType = block.getAttribute("type");
    if (blockType && !isBlockVisibleFor(blockType, sourceType)) {
      block.remove();
    }
  }

  for (const category of Array.from(toolbox.querySelectorAll("category"))) {
    const hasBlocks = category.querySelector("block") !== null;
    const isDynamic =
      category.hasAttribute("custom") ||
      category.getAttribute("name") === "Variables" ||
      category.getAttribute("name") === "Functions";
    if (!hasBlocks && !isDynamic) {
      category.remove();
    }
  }

  appendExtensionCategories(toolbox);

  return toolbox;
}

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
  },
};
