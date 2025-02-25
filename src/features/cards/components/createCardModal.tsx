import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateCard } from "../api/useCreateCard";
import { toast } from "sonner";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Loader } from "lucide-react";
import { useCreateCardModal } from "../store/useCreateCardModal";
import { useBoardId } from "@/features/boards/api/useBoardId";

export const CreateCardModal = () => {
  const [content, setContent] = useState("");
  const { mutate: createCard, isPending } = useCreateCard();
  const [open, setOpen] = useCreateCardModal();
  const boardId = useBoardId();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  const handleClose = () => {
    editor?.commands.clearContent();
    setContent("");
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
        position: {
          x: Math.random() * 500,
          y: Math.random() * 500,
          width: 300,
          height: 200,
        },
      });
      toast.success("Card created");
      handleClose();
    } catch {
      toast.error("Failed to create card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]">
        <DialogHeader>
          <DialogTitle>Create new card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="min-h-[150px] bg-[#1a1a1a] p-4 rounded-lg">
            <EditorContent editor={editor} />
          </div>
          <div className="flex justify-end">
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