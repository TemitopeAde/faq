// This file wires your component with its default props and exports it for use by the extension.
// Please do not modify the structure or logic of this file

import { withDefaults } from '@wix/react-component-utils';
import Component from './faq-harmony';
import { defaultProps } from './faq-harmony.props';

const FaqHarmony = withDefaults(
  Component,
  defaultProps
);

export default FaqHarmony;
