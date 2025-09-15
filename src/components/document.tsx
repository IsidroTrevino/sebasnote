'use client';

import React, { useState, useMemo } from 'react';
import { EditorContent } from '@tiptap/react';
import { debounce } from 'lodash';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { useListAllBoards } from '@/features/boards/store/useListAllBoards';
import MenuBar from '@/features/boards/components/editor/menuBar';
import { useSharedEditor, EditorStyles } from '@/features/boards/store/useSharedEditor';

interface DocumentProps {
  boardId: Id<'boards'>;
  initialContent?: string;
}

export const Document = ({ boardId, initialContent = '' }: DocumentProps) => {
  const [, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const updateDocument = useMutation(api.documents.update);
  const { data: allBoards } = useListAllBoards();

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

  const editor = useSharedEditor({
    initialContent,
    placeholder: 'Start typing your document here...',
    onUpdate: (newContent) => {
      setContent(newContent);
      debouncedSave(newContent);
    },
    enableResizableImage: true,
    enableNavigation: true
  });

  return (
    <div className="h-full w-full flex flex-col bg-[#1a1a1a] overflow-hidden">
      <div className="bg-[#2a2a2a] rounded-md shadow-md flex-grow flex flex-col overflow-hidden border border-[#3a3a3a]">
        <MenuBar editor={editor} linkableBoards={allBoards || []} boardId={boardId} />
        <div className="flex-grow p-6 overflow-y-auto">
          <EditorStyles />
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