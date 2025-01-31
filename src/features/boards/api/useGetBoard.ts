import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface useGetBoardProps {
    id: Id<"boards">;
}

export const useGetBoard = ({id}: useGetBoardProps) => {
    const data = useQuery(api.boards.getById, {boardId: id});
    const isLoading = data === undefined;

    return {data, isLoading};
};
