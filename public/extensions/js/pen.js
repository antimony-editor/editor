class PenExtension {
  get id() { return "pen"; }

  registerCategory() {
    return {
      name: "Pen",
      color: "#0fbd8c"
    };
  }

  registerBlocks() {
    return [
      {
        id: "down",
        text: "pen down",
        type: "statement",
        tooltip: "Put the pen down so the sprite draws as it moves"
      },
      {
        id: "up",
        text: "pen up",
        type: "statement",
        tooltip: "Lift the pen up so the sprite stops drawing"
      },
      {
        id: "clear",
        text: "clear pen",
        type: "statement",
        tooltip: "Clear every pen drawing on the stage"
      },
      {
        id: "set_color",
        text: "set pen color R [R] G [G] B [B]",
        type: "statement",
        inlineInputs: true,
        tooltip: "Set the pen color to an RGB value",
        fields: {
          R: { kind: "value", type: "Number", default: 15 },
          G: { kind: "value", type: "Number", default: 189 },
          B: { kind: "value", type: "Number", default: 140 }
        }
      },
      {
        id: "set_color_value",
        text: "set pen color to [MODE] [VALUE]",
        type: "statement",
        inlineInputs: true,
        tooltip: "Set the pen color from a single RGB or HEX value",
        fields: {
          MODE: { kind: "menu", items: ["RGB", "HEX"], default: "HEX" },
          VALUE: { kind: "value", type: ["String", "Number"], default: "#0fbd8c" }
        }
      },
      {
        id: "set_size",
        text: "set pen size to [SIZE] px",
        type: "statement",
        inlineInputs: true,
        tooltip: "Set the pen thickness in pixels",
        fields: {
          SIZE: { kind: "value", type: "Number", default: 1 }
        }
      }
    ];
  }

  registerCode() {
    return {
      down: (args, context) => {
        window.RUNTIME.penDown(context.spriteId, context.sprite.x, context.sprite.y);
      },
      up: (args, context) => {
        window.RUNTIME.penUp(context.spriteId, context.sprite.x, context.sprite.y);
      },
      clear: () => {
        window.RUNTIME.clearPen();
      },
      set_color: (args, context) => {
        window.RUNTIME.setPenColor(context.spriteId, args.R, args.G, args.B);
      },
      set_color_value: (args, context) => {
        window.RUNTIME.setPenColor(context.spriteId, args.VALUE);
      },
      set_size: (args, context) => {
        window.RUNTIME.setPenSize(context.spriteId, args.SIZE);
      }
    };
  }
}
