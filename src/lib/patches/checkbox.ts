import * as Blockly from "blockly/core";
export class Checkbox extends (Blockly.FieldCheckbox as any) {
    borderRect_: SVGRectElement | null = null;
    imageElement_: SVGElement | null = null;
    hover_ = false;

    constructor(value?: any, validator?: any, config?: any) {
        super(value, validator, config);
    }

    initView() {
        this.borderRect_ = Blockly.utils.dom.createSvgElement(
            Blockly.utils.Svg.RECT as any,
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
        this.imageElement_ = Blockly.utils.dom.createSvgElement(
            "image",
            {
                x: 0,
                y: 0,
                width: 16.25,
                height: 13,
                preserveAspectRatio: "xMidYMid meet",
                style: "pointer-events: none;",
            },
            this.fieldGroup_,
        );

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

        this.updateImageSrc();
    }

    onMouseEnter_() {
        this.hover_ = true;
        if (this.imageElement_) this.imageElement_.setAttribute("opacity", "0.85");
    }

    onMouseLeave_() {
        this.hover_ = false;
        if (this.imageElement_) this.imageElement_.setAttribute("opacity", this.getValueBoolean() ? "1" : "1");
    }

    doValueUpdate_(newValue: any) {
        const baseProto = (Blockly.FieldCheckbox as any)?.prototype;
        if (baseProto && typeof baseProto.doValueUpdate_ === "function") {
            baseProto.doValueUpdate_.call(this, newValue);
        }
        this.updateImageSrc();
    }

    updateImageSrc() {
        if (!this.imageElement_) return;

        const url = this.getValueBoolean() ? "/checkbox-true.svg" : "/checkbox-false.svg";
        // Use the standard `href` attribute only (no xlink fallback).
        this.imageElement_.setAttribute("href", url);
    }

    render_() {
        this.size_.width = 16.25;
        this.size_.height = 13;
    }

    dispose() {
        if (this.mouseEnterWrapper_) Blockly.browserEvents.unbind(this.mouseEnterWrapper_);
        if (this.mouseLeaveWrapper_) Blockly.browserEvents.unbind(this.mouseLeaveWrapper_);
        super.dispose();
    }
}
try {
    if ((Blockly as any).fieldRegistry?.get?.("field_checkbox")) {
    }
    Blockly.fieldRegistry.register("field_checkbox", Checkbox as any);
} catch (e) {
}

export default Checkbox;
