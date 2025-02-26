import { Id } from "../../../convex/_generated/dataModel";

export type BoardType = {
    _id: Id<"boards">;
    _creationTime: number;
    parentId?: Id<"boards"> | undefined;
    name: string;
    isHome: boolean;
    isDocument: boolean;
    userId: string;
    createdAt: number;
    updatedAt: number;
};