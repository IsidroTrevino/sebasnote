import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";
import { BoardType } from "@/features/types/boardType";

interface BoardSidebarProps {
  board: BoardType;
  boardChildren: BoardType[];
}

const BoardSidebar = ({board, boardChildren}: BoardSidebarProps) => {

  return (
    <div className="p-4 h-[50%] overflow-scroll">
        <h2 className="text-lg font-semibold text-gray-400">
            {board?.name === "Home" ? "Your projects" : board?.name}
        </h2>
        {
              boardChildren.map((child) => (
                <h3 className="text-md font-semibold text-gray-300" key={child._id}>
                  {child.name}
                </h3>
              ))
          }
    </div>
  )
}

export default BoardSidebar
