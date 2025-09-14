import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .first();
  },
});

export const update = mutation({
  args: { 
    boardId: v.id("boards"),
    content: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingDoc = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .first();

    if (existingDoc) {
      return await ctx.db.patch(existingDoc._id, {
        content: args.content,
        updatedAt: Date.now()
      });
    }

    return await ctx.db.insert("documents", {
      boardId: args.boardId,
      content: args.content,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
});

export const listAllBoards = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("boards")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  }
});