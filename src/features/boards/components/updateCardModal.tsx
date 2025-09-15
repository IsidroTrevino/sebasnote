'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { EditorContent } from '@tiptap/react';
import { Loader } from "lucide-react";
import { useUpdateCardModal } from "../store/useUpdateCardModal";
import { useSharedEditor, EditorStyles } from '../store/useSharedEditor';
import MenuBar from './editor/menuBar';

export const UpdateCardModal = () => {
  const { isOpen, card, onClose } = useUpdateCardModal();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const updateCard = useMutation(api.cards.update);
  
  // Use the shared editor hook with card-specific options
  const editor = useSharedEditor({
    initialContent: '',
    placeholder: 'Start typing...',
    onUpdate: (newContent) => {
      setContent(newContent);
    },
    enableResizableImage: true,
    enableNavigation: false // Disable navigation for card editor
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
          {/* Use the shared MenuBar component */}
          <MenuBar 
            editor={editor} 
            linkableBoards={[]} // Pass empty array or fetch boards if needed
            boardId={card?.boardId} 
          />
          <div className="min-h-[150px] max-h-[50vh] bg-[#1a1a1a] p-4 rounded-lg overflow-y-auto">
            {/* Use shared editor styles */}
            <EditorStyles />
            <EditorContent editor={editor} className="text-gray-200" />
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