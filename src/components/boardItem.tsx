import { BoardType } from "@/features/types/boardType";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface BoardItemProps {
    board: BoardType;
}

const BoardItem = ({ board }: BoardItemProps) => {
    const router = useRouter();
    return (
        <div className="m-4 p-2 cursor-pointer border border-gray-600  flex items-center justify-between bg-[#2a2a2a] hover:bg-[#3a3a3a]" onClick={() => router.push(`/${board._id}/${encodeURIComponent(board.name)}`)}>
            <h2 className="text-lg font-semibold text-gray-400 w-[80%]">
                {board.name}
            </h2>
            <ChevronRight size={24} />
        </div>
    );
}

export default BoardItem;