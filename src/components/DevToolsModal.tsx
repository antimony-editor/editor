import * as Blockly from "blockly/core";
import { X } from "lucide-react";

interface DevToolsModalProps {
  isClosing?: boolean;
  onClose: () => void;
}

export default function DevToolsModal({
  isClosing = false,
  onClose,
}: DevToolsModalProps) {
  function logWorkspaceXML() {
    const workspace = Blockly.getMainWorkspace();
    if (!workspace) {
      console.error("No Blockly workspace found.");
      return;
    }
    const xml = Blockly.Xml.workspaceToDom(workspace);
    const xmlString = Blockly.Xml.domToPrettyText(xml);
    console.log("Workspace XML:\n", xmlString);
  }

  return (
    <div className={`modal-overlay ${isClosing ? "is-closing" : ""}`}>
      <div
        className="modal-content credits-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Developer Tools</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body credits-modal-body">
          <button onClick={logWorkspaceXML}>Log Workspace XML</button>
        </div>
      </div>
    </div>
  );
}
