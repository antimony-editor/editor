import { DropDownDiv, fieldRegistry } from "blockly/core";
import { FieldColour, registerFieldColour } from "@blockly/field-colour";
import iro from "@jaames/iro";

registerFieldColour();

type ColorPickerOptions = Parameters<typeof iro.ColorPicker>[1];

export default class ColorWheelField extends FieldColour {
  private width: number;
  private pickerOptions: ColorPickerOptions;

  constructor(
    color = "#FF00FF",
    width = 150,
    options: ColorPickerOptions = {},
  ) {
    super(color);
    this.width = width;
    this.pickerOptions = options;
  }

  protected override showEditor_() {
    const editor = document.createElement("div");
    DropDownDiv.getContentDiv().appendChild(editor);
    editor.classList.add("blockly-color-wheel-container");

    const colorPicker = iro.ColorPicker(editor, {
      width: this.width,
      color: this.getValue() ?? "#FF00FF",
      ...this.pickerOptions,
    });

    colorPicker.on("color:change", (color: iro.Color) => {
      this.setValue(color.hexString);
    });
    DropDownDiv.showPositionedByField(this, () => editor.remove());
  }
}

fieldRegistry.register("color_wheel", ColorWheelField as typeof FieldColour);
