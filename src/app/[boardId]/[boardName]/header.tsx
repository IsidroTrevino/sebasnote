'use client';

import Link from "next/link";
import { ChevronRight, Loader } from "lucide-react";
import { useBoardAncestors } from "@/features/boards/api/useGetBoardAncestors";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { cn } from "@/lib/utils";
import { UserButton } from "@/components/userButton";
import { BoardType } from "@/features/types/boardType";

interface HeaderProps {
    ancestorsData?: BoardType[];
    currentBoard?: BoardType;
    isLoading: boolean;
}

const Header = ({ ancestorsData, currentBoard, isLoading }: HeaderProps) => {
    return (
        <div className="flex flex-col bg-[#2a2a2a] shadow-lg border-b border-[#3a3a3a]">
            <div className="h-16 w-full flex items-center justify-between px-6">
                <div className="flex items-center gap-2 text-white">
                    {isLoading ? (
                        <Loader className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                        ancestorsData?.map((board, index) => (
                            <div key={board._id} className="flex items-center gap-2">
                                {index > 0 && <ChevronRight className="size-4 text-gray-400" />}
                                <Link 
                                    href={`/${board._id}/${encodeURIComponent(board.name)}`}
                                    className="hover:underline transition text-gray-400 font-semibold"
                                >
                                    {board.name}
                                </Link>
                            </div>
                        ))
                    )}
                </div>
                <UserButton/>
            </div>
            <div className={cn((currentBoard?.parentId === undefined) ? "flex items-center justify-center text-2xl font-bold" : "flex items-center justify-center text-2xl font-bold pb-4")}>
                {currentBoard?.parentId === undefined ? "" : currentBoard?.name}
            </div>
        </div>
    );
}

export default Header;
