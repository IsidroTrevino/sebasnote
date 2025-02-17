import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";
import {authTables} from "@convex-dev/auth/server";

const schema = defineSchema({
    ...authTables,
    boards: defineTable({
        name: v.string(),
        userId: v.string(),
        parentId: v.optional(v.id("boards")),
        createdAt: v.number(),
        updatedAt: v.number()
    }),
});

export default schema;