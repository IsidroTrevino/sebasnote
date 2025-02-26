import { BoardType } from "@/features/types/boardType";
import { cn } from "@/lib/utils";
import { File, Folder, GripVertical } from "lucide-react";
import Link from "next/link";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface SortableBoardItemProps {
  board: BoardType;
}

export function SortableBoardItem({ board }: SortableBoardItemProps) {
  const boardId = useBoardId();
  const isActive = board._id === boardId;
  const [isHovering, setIsHovering] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: String(board._id)
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto'
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center rounded-md",
        isDragging && "bg-[#2a2a2a] shadow-md"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "p-1 cursor-grab",
          isHovering || isDragging ? "opacity-100" : "opacity-0",
          "transition-opacity"
        )}
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>
      
      <Link 
        href={`/${board._id}/${board.name.toLowerCase().replace(/ /g, '-')}`}
        className="flex-grow"
        onClick={(e) => isDragging && e.preventDefault()}
        draggable={false} // Prevent default HTML5 drag behavior
      >
        <div className={cn(`
          flex items-center gap-x-2 text-sm p-2 rounded-md
          hover:bg-[#2a2a2a] transition-colors
          cursor-pointer w-full
        `, 
          isActive && "bg-[#2a2a2a]"
        )}>
          {board.isDocument ? (
            <File size={18} className="text-gray-400 shrink-0" />
          ) : (
            <Folder size={18} className="text-gray-400 shrink-0" />
          )}
          <span className="text-gray-300 truncate">
            {board.name}
          </span>
        </div>
      </Link>
    </div>
  );
}