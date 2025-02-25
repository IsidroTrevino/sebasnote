'use client';

import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { BoardCard } from "@/components/boardCard";
import { Loader, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateCardModal } from "@/features/cards/store/useCreateCardModal";

export default function BoardPage() {
    const boardId = useBoardId();
    const [,setOpen] = useCreateCardModal();
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

    if (!board.isHome) {
        return (
            <div className="h-screen w-full bg-[#1a1a1a] relative">
                {!board.isDocument && (
                    <div className="absolute top-4 right-4">
                        <Button 
                            onClick={() => setOpen(true)}
                            className="bg-[#2a2a2a] hover:bg-[#4a4a4a]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Card
                        </Button>
                    </div>
                )}
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