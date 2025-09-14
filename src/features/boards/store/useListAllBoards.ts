import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useListAllBoards = () => {
    // Make sure your query returns objects with _id and name properties
    const data = useQuery(api.documents.listAllBoards) || [];
    const isLoading = data === undefined;

    return { data, isLoading };
};