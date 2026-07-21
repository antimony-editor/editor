import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { ExtensionBridge } from "./bridge";
import { defineExpandableBlock } from "../blocks/expandable";
import type {
  ExtensionBlockDef,
  ExtensionBlockType,
  ExtensionCategoryDef,
  ExtensionCodeHandlers,
  ExtensionFieldSpec,
  ExtensionInstance,
  RegisteredExtension,
} from "./types";

type ExtensionCategoryEntry = {
  category: ExtensionCategoryDef | null;
  color: string;
  blocks: Record<string, NormalizedExtensionBlockDef>;
};

type NormalizedExtensionBlockDef = Omit<
  ExtensionBlockDef,
  | "id"
  | "opcode"
  | "text"
  | "spec"
  | "type"
  | "blockType"
  | "fields"
  | "arguments"
> & {
  id: string;
  text: string;
  type: ExtensionBlockType;
  fields: Record<string, ExtensionFieldSpec>;
};

declare global {
  interface Window {
    ANTIMONY_EXTENSIONS?: {
      runBlock: (
        fullType: string,
        args: Record<string, unknown>,
        context?: unknown,
      ) => Promise<unknown>;
      registerExtension: typeof registerExtension;
    };
  }
}

export const activeExtensions: RegisteredExtension[] = [];
export const extensionHandlers: Record<string, ExtensionCodeHandlers[string]> =
  {};
export const extensionBridges = new Map<string, ExtensionBridge>();

const categoryEntries: ExtensionCategoryEntry[] = [];
const listeners = new Set<() => void>();

function emitExtensionChange() {
  for (const listener of listeners) listener();
}

export function subscribeExtensionChanges(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearExtensions() {
  extensionBridges.forEach((bridge) => bridge.terminate());
  extensionBridges.clear();

  for (const key in extensionHandlers) {
    delete extensionHandlers[key];
  }

  activeExtensions.length = 0;
  categoryEntries.length = 0;

  emitExtensionChange();
}

function menuItems(
  items: Extract<ExtensionFieldSpec, { kind: "menu" }>["items"],
) {
  return items.map((item) =>
    typeof item === "string" ? [item, item] : [item.text, item.value],
  ) as [string, string][];
}

function normalizeBlockType(blockDef: ExtensionBlockDef): ExtensionBlockType {
  const type = blockDef.type ?? blockDef.blockType;
  if (blockDef.dual || type === "dual") return "dual";
  if (type === "command") return "statement";
  if (type === "reporter") return "output";
  if (type === "hat") return "cap";
  if (type === "statement" || type === "cap" || type === "output") {
    return type;
  }
  return "statement";
}

function normalizeBlockDef(
  blockDef: ExtensionBlockDef,
): NormalizedExtensionBlockDef | null {
  const id = blockDef.id ?? blockDef.opcode;
  if (!id) return null;

  return {
    ...blockDef,
    id,
    text: blockDef.text ?? blockDef.spec ?? id,
    type: normalizeBlockType(blockDef),
    fields: blockDef.fields ?? blockDef.arguments ?? {},
  };
}

function isValueSpec(
  spec: ExtensionFieldSpec,
): spec is Extract<ExtensionFieldSpec, { kind?: "value" }> {
  return (spec.kind ?? "value") === "value";
}

function textToBlock(
  block: Blockly.Block,
  text: string,
  fields: Record<string, ExtensionFieldSpec> = {},
) {
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) block.appendDummyInput().appendField(before);

    const inputName = match[1].trim();
    const spec = fields[inputName];

    if (spec?.kind === "statement") {
      block.appendStatementInput(inputName).setCheck(spec.accepts ?? "default");
    } else if (spec && isValueSpec(spec)) {
      block.appendValueInput(inputName).setCheck(spec.type ?? null);
    } else if (spec?.kind === "menu") {
      block
        .appendDummyInput()
        .appendField(
          new Blockly.FieldDropdown(menuItems(spec.items)),
          inputName,
        );
      if (spec.default) block.setFieldValue(spec.default, inputName);
    } else {
      block.appendDummyInput().appendField(`[${inputName}]`);
    }

    lastIndex = regex.lastIndex;
  }

  const trailing = text.slice(lastIndex).trim();
  if (trailing) block.appendDummyInput().appendField(trailing);
}

function buildShadowElement(
  document: Document,
  namespace: string,
  type: string | string[] | null | undefined,
  defaultValue: unknown,
) {
  const primaryType = Array.isArray(type) ? type[0] : type;
  const config =
    primaryType === "Number"
      ? { type: "math_number", field: "NUM", value: defaultValue ?? 0 }
      : primaryType === "Boolean"
        ? {
            type: "checkbox",
            field: "BOOL",
            value: defaultValue ? "TRUE" : "FALSE",
          }
        : primaryType === "String" || primaryType == null
          ? { type: "text", field: "TEXT", value: defaultValue ?? "" }
          : null;

  if (!config) return null;

  const shadow = document.createElementNS(namespace, "shadow");
  shadow.setAttribute("type", config.type);
  const field = document.createElementNS(namespace, "field");
  field.setAttribute("name", config.field);
  field.textContent = String(config.value);
  shadow.appendChild(field);
  return shadow;
}

