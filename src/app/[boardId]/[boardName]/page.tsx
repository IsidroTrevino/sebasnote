'use client';

import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { BoardCard } from "@/components/boardCard";
import { Loader, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCreateCardModal } from "@/features/boards/store/useCreateCardModal";

export default function BoardPage() {
    const boardId = useBoardId();
    const board = useGetBoard({ id: boardId });
    const { boards: children, isLoading: isLoadingChildren } = useGetChildren(boardId);
    const router = useRouter();
    const [, setCreateCardOpen] = useCreateCardModal();

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

    if (!board?.isHome) {
        return (
            <div className="flex h-screen w-full bg-[#1a1a1a]">
                {
                    !board?.isDocument && (
                        <div className="flex justify-end p-4 w-full">
                            <Button className="mr-4 mt-4" onClick={() => setCreateCardOpen(true)}><Plus/> Add Card</Button>
                        </div>
                    )
                }
            </div>
            
        );
    }

    return (
        <div className="flex flex-col h-screen w-screen p-6 bg-[#1a1a1a]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-grow">
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