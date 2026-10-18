/**
 * THIS FILE IS AUTO-GENERATED — DO NOT EDIT.
 * It contains the `editorElement` portion of the manifest, automatically derived from your component's
 * source code, prop types, and CSS rules.
 * Update your source code and run `npx wix build && npx wix generate manifest` to regenerate it.
 * If you need to override specific manifest values (sizing, layout, etc.),
 * you can do so in faq-harmony.extension.ts.
 */

import type { EditorElement } from '@wix/react-component-schema';

export const editorElement = {
  "selector": ".faq-harmony",
  "displayName": "Faq Harmony",
  "data": {
    "direction": {
      "displayName": "Direction",
      "dataType": "direction"
    },
    "a11y": {
      "displayName": "Accessibility",
      "dataType": "a11y",
      "a11y": {
        "attributes": [
          "ariaLabel"
        ]
      }
    },
    "connectionKey": {
      "displayName": "Connection Key",
      "dataType": "text",
      "text": {}
    },
    "heading": {
      "displayName": "Heading",
      "dataType": "text",
      "text": {}
    },
    "description": {
      "displayName": "Description",
      "dataType": "text",
      "text": {}
    },
    "display": {
      "displayName": "Display",
      "dataType": "textEnum",
      "textEnum": {
        "options": [
          {
            "value": "accordion",
            "displayName": "Accordion"
          },
          {
            "value": "grid",
            "displayName": "Grid"
          },
          {
            "value": "cards",
            "displayName": "Cards"
          },
          {
            "value": "tabs",
            "displayName": "Tabs"
          }
        ]
      }
    },
    "searchPlaceholder": {
      "displayName": "Search Placeholder",
      "dataType": "text",
      "text": {}
    },
    "initiallyOpen": {
      "displayName": "Initially Open",
      "dataType": "booleanValue"
    },
    "singleOpen": {
      "displayName": "Single Open",
      "dataType": "booleanValue"
    },
    "collectFeedback": {
      "displayName": "Collect Feedback",
      "dataType": "booleanValue"
    },
    "seoSchema": {
      "displayName": "Seo Schema",
      "dataType": "booleanValue"
    }
  },
  "elements": {
    "faqHarmonyHeading": {
      "elementType": "inlineElement",
      "inlineElement": {
        "selector": ".faq-harmony-heading",
        "displayName": "Heading",
        "behaviors": {
          "removable": true,
          "selectable": false
        },
        "cssProperties": {
          "font": {},
          "lineHeight": {
            "defaultValue": "1.3"
          },
          "letterSpacing": {},
          "textDecorationLine": {},
          "textTransform": {},
          "textAlign": {},
          "textShadow": {},
          "color": {
            "defaultValue": "inherit"
          },
          "marginTop": {
            "defaultValue": "0"
          },
          "marginBottom": {
            "defaultValue": "8px"
          },
          "marginInlineStart": {
            "defaultValue": "0"
          },
          "marginInlineEnd": {
            "defaultValue": "0"
          },
          "display": {
            "display": {
              "displayValues": [
                "none",
                "block"
              ]
            }
          }
        }
      }
    },
    "faqHarmonyDescription": {
      "elementType": "inlineElement",
      "inlineElement": {
        "selector": ".faq-harmony-description",
        "displayName": "Description",
        "behaviors": {
          "removable": true,
          "selectable": false
        },
        "cssProperties": {
          "font": {},
          "lineHeight": {
            "defaultValue": "1.65"
          },
          "letterSpacing": {},
          "textDecorationLine": {},
          "textTransform": {},
          "textAlign": {},
          "textShadow": {},
          "color": {
            "defaultValue": "inherit"
          },
          "marginTop": {
            "defaultValue": "0"
          },
          "marginBottom": {
            "defaultValue": "0"
          },
          "marginInlineStart": {
            "defaultValue": "0"
          },
          "marginInlineEnd": {
            "defaultValue": "0"
          },
          "display": {
            "display": {
              "displayValues": [
                "none",
                "block"
              ]
            }
          }
        }
      }
    }
  },
  "cssProperties": {
    "background": {
      "defaultValue": "#ffffff"
    },
    "borderTop": {
      "defaultValue": "1px solid #d9dfe8"
    },
    "borderBottom": {
      "defaultValue": "1px solid #d9dfe8"
    },
    "borderInlineStart": {
      "defaultValue": "1px solid #d9dfe8"
    },
    "borderInlineEnd": {
      "defaultValue": "1px solid #d9dfe8"
    },
    "paddingTop": {
      "defaultValue": "28px"
    },
    "paddingBottom": {
      "defaultValue": "28px"
    },
    "paddingInlineStart": {
      "defaultValue": "28px"
    },
    "paddingInlineEnd": {
      "defaultValue": "28px"
    },
    "borderStartStartRadius": {
      "defaultValue": "12px"
    },
    "borderStartEndRadius": {
      "defaultValue": "12px"
    },
    "borderEndStartRadius": {
      "defaultValue": "12px"
    },
    "borderEndEndRadius": {
      "defaultValue": "12px"
    },
    "boxShadow": {},
    "overflow": {},
    "mixBlendMode": {},
    "marginTop": {},
    "marginBottom": {},
    "marginInlineStart": {},
    "marginInlineEnd": {}
  },
  "cssCustomProperties": {}
} as EditorElement;
