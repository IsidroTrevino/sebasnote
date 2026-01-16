'use client';

import React, { useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { NodeSelection } from 'prosemirror-state';  // Import from prosemirror-state instead
import { Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import { useQuery } from 'convex/react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  QuoteIcon,
  Heading1,
  Heading2,
  Heading3,
  ListIcon,
  HighlighterIcon,
  Type,
  TextCursorInput,
  Palette,
  ImagePlusIcon,
  ImageIcon,
  Link2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import Image from 'next/image';


interface MenuBarProps {
  editor: Editor | null;
  linkableBoards: { _id: Id<'boards'>; name: string }[];
  boardId: Id<'boards'>;
}

export const MenuBar = ({ editor, linkableBoards, boardId }: MenuBarProps) => {
  const [search, setSearch] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const filteredBoards = useMemo(
    () => linkableBoards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())),
    [linkableBoards, search]
  );
  const referenceImages = useQuery(api.referenceImages.getByBoardId, { boardId }) || [];

  if (!editor) return null;

  const canWrapImage =
    editor.isActive('image') ||
    (editor.state.selection instanceof NodeSelection &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.state.selection as any).node?.type?.name === 'image');

  const hexToRgba = (hex: string, alpha = 0.35) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getImageName = (url?: string | null, title?: string | null): string => {
    const t = (title || '').trim();
    if (t) return t;
    const u = (url || '').split('?')[0];
    const parts = u.split('/');
    const last = parts[parts.length - 1] || 'image';
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
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
            <button className="h-4 w-4 rounded bg-[rgba(253,230,138,0.35)]" onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setHighlight({ color: 'rgba(253,230,138,0.35)' }).run();
            }} />
            <button className="h-4 w-4 rounded bg-[rgba(187,247,208,0.35)]" onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setHighlight({ color: 'rgba(187,247,208,0.35)' }).run();
            }} />
            <button className="h-4 w-4 rounded bg-[rgba(191,219,254,0.35)]" onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setHighlight({ color: 'rgba(191,219,254,0.35)' }).run();
            }} />
            <button className="h-4 w-4 rounded bg-[rgba(254,202,202,0.35)]" onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setHighlight({ color: 'rgba(254,202,202,0.35)' }).run();
            }} />
            <button className="h-4 w-4 rounded bg-[rgba(221,214,254,0.35)]" onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setHighlight({ color: 'rgba(221,214,254,0.35)' }).run();
            }} />
            <button className="h-4 w-4 rounded bg-[rgba(251,207,232,0.35)]" onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setHighlight({ color: 'rgba(251,207,232,0.35)' }).run();
            }} />
          </div>
          <Input
            type="color"
            className="h-8 w-full bg-[#1a1a1a] border-[#3a3a3a]"
            onChange={(e) => editor?.chain().focus().setHighlight({ color: hexToRgba(e.target.value, 0.35) }).run()}
            aria-label="Pick highlight color"
          />
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full bg-[#2a2a2a] border-[#3a3a3a]"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              Remove highlight
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
              editor.chain().focus().setFontFamily('Georgia').run();
            }}
          >
            Georgia
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor.chain().focus().setFontFamily('EB Garamond').run();
            }}
          >
            EB Garamond
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor.chain().focus().setFontFamily('Lexend').run();
            }}
          >
            Lexend
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor.chain().focus().setFontFamily('Impact').run();
            }}
          >
            Impact
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor.chain().focus().unsetFontFamily().run();
            }}
          >
            Default font
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
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('12px').run();}}>12 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('14px').run();}}>14 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('16px').run();}}>16 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('18px').run();}}>18 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('20px').run();}}>20 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('24px').run();}}>24 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('28px').run();}}>28 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('32px').run();}}>32 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('36px').run();}}>36 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('40px').run();}}>40 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('48px').run();}}>48 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('60px').run();}}>60 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {e.preventDefault(); editor.chain().focus().setFontSize('72px').run();}}>72 px</DropdownMenuItem>
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
            <button className="h-4 w-4 rounded-full bg-[#e5e7eb]" onClick={(e) => {e.preventDefault(); editor.chain().focus().setColor('#e5e7eb').run();}} />
            <button className="h-4 w-4 rounded-full bg-[#f87171]" onClick={(e) => {e.preventDefault(); editor.chain().focus().setColor('#f87171').run();}} />
            <button className="h-4 w-4 rounded-full bg-[#60a5fa]" onClick={(e) => {e.preventDefault(); editor.chain().focus().setColor('#60a5fa').run();}} />
            <button className="h-4 w-4 rounded-full bg-[#34d399]" onClick={(e) => {e.preventDefault(); editor.chain().focus().setColor('#34d399').run();}} />
            <button className="h-4 w-4 rounded-full bg-[#fbbf24]" onClick={(e) => {e.preventDefault(); editor.chain().focus().setColor('#fbbf24').run();}} />
            <button className="h-4 w-4 rounded-full bg-[#a78bfa]" onClick={(e) => {e.preventDefault(); editor.chain().focus().setColor('#a78bfa').run();}} />
          </div>
          <Input
            type="color"
            className="h-8 w-full bg-[#1a1a1a] border-[#3a3a3a]"
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            aria-label="Pick text color"
          />
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full bg-[#2a2a2a] border-[#3a3a3a]"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Reset to default
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reference image embed */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            aria-label="Insert reference image"
          >
            <ImagePlusIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-2 max-h-72 overflow-auto">
          {referenceImages.length === 0 ? (
            <div className="text-gray-400 text-sm py-2 text-center">No reference images available</div>
          ) : (
            referenceImages.map((img) => (
              <div 
                key={img._id} 
                className="flex items-center gap-2 p-1 hover:bg-[#3a3a3a] rounded cursor-pointer mb-1"
                onClick={() => {
                    if (img.url) { // Add null check
                    editor.chain().focus().setImage({ 
                        src: img.url, 
                        alt: img.title || getImageName(img.url), 
                        title: img.title 
                    }).run();
                    }
                }}
                >
                <div className="w-12 h-12 bg-[#1a1a1a] rounded overflow-hidden flex items-center justify-center relative">
                    <Image 
                        src={img.url || ''} // Add default empty string to handle null
                        alt={img.title || 'Reference image'} 
                        className="max-w-full max-h-full object-contain" 
                    />
                </div>
                <div className="flex-1 truncate">{img.title || getImageName(img.url)}</div>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reference image link */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            aria-label="Insert reference image link"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-2 max-h-72 overflow-auto">
          {referenceImages.length === 0 ? (
            <div className="text-gray-400 text-sm py-2 text-center">No reference images available</div>
          ) : (
            referenceImages.map((img) => (
              <div 
                key={img._id} 
                className="flex items-center gap-2 p-1 hover:bg-[#3a3a3a] rounded cursor-pointer mb-1"
                onClick={() => {
                    if (img.url) { // Add null check
                        editor.chain().focus().setImage({ 
                        src: img.url, 
                        alt: img.title || getImageName(img.url), 
                        title: img.title 
                        }).run();
                    }
                    }}
              >
                <div className="w-12 h-12 bg-[#1a1a1a] rounded overflow-hidden flex items-center justify-center relative">
                    {img.url && (
                        <Image 
                        src={img.url}
                        alt={img.title || 'Reference image'}
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized // Add this if you're using external images
                        />
                    )}
                </div>
                <div className="flex-1 truncate">{img.title || getImageName(img.url)}</div>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Image wrap */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            disabled={!canWrapImage}
          >
            <AlignLeftIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 p-1">
          <DropdownMenuItem onSelect={(e: Event) => {
            e.preventDefault();
            editor.chain().focus().updateAttributes('image', { float: 'left', vshift: '0px' }).run();
          }}>
            Wrap left
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {
            e.preventDefault();
            editor.chain().focus().updateAttributes('image', { float: 'right', vshift: '0px' }).run();
          }}>
            Wrap right
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => {
            e.preventDefault();
            editor.chain().focus().updateAttributes('image', { float: null, vshift: null }).run();
          }}>
            Inline (no wrap)
          </DropdownMenuItem>
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
        <DropdownMenuContent className="w-72 p-2">
            <Input
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 bg-[#1a1a1a] border-[#3a3a3a] text-gray-300 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-2 mb-2">
              <Input
                placeholder="Or paste external URL"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="flex-1 h-8 bg-[#1a1a1a] border-[#3a3a3a] text-gray-300 placeholder:text-gray-500"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!externalUrl) return;
                  editor.chain().focus().extendMarkRange('link')
                    .setLink({ href: externalUrl, target: '_blank' }).run();
                  setExternalUrl('');
                }}
                className="h-8 bg-[#3a3a3a] border-[#3a3a3a] text-gray-200 hover:bg-[#4a4a4a]"
              >
                Use URL
              </Button>
            </div>
            {filteredBoards.length === 0 ? (
            <div className="text-gray-400 text-sm py-1 text-center">No boards found</div>
            ) : (
            filteredBoards.map((b) => (
                <div 
                key={b._id} 
                className="flex items-center p-1 hover:bg-[#3a3a3a] rounded cursor-pointer"
                onClick={() => {
                    // Fix: Use the correct URL format to match your routing pattern
                    // Changed from /boards/${b._id} to /${b._id}/${encodeURIComponent(b.name)}
                    editor.chain().focus().extendMarkRange('link')
                    .setLink({ 
                        href: `/${b._id}/${encodeURIComponent(b.name || 'untitled')}`, 
                        target: '_self' 
                    }).run();
                }}
                >
                {b.name}
                </div>
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

export default MenuBar;
