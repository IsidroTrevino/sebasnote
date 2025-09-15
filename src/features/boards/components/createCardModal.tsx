'use client';

import React, { useState, useEffect, useMemo } from "react";
import { EditorContent } from '@tiptap/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useCreateCard } from "../api/useCreateCard";
import { useCreateCardModal } from "../store/useCreateCardModal";
import { useBoardId } from "../api/useBoardId";
import { useListAllBoards } from "../store/useListAllBoards";
import { useSharedEditor, EditorStyles } from '../store/useSharedEditor';
import MenuBar from './editor/menuBar';
import { Id } from "../../../../convex/_generated/dataModel";

export const CreateCardModal = () => {
  const [content, setContent] = useState("");
  const { mutate: createCard, isPending } = useCreateCard();
  const [open, setOpen] = useCreateCardModal();
  const boardId = useBoardId();
  const [hasDraft, setHasDraft] = useState(false);
  const { data: allBoards } = useListAllBoards();

  // Draft handling
  const draftKey = useMemo(() => (boardId ? `sebasnote-card-draft-${boardId}` : ''), [boardId]);
  
  useEffect(() => {
    if (open && draftKey) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setContent(savedDraft);
        setHasDraft(true);
      }
    }
  }, [open, draftKey]);
  
  useEffect(() => {
    if (open && draftKey && content) {
      localStorage.setItem(draftKey, content);
    }
  }, [content, open, draftKey]);

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

  // Apply draft content to editor when ready
  useEffect(() => {
    if (editor && hasDraft && content) {
      editor.commands.setContent(content);
      setHasDraft(false);
    }
  }, [editor, hasDraft, content]);

  const clearDraft = () => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    try {
      await createCard({
        boardId,
        content,
        width: 300,
        height: 200,
      });
      toast.success("Card created");
      editor?.commands.clearContent();
      setContent("");
      clearDraft();
      setOpen(false);
    } catch {
      toast.error("Failed to create card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a] max-w-[90vw] w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create new card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2">
          <MenuBar 
            editor={editor} 
            linkableBoards={allBoards || []} 
            boardId={boardId as Id<'boards'> || '' as unknown as Id<'boards'>} 
          />
          <div className="min-h-[150px] max-h-[50vh] bg-[#1a1a1a] p-4 rounded-lg overflow-y-auto">
            <EditorStyles />
            <EditorContent editor={editor} className="text-gray-200" />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              disabled={isPending}
              onClick={handleCreate}
              className="bg-[#3a3a3a] hover:bg-[#4a4a4a]"
            >
              {isPending ? <Loader className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};