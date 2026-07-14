import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";

const EMPTY_BOARDS: Doc<"boards">[] = [];

export const useListAllBoards = () => {
    // Make sure your query returns objects with _id and name properties
    const queryData = useQuery(api.documents.listAllBoards);
    const data = queryData ?? EMPTY_BOARDS;
    const isLoading = queryData === undefined;

    return { data, isLoading };
};
