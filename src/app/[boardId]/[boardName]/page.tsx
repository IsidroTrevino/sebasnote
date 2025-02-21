'use client';

import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { BoardCard } from "@/components/boardCard";
import { Loader } from "lucide-react";


export default function BoardPage() {
    const boardId = useBoardId();
    const board = useGetBoard({ id: boardId });
    const { boards: children, isLoading: isLoadingChildren } = useGetChildren(boardId);

    if (isLoadingChildren) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader className="size-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (!board?.isHome) {
        return (
            <div className="h-full w-full">
            </div>
        );
    }

    return (
        <div className="h-full w-full p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {children?.map((board) => (
                    <BoardCard 
                        key={board._id} 
                        id={board._id} 
                        name={board.name} 
                    />
                ))}
            </div>
        </div>
    );
}