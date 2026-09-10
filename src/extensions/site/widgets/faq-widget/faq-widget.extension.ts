import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: '27a2da1d-d85f-4dff-9127-e8e345e8cc82',
  name: 'FAQ Widget',
  width: {
    defaultWidth: 450,
    allowStretch: true
  },
  height: {
    defaultHeight: 250
  },
  installation: {
    autoAdd: false
  },
  presets: [
    {
      id: '91521e2a-de98-451b-aedb-54116e122a85',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/faq-widget-thumbnail-v2.png',
    },
  ],
  
  tagName: 'faq-widget',
  element: './extensions/site/widgets/faq-widget/faq-widget.tsx',
  settings: './extensions/site/widgets/faq-widget/faq-widget.panel.tsx',
});
