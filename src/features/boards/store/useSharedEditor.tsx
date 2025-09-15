import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import { NodeSelection } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from '@/lib/tiptap/fontSize';
import Highlight from '@tiptap/extension-highlight';
import Blockquote from '@tiptap/extension-blockquote';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import ResizableImage from '@/lib/tiptap/resizableImage';
import { useRouter } from 'next/navigation';
import { useImageDialog } from './useImageDialog';

interface UseEditorOptions {
  initialContent?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  enableResizableImage?: boolean;
  enableNavigation?: boolean;
}

export const useSharedEditor = ({
  initialContent = '',
  placeholder = 'Start typing...',
  onUpdate = () => {},
  enableResizableImage = true,
  enableNavigation = true
}: UseEditorOptions = {}) => {
  const router = useRouter();
  const { open: openImageDialog } = useImageDialog();

  // Initialize the editor with shared configuration
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Bold,
      Italic,
      Underline,
      Strike,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
      Blockquote,
      Heading,
      ListItem,
      BulletList,
      // Only include ResizableImage if enabled
      ...(enableResizableImage ? [ResizableImage] : []),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:opacity-90',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      onUpdate(newContent);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handleClickOn(view, pos, node, nodePos, _event, _direct) {
        try {
          if (enableResizableImage && node.type && node.type.name === 'image') {
            const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos));
            view.dispatch(tr);
            return true;
          }
        } catch {}
        return false;
      },
      handleDOMEvents: {
        click(view, event) {
          try {
            if (enableResizableImage) {
              const target = event.target as HTMLElement;
              const wrapper = target?.closest?.('.tiptap-image-wrapper') as HTMLElement | null;
              if (wrapper) {
                // Resolve the position before the node view DOM and select the image node
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pos = (view as any).posAtDOM(wrapper, 0) as number;
                if (typeof pos === 'number') {
                  const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
                  view.dispatch(tr);
                  return true;
                }
              }
            }
          } catch {}
          return false;
        },
      },
    },
  });

  // Add the image preview functionality
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;

    let previewEl: HTMLDivElement | null = null;

    const removePreview = () => {
      if (previewEl && previewEl.parentNode) {
        previewEl.parentNode.removeChild(previewEl);
      }
      previewEl = null;
    };

    const createPreview = (url: string) => {
      removePreview();
      previewEl = document.createElement('div');
      previewEl.style.position = 'fixed';
      previewEl.style.pointerEvents = 'none';
      previewEl.style.zIndex = '9999';
      previewEl.style.padding = '4px';
      previewEl.style.background = 'rgba(0,0,0,0.7)';
      previewEl.style.borderRadius = '6px';
      previewEl.style.border = '1px solid #3a3a3a';
      const img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '200px';
      img.style.maxHeight = '140px';
      img.style.display = 'block';
      img.style.borderRadius = '4px';
      previewEl.appendChild(img);
      document.body.appendChild(previewEl);
    };

    const getRefImageUrl = (href: string) => {
      if (!href) return null;
      if (href.startsWith('#image:')) {
        try {
          return decodeURIComponent(href.slice(7));
        } catch {
          return href.slice(7);
        }
      }
      return null;
    };

    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const hasMod = me.metaKey || me.ctrlKey;
      const refUrl = getRefImageUrl(href);

      if (anchor && refUrl) {
        e.preventDefault();
        openImageDialog(refUrl);
        return;
      }

      // Only handle navigation if enabled
      if (enableNavigation) {
        // Check if this is a board link - either starting with / or matching your board pattern
        if (anchor && href.startsWith('/') && !href.startsWith('#')) {
          // Only handle navigation for clicks with modifier keys (Ctrl/Cmd)
          if (hasMod) {
            e.preventDefault();
            router.push(href);
          }
        }
      }
    };

    const onMouseOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      if (anchor && refUrl) {
        createPreview(refUrl);
      }
    };

    const onMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      if (anchor && refUrl) {
        removePreview();
      }
    };

    const onMouseMove = (e: Event) => {
      const me = e as MouseEvent;
      if (previewEl) {
        const offset = 16;
        let x = me.clientX + offset;
        let y = me.clientY + offset;
        if (x + 220 > window.innerWidth) x = me.clientX - 220;
        if (y + 160 > window.innerHeight) y = me.clientY - 160;
        previewEl.style.left = `${x}px`;
        previewEl.style.top = `${y}px`;
      }
    };

    el.addEventListener('click', onClick);
    el.addEventListener('mouseover', onMouseOver);
    el.addEventListener('mouseout', onMouseOut);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseover', onMouseOver);
      el.removeEventListener('mouseout', onMouseOut);
      el.removeEventListener('mousemove', onMouseMove);
      removePreview();
    };
  }, [editor, router, openImageDialog, enableNavigation]);

  return editor;
};

// Also create a shared editor styles component
export const EditorStyles = () => {
  return (
    <style jsx global>{`
      .ProseMirror-selectednode {
        outline: 2px solid #3b82f6;
        border-radius: 2px;
      }
      
      .tiptap-resize-handle {
        position: absolute;
        width: 12px;
        height: 12px;
        background: rgba(59, 130, 246, 0.8);
        border-radius: 2px;
        z-index: 100;
      }
      
      .tiptap-resize-handle:hover {
        background: rgba(59, 130, 246, 1);
      }
      
      .tiptap-image-wrapper.ProseMirror-selectednode {
        outline: 2px solid #3b82f6;
        border-radius: 2px;
      }
      
      .ProseMirror p {
        margin: 0.5em 0;
      }
      .ProseMirror ul {
        list-style-type: disc;
        padding-left: 1.5em;
        margin: 0.5em 0;
      }
      .ProseMirror h1 {
        font-size: 1.5em;
        font-weight: bold;
        margin: 0.5em 0;
      }
      .ProseMirror h2 {
        font-size: 1.3em;
        font-weight: bold;
        margin: 0.5em 0;
      }
      .ProseMirror h3 {
        font-size: 1.1em;
        font-weight: bold;
        margin: 0.5em 0;
      }
      .ProseMirror blockquote {
        border-left: 3px solid #4a4a4a;
        padding-left: 1em;
        margin: 0.5em 0;
      }
      .ProseMirror code {
        background: #2a2a2a;
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
      .ProseMirror pre {
        background: #2a2a2a;
        padding: 0.75em 1em;
        border-radius: 5px;
        margin: 0.5em 0;
      }
    `}</style>
  );
};