import * as Blockly from "blockly";

const svgPaths = Blockly.utils.svgPaths;

class TuffosConstantProvider extends Blockly.zelos.ConstantProvider {
  PLUS!: any;

  constructor() {
    super();

    this.NOTCH_WIDTH = 7 * this.GRID_UNIT;
    this.NOTCH_HEIGHT = 1.75 * this.GRID_UNIT;
  }

  override init() {
    super.init();

    this.FIELD_TEXT_FONTSIZE = 11;
    this.FIELD_TEXT_FONTFAMILY = '"Helvetica Neue", "Segoe UI", Ubuntu';

    this.ADD_START_HATS = true;

    this.PLUS = this.makePlus();
  }

  makePlus(): any {
    const radius = this.CORNER_RADIUS;

    const makeMainPath = (blockHeight: number, up: boolean, right: boolean) => {
      return (
        svgPaths.arc(
          "a",
          "0 0,1",
          radius,
          svgPaths.point((up ? -1 : 1) * radius, (up ? -1 : 1) * radius),
        ) +
        svgPaths.arc(
          "a",
          "0 0,0",
          radius,
          svgPaths.point((up ? -1 : 1) * radius, (up ? -1 : 1) * radius),
        ) +
        svgPaths.lineOnAxis("h", ((right ? 1 : -1) * radius) / 2) +
        svgPaths.arc(
          "a",
          "0 0,1",
          radius,
          svgPaths.point((up ? -1 : 1) * radius, (up ? -1 : 1) * radius),
        ) +
        svgPaths.lineOnAxis(
          "v",
          (right ? 1 : -1) * (blockHeight - radius * 6),
        ) +
        svgPaths.arc(
          "a",
          "0 0,1",
          radius,
          svgPaths.point((up ? 1 : -1) * radius, (up ? -1 : 1) * radius),
        ) +
        svgPaths.lineOnAxis("h", ((right ? -1 : 1) * radius) / 2) +
        svgPaths.arc(
          "a",
          "0 0,0",
          radius,
          svgPaths.point((up ? 1 : -1) * radius, (up ? -1 : 1) * radius),
        ) +
        svgPaths.arc(
          "a",
          "0 0,1",
          radius,
          svgPaths.point((up ? 1 : -1) * radius, (up ? -1 : 1) * radius),
        )
      );
    };

    return {
      type: this.SHAPES.HEXAGONAL,
      isDynamic: true,
      width: (height: number) => {
        const halfHeight = height / 2;
        const maxWidth = radius * 4;
        return halfHeight > maxWidth ? maxWidth : halfHeight;
      },
      height: (height: number) => {
        return height;
      },
      connectionOffsetY: (connectionHeight: number) => {
        return connectionHeight / 2;
      },
      connectionOffsetX: (connectionWidth: number) => {
        return -connectionWidth;
      },
      pathDown: (height: number) => {
        return makeMainPath(height, false, false);
      },
      pathUp: (height: number) => {
        return makeMainPath(height, true, false);
      },
      pathRightDown: (height: number) => {
        return makeMainPath(height, false, true);
      },
      pathRightUp: (height: number) => {
        return makeMainPath(height, false, true);
      },
    };
  }
 // ZERO documentation btw i had to figure this out
  override getCSS_(selector: string): string[] {
    return [
      ...super.getCSS_(selector),
      `${selector} .blocklySelected>.blocklyPath {`,
      "stroke: none;",
      "}",
      `${selector} .blocklySelected>.blocklyPath.blocklyPathSelected {`,
      "display: none;",
      "}",
    ];
  }

  override shapeFor(connection: Blockly.RenderedConnection): any {
    let checks = connection.getCheck();
    if (!checks && connection.targetConnection) {
      checks = connection.targetConnection.getCheck();
    }
    if (
      connection.type === Blockly.ConnectionType.INPUT_VALUE ||
      connection.type === Blockly.ConnectionType.OUTPUT_VALUE
    ) {
      if (checks && checks.length > 1) {
        return this.ROUNDED;
      } else if (
        checks &&
        (checks.includes("List") || checks.includes("Array"))
      ) {
        return this.SQUARED;
      } else if (checks && checks.includes("Object")) {
        return this.PLUS;
      }
    }
    return super.shapeFor(connection);
  }
}

class PathObject extends Blockly.zelos.PathObject {
  override updateShadow_() {}
}

export default class TuffosRenderer extends Blockly.zelos.Renderer {
  constructor(name: string) {
    super(name);
  }

  override makeConstants_() {
    return new TuffosConstantProvider();
  }

  override makePathObject(
    root: SVGElement,
    style: Blockly.Theme.BlockStyle,
  ): Blockly.zelos.PathObject {
    return new PathObject(
      root,
      style,
      this.getConstants() as Blockly.zelos.ConstantProvider,
    );
  }
}

try {
  Blockly.blockRendering.unregister("tuffos");
} catch (e) {}
Blockly.blockRendering.register("tuffos", TuffosRenderer);
