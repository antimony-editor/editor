import * as Blockly from "blockly/core";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type ShadowFieldValue = string | number | boolean;

export type ExpandableShadow = {
  type: string;
  fields?: Record<string, ShadowFieldValue>;
};

export type ExpandableSlotDef = {
  prefix: string;
  check?: string | string[] | null;
  shadow?: ExpandableShadow | ((index: number) => ExpandableShadow | null);
  appendLabels?: string[];
};

export type ExpandableBlockOptions = {
  type: string;
  style?: string;
  color?: string;
  output?: string | string[] | null;
  outputShape?: number;
  previousStatement?: string | string[] | null;
  nextStatement?: string | string[] | null;
  initialItemCount?: number;
  minItemCount?: number;
  maxItemCount?: number;
  emptyLabel?: string;
  firstInputLabel?: string;
  slots: ExpandableSlotDef[];
  inputsInline?: boolean;
  tooltip?: string;
};

export type ExpandableBlock = Blockly.Block & {
  itemCount_: number;
  updateShape_: () => void;
  increase_: () => void;
  decrease_: () => void;
};

export function createShadowDom(template: ExpandableShadow) {
  const shadow = Blockly.utils.xml.createElement("shadow");
  shadow.setAttribute("type", template.type);

  for (const [name, value] of Object.entries(template.fields ?? {})) {
    const field = Blockly.utils.xml.createElement("field");
    field.setAttribute("name", name);
    field.textContent = String(value);
    shadow.appendChild(field);
  }

  return shadow;
}

export function getShadow(
  shadowField:
    | ExpandableShadow
    | ((index: number) => ExpandableShadow | null)
    | undefined
    | null,
  index: number,
): ExpandableShadow | null {
  if (!shadowField) return null;
  return typeof shadowField === "function" ? shadowField(index) : shadowField;
}

export function defineExpandableBlock(options: ExpandableBlockOptions) {
  const minItemCount = options.minItemCount ?? 0;
  const maxItemCount = options.maxItemCount ?? 99;
  const initialItemCount = options.initialItemCount ?? minItemCount;

  Blockly.Blocks[options.type] = {
    init: function (this: ExpandableBlock) {
      this.itemCount_ = initialItemCount;
      this.setInputsInline(options.inputsInline ?? true);
      if (options.color) {
        this.setColour(options.color);
      } else if (options.style) {
        this.setStyle(options.style);
      }
      if (options.output !== undefined) this.setOutput(true, options.output);
      if (options.outputShape !== undefined) {
        (
          this as Blockly.Block & { setOutputShape?: (shape: number) => void }
        ).setOutputShape?.(options.outputShape);
      }
      if (options.previousStatement !== undefined) {
        this.setPreviousStatement(true, options.previousStatement);
      }
      if (options.nextStatement !== undefined) {
        this.setNextStatement(true, options.nextStatement);
      }
      if (options.tooltip) this.setTooltip(options.tooltip);
      this.updateShape_();
    },

    mutationToDom: function (this: ExpandableBlock) {
      const container = Blockly.utils.xml.createElement("mutation");
      container.setAttribute("items", String(this.itemCount_));
      return container;
    },

    domToMutation: function (this: ExpandableBlock, xmlElement: Element) {
      const items = Number.parseInt(xmlElement.getAttribute("items") ?? "", 10);
      this.itemCount_ = Number.isFinite(items) ? items : initialItemCount;
      this.updateShape_();
    },

    saveExtraState: function (this: ExpandableBlock) {
      return { itemCount: this.itemCount_ };
    },

    loadExtraState: function (
      this: ExpandableBlock,
      state: { itemCount?: number } | null,
    ) {
      this.itemCount_ =
        state && typeof state.itemCount === "number"
          ? state.itemCount
          : initialItemCount;
      this.updateShape_();
    },

    updateShape_: function (this: ExpandableBlock) {
      if (this.getInput("ARROWS")) this.removeInput("ARROWS");
      if (this.getInput("EMPTY")) this.removeInput("EMPTY");

      if (this.itemCount_ === 0) {
        this.appendDummyInput("EMPTY").appendField(
          options.emptyLabel ?? "empty",
        );
      } else {
        for (let i = 0; i < this.itemCount_; i++) {
          for (let s = 0; s < options.slots.length; s++) {
            const slot = options.slots[s];
            const inputName = `${slot.prefix}${i}`;
            let input = this.getInput(inputName);

            if (!input) {
              input = this.appendValueInput(inputName).setCheck(
                slot.check ?? null,
              );
              input.setAlign(Blockly.inputs.Align.RIGHT);

              if (i === 0 && s === 0 && options.firstInputLabel) {
                input.appendField(options.firstInputLabel);
              }

              for (const label of slot.appendLabels ?? []) {
                input.appendField(label);
              }

              const shadow = getShadow(slot.shadow, i);
              if (shadow)
                input.connection?.setShadowDom(createShadowDom(shadow));
            }
          }
        }
      }

      for (let i = this.itemCount_; ; i++) {
        let removed = false;
        for (const slot of options.slots) {
          const name = `${slot.prefix}${i}`;
          if (this.getInput(name)) {
            this.removeInput(name);
            removed = true;
          }
        }
        if (!removed) break;
      }

      const arrowsInput = this.appendDummyInput("ARROWS").setAlign(
        Blockly.inputs.Align.RIGHT,
      );

      if (this.itemCount_ > minItemCount) {
        arrowsInput.appendField(
          new Blockly.FieldImage(
            "/arrow-left.svg",
            18,
            24,
            "remove an input",
            this.decrease_.bind(this),
          ),
        );
      }

      arrowsInput.appendField(
        new Blockly.FieldImage(
          "/arrow-right.svg",
          18,
          24,
          "add an input",
          this.increase_.bind(this),
        ),
      );
    },

    increase_: function (this: ExpandableBlock) {
      if (this.itemCount_ >= maxItemCount) return;
      this.itemCount_++;
      this.updateShape_();
      (this as unknown as Blockly.BlockSvg).render();
    },

    decrease_: function (this: ExpandableBlock) {
      if (this.itemCount_ <= minItemCount) return;
      this.itemCount_--;
      this.updateShape_();
      (this as unknown as Blockly.BlockSvg).render();
    },
  };
}
