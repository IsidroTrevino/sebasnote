import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {v} from "convex/values";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
        return {
            home: null,
            children: []
        };
        }

        const homeBoard = await ctx.db
        .query("boards")
        .filter((q) => 
            q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("name"), "Home"),
            q.eq(q.field("parentId"), undefined)
            )
        )
        .first();

        const childBoards = homeBoard ? await ctx.db
        .query("boards")
        .filter((q) => 
            q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("parentId"), homeBoard._id)
            )
        )
        .collect() : [];

        return {
        home: homeBoard,
        children: childBoards
        };
    }
});
  
export const create = mutation({
    args: {
        name: v.string(),
        parentId: v.optional(v.id("boards")), 
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        
        if (!userId) {
        throw new Error("Not authenticated");
        }

        return await ctx.db.insert("boards", {
        name: args.name,
        userId,
        parentId: args.parentId,
        position: { x: 0, y: 0 },
        createdAt: Date.now(),
        updatedAt: Date.now()
        });
    },
});


export const getAncestors = query({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        const ancestors: Doc<"boards">[] = [];
        let currentBoardId: Id<"boards"> | undefined = args.boardId;

        while (currentBoardId !== undefined) {
            const board: Doc<"boards"> | null = await ctx.db.get(currentBoardId);
            if (!board) break;
            
            ancestors.unshift(board);
            currentBoardId = board.parentId;
        }

        return ancestors;
    },
});

export const getById = query({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.boardId);
    },
});