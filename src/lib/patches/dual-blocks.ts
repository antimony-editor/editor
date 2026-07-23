import * as Blockly from "blockly/core";

export class ChameleonConnectionChecker
  extends Blockly.ConnectionChecker
  implements Blockly.IConnectionChecker
{
  /**
   * @param a One of the connections.
   * @param b The other connection.
   * @returns True if they are allowed to connect.
   */
  override doTypeChecks(a: Blockly.Connection, b: Blockly.Connection): boolean {
    if (!super.doTypeChecks(a, b)) {
      return false;
    }

    if (this.violatesExclusivity(a, b) || this.violatesExclusivity(b, a)) {
      return false;
    }

    return true;
  }

  /**
   * @param conn The connection belonging to the block being checked.
   * @param target The target connection it's trying to connect to.
   * @returns True if it violates exclusivity.
   */
  private violatesExclusivity(
    conn: Blockly.Connection,
    target: Blockly.Connection,
  ): boolean {
    const block: Blockly.Block | null = conn.getSourceBlock();
    if (!block) {
      return false;
    }

    const hasOutput = !!block.outputConnection;
    const hasPrevious = !!block.previousConnection;
    const hasNext = !!block.nextConnection;
    const isDualBlock = hasOutput && (hasPrevious || hasNext);

    if (!isDualBlock) {
      return false;
    }

    if (conn === block.outputConnection) {
      const isPrevConnected = !!(
        block.previousConnection && block.previousConnection.isConnected()
      );
      const isNextConnected = !!(
        block.nextConnection && block.nextConnection.isConnected()
      );

      if (isPrevConnected || isNextConnected) {
        return true;
      }
    }

    if (conn === block.previousConnection || conn === block.nextConnection) {
      const isOutputConnected = !!(
        block.outputConnection && block.outputConnection.isConnected()
      );

      if (isOutputConnected) {
        return true;
      }
    }

    return false;
  }
}

Blockly.registry.register(
  Blockly.registry.Type.CONNECTION_CHECKER,
  Blockly.registry.DEFAULT,
  ChameleonConnectionChecker,
  true,
);

/**
 * this is nt a fix but Ok
 */
export type DualMode = "inert" | "stack" | "input";

export interface DualBlock extends Blockly.BlockSvg {
  mode_: DualMode;
  updateShape_: () => void;
}

function isDualMode(value: string | null): value is DualMode {
  return value === "inert" || value === "stack" || value === "input";
}

export function createPolymorphicDualMixin(
  statementCheck: string | string[] | null = "default",
) {
  return {
    updateShape_(this: DualBlock) {
      switch (this.mode_) {
        case "stack": {
          const check =
            this.previousConnection?.targetConnection?.getCheck() ??
            statementCheck;
          this.setOutput(false);
          this.setPreviousStatement(true, check);
          this.setNextStatement(true, check);
          break;
        }
        case "input": {
          const check =
            this.outputConnection?.targetConnection?.getCheck() ?? null;
          this.setOutput(true, check);
          this.setPreviousStatement(false);
          this.setNextStatement(false);
          break;
        }
        case "inert":
        default:
          this.setOutput(true, null);
          this.setPreviousStatement(true, statementCheck);
          this.setNextStatement(true, statementCheck);
          break;
      }
    },

    mutationToDom(this: DualBlock) {
      const container = Blockly.utils.xml.createElement("mutation");
      container.setAttribute("mode", this.mode_);
      return container;
    },

    domToMutation(this: DualBlock, xmlElement: Element) {
      const mode = xmlElement.getAttribute("mode");
      this.mode_ = isDualMode(mode) ? mode : "inert";
      this.updateShape_();
    },

    onchange(this: DualBlock, event: Blockly.Events.Abstract) {
      if (this.isInFlyout || !this.workspace || this.isDeadOrDying()) return;
      if (event.type !== Blockly.Events.BLOCK_DRAG) return;
      if ((event as Blockly.Events.BlockDrag).isStart) return;

      const inInput = !!this.outputConnection?.isConnected();
      const inStack = !!(
        this.previousConnection?.isConnected() ||
        this.nextConnection?.isConnected()
      );
      const nextMode: DualMode = inInput ? "input" : inStack ? "stack" : "inert";
      if (nextMode === this.mode_) return;

      const existingGroup = Blockly.Events.getGroup();
      Blockly.Events.setGroup(event.group || existingGroup || true);
      try {
        this.mode_ = nextMode;
        this.updateShape_();
      } finally {
        Blockly.Events.setGroup(existingGroup);
      }
    },
  };
}
