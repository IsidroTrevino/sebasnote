'use client';

import React, { useState, useMemo } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from '@/lib/tiptap/fontSize';

import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  Highlighter as HighlighterIcon,
  Loader,
  QuoteIcon,
  Heading2,
  Heading1,
  Heading3,
  ListIcon,
  Link2,
  X,
  Palette,
  TextCursorInput,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useListAllBoards } from '@/features/boards/api/useListAllBoards';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import Blockquote from '@tiptap/extension-blockquote';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';

const MenuBar = ({
  editor,
  linkableBoards,
}: {
  editor: Editor | null;
  linkableBoards: { _id: Id<'boards'>; name: string }[];
}) => {
  const [search, setSearch] = useState('');
  const filteredBoards = useMemo(
    () => linkableBoards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())),
    [linkableBoards, search]
  );
  if (!editor) return null;

  const hexToRgba = (hex: string, alpha = 0.35) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="border-b border-[#3a3a3a] bg-[#2a2a2a] p-2 sticky top-0 z-10 rounded-t-md flex flex-wrap items-center gap-1">
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`h-8 w-8 ${editor.isActive('bold') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <BoldIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`h-8 w-8 ${editor.isActive('italic') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <ItalicIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={`h-8 w-8 ${editor.isActive('underline') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`h-8 w-8 ${editor.isActive('strike') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <StrikethroughIcon className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <HighlighterIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
          <div className="grid grid-cols-6 gap-2 mb-2">
            <button className="h-4 w-4 rounded bg-[rgba(253,230,138,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(253,230,138,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(187,247,208,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(187,247,208,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(191,219,254,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(191,219,254,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(254,202,202,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(254,202,202,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(221,214,254,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(221,214,254,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(251,207,232,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(251,207,232,0.35)' }).run(); }} />
          </div>
          <Input
            type="color"
            className="h-8 w-full bg-[#1a1a1a] border-[#3a3a3a]"
            onChange={(e) => editor?.chain().focus().setHighlight({ color: hexToRgba(e.target.value, 0.35) }).run()}
            aria-label="Pick highlight color"
          />
          <div className="mt-2">
            <Button
              variant="outline"
              className="h-8 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a] w-full"
              onClick={() => editor?.chain().focus().unsetHighlight().run()}
            >
              Clear highlight
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        disabled={!editor.can().chain().focus().setTextAlign('left').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'left' }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <AlignLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        disabled={!editor.can().chain().focus().setTextAlign('center').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'center' }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <AlignCenterIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        disabled={!editor.can().chain().focus().setTextAlign('right').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'right' }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <AlignRightIcon className="h-4 w-4" />
      </Button>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={!editor.can().chain().focus().toggleBlockquote().run()}
        className={`h-8 w-8 ${editor.isActive('blockquote') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <QuoteIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 1 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 2 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 3 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        className={`h-8 w-8 ${editor.isActive('bulletList') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <ListIcon className="h-4 w-4" />
      </Button>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      {/* Typography controls */}
      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-1">
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Courier New').run();
            }}
          >
            <span style={{ fontFamily: 'Courier New' }}>Courier New</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Georgia').run();
            }}
          >
            <span style={{ fontFamily: 'Georgia' }}>Georgia</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('EB Garamond').run();
            }}
          >
            <span style={{ fontFamily: 'EB Garamond' }}>EB Garamond</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Lexend').run();
            }}
          >
            <span style={{ fontFamily: 'Lexend' }}>Lexend</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Impact').run();
            }}
          >
            <span style={{ fontFamily: 'Impact' }}>Impact</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <TextCursorInput className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 p-1">
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('12px').run(); }}>12 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('14px').run(); }}>14 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('16px').run(); }}>16 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('18px').run(); }}>18 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('20px').run(); }}>20 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('24px').run(); }}>24 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('28px').run(); }}>28 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('32px').run(); }}>32 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('36px').run(); }}>36 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('40px').run(); }}>40 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('48px').run(); }}>48 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('60px').run(); }}>60 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('72px').run(); }}>72 px</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Text color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
          <div className="grid grid-cols-6 gap-2 mb-2">
            <button className="h-4 w-4 rounded-full bg-[#e5e7eb]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#e5e7eb').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#f87171]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#f87171').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#60a5fa]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#60a5fa').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#34d399]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#34d399').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#fbbf24]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#fbbf24').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#a78bfa]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#a78bfa').run(); }} />
          </div>
          <Input
            type="color"
            className="h-8 w-full bg-[#1a1a1a] border-[#3a3a3a]"
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            aria-label="Pick text color"
          />
          <div className="mt-2">
            <Button
              variant="outline"
              className="h-8 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a] w-full"
              onClick={() => editor?.chain().focus().unsetColor().run()}
            >
              Clear text color
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Existing Link control */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2">
          <Input
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 bg-[#1a1a1a] border-[#3a3a3a] text-gray-300 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {filteredBoards.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No boards found</div>
          ) : (
            filteredBoards.map((b) => (
              <DropdownMenuItem
                key={b._id}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  if (!editor) return;
                  const href = `/${b._id}/${encodeURIComponent(b.name)}`;
                  const selection = editor.state.selection;
                  const isEmpty = selection.empty;

                  if (isEmpty) {
                    editor
                      .chain()
                      .focus()
                      .insertContent({
                        type: 'text',
                        text: b.name,
                        marks: [{ type: 'link', attrs: { href } }],
                      })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href })
                      .run();
                  }
                }}
                className="truncate"
                title={b.name}
              >
                {b.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()}
        className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]"
        aria-label="Remove link"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface DocumentProps {
  boardId: Id<'boards'>;
  initialContent?: string;
}

export const Document = ({ boardId, initialContent = '' }: DocumentProps) => {
  const [, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const updateDocument = useMutation(api.documents.update);
  const router = useRouter();
  const { boards: allBoards } = useListAllBoards();

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
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;
    const handler = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const hasMod = me.metaKey || me.ctrlKey;
      if (anchor && href.startsWith('/') && hasMod) {
        e.preventDefault();
        router.push(href);
      }
    };
    el.addEventListener('click', handler);
    return () => {
      el.removeEventListener('click', handler);
    };
  }, [editor, router]);

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
        <MenuBar editor={editor} linkableBoards={allBoards || []} />
        <div className="flex-grow p-6 overflow-y-auto">
          <style jsx global>{`
            .ProseMirror {
              min-height: calc(100vh - 150px);
            }
            .ProseMirror p {
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
            .ProseMirror ul {
              list-style-type: disc;
              padding-left: 1.5em;
              margin: 0.5em 0;
            }
            .ProseMirror ol {
              list-style-type: decimal;
              padding-left: 1.5em;
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
            .ProseMirror p[style*='text-align: center'] {
              text-align: center;
            }
            .ProseMirror p[style*='text-align: right'] {
              text-align: right;
            }
            .ProseMirror p[style*='text-align: left'] {
              text-align: left;
            }
            .ProseMirror a {
              color: #60a5fa;
              text-decoration: underline;
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
