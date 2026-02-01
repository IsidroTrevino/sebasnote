'use client';

import BoardSidebar from "@/components/boardsSidebar";
import Header from "./header";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { useBoardAncestors } from "@/features/boards/api/useGetBoardAncestors";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { BoardType } from "@/features/types/boardType";
import { Button } from "@/components/ui/button";
import { Loader, Plus } from "lucide-react";
import { useCreateBoardModal } from "@/features/boards/store/useCreateBoardModal";
import ImagesSidebar from "@/components/imagesSidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface BoardNameLayoutProps {
    children: React.ReactNode;
}

const BoardNameLayout = ({ children }: BoardNameLayoutProps) => {
    const ancestors = useBoardAncestors();
    const boardId = useBoardId();
    const board = useGetBoard({id: boardId});
    const isLoading = ancestors === undefined || board === undefined;
    const [, setCreateOpen] = useCreateBoardModal();
    const router = useRouter();


    useEffect(() => {
        if (!isLoading && !board) {
            const pending = typeof window !== "undefined"
                ? sessionStorage.getItem("pendingBoardRedirect")
                : null;

            if (pending) {
                sessionStorage.removeItem("pendingBoardRedirect");
                router.replace(pending);
                return;
            }

            router.push('/');
        }
    }, [board, isLoading, router]);

    if (isLoading || !board) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
                <Loader className="size-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#1a1a1b] text-gray-200">
            <Header currentBoard={board as BoardType} ancestorsData={ancestors as BoardType[]} isLoading={isLoading}/>
            {board?.isHome !== true ? (
                <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-4rem)]">
                <ResizablePanel 
                    defaultSize={25}
                    minSize={20} 
                    maxSize={30}
                    className="bg-[#2a2a2a] border-r border-[#3a3a3a]"
                >
                    <BoardSidebar board={board as BoardType} />
                    <Separator className="bg-[#3a3a3a]" />
                    <ImagesSidebar board={board as BoardType} />
                </ResizablePanel>
    
                <ResizableHandle className="bg-[#2a2a2a] border-x border-[#3a3a3a]" />
    
                <ResizablePanel defaultSize={85} className="bg-[#1a1a1a]">
                    {children}
                </ResizablePanel>
            </ResizablePanelGroup>
            ) : (
                <div className="w-full h-full flex flex-col">
                    <div className="flex flex-row items-center justify-end p-10">
                        <Button className="bg-[#2a2a2a] hover:bg-[#4a4a4a]" onClick={() => setCreateOpen(true)}> <Plus/> Create Board</Button>
                    </div>
                    <div>
                        {children}
                    </div>
                </div>
            )}
            
        </div>
    );
}

export default BoardNameLayout;