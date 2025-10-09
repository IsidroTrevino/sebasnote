import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export type SpotifySongContent = {
  type: "spotify_song";
  title: string;
  artist: string;
  rating: number;
  ratingDescription?: string;
  durationMs?: number;
  spotifyUrl?: string;
  coverUrl?: string;
};

export type SpotifySongCard = {
  _id: Id<"cards">;
  _creationTime: number;
  boardId: Id<"boards">;
  userId: string;
  createdAt?: number;
  updatedAt?: number;
  content: SpotifySongContent;
};

export const useListSpotifySongs = (boardId?: Id<"boards">) => {
  const data = useQuery(
    api.spotifySongs.listByBoard,
    boardId ? { boardId } : "skip"
  ) as SpotifySongCard[] | undefined;

  return {
    songs: data || [],
    isLoading: data === undefined && boardId !== undefined,
  };
};
