'use client';

import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { BoardCard } from "@/components/boardCard";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BoardPage() {
    const boardId = useBoardId();
    const board = useGetBoard({ id: boardId });
    const { boards: children, isLoading: isLoadingChildren } = useGetChildren(boardId);
    const router = useRouter();


    useEffect(() => {
        if (!isLoadingChildren && !board) {
            router.push('/');
        }
    }, [board, isLoadingChildren, router]);

    if (isLoadingChildren || !board) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
                <Loader className="size-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (isLoadingChildren) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
                <Loader className="size-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (!board?.isHome) {
        return (
            <div className="h-screen w-full bg-[#1a1a1a]">
            </div>
        );
    }

    return (
        <div className="h-screen w-screen p-6 bg-[#1a1a1a]">
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