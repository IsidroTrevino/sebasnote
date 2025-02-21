import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        return await ctx.storage.generateUploadUrl();
    }
});

export const create = mutation({
    args: {
        boardId: v.id("boards"),
        storageId: v.string()
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        return await ctx.db.insert("projectCovers", {
            boardId: args.boardId,
            userId,
            storageId: args.storageId,
            createdAt: Date.now()
        });
    }
});

export const getByBoardId = query({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        const cover = await ctx.db
            .query("projectCovers")
            .filter((q) => q.eq(q.field("boardId"), args.boardId))
            .first();

        if (!cover) return null;

        const url = await ctx.storage.getUrl(cover.storageId);
        return {
            ...cover,
            url
        };
    }
});