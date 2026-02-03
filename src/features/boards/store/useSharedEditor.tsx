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
import { Extension } from '@tiptap/core';

interface UseEditorOptions {
  initialContent?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  enableResizableImage?: boolean;
  enableNavigation?: boolean;
  onNavigate?: () => void;
}

// Custom Link extension that completely disables default click behavior
const CustomLink = Link.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
    }
  },
  addProseMirrorPlugins() {
    // Remove any plugins from parent that might handle clicks
    return [];
  },
  addKeyboardShortcuts() {
    return {};
  },
});

export const useSharedEditor = ({
  initialContent = '',
  placeholder = 'Start typing...',
  onUpdate = () => {},
  enableResizableImage = true,
  enableNavigation = true,
  onNavigate = () => {}
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
      CustomLink.configure({
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
        // Image resizing only - links are handled in useEffect
        mousedown(view, event) {
          try {
            if (enableResizableImage) {
              const target = event.target as HTMLElement;
              const wrapper = target.closest('.tiptap-image-wrapper') as HTMLElement | null;
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

  // Handle link clicks with Ctrl+Click requirement
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;

    const handleLinkMouseDown = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement | null;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      // ALWAYS prevent mousedown on links to stop prosemirror selection
      me.preventDefault();
      me.stopPropagation();
      me.stopImmediatePropagation();
    };

    const handleLinkClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement | null;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const hasMod = me.metaKey || me.ctrlKey;

      // Always prevent default and stop propagation
      me.preventDefault();
      me.stopPropagation();
      me.stopImmediatePropagation();

      // Only navigate if Ctrl+Click
      if (hasMod) {
        if (enableNavigation && href.startsWith('/')) {
          // Internal board link - open in new tab
          window.open(href, '_blank');
          onNavigate();
        } else {
          // External link - add http:// if missing
          const url = href.startsWith('http://') || href.startsWith('https://') 
            ? href 
            : `https://${href}`;
          window.open(url, '_blank');
          onNavigate();
        }
      }
    };

    // Use capture phase to intercept BEFORE prosemirror
    el.addEventListener('mousedown', handleLinkMouseDown, true);
    el.addEventListener('click', handleLinkClick, true);

    return () => {
      el.removeEventListener('mousedown', handleLinkMouseDown, true);
      el.removeEventListener('click', handleLinkClick, true);
    };
  }, [editor, router, enableNavigation, onNavigate]);

  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;

    let previewEl: HTMLDivElement | null = null;
    let linkTooltipEl: HTMLDivElement | null = null;

    const removePreview = () => {
      if (previewEl && previewEl.parentNode) {
        previewEl.parentNode.removeChild(previewEl);
      }
      previewEl = null;
    };

    const removeLinkTooltip = () => {
      if (linkTooltipEl && linkTooltipEl.parentNode) {
        linkTooltipEl.parentNode.removeChild(linkTooltipEl);
      }
      linkTooltipEl = null;
    };

    const createLinkTooltip = (href: string, x: number, y: number) => {
      removeLinkTooltip();
      linkTooltipEl = document.createElement('div');
      linkTooltipEl.style.position = 'fixed';
      linkTooltipEl.style.left = `${x}px`;
      linkTooltipEl.style.top = `${y + 10}px`;
      linkTooltipEl.style.pointerEvents = 'none';
      linkTooltipEl.style.zIndex = '9999';
      linkTooltipEl.style.padding = '6px 8px';
      linkTooltipEl.style.background = '#2a2a2a';
      linkTooltipEl.style.borderRadius = '6px';
      linkTooltipEl.style.border = '1px solid rgba(34, 197, 94, 0.3)';
      linkTooltipEl.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
      linkTooltipEl.style.display = 'flex';
      linkTooltipEl.style.alignItems = 'center';
      linkTooltipEl.style.gap = '6px';
      linkTooltipEl.style.fontSize = '12px';
      linkTooltipEl.style.whiteSpace = 'nowrap';
      linkTooltipEl.style.maxWidth = '400px';
      linkTooltipEl.style.animation = 'fadeIn 0.2s ease-in-out';

      const label = document.createElement('span');
      label.textContent = 'Links to:';
      label.style.fontWeight = '500';
      label.style.color = '#22c55e';

      const path = document.createElement('span');
      path.textContent = href;
      path.style.color = '#d1d5db';
      path.style.overflow = 'hidden';
      path.style.textOverflow = 'ellipsis';

      const arrow = document.createElement('span');
      arrow.innerHTML = '→';
      arrow.style.color = '#22c55e';
      arrow.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';

      linkTooltipEl.appendChild(label);
      linkTooltipEl.appendChild(path);
      linkTooltipEl.appendChild(arrow);
      document.body.appendChild(linkTooltipEl);
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
      const refUrl = getRefImageUrl(href);

      if (anchor && refUrl) {
        me.preventDefault();
        me.stopPropagation();
        me.stopImmediatePropagation();
        openImageDialog(refUrl);
        return;
      }

      // For regular links, the main handler above will deal with them
      // This just handles reference images
    };

    const onMouseOver = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      
      if (anchor && refUrl) {
        createPreview(refUrl);
      } else if (anchor && href && !refUrl) {
        // Show link tooltip for regular links
        createLinkTooltip(href, me.clientX, me.clientY);
      }
    };

    const onMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      
      if (anchor && refUrl) {
        removePreview();
      } else if (anchor && href && !refUrl) {
        removeLinkTooltip();
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

    el.addEventListener('mouseover', onMouseOver);
    el.addEventListener('mouseout', onMouseOut);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mouseover', onMouseOver);
      el.removeEventListener('mouseout', onMouseOut);
      el.removeEventListener('mousemove', onMouseMove);
      removePreview();
      removeLinkTooltip();
    };
  }, [editor, router, openImageDialog, enableNavigation]);

  return editor;
};

// Also create a shared editor styles component
export const EditorStyles = () => {
  return (
    <style jsx global>{`
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: .5;
        }
      }

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
      .ProseMirror a {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        cursor: pointer;
      }
    `}</style>
  );
};