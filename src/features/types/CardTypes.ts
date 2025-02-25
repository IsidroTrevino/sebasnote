import { Id } from "../../../convex/_generated/dataModel";

export interface CardPosition {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export interface Card {
    _id: Id<"cards">;
    boardId: Id<"boards">;
    userId: string;
    title?: string;
    content: string;
    position: CardPosition;
    createdAt: number;
    updatedAt: number;
  }