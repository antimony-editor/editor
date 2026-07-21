import { useState } from "react";
import { ProjectSettings, RESOLUTION_PRESETS } from "../lib/settings";
import { Resolution, ResolutionEdit } from "./Resolution";

interface WelcomeModalProps {
  isClosing?: boolean;
  onClose: (settings: ProjectSettings, projectName: string) => void;
  onLoad: () => void;
  initialSettings: ProjectSettings;
  initialProjectName: string;
}

const FPS_PRESETS = [30, 60, 120, 144, 240];

const SUBTITLES = [
  "What do you want to create today?",
  "Let's make something great.",
  "Ready when you are.",
  "Time to bring an idea to life.",
  "What's the vision?",
  "Your next project starts here.",
  "Build something amazing.",
  "Every great idea starts somewhere.",
  "What are we making today?",
  "Bring your imagination.",
  "Turn ideas into reality.",
  "Let's create together.",
  "What's on your mind?",
  "Dream it. Build it. Piece it.",
  "Start with an idea.",
  "Ready to make progress?",
  "Create without limits.",
  "Let's get to work.",
  "Your project is waiting.",
  "Make something you'll be proud of!",
];

const NIGHT_GREETINGS = [
  "Good night!",
  "Late night session?",
  "Still up?",
  "What's keeping you awake?",
  "The night is young...",
  "Creating after dark?",
  "Can't sleep? Let's build.",
  "Night owls welcome.",
  "Making ideas happen tonight?",
  "One more project before bed?",
];

const MORNING_GREETINGS = [
  "Good morning!",
  "Morning!",
  "Rise and create.",
  "Rise and shine!",
  "A fresh start awaits.",
  "Ready to kick off the day?",
  "Let's make today productive.",
  "Hope you're feeling inspired.",
  "Are you ready? Let's begin.",
  "A new day, new ideas.",
  "Let's build something today.",
  "Time to get creative.",
];

const AFTERNOON_GREETINGS = [
  "Good afternoon!",
  "Afternoon!",
  "Hope your day's going well.",
  "Back at it?",
  "Let's keep the momentum going.",
  "Ready for your next idea?",
  "Hope you're having a productive day.",
  "Let's make this afternoon count.",
];

const EVENING_GREETINGS = [
  "Good evening!",
  "Evening!",
  "Winding down or just getting started?",
  "Hope you're having a great evening.",
  "Ready to create tonight?",
  "Ending the day with a project?",
  "Let's finish the day strong.",
  "An evening of creativity awaits.",
  "Perfect time to build something.",
  "What's on the agenda tonight?",
];

function getTimeGreeting() {
  const hour = new Date().getHours();
  const greetings =
    hour < 5
      ? NIGHT_GREETINGS
      : hour < 12
        ? MORNING_GREETINGS
        : hour < 18
          ? AFTERNOON_GREETINGS
          : EVENING_GREETINGS;
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function pickSubtitle() {
  const pool = [...SUBTITLES, getTimeGreeting()];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function WelcomeModal({
  isClosing = false,
  onClose,
  onLoad,
  initialSettings,
  initialProjectName,
}: WelcomeModalProps) {
  const [settings, setSettings] = useState<ProjectSettings>(initialSettings);
  const [projectName, setProjectName] = useState(initialProjectName);
  const [subtitle] = useState(pickSubtitle);

  const colors = ["#fdc700", "#ff6467", "#51a2ff"];
  const title = "ANTIMONY";

  return (
    <div
      className={`modal-overlay welcome-modal-overlay ${isClosing ? "is-closing" : ""}`}
    >
      <div
        className="modal-content welcome-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="welcome-modal-header">
          <p className="welcome-subtitle-top">Welcome to</p>
          <h1 className="welcome-title">
            {title.split("").map((char, i) => (
              <span
                key={i}
                style={{
                  color: colors[i % colors.length],
                  animationDelay: `${i * 0.05}s, ${0.6 + i * 0.15}s`,
                  textShadow: `
                    0 0 10px ${colors[i % colors.length]}33,
                    0 0 20px ${colors[i % colors.length]}22
                  `,
                }}
              >
                {char}
              </span>
            ))}
          </h1>
          <p className="welcome-subtitle-bottom">{subtitle}</p>
        </div>

        <div className="welcome-modal-body">
          <div className="welcome-settings-section">
            <label>Project Name</label>
            <input
              type="text"
              className="welcome-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Untitled Project"
            />
          </div>

          <div className="welcome-settings-section">
            <label>Resolution</label>
            <div className="welcome-presets-grid-scrollable">
              {RESOLUTION_PRESETS.map((preset) => (
                <Resolution
                  width={preset.width}
                  height={preset.height}
                  label={preset.label}
                  callback={() => {
                    setSettings({
                      ...settings,
                      width: preset.width,
                      height: preset.height,
                    });
                  }}
                  selected={
                    settings.width === preset.width &&
                    settings.height === preset.height
                  }
                />
              ))}
              <ResolutionEdit
                width={settings.width}
                height={settings.height}
                callback={(w, h) => {
                  setSettings({ ...settings, width: w, height: h });
                }}
                selected={
                  !RESOLUTION_PRESETS.some(
                    (p) =>
                      p.width === settings.width &&
                      p.height === settings.height,
                  )
                }
              />
            </div>
          </div>

          <div className="welcome-settings-section">
            <label>Framerate (FPS)</label>
            <div className="welcome-presets-grid">
              {FPS_PRESETS.map((fps) => (
                <button
                  key={fps}
                  className={`welcome-preset-btn ${
                    settings.fps === fps ? "active" : ""
                  }`}
                  onClick={() => setSettings({ ...settings, fps })}
                >
                  {fps}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn primary welcome-start-btn"
            onClick={() => onClose(settings, projectName)}
          >
            Start Creating
          </button>
          <button className="btn welcome-load-btn" onClick={onLoad}>
            Load Existing Project
          </button>
        </div>
      </div>
    </div>
  );
}
