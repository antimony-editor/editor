import { categoryColours } from "./colors";

const math_number = {
    shadow: {
        type: "math_number",
        fields: { NUM: 0 },
    },
};

const text = {
    shadow: {
        type: "text",
        fields: { TEXT: "" },
    },
};

export const toolbox = {
    kind: "categoryToolbox",
    contents: [
        {
            kind: "category",
            name: "Logic",
            categorystyle: "logic_category",
            contents: [
                { kind: "block", type: "controls_if" },
                { kind: "block", type: "controls_ifelse" },
                {
                    kind: "block",
                    type: "logic_compare",
                    inputs: {
                        A: math_number,
                        B: math_number,
                    },
                },
                { kind: "block", type: "logic_operation" },
                { kind: "block", type: "logic_negate" },
                { kind: "block", type: "logic_boolean" },
                { kind: "block", type: "logic_null" },
                {
                    kind: "block",
                    type: "logic_ternary",
                    inputs: {
                        IF: { shadow: { type: "logic_boolean" } },
                        THEN: text,
                        ELSE: text,
                    },
                },
            ],
        },
        {
            kind: "category",
            name: "Loops",
            categorystyle: "loop_category",
            contents: [
                {
                    kind: "block",
                    type: "controls_repeat_ext",
                    inputs: {
                        TIMES: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 10 },
                            },
                        },
                    },
                },
                { kind: "block", type: "controls_whileUntil" },
                {
                    kind: "block",
                    type: "controls_for",
                    inputs: {
                        FROM: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
                            },
                        },
                        TO: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 10 },
                            },
                        },
                        BY: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
                            },
                        },
                    },
                },
                { kind: "block", type: "controls_forEach" },
                { kind: "block", type: "controls_flow_statements" },
            ],
        },
        {
            kind: "category",
            name: "Math",
            categorystyle: "math_category",
            contents: [
                { kind: "block", type: "math_number" },
                {
                    kind: "block",
                    type: "math_arithmetic",
                    inputs: {
                        A: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
                            },
                        },
                        B: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_single",
                    inputs: {
                        NUM: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 9 },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_trig",
                    inputs: {
                        NUM: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 45 },
                            },
                        },
                    },
                },
                { kind: "block", type: "math_constant" },
                {
                    kind: "block",
                    type: "math_number_property",
                    inputs: {
                        NUMBER_TO_CHECK: math_number,
                    },
                },
                {
                    kind: "block",
                    type: "math_round",
                    inputs: {
                        NUM: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 3.1 },
                            },
                        },
                    },
                },
                { kind: "block", type: "math_on_list" },
                {
                    kind: "block",
                    type: "math_modulo",
                    inputs: {
                        DIVIDEND: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 64 },
                            },
                        },
                        DIVISOR: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 10 },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_constrain",
                    inputs: {
                        VALUE: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 50 },
                            },
                        },
                        LOW: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
                            },
                        },
                        HIGH: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 100 },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_random_int",
                    inputs: {
                        FROM: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 1 },
                            },
                        },
                        TO: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 100 },
                            },
                        },
                    },
                },
                { kind: "block", type: "math_random_float" },
            ],
        },
        {
            kind: "category",
            name: "Text",
            categorystyle: "text_category",
            contents: [
                { kind: "block", type: "text" },
                { kind: "block", type: "text_join" },
                {
                    kind: "block",
                    type: "text_append",
                    inputs: {
                        TEXT: text,
                    },
                },
                {
                    kind: "block",
                    type: "text_length",
                    inputs: {
                        VALUE: {
                            shadow: {
                                type: "text",
                                fields: { TEXT: "abc" },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "text_isEmpty",
                    inputs: {
                        VALUE: text,
                    },
                },
                {
                    kind: "block",
                    type: "text_indexOf",
                    inputs: {
                        VALUE: text,
                        FIND: text,
                    },
                },
                {
                    kind: "block",
                    type: "text_charAt",
                    inputs: {
                        VALUE: text,
                        AT: math_number,
                    },
                },
                {
                    kind: "block",
                    type: "text_getSubstring",
                    inputs: {
                        STRING: text,
                        AT1: math_number,
                        AT2: math_number,
                    },
                },
                {
                    kind: "block",
                    type: "text_changeCase",
                    inputs: {
                        TEXT: text,
                    },
                },
                {
                    kind: "block",
                    type: "text_trim",
                    inputs: {
                        TEXT: text,
                    },
                },
                {
                    kind: "block",
                    type: "text_print",
                    inputs: {
                        TEXT: {
                            shadow: {
                                type: "text",
                                fields: { TEXT: "abc" },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "text_prompt_ext",
                    inputs: {
                        TEXT: text,
                    },
                },
            ],
        },
        {
            kind: "category",
            name: "Lists",
            categorystyle: "list_category",
            contents: [
                { kind: "block", type: "lists_create_with" },
                {
                    kind: "block",
                    type: "lists_repeat",
                    inputs: {
                        NUM: {
                            shadow: {
                                type: "math_number",
                                fields: { NUM: 5 },
                            },
                        },
                    },
                },
                { kind: "block", type: "lists_length" },
                { kind: "block", type: "lists_isEmpty" },
                { kind: "block", type: "lists_indexOf" },
                { kind: "block", type: "lists_getIndex" },
                { kind: "block", type: "lists_setIndex" },
                { kind: "block", type: "lists_getSublist" },
                { kind: "block", type: "lists_split" },
                { kind: "block", type: "lists_sort" },
            ],
        },

        {
            kind: "category",
            name: "Motion",
            categorystyle: "motion_category",
            contents: [],
        },
        {
            kind: "category",
            name: "Appearance",
            categorystyle: "appearance_category",
            contents: [],
        },
        {
            kind: "category",
            name: "Timing",
            categorystyle: "timing_category",
            contents: [],
        },
        {
            kind: "category",
            name: "Effects",
            categorystyle: "effects_category",
            contents: [],
        },
        {
            kind: "category",
            name: "Layers",
            categorystyle: "layers_category",
            contents: [],
        },
        {
            kind: "category",
            name: "Audio",
            categorystyle: "audio_category",
            contents: [],
        },
        {
            kind: "category",
            name: "Variables",
            categorystyle: "variable_category",
            custom: "VARIABLE",
        },
        {
            kind: "category",
            name: "Functions",
            categorystyle: "procedure_category",
            custom: "PROCEDURE",
        },
    ],
};
