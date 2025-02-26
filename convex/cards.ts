import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createCard = mutation({
  args: {
    boardId: v.id("boards"),
    content: v.any(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = {
      boardId: args.boardId,
      userId,
      content: args.content,
      width: args.width || 300,
      height: args.height || 200,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const cardId = await ctx.db.insert("cards", card);
    return cardId;
  },
});

export const getByBoardId = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      return [];
    }

    const cards = await ctx.db
      .query("cards")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .order("desc")
      .collect();

    return cards;
  },
});

export const update = mutation({
  args: {
    id: v.id("cards"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    content: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the card to verify ownership
    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Update only the provided fields
    const updates: Partial<typeof card> = {};
    
    if (args.width !== undefined) updates.width = args.width;
    if (args.height !== undefined) updates.height = args.height;
    if (args.content !== undefined) updates.content = args.content;
    
    updates.updatedAt = Date.now();

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});