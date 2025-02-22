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
        storageId: v.string(),
        name: v.string()
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const url = await ctx.storage.getUrl(args.storageId);
        if (!url) throw new Error("Failed to get storage URL");
        return await ctx.db.insert("referenceImages", {
            boardId: args.boardId,
            userId,
            storageId: args.storageId,
            title: args.name,
            createdAt: Date.now(),
            url
        });
    }
});

export const getByBoardId = query({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        const images = await ctx.db
            .query("referenceImages")
            .filter((q) => q.eq(q.field("boardId"), args.boardId))
            .collect();

        return await Promise.all(
            images.map(async (image) => ({
                ...image,
                url: await ctx.storage.getUrl(image.storageId)
            }))
        );
    }
});

export const deleteImage = mutation({
    args: { imageId: v.id("referenceImages") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const image = await ctx.db.get(args.imageId);
        if (!image || image.userId !== userId) {
            throw new Error("Not authorized");
        }

        await ctx.storage.delete(image.storageId);
        await ctx.db.delete(args.imageId);
    }
});