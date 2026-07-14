import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const getHome = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            return null;
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

        return {
            home: homeBoard,
        };
    }
});
  
// Add this to your create mutation in convex/boards.ts
export const create = mutation({
    args: {
        name: v.string(),
        parentId: v.optional(v.id("boards")), 
        isHome: v.optional(v.boolean()),
        isDocument: v.optional(v.boolean()),
        isSpotify: v.optional(v.boolean()),
        isExcel: v.optional(v.boolean()),
        isRanking: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        
        if (!userId) {
            throw new Error("Not authenticated");
        }

        let order = 0;
        if (args.parentId) {
            const siblings = await ctx.db
                .query("boards")
                .filter((q) => q.eq(q.field("parentId"), args.parentId))
                .collect();
            
            if (siblings.length > 0) {
                const maxOrder = Math.max(...siblings.map(b => b.order ?? 0));
                order = maxOrder + 10;
            }
        }

        const boardId = await ctx.db.insert("boards", {
            name: args.name,
            userId,
            parentId: args.parentId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isHome: args.isHome ?? false,
            isDocument: args.isDocument ?? false,
            isSpotify: args.isSpotify ?? false,
            isExcel: args.isExcel ?? false,
            isRanking: args.isRanking ?? false,
            order: order
        });

        // Create spreadsheet data if isExcel is true
        if (args.isExcel) {
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

            await ctx.db.insert("spreadsheets", {
                boardId,
                userId,
                data,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        if (args.isRanking) {
            await ctx.db.insert("rankingBoards", {
                boardId,
                userId,
                mode: "image",
                rows: [
                    { id: "ss-plus", label: "SS+", color: "#dc2626" },
                    { id: "ss", label: "SS", color: "#ea580c" },
                    { id: "s", label: "S", color: "#f59e0b" },
                    { id: "a", label: "A", color: "#22c55e" },
                    { id: "b", label: "B", color: "#3b82f6" },
                    { id: "c", label: "C", color: "#8b5cf6" },
                    { id: "d", label: "D", color: "#6b7280" },
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        return boardId;
    },
});


export const getAncestors = query({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        
        if (!userId) {
            return null;
        }

        const ancestors: Doc<"boards">[] = [];
        let currentBoardId: Id<"boards"> | undefined = args.boardId;

        while (currentBoardId !== undefined) {
            const board: Doc<"boards"> | null = await ctx.db.get(currentBoardId);
            
            if (!board || board.userId !== userId) {
                return null;
            }
            
            ancestors.unshift(board);
            currentBoardId = board.parentId;
        }

        return ancestors;
    },
});

export const getChildren = query({
    args: { parentId: v.optional(v.id("boards")) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            return null;
        }

        const filter = args.parentId 
            ? (q: any) => q.and(
                q.eq(q.field("userId"), userId),
                q.eq(q.field("parentId"), args.parentId)
                )
            : (q: any) => q.and(
                q.eq(q.field("userId"), userId),
                q.eq(q.field("parentId"), undefined)
                );

        const boards = await ctx.db
            .query("boards")
            .filter(filter)
            .collect();
        
        // Sort by lastVisited descending (most recent first), fall back to order for boards with same lastVisited
        return boards.sort((a, b) => {
            const aLastVisited = a.lastVisited ?? a.createdAt;
            const bLastVisited = b.lastVisited ?? b.createdAt;
            
            // Primary sort: by lastVisited (descending - most recent first)
            if (bLastVisited !== aLastVisited) {
                return bLastVisited - aLastVisited;
            }
            
            // Tiebreaker: by order
            return (a.order ?? 0) - (b.order ?? 0);
        });
    }
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const boards = await ctx.db
            .query("boards")
            .filter((q) => q.eq(q.field("userId"), userId))
            .collect();

        return boards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
});

export const getById = query({
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

        return board;
    },
});

export const updateBoardName = mutation({
    args: {boardId: v.id("boards"), name: v.string()},
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Not authenticated");
        }

        return await ctx.db.patch(args.boardId, {
            name: args.name,
            updatedAt: Date.now()
        });
    }
});

export const deleteBoard = mutation({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new Error("Not authenticated");
        }

        async function deleteRecursively(boardId: Id<"boards">) {
            const cover = await ctx.db
                .query("projectCovers")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .first();

            const referenceImages = await ctx.db
                .query("referenceImages")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .collect();

            for (const image of referenceImages) {
                await ctx.storage.delete(image.storageId);
                await ctx.db.delete(image._id);
            }

            if (cover) {
                await ctx.storage.delete(cover.storageId);
                await ctx.db.delete(cover._id);
            }

            const cards = await ctx.db
                .query("cards")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .collect();
                
            for (const card of cards) {
                await ctx.db.delete(card._id);
            }
            
            const document = await ctx.db
                .query("documents")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .first();
                
            if (document) {
                await ctx.db.delete(document._id);
            }

            const spreadsheet = await ctx.db
                .query("spreadsheets")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .first();

            if (spreadsheet) {
                await ctx.db.delete(spreadsheet._id);
            }

            const rankingBoard = await ctx.db
                .query("rankingBoards")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .first();

            if (rankingBoard) {
                await ctx.db.delete(rankingBoard._id);
            }

            const rankingItems = await ctx.db
                .query("rankingItems")
                .filter((q) => q.eq(q.field("boardId"), boardId))
                .collect();

            for (const item of rankingItems) {
                if (item.storageId) {
                    await ctx.storage.delete(item.storageId);
                }
                await ctx.db.delete(item._id);
            }

            const children = await ctx.db
                .query("boards")
                .filter((q) => q.eq(q.field("parentId"), boardId))
                .collect();

            for (const child of children) {
                await deleteRecursively(child._id);
            }

            await ctx.db.delete(boardId);
        }

        await deleteRecursively(args.boardId);

        return args.boardId;
    }
});

export const updateOrder = mutation({
    args: {
      updates: v.array(
        v.object({
          id: v.id("boards"),
          order: v.number(),
        })
      ),
    },
    handler: async (ctx, args) => {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        throw new Error("Not authenticated");
      }
  
      for (const update of args.updates) {
        const board = await ctx.db.get(update.id);
        if (!board || board.userId !== userId) {
          throw new Error("Board not found or unauthorized");
        }
      }
  
      for (const update of args.updates) {
        await ctx.db.patch(update.id, {
          order: update.order,
          updatedAt: Date.now()
        });
      }
  
      return args.updates.length;
    },
  });

export const trackBoardVisit = mutation({
    args: { boardId: v.id("boards") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const board = await ctx.db.get(args.boardId);
        if (!board || board.userId !== userId) {
            throw new Error("Board not found or unauthorized");
        }

        await ctx.db.patch(args.boardId, {
            lastVisited: Date.now(),
            updatedAt: Date.now()
        });

        return board;
    }
});
