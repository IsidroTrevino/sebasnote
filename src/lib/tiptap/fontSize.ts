import { Extension } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * FontSize extension
 * - Adds a `fontSize` attribute to the built-in textStyle mark.
 * - Works together with @tiptap/extension-text-style.
 * - Usage:
 *    editor.chain().focus().setFontSize('18px').run()
 *    editor.chain().focus().unsetFontSize().run()
 */
const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null as string | null,
            parseHTML: (element) => {
              const el = element as HTMLElement;
              const size = el.style?.fontSize;
              return size || null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: CommandProps) => {
          return chain().setMark('textStyle', { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: CommandProps) => {
          // Setting the attribute to null removes the inline style via renderHTML above
          return chain().setMark('textStyle', { fontSize: null }).run();
        },
    };
  },
});

export default FontSize;
