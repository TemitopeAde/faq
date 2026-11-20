import { extensions } from '@wix/astro/builders'
import type { EditorElement } from '@wix/react-component-schema';
import { DATA, ELEMENTS, LAYOUT } from '@wix/react-component-schema';
import { withEditorElementDefaults } from '@wix/react-component-utils';
import merge from 'deepmerge';
import { editorElement } from './faq-harmony.generated';
import { defaultProps } from './faq-harmony.props';
import componentUrl from './component.tsx?url';
import componentPreviewUrl from './component.preview.tsx?url';

// Data-backed parts are absent during manifest generation's initial, loading render.
// Keep their controls explicit, and align generated part keys with elementProps.
const dynamicPart = (selector: string, displayName: string) => ({
  elementType: ELEMENTS.ELEMENT_TYPE.inlineElement,
  inlineElement: {
    selector, displayName,
    behaviors: { selectable: false, removable: true },
    cssProperties: { color: {}, background: {}, font: {}, borderTop: {}, borderBottom: {}, paddingTop: {}, paddingBottom: {} },
  },
});
const { faqHarmonyHeading: heading, faqHarmonyDescription: description, ...generatedParts } = editorElement.elements ?? {};
const editorElementWithParts = {
  ...editorElement,
  data: {
    ...editorElement.data,
    a11y: { ...editorElement.data?.a11y, dataType: DATA.DATA_TYPE.a11y, a11y: { attributes: [DATA.A11Y_ATTRIBUTES.ariaLabel] } },
  },
  elements: {
    ...generatedParts,
    heading: heading ?? dynamicPart('.faq-harmony-heading', 'Heading'),
    description: description ?? dynamicPart('.faq-harmony-description', 'Description'),
    search: dynamicPart('.faq-harmony-search', 'Search'),
    category: dynamicPart('.faq-harmony-category', 'Category filter'),
    question: dynamicPart('.faq-harmony-question', 'Question'),
    answer: dynamicPart('.faq-harmony-answer', 'Answer'),
    feedback: dynamicPart('.faq-harmony-feedback', 'Feedback buttons'),
    expand: dynamicPart('.faq-harmony-expand', 'Expand and collapse buttons'),
  },
} satisfies EditorElement;

const editorElementWithDefaults = withEditorElementDefaults(
  editorElementWithParts,
  defaultProps
);

export default extensions.editorReactComponent({
  id: '77a2c801-772b-47b2-8345-366b3efb0d98',
  type: 'faq_app.FaqHarmony',
  displayName: 'FAQ Harmony',
  description: 'Searchable FAQs connected to FAQ groups, with native Harmony editing controls.',
  editorElement: merge(
    editorElementWithDefaults,
    {
      data: {
        language: { displayName: 'Language', dataType: DATA.DATA_TYPE.text, text: {} },
        showSearch: { displayName: 'Show Search', dataType: DATA.DATA_TYPE.booleanValue },
        showCategories: { displayName: 'Show Categories', dataType: DATA.DATA_TYPE.booleanValue },
        showExpandAll: { displayName: 'Show Expand All', dataType: DATA.DATA_TYPE.booleanValue },
        showHeading: { displayName: 'Show Heading', dataType: DATA.DATA_TYPE.booleanValue },
        showDescription: { displayName: 'Show Description', dataType: DATA.DATA_TYPE.booleanValue },
        showIcon: { displayName: 'Show Icon', dataType: DATA.DATA_TYPE.booleanValue },
        showHelp: { displayName: 'Show Help', dataType: DATA.DATA_TYPE.booleanValue },
        helpText: { displayName: 'Help Text', dataType: DATA.DATA_TYPE.text, text: {} },
        helpLabel: { displayName: 'Help Label', dataType: DATA.DATA_TYPE.text, text: {} },
        helpLink: { displayName: 'Help Link', dataType: DATA.DATA_TYPE.text, text: {} },
        layout: { displayName: 'Preset', dataType: DATA.DATA_TYPE.text, text: {} },
        icon: { displayName: 'Icon', dataType: DATA.DATA_TYPE.text, text: {} },
        backgroundColor: { displayName: 'Background Color', dataType: DATA.DATA_TYPE.text, text: {} },
        questionColor: { displayName: 'Question Color', dataType: DATA.DATA_TYPE.text, text: {} },
        answerColor: { displayName: 'Answer Color', dataType: DATA.DATA_TYPE.text, text: {} },
        accentColor: { displayName: 'Accent Color', dataType: DATA.DATA_TYPE.text, text: {} },
        borderColor: { displayName: 'Border Color', dataType: DATA.DATA_TYPE.text, text: {} },
        questionFont: { displayName: 'Question Font', dataType: DATA.DATA_TYPE.text, text: {} },
        answerFont: { displayName: 'Answer Font', dataType: DATA.DATA_TYPE.text, text: {} },
        iconColor: { displayName: 'Icon Color', dataType: DATA.DATA_TYPE.text, text: {} },
        iconSize: { displayName: 'Icon Size', dataType: DATA.DATA_TYPE.number },
        radius: { displayName: 'Corner Radius', dataType: DATA.DATA_TYPE.number },
        gap: { displayName: 'Item Gap', dataType: DATA.DATA_TYPE.number },
        padding: { displayName: 'Padding', dataType: DATA.DATA_TYPE.number },
        animation: { displayName: 'Animation', dataType: DATA.DATA_TYPE.text, text: {} },
        hoverEffect: { displayName: 'Hover Effect', dataType: DATA.DATA_TYPE.text, text: {} },
        marginTop: { displayName: 'Margin Top', dataType: DATA.DATA_TYPE.number },
        marginRight: { displayName: 'Margin Right', dataType: DATA.DATA_TYPE.number },
        marginBottom: { displayName: 'Margin Bottom', dataType: DATA.DATA_TYPE.number },
        marginLeft: { displayName: 'Margin Left', dataType: DATA.DATA_TYPE.number },
      },
      elements: {
        heading: {
          inlineElement: {
            cssProperties: {
              font: { defaultValue: '650 24px system-ui, sans-serif' },
            },
          },
        },
        description: {
          inlineElement: {
            cssProperties: {
              font: { defaultValue: '400 15px system-ui, sans-serif' },
            },
          },
        },
      },
      actions: {
        dashboard: {
          displayName: 'Manage FAQs',
          dashboardPageId: 'c8686cd0-505f-42ed-93fd-018db076c16d',
        },
      },
      layout: {
        resizeDirection: LAYOUT.RESIZE_DIRECTION.horizontal,
        contentResizeDirection: LAYOUT.CONTENT_RESIZE_DIRECTION.vertical,
      },
      // Thumbnail shown in the Harmony / Studio "Add elements" panel.
      presets: {
        default: {
          displayName: 'FAQ Harmony',
          thumbnailUrl: '{{BASE_URL}}/faq-widget-thumbnail-v2.png',
        },
      },
    }
  ),
  installation: {
    staticContainer: 'HOMEPAGE',
    initialSize: {
      width: {
        sizingType: LAYOUT.SIZING_TYPE.pixels,
        pixels: 640,
      },
      height: {
        sizingType: LAYOUT.SIZING_TYPE.content,
      },
    },
  },
  resources: {
    client: {
      componentUrl,
    },
    editor: {
      componentUrl: componentPreviewUrl,
    },
  },
});
