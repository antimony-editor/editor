import { isBlockVisibleFor, type BlockSourceType } from "./blockVisibility";

export default function (mediaType: BlockSourceType) {
  function block(blockType: string, ...children: string[]): string {
    if (!isBlockVisibleFor(blockType, mediaType)) return "";
    const inner = children.filter(Boolean).join("");
    return `<block type="${blockType}">${inner}</block>`;
  }

  function value(name: string, ...children: string[]): string {
    const inner = children.filter(Boolean).join("");
    return `<value name="${name}">${inner}</value>`;
  }

  function shadow(type: string, ...children: string[]): string {
    const inner = children.filter(Boolean).join("");
    return `<shadow type="${type}">${inner}</shadow>`;
  }

  function textShadow(defaultValue: string): string {
    return `<shadow type="text"><field name="TEXT">${defaultValue}</field></shadow>`;
  }

  function field(name: string, value: string | number): string {
    return `<field name="${name}">${value}</field>`;
  }

  function sep(gap?: string | number): string {
    return gap != null ? `<sep gap="${gap}"></sep>` : "<sep></sep>";
  }

  function mutation(items: string): string {
    return `<mutation items="${items}"></mutation>`;
  }

  return `<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Logic" categorystyle="logic_blocks">
    ${block(
      "logic_compare",
      value("A", shadow("math_number", field("NUM", 0))),
      value("B", shadow("math_number", field("NUM", 0)))
    )}
    ${block(
      "logic_operation",
      value("A", shadow("checkbox", field("BOOL", "FALSE"))),
      value("B", shadow("checkbox", field("BOOL", "FALSE")))
    )}
    ${block("logic_negate", value("BOOL", shadow("checkbox", field("BOOL", "FALSE"))))}
    ${block("checkbox")}
    ${block("logic_null")}
    ${sep(50)}
    ${block("controls_if")}
    ${block("controls_ifelse")}
    ${block(
      "logic_ternary",
      value("IF", shadow("checkbox", field("BOOL", "FALSE"))),
      value("THEN", textShadow("")),
      value("ELSE", textShadow(""))
    )}
    ${sep(50)}
    ${block("logic_switch", value("VALUE", textShadow("")))}
    ${block("logic_case", value("VALUE", textShadow("")))}
    ${block("logic_default")}
    ${block("logic_exit_case")}
    ${block("logic_runNextCaseWhen", value("VALUE", textShadow("")))}
  </category>
  <category name="Loops" categorystyle="loop_blocks">
    ${block(
      "controls_repeat_ext",
      value("TIMES", shadow("math_number", field("NUM", 10)))
    )}
    ${block("controls_forever")}
    ${block(
      "controls_forLoop",
      value("VAR", block("controls_forLoop_var")),
      value("START", shadow("math_number", field("NUM", 1))),
      value("END", shadow("math_number", field("NUM", 10)))
    )}
    ${block(
      "controls_for",
      value("FROM", shadow("math_number", field("NUM", 1))),
      value("TO", shadow("math_number", field("NUM", 10))),
      value("BY", shadow("math_number", field("NUM", 1)))
    )}
    ${block("controls_forEach")}
    ${sep(50)}
    ${block(
      "controls_whileUntil",
      value("BOOL", shadow("checkbox", field("BOOL", "FALSE")))
    )}
    ${block("controls_flow_statements")}
  </category>
  <category name="Math" categorystyle="math_blocks">
    ${block(
      "math_arithmetic",
      value("A", shadow("math_number", field("NUM", 1))),
      value("B", shadow("math_number", field("NUM", 1)))
    )}
    ${block("math_single", value("NUM", shadow("math_number", field("NUM", 9))))}
    ${block(
      "math_modulo",
      value("DIVIDEND", shadow("math_number", field("NUM", 64))),
      value("DIVISOR", shadow("math_number", field("NUM", 10)))
    )}
    ${block("math_constants")}
    ${block("math_trig", value("NUM", shadow("math_number", field("NUM", 45))))}
    ${block("math_round", value("NUM", shadow("math_number", field("NUM", 3.1))))}
    ${block(
      "math_number_property",
      value("NUMBER_TO_CHECK", shadow("math_number", field("NUM", 0)))
    )}
    ${block(
      "math_random_int",
      value("FROM", shadow("math_number", field("NUM", 1))),
      value("TO", shadow("math_number", field("NUM", 100)))
    )}
    ${block("math_random_float")}
    ${block(
      "math_constrain",
      value("VALUE", shadow("math_number", field("NUM", 50))),
      value("LOW", shadow("math_number", field("NUM", 1))),
      value("HIGH", shadow("math_number", field("NUM", 100)))
    )}
    ${block("math_on_list")}
  </category>
  <category name="Text" categorystyle="text_blocks">
    ${block("text_setText", value("TEXT", shadow("text", field("TEXT", "Hello!"))))}
    ${block("text_join")}
    ${block("text_append", value("TEXT", textShadow("")))}
    ${block("text_changeCase", value("TEXT", textShadow("")))}
    ${block("text_trim", value("TEXT", textShadow("")))}
    ${sep(50)}
    ${block("text_length", value("VALUE", shadow("text", field("TEXT", "abc"))))}
    ${block("text_isEmpty", value("VALUE", textShadow("")))}
    ${block(
      "text_indexOf",
      value("VALUE", textShadow("")),
      value("FIND", textShadow(""))
    )}
    ${block(
      "text_charAt",
      value("VALUE", textShadow("")),
      value("AT", shadow("math_number", field("NUM", 0)))
    )}
    ${block(
      "text_getSubstring",
      value("STRING", textShadow("")),
      value("AT1", shadow("math_number", field("NUM", 0))),
      value("AT2", shadow("math_number", field("NUM", 0)))
    )}
    ${sep(50)}
    ${block("text_print", value("TEXT", shadow("text", field("TEXT", "abc"))))}
    ${block("text_prompt_ext", value("TEXT", textShadow("")))}
  </category>
  <category name="Lists" categorystyle="list_blocks">
    ${block("lists_create_with")}
    ${block("lists_repeat", value("NUM", shadow("math_number", field("NUM", 5))))}
    ${sep(50)}
    ${block("lists_split")}
    ${block("lists_length")}
    ${block("lists_isEmpty")}
    ${block("lists_indexOf")}
    ${block("lists_getIndex")}
    ${block("lists_setIndex")}
    ${block("lists_getSublist")}
    ${block("lists_sort")}
  </category>
  <category name="Dictionaries" categorystyle="dict_blocks">
    ${block("dicts_create_with")}
    ${sep(50)}
    ${block(
      "dicts_get_value",
      value("DICT", shadow("dicts_create_with", mutation("0"))),
      value("KEY", shadow("text", field("TEXT", "key1")))
    )}
    ${block(
      "dicts_delete_key",
      value("DICT", shadow("dicts_create_with", mutation("0"))),
      value("KEY", shadow("text", field("TEXT", "key1")))
    )}
  </category>
  <category name="Motion" categorystyle="motion_blocks">
    ${block(
      "motion_goTo",
      value("X", shadow("math_number", field("NUM", 0))),
      value("Y", shadow("math_number", field("NUM", 0)))
    )}
    ${block(
      "motion_moveBy",
      value("DX", shadow("math_number", field("NUM", 10))),
      value("DY", shadow("math_number", field("NUM", 0)))
    )}
    ${block(
      "motion_glideSecsTo",
      value("SECS", shadow("math_number", field("NUM", 1))),
      value("X", shadow("math_number", field("NUM", 0))),
      value("Y", shadow("math_number", field("NUM", 0)))
    )}
    ${sep(50)}
    ${block("motion_moveSteps", value("STEPS", shadow("math_number", field("NUM", 10))))}
    ${block(
      "motion_setXY",
      field("AXIS", "X"),
      value("VALUE", shadow("math_number", field("NUM", 0)))
    )}
    ${sep(50)}
    ${block(
      "motion_pointDirection",
      value("ANGLE", shadow("math_number", field("NUM", 90)))
    )}
    ${block("motion_rotate", value("ANGLE", shadow("math_number", field("NUM", 15))))}
    ${sep(50)}
    ${block("motion_getXY")}
    ${sep(50)}
    ${block(
      "motion_setCharPosition",
      value("INDEX", shadow("math_number", field("NUM", 1))),
      value("X", shadow("math_number", field("NUM", 0))),
      value("Y", shadow("math_number", field("NUM", 0)))
    )}
    ${block(
      "motion_tweenCharPosition",
      value("INDEX", shadow("math_number", field("NUM", 1))),
      value("X", shadow("math_number", field("NUM", 0))),
      value("Y", shadow("math_number", field("NUM", 0))),
      value("DURATION", shadow("math_number", field("NUM", 1)))
    )}
    ${block(
      "motion_forEachCharacter",
      value("VAR", block("motion_forEachCharacter_var"))
    )}
  </category>
  <category name="Appearance" categorystyle="appearance_blocks">
    ${block("appearance_show")}
    ${block("appearance_hide")}
    ${sep(50)}
    ${block(
      "appearance_setSize",
      value("SIZE", shadow("math_number", field("NUM", 100)))
    )}
    ${block(
      "appearance_changeSize",
      value("CHANGE", shadow("math_number", field("NUM", 10)))
    )}
    ${block("appearance_getSize")}
    ${sep(50)}
    ${block(
      "appearance_setOpacity",
      value("OPACITY", shadow("math_number", field("NUM", 100)))
    )}
    ${block("appearance_getOpacity")}
    ${block("appearance_setColor")}
    ${block("appearance_flip")}
    ${sep(50)}
    ${block(
      "appearance_setImageIndex",
      value("INDEX", shadow("math_number", field("NUM", 1)))
    )}
    ${block("appearance_setImageName", value("NAME", textShadow("Image 1")))}
    ${block("appearance_nextImage")}
    ${block("appearance_getImageIndex")}
    ${block("appearance_getImageName")}
    ${block("appearance_getImageCount")}
  </category>
  <category name="Timing" categorystyle="timing_blocks">
    ${block("on_start")}
    ${block("timing_getCurrentTime")}
    ${block("wait_seconds", value("SECONDS", shadow("math_number", field("NUM", 1))))}
  </category>
  <category name="Effects" categorystyle="effects_blocks">
    ${block(
      "effects_tween",
      value("VALUE", shadow("math_number", field("NUM", 100))),
      value("DURATION", shadow("math_number", field("NUM", 1)))
    )}
    ${block("effects_setTweenMode")}
    ${block("effects_setPropertyTweenMode")}
    ${block("effects_resetPropertyTweenMode")}
    ${sep(50)}
    ${block("effects_shake", value("INTENSITY", shadow("math_number", field("NUM", 5))))}
    ${block("effects_spin", value("TIMES", shadow("math_number", field("NUM", 1))))}
    ${block("effects_pulse")}
    ${block("effects_set_canvas", value("VALUE", shadow("math_number", field("NUM", 0))))}
    ${block("effects_get_canvas")}
    ${block("effects_clear_canvas")}
    ${block(
      "effects_change_canvas",
      value("DELTA", shadow("math_number", field("NUM", 5)))
    )}
  </category>
  <category name="Layers" categorystyle="layers_blocks">
    ${block("layers_sendToFront")}
    ${block("layers_sendToBack")}
    ${block("layers_sendForward", value("Z", shadow("math_number", field("NUM", 0))))}
    ${block("layers_setZIndex", value("Z", shadow("math_number", field("NUM", 0))))}
    ${block("layers_getZIndex")}
  </category>
  <category name="Sensors" categorystyle="sensors_blocks">
    ${block("sensors_mouseX")}
    ${block("sensors_mouseY")}
    ${block("sensors_mouseDown")}
    ${block("sensors_keyPressed_preset")}
    ${block(
      "sensors_keyPressed_custom",
      value("KEY", shadow("text", field("TEXT", "a")))
    )}
    ${sep(50)}
    ${block("sensors_resetTimer")}
    ${block("sensors_getTimer")}
    ${sep(50)}
    ${block("sensors_distanceToMouse")}
    ${block(
      "sensors_distanceToSprite",
      value("NAME", shadow("text", field("TEXT", "Sprite 1")))
    )}
    ${block("sensors_touchingMouse")}
    ${block(
      "sensors_touchingSprite",
      value("NAME", shadow("text", field("TEXT", "Sprite 1")))
    )}
    ${block("sensors_touchingEdge")}
    ${sep(50)}
    ${block("sensors_stageWidth")}
    ${block("sensors_stageHeight")}
  </category>
  <category name="Audio" categorystyle="audio_blocks">
    ${block("audio_play")}
    ${block("audio_playUntilDone")}
    ${block("audio_loop")}
    ${block("audio_stop")}
    ${block("audio_stopAll")}
    ${sep(50)}
    ${block("audio_setVolume", value("VOLUME", shadow("math_number", field("NUM", 100))))}
    ${block(
      "audio_changeVolume",
      value("VOLUME", shadow("math_number", field("NUM", 10)))
    )}
    ${block("audio_getVolume")}
    ${block(
      "audio_fade",
      value("VOLUME", shadow("math_number", field("NUM", 0))),
      value("SECONDS", shadow("math_number", field("NUM", 1)))
    )}
    ${block("audio_setPitch", value("PITCH", shadow("math_number", field("NUM", 100))))}
    ${sep(50)}
    ${block(
      "audio_setProjectVolume",
      value("VOLUME", shadow("math_number", field("NUM", 100)))
    )}
    ${block(
      "audio_changeProjectVolume",
      value("VOLUME", shadow("math_number", field("NUM", 10)))
    )}
    ${block("audio_getProjectVolume")}
    ${sep(50)}
    ${block("audio_isPlaying")}
  </category>
  <category name="Video" categorystyle="appearance_blocks">
    ${block("video_play")}
    ${block("video_pause")}
    ${sep(50)}
    ${block(
      "video_setPlaybackRate",
      value("RATE", shadow("math_number", field("NUM", 1)))
    )}
    ${block("video_setVolume", value("VOLUME", shadow("math_number", field("NUM", 100))))}
    ${block("video_setLoop")}
    ${sep(50)}
    ${block(
      "video_setCurrentTime",
      value("TIME", shadow("math_number", field("NUM", 0)))
    )}
    ${block("video_getCurrentTime")}
    ${block("video_getDuration")}
    ${sep(50)}
    ${block(
      "video_setVideoIndex",
      value("INDEX", shadow("math_number", field("NUM", 1)))
    )}
    ${block("video_setVideoName", value("NAME", textShadow("Video 1")))}
    ${block("video_nextVideo")}
  </category>
  <category name="Variables" categorystyle="variable_blocks" custom="VARIABLE">
    ${block("variables_set", value("VALUE", shadow("text", field("TEXT", ""))))}
  </category>
  <category name="Functions" categorystyle="procedure_blocks">
    ${block("functions_lambda", value("ARG", block("functions_argument")))}
    ${block("functions_return", value("VALUE", shadow("math_number", field("NUM", 1))))}
    ${block("functions_execute", value("FUNC"), value("ARG", textShadow("foo")))}
  </category>
  <category name="Other" categorystyle="other_blocks"></category>
</xml>`;
}
