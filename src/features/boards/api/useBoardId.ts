import { useParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";

export const useBoardId = () => {
    const params = useParams();
    return params.boardId as Id<'boards'>;
}