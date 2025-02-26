import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';

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
  ListIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import Blockquote from '@tiptap/extension-blockquote';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

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
      <Button 
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHighlight().run()} 
        disabled={!editor.can().chain().focus().toggleHighlight().run()} 
        className={`h-8 w-8 ${editor.isActive('highlight') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <HighlighterIcon className="h-4 w-4" />
      </Button>
      <div className="h-6 border-l border-[#3a3a3a] mx-1"></div>
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
      <div className="h-6 border-l border-[#3a3a3a] mx-1"></div>
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
    </div>
  );
};

interface DocumentProps {
  boardId: Id<"boards">;
  initialContent?: string;
}

export const Document = ({ boardId, initialContent = '' }: DocumentProps) => {
  const [, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const updateDocument = useMutation(api.documents.update);

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
      Highlight,
      Blockquote,
      Heading,
      ListItem,
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

  const debouncedSave = React.useCallback(
    debounce(async (newContent: string) => {
      try {
        setIsSaving(true);
        await updateDocument({
          boardId,
          content: newContent,
        });
      } catch (error) {
        toast.error("Failed to save document");
        console.error("Failed to save document:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [boardId, updateDocument]
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#1a1a1a] overflow-hidden">
      <div className="bg-[#2a2a2a] rounded-md shadow-md flex-grow flex flex-col overflow-hidden border border-[#3a3a3a]">
        <MenuBar editor={editor} />
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
            .ProseMirror p[style*="text-align: center"] {
              text-align: center;
            }
            .ProseMirror p[style*="text-align: right"] {
              text-align: right;
            }
            .ProseMirror p[style*="text-align: left"] {
              text-align: left;
            }
            .ProseMirror mark {
              background-color: rgba(255, 255, 0, 0.3);
              color: white;
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