'use client';

import BoardSidebar from "@/components/boardsSidebar";
import Header from "./header";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { useBoardAncestors } from "@/features/boards/api/useGetBoardAncestors";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { BoardType } from "@/features/types/boardType";
import { useGetBoards } from "@/features/boards/api/useGetBoards";

interface BoardNameLayoutProps {
    children: React.ReactNode;
}

const BoardNameLayout = ({ children }: BoardNameLayoutProps) => {
    const ancestors = useBoardAncestors();
    const isLoading = ancestors === undefined;
    const boardId = useBoardId();
    const {data: board} = useGetBoard({id: boardId});
    const {boards: boardChildren} = useGetBoards();

    return (
        <div className="h-screen w-screen bg-[#1a1a1a] text-gray-200">
            <Header currentBoard={board as BoardType} ancestorsData={ancestors as BoardType[]} isLoading={isLoading}/>
            <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-4rem)]">
            <ResizablePanel 
                defaultSize={25}
                minSize={20} 
                maxSize={30}
                className="bg-[#2a2a2a] border-r border-[#3a3a3a]"
            >
                <BoardSidebar board={board as BoardType} boardChildren={boardChildren}/>
                <Separator className="bg-[#3a3a3a]" />
            </ResizablePanel>

            <ResizableHandle className="bg-[#2a2a2a] border-x border-[#3a3a3a]" />

            <ResizablePanel defaultSize={85} className="bg-[#1a1a1a]">
                {children}
            </ResizablePanel>
        </ResizablePanelGroup>
        </div>
    );
}

export default BoardNameLayout;