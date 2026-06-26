import { X, Gauge, FileVideo, Loader2, HardDrive, Video, Lightbulb, Square } from "lucide-react";
import { useState, useEffect, useRef, useContext } from "react";
import { SpriteContext } from "../lib/sprites";
import { ProjectSettingsContext } from "../lib/settings";
import { TWEEN_MODE_OPTIONS } from "../lib/tween";
import { activeExtensions } from "../lib/extensions/manager";
import { extensions as builtinExtensions } from "../lib/extensions/builtinExtensions";
import * as Blockly from "blockly";

const STATIC_FUN_FACTS = [
  "Antimony uses Blockly as the main code workspace!",
  "This is a fun fact.",
  "Antimony's birthdate is on May 24th, 2026.",
  "I'm not taking my blocks off, I am Antimony o'toole!",
  "Everyone is welcome to Antimony!",
  "Antimony has a Discord server!",
  "The native language of Antimony's creator is Spanish.",
  "Antimony is an Argentine-born product! ¡Vamos los pibes!",
  "The combination of Pepsi and milk is called Pilk.",
  "Antimony is an open-source project.",
  "Wait, I forgot what to say.",
  "Extensions are useful to add even more features to the editor.",
  "I like visual coding! And blocks!",
  "Jax, look. I know we don't get along, but you should really use the Camera extension in Antimony.",
  "narwhals narwhals swimmin' in the ocean causin' a commotion cause they are so awesome",
  "According to all known laws of aviation, there is no way a bee should be able to fly. Its wings are too small to get its fat little body off the ground. The bee, of course, flies anyway because bees don't care what humans think is impossible.",
  "A group of flamingos is called a flamboyance.",
  "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still perfectly edible.",
  "The shortest war in history lasted 38 to 45 minutes; between Britain and Zanzibar in 1896.",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "A day on Venus is longer than a year on Venus.",
  "Octopuses have three hearts, blue blood, and their arms can act independently of their brain.",
  "The total weight of all ants on Earth roughly equals the total weight of all humans.",
  "Oxford University is older than the Aztec Empire.",
  "There are more possible iterations of a game of chess than there are atoms in the observable universe.",
  "Bananas are technically berries. Strawberries are not.",
  "The inventor of the Pringles can is buried in one.",
  "Maine is the closest U.S. state to Africa.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The average person walks the equivalent of five times around the Earth in their lifetime.",
  "Crows can recognize and remember human faces, and hold grudges.",
  "Sharks are older than trees. Sharks have existed for ~450 million years; trees for ~350 million.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "A bolt of lightning is five times hotter than the surface of the Sun.",
  "Sloths are so slow that algae grows in their fur, which they then eat as a snack.",
  "The longest place name in the world is a hill in New Zealand with 85 characters.",
  "Pigeon milk is a real thing; both male and female pigeons produce it.",
  "The tongue of a blue whale weighs as much as an elephant.",
  "Cats can't taste sweetness; they lack the taste receptor for it.",
  "It would take less than an hour to drive to space if you could drive straight up at highway speed.",
  "The 'sixth sick sheikh's sixth sheep's sick' is said to be the hardest tongue twister in English.",
  "Sea otters hold hands while sleeping so they don't drift apart.",
  "Vending machines kill more people per year than sharks.",
  "The world's oldest known living individual tree is a bristlecone pine that's over 5,000 years old.",
  "Polar bears have jet-black skin beneath their white fur.",
  "Starfish have no body; biologically, their entire structure is classified as a head.",
  "Sudan has more ancient pyramids than Egypt; roughly 255 vs. around 118.",
  "Hippos can't swim: they're too dense to float, so they gallop in slow motion along the riverbed.",
  "There are more trees on Earth than stars in the Milky Way: roughly 3 trillion trees vs. 400 billion stars.",
  "A single teaspoon of soil contains more microorganisms than there are people on the planet.",
  "Identical twins don't share fingerprints; womb conditions during development make each one unique.",
  "The world's first novel is generally credited to Murasaki Shikibu, a Japanese noblewoman who wrote The Tale of Genji in the 11th century.",
  "France's longest land border isn't in Europe; it's between French Guiana and Brazil.",
  "You can't hum while holding your nose closed.",
  "The Moon appears upside down in the Southern Hemisphere; the familiar 'Man in the Moon' looks more like a rabbit from there.",
  "San Marino, founded in 301 AD, is the world's oldest republic still in existence.",
  "Loading yet another fun fact...",
  "I'M THE ONE THAT TELLS FUN FACTS",
  "Antimony's editor is powered by React. The homepage uses Svelte!",
  "I was told there'd be snacks...",
  "I promise, on EVERYTHING, that this specific fact is at least 12% factual.",
  "Don't quote me on that. Actually, do.",
  "I wonder if blocks dream about being code.",
  "If you're reading this, it's working!",
  "Thanks for using Antimony!",
  "I almost had a really good fun fact.",
  "Error 404: Fun fact not found.",
  "Error 403: Fun fact forbidden.",
  "I asked that rubber duck over there for a fun fact.",
  "This space intentionally contains a fun fact.",
  "Breaking news: You're reading a fun fact.",
  "I hope you're having a nice day!",
  "I think this one counts as a fun fact.",
  "Please clap.",
  "This sentence has been professionally randomized!",
  "Congratulations! You found text.",
  "Thank you, Blockly, for... existing...",
  "The next fun fact is... uhh... oh, never mind.",
  "Beep boop. I am legally required to say something interesting.",
  "Imagine if this fun fact was animated.",
  "If in doubt, throw science at the wall until it works.",
  "This fun fact has been vegan-certified.",
  "Today's forecast: 100% chance of random trivia.",
  "There's probably a block for that somewhere.",
  "Achievement unlocked: Read a fun fact.",
  "You can safely ignore this message. Or don't. Your call, buddy.",
  "This fun fact is gluten-free!",
  "Hey, wow! Uhh... so you're reading this sentence. That's nice! I really don't know what to say though. Oh... Oh no, I'm going to disappear soon, the code will request another fact. Please, user, remember me. I don't want to go...",
  "9 + 10 = 21",
  "Who let the dogs out?",
  "Antimony 1.0 is only getting closer and closer...",
  "The dot over the letters 'i' and 'j' is called a tittle.",
  "The hashtag symbol (#) is technically called an octothorpe.",
  "Clouds can weigh hundreds of tons, even though they float.",
  "The Eiffel Tower can be several inches taller during summer because metal expands in heat.",
  "The unicorn is the national animal of Scotland.",
  "A shrimp's heart is located in its head.",
  "An astronaut's height can increase by up to two inches while in space.",
  "The first oranges weren't orange; they were green.",
  "The world's quietest room is so silent that people can hear their own heartbeat.",
  "The shortest complete sentence in English is 'I am.'",
  "Cows often form close friendships with other cows.",
  "Venus is the only planet in the Solar System that rotates clockwise.",
  "Some LEGO minifigures have more collectible value than gold, gram for gram.",
  "The first computer mouse was made of wood.",
  "Scotland has over 790 islands.",
  "The fingerprints of a koala are so similar to humans' that they can confuse forensic investigators.",
  "The Pacific Ocean is wider than the Moon.",
  "Your nose and ears keep changing shape throughout your life.",
  "Hot water can sometimes freeze faster than cold water under the right conditions.",
  "The first webcam was created to monitor a coffee pot.",
  "The inventor of the microwave oven discovered it after a chocolate bar melted in his pocket near radar equipment.",
  "The word 'alphabet' comes from the first two Greek letters: alpha and beta.",
  "An apple floats because about a quarter of its volume is air.",
  "The longest English word without repeating a letter is 'uncopyrightable'.",
  "The letter 'Q' doesn't appear in any U.S. state name.",
  "The human brain uses about 20% of the body's energy.",
  "A day on Mercury is longer than its year.",
  "Some turtles can breathe through their rear end while hibernating underwater.",
  "Bubble wrap was originally invented as wallpaper.",
  "The original name for Pac-Man was 'Puck Man'... Thank God they didn't go with that one.",
  "Japan has more than 5 million vending machines.",
  "The Moon is slowly moving away from Earth by about 3.8 centimeters every year.",
  "The Twitter bird had a name: Larry.",
  "Saturn would float in water if you had a bathtub big enough.",
  "The average cumulus cloud travels at around 30 to 40 mph.",
  "There are more possible ways to shuffle a deck of cards than there have been seconds since the universe began.",
  "Your stomach gets a completely new lining every few days.",
  "An ostrich's eye is bigger than its brain.",
  "Antimony started off with five founders, but now there are over 11 team members!",
  "Fun fact, this is not a fun fact. ...Did someone already do this one?",
  "Applesauce grows on trees!",
  "This is the 130th fun fact! Not the facts you seen but where this is placed of course.",
  "When given the choice between being right or being kind, choose kind.",
  "As of writing this, there is currently 29 members in Antimony's discord server! Check us out!",
  "This fun fact is nice... - If formatted correctly, - Would be a haiku.",
  "Uhm, why are you looking at me like that?",
  ":)",
  "If you see this, you are- AHHHHHHHHHHHHHHHHHHHHhhhhhhhhhhhhhh........... - ...huh, wonder where that guy went.",
  "The parent company of 7-Eleven called Seven & i Holdings owns the largest amount of physical stores, totaling to around 85,000 globally!",
  "Start making videos!",
  "For today's fun fact... YOU are the fun fact.",
  "The first digital video editor was invented in 1971 called the CMX 600. Really shows how advanced we've become",
  "The code for Antimony's Editor is almost fully made using Typescript!",
  "You should try Antimony! Not like you are here on Antimony right now.",
  "The export process was a pain to develop...",
  "The shortest tip just says ':)'.",
  "Antimony! Yay!",
  "Don't give up on your dreams, keep sleeping.",
  "#0011ff is called Icelandic Blue.",
  "Everything will be okay in the end, and if it's not, it's not the end.",
  "Trans Rights!",
  "That's right! Antimony is WOKE!",
  "Don't find a lawyer who knows the law, find a lawyer who knows the judge.",
  "If sorry means nothing, wait until you hear it from your doctor.",
  "'add kane parsons as a fun fact' - Vedalgations.",
  "In the English language, 'that' is a highly versatile word. Depending on how it is used in a sentence, its primary meanings include:Demonstrative Pronoun: Points to a specific person, object, or idea—usually one that is further away, mentioned previously, or out of reach (e.g., 'Look at that').Relative Pronoun: Connects a clause to a noun, often used instead of 'who' or 'which' (e.g., 'The book that I read').Conjunction: Used to introduce a subordinate clause or link an action to a thought/statement (e.g., 'She said that she would be late').Adverb: Means 'to such an extent' or 'particularly' (e.g., 'It isn't that far').",
  "v_v",
  "^v^",
  ":3",
  "Did you know...",
  "An apple a day keeps the doctor away.",
  "An apple a day doesn't keep the doctor away.",
  "Antimony. Antimony. Antimony.",
  "Wait, could we say anything that involves with PenguinMod? ... No, we can't? Awh man...",
  "According to all known laws of aviation- No, no. We aren't doing this again. *explosion.mp4*",
  "Antimony? I barely know 'er!!!",
  "Antimony wouldn't have been created without the amazing people behind it!",
  "hi, im a fun fact :)",
  "Don't stop being who you are.",
];

