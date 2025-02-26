// src/components/boardsSidebar.tsx
import { BoardType } from "@/features/types/boardType";
import { Ellipsis, Loader, Plus } from "lucide-react";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { useCreateBoardModal } from "@/features/boards/store/useCreateBoardModal";
import { useUpdateBoardModal } from "@/features/boards/store/useUpdateBoardModal";
import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { SortableBoardItem } from "./sortableBoardItem";

interface BoardSidebarProps {
  board: BoardType;
}

const BoardSidebar = ({ board }: BoardSidebarProps) => {
  const { boards: fetchedChildren, isLoading } = useGetChildren(board?._id);
  const [, setCreateOpen] = useCreateBoardModal();
  const [, setUpdateOpen] = useUpdateBoardModal();
  const updateBoardOrder = useMutation(api.boards.updateOrder);
  const [children, setChildren] = useState<BoardType[] | undefined>(undefined);
  
  const [hasReordered, setHasReordered] = useState(false);

  useEffect(() => {
    if (fetchedChildren && !hasReordered) {
      setChildren(fetchedChildren);
    } else if (!fetchedChildren && children === undefined) {
      setChildren([]);
    }
  }, [fetchedChildren, hasReordered]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 } 
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !children || active.id === over.id) return;
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    const oldIndex = children.findIndex((item) => String(item._id) === activeId);
    const newIndex = children.findIndex((item) => String(item._id) === overId);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const updatedChildren = arrayMove([...children], oldIndex, newIndex);
    setChildren(updatedChildren);
    
    setHasReordered(true);
    
    try {
      const toastId = "update-order";
      toast.loading("Updating order...", { id: toastId });
      
      const updates = updatedChildren.map((child, index) => ({
        id: child._id,
        order: index * 10
      }));
      
      await updateBoardOrder({ updates });
      toast.success("Order updated", { id: toastId });
      
      setTimeout(() => setHasReordered(false), 1000);
    } catch (error) {
      console.error("Failed to update board order:", error);
      toast.error("Failed to update order");
      
      if (fetchedChildren) {
        setChildren(fetchedChildren);
      }
      setHasReordered(false);
    }
  }, [children, fetchedChildren, updateBoardOrder]);

  if (isLoading && !children) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin size-6"/>
      </div>
    );
  }

  return (
    <div className="p-4 h-[50%] overflow-scroll">
      <div className="flex flex-row items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-400">
          {(board?.parentId === undefined) ? "Your projects" : board?.name}
        </h2>
        <div className="flex flex-row gap-4">
          <Plus size={20} className="cursor-pointer" onClick={() => setCreateOpen(true)}/>
          {board?.parentId !== undefined && (
            <Ellipsis 
              size={20} 
              className="cursor-pointer" 
              onClick={() => setUpdateOpen(true)}
            />
          )}
        </div>
      </div>
      
      {children && children.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={children.map(child => String(child._id))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {children.map((child) => (
                <SortableBoardItem key={String(child._id)} board={child} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-gray-500 text-sm">No boards yet</div>
      )}
    </div>
  );
};

export default BoardSidebar;