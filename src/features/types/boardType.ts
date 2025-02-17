import { Id } from "../../../convex/_generated/dataModel";

export type BoardType = {
    _id: Id<"boards">;
    _creationTime: number;
    parentId?: Id<"boards"> | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
};