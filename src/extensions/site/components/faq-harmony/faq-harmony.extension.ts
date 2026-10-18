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
      layout: {
        resizeDirection: LAYOUT.RESIZE_DIRECTION.horizontal,
        contentResizeDirection: LAYOUT.CONTENT_RESIZE_DIRECTION.vertical,
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
