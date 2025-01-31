'use client';

import Link from "next/link";
import { ChevronRight, Loader } from "lucide-react";
import { useBoardAncestors } from "@/features/boards/api/useGetBoardAncestors";
import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { cn } from "@/lib/utils";
import { UserButton } from "@/components/userButton";

const Header = () => {
    const ancestors = useBoardAncestors();
    const isLoading = ancestors === undefined;
    const boardId = useBoardId();
    const {data: board} = useGetBoard({id: boardId});

    return (
        <div className="flex flex-col bg-gray-200 shadow-lg">
            <div className="h-16 w-full flex items-center justify-between px-6">
                <div className="flex items-center gap-2 text-white">
                    {isLoading ? (
                        <Loader className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                        ancestors?.map((board, index) => (
                            <div key={board._id} className="flex items-center gap-2">
                                {index > 0 && <ChevronRight className="size-4 text-black" />}
                                <Link 
                                    href={`/${board._id}/${encodeURIComponent(board.name)}`}
                                    className="hover:underline transition text-black font-semibold"
                                >
                                    {board.name}
                                </Link>
                            </div>
                        ))
                    )}
                </div>
                <UserButton/>
            </div>
            <div className={cn(board?.name === "Home" ? "flex items-center justify-center text-2xl font-bold" : "flex items-center justify-center text-2xl font-bold pb-4")}>
                {
                    board?.name === "Home" ? (
                        ""
                    ) : (
                        board?.name
                    )
                }
            </div>
        </div>
    );
}

export default Header;