import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      return null;
    }

    const document = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .first();
    
    return document;
  },
});

export const update = mutation({
  args: {
    boardId: v.id("boards"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Not authorized");
    }

    const existingDoc = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .first();

    if (existingDoc) {
      await ctx.db.patch(existingDoc._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      return existingDoc._id;
    } else {
      return await ctx.db.insert("documents", {
        boardId: args.boardId,
        userId,
        content: args.content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});