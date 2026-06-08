import { DropDownDiv, fieldRegistry, Field } from "blockly/core";
import iro from "@jaames/iro";

type ColorPickerOptions = Parameters<typeof iro.ColorPicker>[1];

export default class ColorWheelField extends Field {
    static SERIALIZABLE = true;
    SERIALIZABLE = true;
    private width: number;
    private pickerOptions: ColorPickerOptions;

    constructor(color = "#FF00FF", width = 150, options: ColorPickerOptions = {}) {
        super(color);
        this.width = width;
        this.pickerOptions = options;
    }

    static fromJson(options: Record<string, unknown>) {
        const color = typeof options.color === 'string' ? (options.color as string) : '#FF00FF';
        const width = typeof options.width === 'number' ? (options.width as number) : 150;
        const opts = typeof options.options === 'object' && options.options !== null ? (options.options as ColorPickerOptions) : {};
        return new ColorWheelField(color, width, opts);
    }

    protected showEditor_() {
        const editor = document.createElement("div");
        DropDownDiv.getContentDiv().appendChild(editor);
        editor.classList.add("blockly-color-wheel-container");

        const colorPicker = iro.ColorPicker(editor, {
            width: this.width,
            color: (this.getValue() as string) ?? "#FF00FF",
            ...this.pickerOptions,
        });

        const input = document.createElement("input");
        input.type = "text";
        input.className = "blockly-color-wheel-input";
        input.value = (this.getValue() as string) ?? "#FF00FF";
        input.style.marginTop = "8px";
        input.style.width = `${Math.min(this.width, 200)}px`;
        input.style.padding = "6px";
        input.style.borderRadius = "4px";
        input.style.border = "1px solid rgba(0,0,0,0.12)";
        editor.appendChild(input);

        const setFromPicker = (color: iro.Color) => {
            const hex = color.hexString;
            input.value = hex;
            this.setValue(hex);
        };

        colorPicker.on("color:change", setFromPicker);

        const sanitize = (v: string) => {
            if (!v) return null;
            let s = v.trim();
            if (!s.startsWith('#')) s = `#${s}`;
            const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
            return m ? (m[1].length === 3 ? s : s.toUpperCase()) : null;
        };

        const applyInput = () => {
            const val = sanitize(input.value);
            if (val) {
                colorPicker.color.hexString = val;
                this.setValue(val);
                input.value = val;
            } else {
                input.value = colorPicker.color.hexString ?? ((this.getValue() as string) ?? "#FF00FF");
            }
        };

        input.addEventListener('blur', applyInput);
        input.addEventListener('keyup', (ev: KeyboardEvent) => {
            if (ev.key === 'Enter') applyInput();
        });

        DropDownDiv.showPositionedByField(this, () => {
            editor.remove();
        });
    }
}

fieldRegistry.register("color_wheel", ColorWheelField as never);