import { useBoardId } from "@/features/boards/api/useBoardId";
import { useGetBoard } from "@/features/boards/api/useGetBoard";

interface BoardSidebarProps {
  board: {
    _id: string;
    name: string;
  };
}

const BoardSidebar = ({board}: BoardSidebarProps) => {

  return (
    <div className="p-4 h-[50%] overflow-scroll">
        <h2 className="text-lg font-semibold text-gray-400">
            {board?.name === "Home" ? "Your projects" : board?.name}
        </h2>


      
    </div>
  )
}

export default BoardSidebar
