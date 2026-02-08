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
        isSpotify: v.optional(v.boolean()),
        isExcel: v.optional(v.boolean()),
        order: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
        lastVisited: v.optional(v.number())
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
        // Mind map properties
        positionX: v.optional(v.number()),
        positionY: v.optional(v.number()),
        color: v.optional(v.string()),
        fontSize: v.optional(v.number()),
        linkedBoardId: v.optional(v.id("boards")),
        linkedUrl: v.optional(v.string()),
        linkedReferences: v.optional(v.array(v.object({
            type: v.string(),
            boardId: v.optional(v.id("boards")),
            url: v.optional(v.string()),
            name: v.optional(v.string()),
            color: v.optional(v.string()),
        }))),
        categories: v.optional(v.array(v.string())),
        createdAt: v.number(),
        updatedAt: v.number()
    }).index("by_board", ["boardId"]),

    // Connections between cards (arrows in mind map)
    cardConnections: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        fromCardId: v.id("cards"),
        toCardId: v.id("cards"),
        label: v.optional(v.string()),
        color: v.optional(v.string()),
        createdAt: v.number()
    }).index("by_board", ["boardId"])
      .index("by_from_card", ["fromCardId"])
      .index("by_to_card", ["toCardId"]),

    documents: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        content: v.string(),
        createdAt: v.number(),
        updatedAt: v.number()
    }).index("by_board", ["boardId"]),

    spreadsheets: defineTable({
        boardId: v.id("boards"),
        userId: v.string(),
        data: v.any(),
        createdAt: v.number(),
        updatedAt: v.number()
    }).index("by_board", ["boardId"]),
});

export default schema;
