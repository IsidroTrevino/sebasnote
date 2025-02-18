import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { useGetBoards } from "@/features/boards/api/useGetBoards";
import { BoardType } from "@/features/types/boardType";
import BoardItem from "./boardItem";
import { Loader, Plus } from "lucide-react";

interface BoardSidebarProps {
    board: BoardType;
}

const BoardSidebar = ({ board }: BoardSidebarProps) => {
    const { boards: children, isLoading } = useGetBoards(board?._id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="animate-spin size-6"/>
            </div>
        );
    }

    return (
        <div className="p-4 h-[50%] overflow-scroll">
            <div className="flex flex-row items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-400">
                  {board?.name === "Home" ? "Your projects" : board?.name}
              </h2>
              <Plus size={20} />
            </div>
            {children?.map((child) => (
                <BoardItem key={child._id} board={child} />
            ))}
        </div>
    );
};

export default BoardSidebar;