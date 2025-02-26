import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";
import {authTables} from "@convex-dev/auth/server";

const schema = defineSchema({
    ...authTables,
    boards: defineTable({
        name: v.string(),
        userId: v.string(),
        parentId: v.optional(v.id("boards")),
        isHome: v.boolean(),
        isDocument: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number()
    }),

    projectCovers: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        storageId: v.string(),
        createdAt: v.number()
    }).index("by_board", ["boardId"]),

    referenceImages: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        url: v.string(),
        storageId: v.string(),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        createdAt: v.number()
    }).index("by_board", ["boardId"]),

    cards: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        content: v.any(), 
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number()
    }).index("by_board", ["boardId"]),

    documents: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        content: v.string(),
        createdAt: v.number(),
        updatedAt: v.number()
    }).index("by_board", ["boardId"]),
});

export default schema;