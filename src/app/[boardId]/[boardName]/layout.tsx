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
import { ImageIcon, Loader, PanelLeft, Plus, X } from "lucide-react";
import { useCreateBoardModal } from "@/features/boards/store/useCreateBoardModal";
import ImagesSidebar from "@/components/imagesSidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 768px)");
        const syncViewport = () => setIsDesktop(mediaQuery.matches);

        syncViewport();
        mediaQuery.addEventListener("change", syncViewport);

        return () => mediaQuery.removeEventListener("change", syncViewport);
    }, []);

    useEffect(() => {
        if (isDesktop) {
            setMobileSidebarOpen(false);
        }
    }, [isDesktop]);

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
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#1a1a1b] text-gray-200">
            <Header currentBoard={board as BoardType} ancestorsData={ancestors as BoardType[]} isLoading={isLoading}/>
            {board?.isHome !== true ? (
                <div className="relative min-h-0 flex-1">
                    {isDesktop ? (
                        <ResizablePanelGroup direction="horizontal" className="h-full">
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

                            <ResizablePanel defaultSize={75} className="min-h-0 bg-[#1a1a1a]">
                                <main className="h-full min-h-0">
                                    {children}
                                </main>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    ) : (
                        <main className="h-full min-h-0">
                            {children}
                        </main>
                    )}

                    {!isDesktop && (
                    <div className="fixed bottom-4 left-4 z-50 flex gap-2">
                        <Button
                            type="button"
                            size="icon"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="h-11 w-11 rounded-full border border-[#3a3a3a] bg-[#2a2a2a] shadow-lg hover:bg-[#3a3a3a]"
                            aria-label="Open workspace sidebar"
                        >
                            <PanelLeft className="h-5 w-5" />
                        </Button>
                    </div>
                    )}

                    {!isDesktop && mobileSidebarOpen && (
                        <div className="fixed inset-0 z-[80]">
                            <button
                                type="button"
                                className="absolute inset-0 bg-black/60"
                                onClick={() => setMobileSidebarOpen(false)}
                                aria-label="Close workspace sidebar backdrop"
                            />
                            <aside className="absolute bottom-0 left-0 top-0 flex w-[86vw] max-w-sm flex-col border-r border-[#3a3a3a] bg-[#242424] shadow-2xl">
                                <div className="flex h-14 items-center justify-between border-b border-[#3a3a3a] px-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                                        <ImageIcon className="h-4 w-4 text-gray-400" />
                                        Workspace
                                    </div>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setMobileSidebarOpen(false)}
                                        className="h-9 w-9 text-gray-300 hover:bg-[#333333]"
                                        aria-label="Close workspace sidebar"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <BoardSidebar board={board as BoardType} />
                                    <Separator className="bg-[#3a3a3a]" />
                                    <ImagesSidebar board={board as BoardType} />
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex flex-row items-center justify-end p-4 sm:p-10">
                        <Button className="bg-[#2a2a2a] hover:bg-[#4a4a4a]" onClick={() => setCreateOpen(true)}> <Plus/> Create Board</Button>
                    </div>
                    <main className="min-h-0 flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            )}
            
        </div>
    );
}

export default BoardNameLayout;
