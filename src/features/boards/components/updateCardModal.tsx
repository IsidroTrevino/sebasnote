import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useListAllBoards } from "@/features/boards/api/useListAllBoards";
import { useImageDialog } from "@/features/boards/store/useImageDialog";
import { toast } from "sonner";
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import BulletList from '@tiptap/extension-bullet-list';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from '@/lib/tiptap/fontSize';
import { BoldIcon, Loader, ItalicIcon, UnderlineIcon, StrikethroughIcon, ListIcon, Heading1, Heading2, Heading3, Code, QuoteIcon, Link2, X, Palette, TextCursorInput, Type, HighlighterIcon, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useUpdateCardModal } from "../store/useUpdateCardModal";

const MenuBar = ({ editor, boardId }: { editor: Editor | null; boardId: Id<'boards'> | null }) => {
  const { boards } = useListAllBoards();
  const [search, setSearch] = useState('');
  const filteredBoards = (boards ?? []).filter((b) =>
    (b.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const [openColor, setOpenColor] = useState(false);
  const [openHighlight, setOpenHighlight] = useState(false);
  const [openFont, setOpenFont] = useState(false);
  const [openSize, setOpenSize] = useState(false);
  const [openLink, setOpenLink] = useState(false);

  const referenceImages = useQuery(
    api.referenceImages.getByBoardId,
    boardId ? { boardId } : "skip"
  ) || [];

  if (!editor) return null;

  const hexToRgba = (hex: string, alpha = 0.35) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const applyFontFamily = (family: string) => {
    if (!editor) return;
    editor.chain().focus().setFontFamily(family).run();
  };

  const applyFontSize = (size: string) => {
    if (!editor) return;
    editor.chain().focus().setFontSize(size).run();
  };

  const getImageName = (url?: string | null, title?: string | null): string => {
    const t = (title || "").trim();
    if (t) return t;
    const u = (url || "").split("?")[0];
    const parts = u.split("/");
    const last = parts[parts.length - 1] || "image";
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-2">
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
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
        className={`h-8 w-8 ${editor.isActive('heading', { level: 1 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
        className={`h-8 w-8 ${editor.isActive('heading', { level: 2 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
        className={`h-8 w-8 ${editor.isActive('heading', { level: 3 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBulletList().run()} 
        className={`h-8 w-8 ${editor.isActive('bulletList') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <ListIcon className="h-4 w-4" />
      </Button>
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
        className={`h-8 w-8 ${editor.isActive('codeBlock') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBlockquote().run()} 
        className={`h-8 w-8 ${editor.isActive('blockquote') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <QuoteIcon className="h-4 w-4" />
      </Button>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      {/* Typography controls */}
      {/* Font family */}
      <DropdownMenu open={openFont} onOpenChange={(o) => { setOpenFont(o); if (o) { setOpenSize(false); setOpenColor(false); setOpenHighlight(false); setOpenLink(false); } }}>
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
              applyFontFamily('Courier New');
            }}
          >
            <span style={{ fontFamily: 'Courier New' }}>Courier New</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              applyFontFamily('Georgia');
            }}
          >
            <span style={{ fontFamily: 'Georgia' }}>Georgia</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              applyFontFamily('EB Garamond');
            }}
          >
            <span style={{ fontFamily: 'EB Garamond' }}>EB Garamond</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              applyFontFamily('Lexend');
            }}
          >
            <span style={{ fontFamily: 'Lexend' }}>Lexend</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              applyFontFamily('Impact');
            }}
          >
            <span style={{ fontFamily: 'Impact' }}>Impact</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu open={openSize} onOpenChange={(o) => { setOpenSize(o); if (o) { setOpenFont(false); setOpenColor(false); setOpenHighlight(false); setOpenLink(false); } }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <TextCursorInput className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 p-1">
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('12px'); }}>12 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('14px'); }}>14 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('16px'); }}>16 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('18px'); }}>18 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('20px'); }}>20 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('24px'); }}>24 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('28px'); }}>28 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('32px'); }}>32 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('36px'); }}>36 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('40px'); }}>40 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('48px'); }}>48 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('60px'); }}>60 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); applyFontSize('72px'); }}>72 px</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Text color */}
      <DropdownMenu open={openColor} onOpenChange={(o) => { setOpenColor(o); if (o) { setOpenHighlight(false); setOpenFont(false); setOpenSize(false); setOpenLink(false); } }}>
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

      {/* Highlight color */}
      <DropdownMenu open={openHighlight} onOpenChange={(o) => { setOpenHighlight(o); if (o) { setOpenColor(false); setOpenFont(false); setOpenSize(false); setOpenLink(false); } }}>
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

      {/* Reference image link */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            aria-label="Insert reference image link"
            title="Insert reference image link"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-2 max-h-72 overflow-auto">
          {referenceImages.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No reference images</div>
          ) : (
            referenceImages.map((img) => (
              <DropdownMenuItem
                key={img._id}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  if (!editor) return;
                  const label = getImageName(img.url, img.title);
                  const href = `#image:${encodeURIComponent(img.url || '')}`;
                  const { selection } = editor.state;
                  const isEmpty = selection.empty;

                  if (isEmpty) {
                    editor
                      .chain()
                      .focus()
                      .insertContent({
                        type: 'text',
                        text: label,
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
                className="flex items-center gap-2"
                title={getImageName(img.url, img.title)}
              >
                <Image
                  src={img.url || ''}
                  alt={getImageName(img.url, img.title)}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-cover rounded"
                />
                <span className="truncate">{getImageName(img.url, img.title)}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Existing Link control */}
      <DropdownMenu open={openLink} onOpenChange={(o) => { setOpenLink(o); if (o) { setOpenColor(false); setOpenHighlight(false); setOpenFont(false); setOpenSize(false); } }}>
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
                  const { selection } = editor.state;
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

export const UpdateCardModal = () => {
  const { isOpen, card, onClose } = useUpdateCardModal();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const updateCard = useMutation(api.cards.update);
  const { open: openImageDialog } = useImageDialog();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Bold,
      Italic,
      BulletList,
      Heading,
      ListItem,
      Underline,
      Strike,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlock,
      Blockquote,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:opacity-90',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  });
  
  // Set initial content when card changes
  useEffect(() => {
    if (editor && card?.content) {
      editor.commands.setContent(card.content as string);
      setContent(card.content as string);
    }
  }, [editor, card]);

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
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);

      if (anchor && refUrl) {
        e.preventDefault();
        openImageDialog(refUrl);
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
  }, [editor, openImageDialog]);
  
  const handleClose = () => {
    onClose();
    if (editor) {
      editor.commands.clearContent();
    }
    setContent("");
  };
  
  const handleUpdate = async () => {
    if (!card || !content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    try {
      setIsSaving(true);
      await updateCard({
        id: card._id,
        content,
      });
      toast.success("Card updated");
      handleClose();
    } catch (error) {
      console.error("Failed to update card:", error);
      toast.error("Failed to update card");
    } finally {
      setIsSaving(false);
    }
  };

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a] max-w-[90vw] w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2">
          <MenuBar editor={editor} boardId={card?.boardId ?? null} />
          <div className="min-h-[150px] max-h-[50vh] bg-[#1a1a1a] p-4 rounded-lg overflow-y-auto">
            <style jsx global>{`
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
            <EditorContent editor={editor} />
            </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-[#3a3a3a]">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-4 bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#3a3a3a] text-gray-300 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            className="px-4 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-200 font-medium transition-colors border border-[#3a3a3a]"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </div>
          </DialogContent>
        </Dialog>
    );
};