function buildBlockElement(
  document: Document,
  namespace: string,
  blockType: string,
  fields: Record<string, ExtensionFieldSpec> = {},
) {
  const block = document.createElementNS(namespace, "block");
  block.setAttribute("type", blockType);

  for (const [name, spec] of Object.entries(fields)) {
    if (!isValueSpec(spec) || spec.default === undefined) continue;
    const value = document.createElementNS(namespace, "value");
    value.setAttribute("name", name);
    const shadow = buildShadowElement(
      document,
      namespace,
      spec.type,
      spec.default,
    );
    if (shadow) value.appendChild(shadow);
    block.appendChild(value);
  }

  return block;
}

function buildCategoryElement(
  document: Document,
  namespace: string,
  entry: ExtensionCategoryEntry,
) {
  if (!entry.category) return null;

  const category = document.createElementNS(namespace, "category");
  category.setAttribute("name", entry.category.name ?? "Extension");
  category.setAttribute("colour", entry.category.color ?? entry.color);
  if (entry.category.iconURI) {
    category.setAttribute("iconURI", entry.category.iconURI);
  }

  for (const [blockType, blockDef] of Object.entries(entry.blocks)) {
    category.appendChild(
      buildBlockElement(document, namespace, blockType, blockDef.fields),
    );
  }

  return category;
}

function registerBlocks(
  id: string,
  blocks: ExtensionBlockDef[],
  categoryColor: string,
) {
  const blockDefs: Record<string, NormalizedExtensionBlockDef> = {};

  for (const rawBlockDef of blocks) {
    const blockDef = normalizeBlockDef(rawBlockDef);
    if (!blockDef) {
      console.warn("Skipped extension block with no id:", rawBlockDef);
      continue;
    }

    const blockType = `${id}_${blockDef.id}`;
    blockDefs[blockType] = blockDef;

    if (blockDef.expandable) {
      defineExpandableBlock({
        type: blockType,
        color: blockDef.color ?? categoryColor,
        output: blockDef.outputType,
        outputShape: blockDef.outputShape,
        previousStatement: blockDef.statementType,
        nextStatement: blockDef.statementType,
        initialItemCount: blockDef.initialItemCount,
        minItemCount: blockDef.minItemCount,
        maxItemCount: blockDef.maxItemCount,
        emptyLabel: blockDef.emptyLabel,
        firstInputLabel: blockDef.firstInputLabel,
        tooltip: blockDef.tooltip,
        slots: [
          {
            prefix: blockDef.inputPrefix ?? "ADD",
            check: blockDef.inputCheck,
            shadow: blockDef.shadow,
          },
        ],
      });
    } else {
      Blockly.Blocks[blockType] = {
        init: function () {
          textToBlock(this, blockDef.text, blockDef.fields);

          switch (blockDef.type) {
            case "statement":
              this.setPreviousStatement(
                true,
                blockDef.statementType ?? "default",
              );
              this.setNextStatement(true, blockDef.statementType ?? "default");
              break;
            case "cap":
              this.setPreviousStatement(
                true,
                blockDef.statementType ?? "default",
              );
              break;
            case "output":
              this.setOutput(true, blockDef.outputType ?? null);
              if (blockDef.outputShape) {
                (
                  this as Blockly.Block & {
                    setOutputShape?: (shape: number) => void;
                  }
                ).setOutputShape?.(blockDef.outputShape);
              }
              break;
            case "dual":
              this.setPreviousStatement(
                true,
                blockDef.statementType ?? "default",
              );
              this.setNextStatement(true, blockDef.statementType ?? "default");
              this.setOutput(true, blockDef.outputType ?? null);
              if (blockDef.outputShape) {
                (
                  this as Blockly.Block & {
                    setOutputShape?: (shape: number) => void;
                  }
                ).setOutputShape?.(blockDef.outputShape);
              }
              break;
          }

          if (blockDef.tooltip) this.setTooltip(blockDef.tooltip);
          this.setColour(String(blockDef.color ?? categoryColor));
          this.setInputsInline(blockDef.inlineInputs ?? true);
        },
      };
    }
  }

  return blockDefs;
}