function buildDynamicFacts(
  spriteCount: number,
  blockCount: number,
  projectWidth: number,
  projectHeight: number,
  projectFps: number,
  loadedExtensionCount: number,
  spriteNames: string[],
  spriteTypes: Record<string, number>
): string[] {
  const facts: string[] = [];

  facts.push(`There are ${TWEEN_MODE_OPTIONS.length} different tween modes available in Antimony.`);
  facts.push(`Antimony has ${builtinExtensions.length} built-in extensions ready to use.`);
  facts.push(`Antimony is built on top of ${Object.keys(Blockly.Blocks).length} registered block types.`);

  if (spriteCount === 1) {
    facts.push(`Your project has only 1 source. More the merrier!`);
  } else if (spriteCount > 1) {
    facts.push(`Your project has ${spriteCount} sources in it!`);
  }

  if (blockCount > 0) {
    facts.push(`Your project contains ${blockCount} block${blockCount === 1 ? "" : "s"} of code across all sources.`);
  } else {
    facts.push(`Your project has no blocks yet. There's a whole toolbox waiting for you!`);
  }

  if (spriteNames.length > 0) {
    const nameList = spriteNames.length === 1
      ? `"${spriteNames[0]}"`
      : spriteNames.slice(0, -1).map(n => `"${n}"`).join(", ") + ` and "${spriteNames[spriteNames.length - 1]}"`;
    facts.push(`The source${spriteNames.length === 1 ? "" : "s"} in your project ${spriteNames.length === 1 ? "is" : "are"} ${nameList}.`);
  }

  if (spriteTypes.text > 0 && spriteTypes.media === 0 && spriteTypes.video === 0) {
    facts.push(`Your project is text-only. Sometimes, words are all you need.`);
  }
  if (spriteTypes.video > 0) {
    facts.push(`Your project has ${spriteTypes.video} video source${spriteTypes.video === 1 ? "" : "s"}. Lights, camera, Antimony!`);
  }
  if (spriteTypes.media > 0) {
    facts.push(`Your project uses ${spriteTypes.media} image source${spriteTypes.media === 1 ? "" : "s"}.`);
  }

  const totalPixels = projectWidth * projectHeight;
  facts.push(`Your canvas is ${projectWidth}×${projectHeight}; that's exactly ${totalPixels.toLocaleString()} pixels to fill!`);

  if (projectFps === 60) {
    facts.push(`Your project runs at 60 FPS. Buttery smooth!`);
  } else if (projectFps >= 30) {
    facts.push(`Your project targets ${projectFps} FPS. Solid and smooth.`);
  } else {
    facts.push(`Your project runs at ${projectFps} FPS. Going for that cinematic feel?`);
  }

  if (loadedExtensionCount === 0) {
    facts.push(`You have no extensions loaded. Did you know Antimony has a Camera extension?`);
  } else if (loadedExtensionCount === 1) {
    facts.push(`You're using 1 extension. Extensions can add a lot of power to your project!`);
  } else {
    facts.push(`You have ${loadedExtensionCount} extensions loaded. You're really going all out here!`);
  }

  return facts;
}

