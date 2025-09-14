'use client';

import React, { useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { debounce } from 'lodash';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { useListAllBoards } from '@/features/boards/store/useListAllBoards';
import { useImageDialog } from '@/features/boards/store/useImageDialog';
import ResizableImage from '@/lib/tiptap/resizableImage';
import MenuBar from '@/features/boards/components/editor/menuBar';

interface DocumentProps {
  boardId: Id<'boards'>;
  initialContent?: string;
}

export const Document = ({ boardId, initialContent = '' }: DocumentProps) => {
  const [, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const updateDocument = useMutation(api.documents.update);
  const router = useRouter();
  const { data: allBoards } = useListAllBoards();
  const { open: openImageDialog } = useImageDialog();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your document here...',
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
      ResizableImage,
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
      setContent(newContent);
      debouncedSave(newContent);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handleClickOn(view, pos, node, nodePos, _event, _direct) {
        try {
          if (node.type && node.type.name === 'image') {
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
          } catch {}
          return false;
        },
      },
    },
  });

  React.useEffect(() => {
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

      // Check if this is a board link - either starting with / or matching your board pattern
      if (anchor && href.startsWith('/') && !href.startsWith('#')) {
        // Only handle navigation for clicks with modifier keys (Ctrl/Cmd)
        // or explicitly handle all clicks by removing the hasMod condition
        if (hasMod) {
          e.preventDefault();
          router.push(href);
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
  }, [editor, router, openImageDialog]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (newContent: string) => {
        try {
          setIsSaving(true);
          await updateDocument({
            boardId,
            content: newContent,
          });
        } catch (error) {
          toast.error('Failed to save document');
          console.error('Failed to save document:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1000),
    [boardId, updateDocument]
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#1a1a1a] overflow-hidden">
      <div className="bg-[#2a2a2a] rounded-md shadow-md flex-grow flex flex-col overflow-hidden border border-[#3a3a3a]">
        <MenuBar editor={editor} linkableBoards={allBoards || []} boardId={boardId} />
        <div className="flex-grow p-6 overflow-y-auto">
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
          `}</style>
          <EditorContent editor={editor} className="text-gray-200" />
        </div>
      </div>
      {isSaving && (
        <div className="fixed bottom-4 right-4 flex items-center bg-[#2a2a2a] rounded-md px-3 py-1 text-gray-400 text-sm border border-[#3a3a3a]">
          <Loader className="h-3 w-3 animate-spin mr-2" />
          Saving...
        </div>
      )}
    </div>
  );
};