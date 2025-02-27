import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
import { BoldIcon, Loader, ItalicIcon, UnderlineIcon, StrikethroughIcon, ListIcon, Heading1, Heading2, Heading3, Code, QuoteIcon } from "lucide-react";
import { useUpdateCardModal } from "../store/useUpdateCardModal";

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

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
    </div>
  );
};

export const UpdateCardModal = () => {
  const { isOpen, card, onClose } = useUpdateCardModal();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const updateCard = useMutation(api.cards.update);
  
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
      CodeBlock,
      Blockquote,
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
          <MenuBar editor={editor} />
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
            className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
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
