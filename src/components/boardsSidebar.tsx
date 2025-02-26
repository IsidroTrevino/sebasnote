
import { BoardType } from "@/features/types/boardType";
import BoardItem from "./boardItem";
import { Ellipsis, Loader, Plus } from "lucide-react";
import { useGetChildren } from "@/features/boards/api/useGetChildren";
import { useCreateBoardModal } from "@/features/boards/store/useCreateBoardModal";
import { useUpdateBoardModal } from "@/features/boards/store/useUpdateBoardModal";

interface BoardSidebarProps {
    board: BoardType;
}

const BoardSidebar = ({ board }: BoardSidebarProps) => {
    const { boards: children, isLoading } = useGetChildren(board?._id);
    const [, setCreateOpen] = useCreateBoardModal();
    const [, setUpdateOpen] = useUpdateBoardModal();

    if (isLoading || !board) {
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
                  {(board?.parentId === undefined) ? "Your projects" : board?.name}
              </h2>
                <div className="flex flex-row gap-4">
                    <Plus size={20} className="cursor-pointer" onClick={() => setCreateOpen(true)}/>
                    {board?.parentId !== undefined && (
                        <Ellipsis 
                            size={20} 
                            className="cursor-pointer" 
                            onClick={() => setUpdateOpen(true)}
                        />
                    )}
                </div>
            </div>
            {children?.map((child) => (
                <BoardItem key={child._id} board={child} />
            ))}
        </div>
    );
};

export default BoardSidebar;