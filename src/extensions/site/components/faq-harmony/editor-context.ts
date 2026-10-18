import { createContext } from 'react';

// Both design and editor preview must avoid live analytics and use owner-authorized reads.
export const EditorPreviewContext = createContext(false);
