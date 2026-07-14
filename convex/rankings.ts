import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const defaultRows = [
  { id: "ss-plus", label: "SS+", color: "#dc2626" },
  { id: "ss", label: "SS", color: "#ea580c" },
  { id: "s", label: "S", color: "#f59e0b" },
  { id: "a", label: "A", color: "#22c55e" },
  { id: "b", label: "B", color: "#3b82f6" },
  { id: "c", label: "C", color: "#8b5cf6" },
  { id: "d", label: "D", color: "#6b7280" },
];

async function requireBoardOwner(ctx: any, boardId: Id<"boards">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const board = await ctx.db.get(boardId);
  if (!board || board.userId !== userId) {
    throw new Error("Board not found or unauthorized");
  }

  return { userId, board };
}

async function ensureRankingBoard(ctx: any, boardId: Id<"boards">, userId: string) {
  const existing = await ctx.db
    .query("rankingBoards")
    .withIndex("by_board", (q: any) => q.eq("boardId", boardId))
    .first();

  if (existing) return existing;

  const id = await ctx.db.insert("rankingBoards", {
    boardId,
    userId,
    mode: "image",
    rows: defaultRows,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return await ctx.db.get(id);
}

export const get = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const { userId } = await requireBoardOwner(ctx, args.boardId);
    const ranking = await ensureRankingBoard(ctx, args.boardId, userId);

    const items = await ctx.db
      .query("rankingItems")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const hydratedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        url: item.storageId ? await ctx.storage.getUrl(item.storageId) : item.url,
      }))
    );

    hydratedItems.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);

    return {
      ranking,
      items: hydratedItems,
    };
  },
});

export const generateUploadUrl = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    await requireBoardOwner(ctx, args.boardId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const setMode = mutation({
  args: {
    boardId: v.id("boards"),
    mode: v.union(v.literal("image"), v.literal("text")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBoardOwner(ctx, args.boardId);
    const ranking = await ensureRankingBoard(ctx, args.boardId, userId);
    if (!ranking) throw new Error("Ranking board not found");

    await ctx.db.patch(ranking._id, {
      mode: args.mode,
      updatedAt: Date.now(),
    });
  },
});

export const updateRows = mutation({
  args: {
    boardId: v.id("boards"),
    rows: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        color: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBoardOwner(ctx, args.boardId);
    const ranking = await ensureRankingBoard(ctx, args.boardId, userId);
    if (!ranking) throw new Error("Ranking board not found");

    if (args.rows.length === 0) {
      throw new Error("A ranking board needs at least one row");
    }

    await ctx.db.patch(ranking._id, {
      rows: args.rows,
      updatedAt: Date.now(),
    });
  },
});

export const createTextItem = mutation({
  args: {
    boardId: v.id("boards"),
    rowId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBoardOwner(ctx, args.boardId);
    const items = await ctx.db
      .query("rankingItems")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("rowId"), args.rowId))
      .collect();

    const maxOrder = items.length ? Math.max(...items.map((item) => item.order)) : 0;

    return await ctx.db.insert("rankingItems", {
      boardId: args.boardId,
      userId,
      rowId: args.rowId,
      type: "text",
      text: args.text.trim(),
      order: maxOrder + 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const createImageItem = mutation({
  args: {
    boardId: v.id("boards"),
    rowId: v.string(),
    storageId: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBoardOwner(ctx, args.boardId);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to load uploaded image");

    const items = await ctx.db
      .query("rankingItems")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("rowId"), args.rowId))
      .collect();

    const maxOrder = items.length ? Math.max(...items.map((item) => item.order)) : 0;

    return await ctx.db.insert("rankingItems", {
      boardId: args.boardId,
      userId,
      rowId: args.rowId,
      type: "image",
      text: args.text,
      storageId: args.storageId,
      url,
      order: maxOrder + 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const moveItem = mutation({
  args: {
    itemId: v.id("rankingItems"),
    rowId: v.string(),
    orderedIds: v.array(v.id("rankingItems")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found or unauthorized");
    }

    await requireBoardOwner(ctx, item.boardId);

    const ids = args.orderedIds.includes(args.itemId)
      ? args.orderedIds
      : [...args.orderedIds, args.itemId];

    for (let index = 0; index < ids.length; index++) {
      const rowItem = await ctx.db.get(ids[index]);
      if (rowItem && rowItem.userId === userId && rowItem.boardId === item.boardId) {
        await ctx.db.patch(ids[index], {
          rowId: args.rowId,
          order: (index + 1) * 1000,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const updateItemText = mutation({
  args: {
    itemId: v.id("rankingItems"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found or unauthorized");
    }

    await ctx.db.patch(args.itemId, {
      text: args.text,
      updatedAt: Date.now(),
    });
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("rankingItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found or unauthorized");
    }

    if (item.storageId) {
      await ctx.storage.delete(item.storageId);
    }

    await ctx.db.delete(args.itemId);
  },
});