function collectInputs(
  block: Blockly.Block & { itemCount_?: number },
  fields: Record<string, ExtensionFieldSpec> = {},
) {
  const inputs: Record<string, string> = {};

  for (const input of block.inputList) {
    if (!input.name) continue;

    if (input.connection?.type === Blockly.ConnectionType.INPUT_VALUE) {
      const code = javascriptGenerator.valueToCode(
        block,
        input.name,
        Order.ATOMIC,
      );
      if (code) inputs[input.name] = code;
    } else if (
      input.connection?.type === Blockly.ConnectionType.NEXT_STATEMENT
    ) {
      const code = javascriptGenerator.statementToCode(block, input.name);
      if (code) inputs[input.name] = `async () => { ${code} }`;
    }
  }
  if (typeof block.itemCount_ === "number") {
    inputs["itemCount"] = block.itemCount_.toString();
    for (let i = 0; i < block.itemCount_; i++) {
      const inputName = `ADD${i}`;
      const code = javascriptGenerator.valueToCode(
        block,
        inputName,
        Order.ATOMIC,
      );
      if (code) inputs[inputName] = code;
    }
  }

  for (const [name, spec] of Object.entries(fields)) {
    if (spec.kind !== "menu") continue;
    const value = block.getFieldValue(name);
    if (value !== undefined) inputs[name] = JSON.stringify(value);
  }

  return inputs;
}

function registerCodeGenerators(
  id: string,
  codeGen: ExtensionCodeHandlers | Record<string, true>,
  blockDefs: Record<string, NormalizedExtensionBlockDef>,
  trusted: boolean,
) {
  for (const blockId of Object.keys(codeGen)) {
    const fullType = `${id}_${blockId}`;
    const blockDef = blockDefs[fullType];

    if (trusted) {
      extensionHandlers[fullType] = (codeGen as ExtensionCodeHandlers)[blockId];
    }

    javascriptGenerator.forBlock[fullType] = function (block: Blockly.Block) {
      const inputs = collectInputs(block, blockDef?.fields);
      const argsLiteral = `{${Object.entries(inputs)
        .map(([key, value]) => `${JSON.stringify(key)}:${value}`)
        .join(",")}}`;
      const call = `window.ANTIMONY_EXTENSIONS.runBlock(${JSON.stringify(fullType)}, ${argsLiteral}, context)`;
      const expr = `(await ${call})`;
      const shouldReport =
        blockDef?.type === "output" ||
        (blockDef?.type === "dual" && block.outputConnection?.isConnected());
      return shouldReport ? [expr, Order.NONE] : `${expr};\n`;
    };
  }
}

async function runBlock(
  fullType: string,
  args: Record<string, unknown>,
  context?: unknown,
) {
  const trustedHandler = extensionHandlers[fullType];
  if (trustedHandler) return trustedHandler(args, context);

  const [extensionId, blockId] = fullType.split(/_(.*)/s);
  const bridge = extensionBridges.get(extensionId);
  if (!bridge) throw new Error(`Extension "${extensionId}" is not loaded`);
  return bridge.runBlock(blockId, args);
}

function installRuntimeGlobal() {
  window.ANTIMONY_EXTENSIONS = {
    runBlock,
    registerExtension,
  };
}

function finishRegistration(
  id: string,
  code: string,
  trusted: boolean,
  category: ExtensionCategoryDef | null,
  blocks: ExtensionBlockDef[],
  codeGen: ExtensionCodeHandlers | Record<string, true>,
) {
  if (activeExtensions.some((entry) => entry.id === id)) {
    console.warn(`Extension "${id}" is already registered; skipping`);
    return;
  }

  const color = category?.color ?? "#b3650c"; // why this colour? all extensions without colours are Stinky
  const blockDefs = registerBlocks(id, blocks, color);
  categoryEntries.push({ category, color, blocks: blockDefs });
  registerCodeGenerators(id, codeGen, blockDefs, trusted);
  activeExtensions.push({ id, code, trusted });
  emitExtensionChange();
}

export async function registerExtension(codeString: string, trusted = false) {
  installRuntimeGlobal();

  if (trusted) {
    const ExtensionClass = (0, eval)(`(${codeString})`);
    const extension = new ExtensionClass() as ExtensionInstance;
    const id = extension.id ?? extension.constructor.name;
    finishRegistration(
      id,
      codeString,
      true,
      extension.registerCategory?.() ?? null,
      extension.registerBlocks?.() ?? [],
      extension.registerCode?.() ?? {},
    );
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const bridge = new ExtensionBridge("temp_id", codeString, (extInfo) => {
      const id = extInfo.id;
      if (activeExtensions.some((entry) => entry.id === id)) {
        bridge.terminate();
        resolve();
        return;
      }

      bridge.extId = id;
      extensionBridges.set(id, bridge);
      finishRegistration(
        id,
        codeString,
        false,
        extInfo.category,
        extInfo.blocks,
        Object.fromEntries(
          (extInfo.codeGen as string[]).map((blockId) => [blockId, true]),
        ) as Record<string, true>,
      );
      resolve();
    });

    bridge.worker.addEventListener("error", (event) => {
      bridge.terminate();
      reject(event.error ?? new Error(event.message));
    });
  });
}

export function appendExtensionCategories(toolbox: Element) {
  const document = toolbox.ownerDocument;
  const namespace =
    toolbox.namespaceURI ?? "https://developers.google.com/blockly/xml";

  for (const entry of categoryEntries) {
    const category = buildCategoryElement(document, namespace, entry);
    if (category) toolbox.appendChild(category);
  }
}

if (typeof window !== "undefined") {
  installRuntimeGlobal();
}
