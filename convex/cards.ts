import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createCard = mutation({
  args: {
    boardId: v.id("boards"),
    content: v.any(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    color: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    linkedBoardId: v.optional(v.id("boards")),
    linkedUrl: v.optional(v.string()),
    linkedReferences: v.optional(
      v.array(
        v.object({
          type: v.string(),
          boardId: v.optional(v.id("boards")),
          url: v.optional(v.string()),
          name: v.optional(v.string()),
          color: v.optional(v.string()),
        })
      )
    ),
    categories: v.optional(v.array(v.string())),
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
      positionX: args.positionX ?? 100,
      positionY: args.positionY ?? 100,
      color: args.color || "#2a2a2a",
      fontSize: args.fontSize || 14,
      linkedBoardId: args.linkedBoardId,
      linkedUrl: args.linkedUrl,
      linkedReferences: args.linkedReferences,
      categories: args.categories || [],
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
    content: v.optional(v.string()),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    color: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    linkedBoardId: v.optional(v.id("boards")),
    linkedUrl: v.optional(v.string()),
    linkedReferences: v.optional(
      v.array(
        v.object({
          type: v.string(),
          boardId: v.optional(v.id("boards")),
          url: v.optional(v.string()),
          name: v.optional(v.string()),
          color: v.optional(v.string()),
        })
      )
    ),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) {
      throw new Error("Not authorized");
    }

    const updates: Record<string, any> = {};
    
    if (args.width !== undefined) updates.width = args.width;
    if (args.height !== undefined) updates.height = args.height;
    if (args.content !== undefined) updates.content = args.content;
    if (args.positionX !== undefined) updates.positionX = args.positionX;
    if (args.positionY !== undefined) updates.positionY = args.positionY;
    if (args.color !== undefined) updates.color = args.color;
    if (args.fontSize !== undefined) updates.fontSize = args.fontSize;
    if (args.linkedBoardId !== undefined) updates.linkedBoardId = args.linkedBoardId;
    if (args.linkedUrl !== undefined) updates.linkedUrl = args.linkedUrl;
    if (args.linkedReferences !== undefined) updates.linkedReferences = args.linkedReferences;
    if (args.categories !== undefined) updates.categories = args.categories;
    
    updates.updatedAt = Date.now();

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Update card position (optimized for drag operations)
export const updatePosition = mutation({
  args: {
    id: v.id("cards"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      positionX: args.positionX,
      positionY: args.positionY,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Update card color
export const updateColor = mutation({
  args: {
    id: v.id("cards"),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, {
      color: args.color,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const deleteCard = mutation({
  args: {
    id: v.id("cards"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) {
      throw new Error("Card not found or unauthorized");
    }

    // Delete all connections involving this card
    const fromConnections = await ctx.db
      .query("cardConnections")
      .withIndex("by_from_card", (q) => q.eq("fromCardId", args.id))
      .collect();
    
    const toConnections = await ctx.db
      .query("cardConnections")
      .withIndex("by_to_card", (q) => q.eq("toCardId", args.id))
      .collect();

    for (const conn of [...fromConnections, ...toConnections]) {
      await ctx.db.delete(conn._id);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ============ CONNECTION MUTATIONS ============

export const createConnection = mutation({
  args: {
    boardId: v.id("boards"),
    fromCardId: v.id("cards"),
    toCardId: v.id("cards"),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify both cards exist and belong to user
    const fromCard = await ctx.db.get(args.fromCardId);
    const toCard = await ctx.db.get(args.toCardId);
    
    if (!fromCard || !toCard || fromCard.userId !== userId || toCard.userId !== userId) {
      throw new Error("Cards not found or unauthorized");
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query("cardConnections")
      .withIndex("by_from_card", (q) => q.eq("fromCardId", args.fromCardId))
      .filter((q) => q.eq(q.field("toCardId"), args.toCardId))
      .first();

    if (existing) {
      throw new Error("Connection already exists");
    }

    const connection = {
      boardId: args.boardId,
      userId,
      fromCardId: args.fromCardId,
      toCardId: args.toCardId,
      label: args.label,
      color: args.color || "#6b7280",
      createdAt: Date.now(),
    };

    const connectionId = await ctx.db.insert("cardConnections", connection);
    return connectionId;
  },
});

export const deleteConnection = mutation({
  args: {
    id: v.id("cardConnections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const connection = await ctx.db.get(args.id);
    if (!connection || connection.userId !== userId) {
      throw new Error("Connection not found or unauthorized");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const updateConnection = mutation({
  args: {
    id: v.id("cardConnections"),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const connection = await ctx.db.get(args.id);
    if (!connection || connection.userId !== userId) {
      throw new Error("Connection not found or unauthorized");
    }

    const updates: Partial<typeof connection> = {};
    if (args.label !== undefined) updates.label = args.label;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const getConnectionsByBoard = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const connections = await ctx.db
      .query("cardConnections")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return connections;
  },
});