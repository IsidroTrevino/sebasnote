/* TipTap command typings augmentation so we can call editor.chain().setColor, setHighlight, setFontFamily, setFontSize with proper types and without using `any`. */
import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    color: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
    };
    highlight: {
      setHighlight: (attributes?: { color?: string }) => ReturnType;
      toggleHighlight: (attributes?: { color?: string }) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
    setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
  }
}
