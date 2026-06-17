import { AlertTriangle, X } from "lucide-react";

interface BrowserCompatibilityModalProps {
  isClosing?: boolean;
  onClose: () => void;
}

export default function BrowserCompatibilityModal({
  isClosing = false,
  onClose,
}: BrowserCompatibilityModalProps) {
  return (
    <div
      className={`modal-overlay ${isClosing ? "is-closing" : ""}`}
      onClick={onClose}
    >
      <div
        className="modal-content browser-compat-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Browser Compatibility</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body browser-compat-modal-body">
          <div className="browser-compat-warning">
            <AlertTriangle size={18} />
            <p>
              Antimony is built and tested primarily for Chromium-based browsers.
              You may encounter bugs and compatibility issues in other browsers.
            </p>
          </div>
          <p className="browser-compat-suggestion">
            For the most reliable experience, consider using the Antimony desktop
            app instead of your current browser.
          </p>
          <button className="btn primary browser-compat-dismiss-btn" onClick={onClose}>
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