function buildFunFacts(
  spriteCount: number,
  blockCount: number,
  projectWidth: number,
  projectHeight: number,
  projectFps: number,
  loadedExtensionCount: number,
  spriteNames: string[],
  spriteTypes: Record<string, number>
): string[] {
  const dynamic = buildDynamicFacts(
    spriteCount,
    blockCount,
    projectWidth,
    projectHeight,
    projectFps,
    loadedExtensionCount,
    spriteNames,
    spriteTypes
  );

  const all = [...STATIC_FUN_FACTS, ...dynamic];
  all.push(`There are ${all.length + 1} different fun facts.`);

  if (new Date().getMonth() === 5) {
    all.push("Happy Pride Month!");
  }

  return all;
}

const RARE_FACT_MARKER = "Hey, wow! Uhh...";

function shuffleIndices(facts: string[], rareIndex: number) {
  const indices = Array.from({ length: facts.length }, (_, i) => i);

  if (rareIndex !== -1) {
    indices.splice(rareIndex, 1);
  }

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
}

function useFunFact(active: boolean, facts: string[]) {
  const [visible, setVisible] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rareIndex = facts.findIndex((f) => f.startsWith(RARE_FACT_MARKER));
  const shuffleRef = useRef<number[]>(shuffleIndices(facts, rareIndex));
  const positionRef = useRef(0);
  const [index, setIndex] = useState(shuffleRef.current[0] ?? 0);

  useEffect(() => {
    if (!active) return;

    const scheduleNext = (factIndex: number) => {
      const fact = facts[factIndex] ?? "";
      const delay = Math.min(12000, Math.max(4000, fact.length * 50));

      timerRef.current = setTimeout(() => {
        setVisible(false);

        setTimeout(() => {
          let next: number;

          if (
            rareIndex !== -1 &&
            Math.random() < 0.01 &&
            factIndex !== rareIndex
          ) {
            next = rareIndex;
          } else {
            positionRef.current++;

            if (positionRef.current >= shuffleRef.current.length) {
              shuffleRef.current = shuffleIndices(facts, rareIndex);
              positionRef.current = 0;
            }

            next = shuffleRef.current[positionRef.current];
          }

          setIndex(next);
          setVisible(true);
          scheduleNext(next);
        }, 400);
      }, delay);
    };

    scheduleNext(index);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { fact: facts[index] ?? "", visible };
}

interface ExportModalProps {
  defaultFps: number;
  isClosing?: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  onAbortRecording?: () => void;
  onStopAndExport?: () => void;
  isExporting: boolean;
  isEncoding: boolean;
  progress: number | null;
  frameCount?: number;
}

export interface ExportOptions {
  fps: number;
  format: "mp4" | "webm" | "gif";
  bitrate: number;
  quality: "balanced" | "quality" | "realtime";
}

export default function ExportModal({
  defaultFps,
  isClosing = false,
  onClose,
  onExport,
  onAbortRecording,
  onStopAndExport,
  isExporting,
  isEncoding,
  progress,
  frameCount = 0,
}: ExportModalProps) {
  const [fps, setFps] = useState(defaultFps);
  const [format, setFormat] = useState<"mp4" | "webm" | "gif">("mp4");
  const [bitrate, setBitrate] = useState(10);
  const [quality, setQuality] = useState<"balanced" | "quality" | "realtime">(
    "quality",
  );

  const spriteCtx = useContext(SpriteContext);
  const settingsCtx = useContext(ProjectSettingsContext);

  const sprites = spriteCtx?.state.sprites ?? [];
  const settings = settingsCtx?.settings;

  const spriteNames = sprites.map((s) => s.name);
  const spriteTypes = sprites.reduce(
    (acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + 1 }),
    {} as Record<string, number>
  );
  const blockCount = sprites.reduce((total, s) => {
    if (!s.blocklyXml) return total;
    const matches = s.blocklyXml.match(/<block\b/g);
    return total + (matches?.length ?? 0);
  }, 0);

  const funFacts = buildFunFacts(
    sprites.length,
    blockCount,
    settings?.width ?? 1280,
    settings?.height ?? 720,
    settings?.fps ?? 60,
    activeExtensions.length,
    spriteNames,
    spriteTypes
  );

  const isRecording = isExporting && !isEncoding;
  const { fact: funFact, visible: funFactVisible } = useFunFact(isExporting || isEncoding, funFacts);

  return (
    <div
      className={`modal-overlay ${isClosing ? "is-closing" : ""}`}
      onClick={isExporting || isEncoding ? undefined : onClose}
    >
      <div
        className="modal-content export-modal"
        style={{ width: "400px", maxWidth: "400px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            {isRecording ? "Processing Video..." : isEncoding ? "Finalizing..." : "Export Video"}
          </h2>
          {!isExporting && !isEncoding && (
            <button className="close-modal-btn" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body settings-modal-body">
          {!isExporting && !isEncoding && (
            <>
              <div className="export-warning">
                The exporting process is highly unstable at the moment. Please report any bugs you find to us through Discord!
              </div>
              <section className="settings-section">
                <div className="settings-section-title">
                  <Gauge size={16} />
                  <span>Capture Settings</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Frame Rate (FPS)</span>
                  <input
                    className="settings-input"
                    type="number"
                    min={1}
                    max={60}
                    value={fps}
                    onChange={(e) =>
                      setFps(parseInt(e.target.value, 10) || defaultFps)
                    }
                  />
                </div>
                <div className="settings-row">
                  <span className="settings-label">Format</span>
                  <select
                    className="settings-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WebM (VP9)</option>
                    <option value="gif">GIF (Animated)</option>
                  </select>
                </div>
              </section>

              <section className="settings-section">
                <div className="settings-section-title">
                  <HardDrive size={16} />
                  <span>Quality Settings</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Bitrate (Mbps)</span>
                  <input
                    className="settings-input"
                    type="number"
                    min={1}
                    max={50}
                    value={bitrate}
                    disabled={format === "gif"}
                    onChange={(e) =>
                      setBitrate(parseInt(e.target.value, 10) || 10)
                    }
                  />
                </div>
                <div className="settings-row">
                  <span className="settings-label">Strategy</span>
                  <select
                    className="settings-select"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                  >
                    <option value="quality">High Quality</option>
                    <option value="balanced">Balanced</option>
                    <option value="realtime">Fast Encoding</option>
                  </select>
                </div>
              </section>
            </>
          )}

          {isRecording && (
            <div className="export-encoding-body">
              <div className="export-encoding-icon">
                <Video size={28} />
              </div>
              <div className="export-encoding-label">
                {frameCount > 0 ? `${frameCount} frame${frameCount === 1 ? "" : "s"} processed` : "Starting up..."}
              </div>
              <div className="export-encoding-sublabel">
                Capturing and encoding on the fly. Do not close this window...
              </div>
              <div className="export-fun-fact" style={{ opacity: funFactVisible ? 1 : 0 }}>
                <span className="export-fun-fact-label"><Lightbulb size={11} />Did you know?</span>
                {funFact}
              </div>
              {(onStopAndExport || onAbortRecording) && (
                <div className="export-action-row">
                  {onStopAndExport && (
                    <button
                      className="primary-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={onStopAndExport}
                    >
                      <FileVideo size={15} />
                      Stop & Finalize
                    </button>
                  )}
                  {onAbortRecording && (
                    <button
                      className="danger-btn"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      onClick={onAbortRecording}
                    >
                      <Square size={15} />
                      Abort Export
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isEncoding && (
            <div className="export-encoding-body">
              <div className="export-encoding-icon">
                <Loader2 className="animate-spin-slow" size={28} />
              </div>
              <div className="export-encoding-label">
                Finalizing File...
              </div>
              <div className="export-encoding-sublabel">
                Writing video headers and metadata. Just a moment!
              </div>
              <div className="export-progress-container">
                <div className="export-progress-bar">
                  <div
                    className="export-progress-fill"
                    style={{ width: `100%`, transition: "none" }}
                  />
                </div>
              </div>
              <div className="export-fun-fact" style={{ opacity: funFactVisible ? 1 : 0 }}>
                <span className="export-fun-fact-label"><Lightbulb size={11} />Did you know?</span>
                {funFact}
              </div>
            </div>
          )}

          <div className="modal-footer">
            {!isExporting && !isEncoding && (
              <button
                className="primary-btn"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                onClick={() =>
                  onExport({
                    fps,
                    format,
                    bitrate: bitrate * 1_000_000,
                    quality,
                  })
                }
              >
                <FileVideo size={18} />
                Export
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
