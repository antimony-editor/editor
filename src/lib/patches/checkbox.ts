import * as Blockly from 'blockly';

interface CheckboxOptions extends Blockly.FieldConfig {
  checked?: boolean;
}

const checkPath = "M 0 6.5 6.5 13 16.25 0";
const xPath = "M 14.625 0 L 1.625 13 M 14.625 13 L 1.625 0";

export class Checkbox extends Blockly.FieldCheckbox {
  static SERIALIZABLE = true;
  private checkElement_: SVGPathElement | null = null;
  private mouseEnterWrapper_: Blockly.browserEvents.Data | null = null;
  private mouseLeaveWrapper_: Blockly.browserEvents.Data | null = null;
  private isHovered_: boolean = false;

  constructor(
    value: boolean | string = false,
    validator?: Blockly.FieldValidator | null,
    config?: CheckboxOptions,
  ) {
    super(value as any, validator ?? undefined, config);
  }

  static fromJson(options: CheckboxOptions): Checkbox {
    return new Checkbox(options["checked"], undefined, options);
  }

  initView(): void {
    this.borderRect_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.RECT,
      {
        x: 0,
        y: 0,
        width: 16.25,
        height: 13,
        opacity: 0,
        cursor: "pointer",
      },
      this.fieldGroup_,
    );
    this.checkElement_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.PATH,
      {
        d: this.getValueBoolean() ? checkPath : xPath,
        stroke: "#ffffff",
        opacity: this.getValueBoolean() ? 0.5 : 0,
        "stroke-width": 4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        fill: "none",
        cursor: "pointer",
      },
      this.fieldGroup_,
    );

    if (this.fieldGroup_) {
      this.mouseEnterWrapper_ = Blockly.browserEvents.bind(
        this.fieldGroup_,
        "mouseenter",
        this,
        this.onMouseEnter_,
      );
      this.mouseLeaveWrapper_ = Blockly.browserEvents.bind(
        this.fieldGroup_,
        "mouseleave",
        this,
        this.onMouseLeave_,
      );
    }
  }

  onMouseEnter_(): void {
    this.isHovered_ = true;
    if (this.checkElement_) {
      this.checkElement_.setAttribute("opacity", "0.5");
    }
  }

  onMouseLeave_(): void {
    this.isHovered_ = false;
    if (this.checkElement_ && !this.getValueBoolean()) {
      this.checkElement_.setAttribute("opacity", "0");
    }
  }

  doValueUpdate_(newValue: string): void {
    super.doValueUpdate_(newValue as any);
    if (this.checkElement_) {
      this.checkElement_.setAttribute(
        "d",
        this.getValueBoolean() ? checkPath : xPath,
      );
      this.checkElement_.setAttribute(
        "opacity",
        this.getValueBoolean() || this.isHovered_ ? "0.5" : "0",
      );
    }
  }

  render_(): void {
    this.size_.width = 16.25;
    this.size_.height = 13;
  }

  dispose(): void {
    if (this.mouseEnterWrapper_) {
      Blockly.browserEvents.unbind(this.mouseEnterWrapper_);
    }
    if (this.mouseLeaveWrapper_) {
      Blockly.browserEvents.unbind(this.mouseLeaveWrapper_);
    }
    super.dispose();
  }
}

try {
  if ((Blockly as any).fieldRegistry?.get?.("field_checkbox")) { /* i hate you typescript youre making me put random comments raauughhh */ }

  Blockly.fieldRegistry.register("field_checkbox", Checkbox as any);
}
catch (e) {
  /* ts pmo */
}

export default Checkbox;
