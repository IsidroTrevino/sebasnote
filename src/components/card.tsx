import { Rnd } from "react-rnd";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Card as CardType } from "@/features/types/CardTypes";

interface CardProps {
  card: CardType;
  onChange: (content: string) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onResizeStop: (width: number, height: number) => void;
}

export const CardComponent = ({
  card,
  onChange,
  onPositionChange,
  onResizeStop,
}: CardProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
    ],
    content: card.content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <Rnd
      default={{
        x: card.position.x,
        y: card.position.y,
        width: card.position.width,
        height: card.position.height,
      }}
      minWidth={200}
      minHeight={100}
      bounds="parent"
      onDragStop={(_e, d) => {
        onPositionChange({ x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _direction, ref, _delta, _position) => {
        onResizeStop(ref.offsetWidth, ref.offsetHeight);
      }}
    >
      <div className="w-full h-full p-4 bg-[#2a2a2a] rounded-lg border border-[#3a3a3a] overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </Rnd>
  );
};