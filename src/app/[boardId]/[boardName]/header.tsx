'use client';

import Link from "next/link";
import { ChevronRight, Loader } from "lucide-react";
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
        <div className="flex shrink-0 flex-col bg-[#2a2a2a] shadow-lg border-b border-[#3a3a3a]">
            <div className="h-16 w-full flex items-center justify-between gap-3 px-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto text-white">
                    {isLoading ? (
                        <Loader className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                        ancestorsData?.map((board, index) => (
                            <div key={board._id} className="flex items-center gap-2">
                                {index > 0 && <ChevronRight className="size-4 text-gray-400" />}
                                <Link 
                                    href={`/${board._id}/${encodeURIComponent(board.name)}`}
                                    className="max-w-[42vw] truncate whitespace-nowrap text-sm font-semibold text-gray-400 transition hover:underline sm:max-w-none sm:text-base"
                                >
                                    {board.name}
                                </Link>
                            </div>
                        ))
                    )}
                </div>
                <UserButton/>
            </div>
            <div className={cn((currentBoard?.parentId === undefined) ? "flex items-center justify-center px-3 text-xl font-bold sm:text-2xl" : "flex items-center justify-center px-3 pb-3 text-xl font-bold sm:pb-4 sm:text-2xl")}>
                {currentBoard?.parentId === undefined ? "" : currentBoard?.name}
            </div>
        </div>
    );
}

export default Header;
