// This file is the Editor preview entry point for your component.
// Override or extend it when you need Editor-specific behavior or rendering
// (e.g. mock data, Editor-only interactions, or a different visual state).

import React from 'react';
import type { ComponentProps, FC } from 'react';
import {
  withDefaults,
  withFallbackPlaceholder,
} from '@wix/react-component-utils';
import Component from './faq-harmony';
import { defaultProps } from './faq-harmony.props';
import { EditorPreviewContext } from './editor-context';

const FaqHarmonyPreview: FC<ComponentProps<typeof Component>> = (props) => {
  return <EditorPreviewContext.Provider value={true}><Component {...props} /></EditorPreviewContext.Provider>;
};

const FaqHarmonyPreviewWithFallback = withFallbackPlaceholder(FaqHarmonyPreview, {
  requiredDataFields: ['connectionKey'],
  rootClassName: 'faq-harmony',
});

export default withDefaults(
  FaqHarmonyPreviewWithFallback,
  defaultProps
);
