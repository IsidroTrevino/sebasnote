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
  
export const create = mutation({
    args: {
        name: v.string(),
        parentId: v.optional(v.id("boards")), 
        isHome: v.optional(v.boolean()),
        isDocument: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        
        if (!userId) {
            throw new Error("Not authenticated");
        }

        return await ctx.db.insert("boards", {
            name: args.name,
            userId,
            parentId: args.parentId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isHome: args.isHome ?? false,
            isDocument: args.isDocument ?? false
        });
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

        return await ctx.db
            .query("boards")
            .filter(filter)
            .collect();
    }
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