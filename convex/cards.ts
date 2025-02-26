import { mutation } from "./_generated/server";
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