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
  true 
);
