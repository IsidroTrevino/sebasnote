import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Spreadsheet data structure
export const createSpreadsheet = mutation({
  args: {
    boardId: v.id("boards"),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create default empty spreadsheet data
    const data = {
      rows: 20,
      cols: 10,
      cells: {} as Record<string, { value: string; formula?: string; format?: any }>,
    };

    // Initialize with empty cells
    for (let row = 0; row < data.rows; row++) {
      for (let col = 0; col < data.cols; col++) {
        data.cells[`${row}_${col}`] = { value: "" };
      }
    }

    const id = await ctx.db.insert("spreadsheets", {
      boardId: args.boardId,
      userId: identity.subject,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const getSpreadsheet = query({
  args: {
    boardId: v.id("boards"),
  },
  async handler(ctx, args) {
    const spreadsheet = await ctx.db
      .query("spreadsheets")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    return spreadsheet;
  },
});

export const updateCell = mutation({
  args: {
    boardId: v.id("boards"),
    row: v.number(),
    col: v.number(),
    value: v.string(),
    formula: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const spreadsheet = await ctx.db
      .query("spreadsheets")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (!spreadsheet) throw new Error("Spreadsheet not found");

    const cellKey = `${args.row}_${args.col}`;
    const updatedData = { ...spreadsheet.data };
    updatedData.cells[cellKey] = {
      value: args.value,
      formula: args.formula,
      format: updatedData.cells[cellKey]?.format || {},
    };

    await ctx.db.patch(spreadsheet._id, {
      data: updatedData,
      updatedAt: Date.now(),
    });

    return { row: args.row, col: args.col, value: args.value };
  },
});

export const updateCellFormat = mutation({
  args: {
    boardId: v.id("boards"),
    row: v.number(),
    col: v.number(),
    format: v.any(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const spreadsheet = await ctx.db
      .query("spreadsheets")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (!spreadsheet) throw new Error("Spreadsheet not found");

    const cellKey = `${args.row}_${args.col}`;
    const updatedData = { ...spreadsheet.data };
    if (!updatedData.cells[cellKey]) {
      updatedData.cells[cellKey] = { value: "" };
    }
    updatedData.cells[cellKey].format = {
      ...updatedData.cells[cellKey].format,
      ...args.format,
    };

    await ctx.db.patch(spreadsheet._id, {
      data: updatedData,
      updatedAt: Date.now(),
    });
  },
});

// Batch update multiple cells at once (for table insertion, etc.)
export const batchUpdateCells = mutation({
  args: {
    boardId: v.id("boards"),
    updates: v.array(v.object({
      row: v.number(),
      col: v.number(),
      value: v.optional(v.string()),
      formula: v.optional(v.string()),
      format: v.optional(v.any()),
      replaceFormat: v.optional(v.boolean()),
    })),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const spreadsheet = await ctx.db
      .query("spreadsheets")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (!spreadsheet) throw new Error("Spreadsheet not found");

    const updatedData = { ...spreadsheet.data };

    for (const update of args.updates) {
      const cellKey = `${update.row}_${update.col}`;
      const existing = updatedData.cells[cellKey] || { value: "" };

      if (update.value !== undefined) {
        existing.value = update.value;
      }
      if (update.formula !== undefined) {
        existing.formula = update.formula;
      }
      if (update.format !== undefined) {
        if (update.replaceFormat) {
          // Full replacement — used when clearing cells during table move
          existing.format = update.format;
        } else {
          existing.format = { ...existing.format, ...update.format };
        }
      }

      updatedData.cells[cellKey] = existing;
    }

    await ctx.db.patch(spreadsheet._id, {
      data: updatedData,
      updatedAt: Date.now(),
    });
  },
});

export const resizeColumns = mutation({
  args: {
    boardId: v.id("boards"),
    cols: v.number(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const spreadsheet = await ctx.db
      .query("spreadsheets")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (!spreadsheet) throw new Error("Spreadsheet not found");

    const updatedData = { ...spreadsheet.data, cols: args.cols };
    await ctx.db.patch(spreadsheet._id, {
      data: updatedData,
      updatedAt: Date.now(),
    });
  },
});

export const resizeRows = mutation({
  args: {
    boardId: v.id("boards"),
    rows: v.number(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const spreadsheet = await ctx.db
      .query("spreadsheets")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (!spreadsheet) throw new Error("Spreadsheet not found");

    const updatedData = { ...spreadsheet.data, rows: args.rows };
    await ctx.db.patch(spreadsheet._id, {
      data: updatedData,
      updatedAt: Date.now(),
    });
  },
});
