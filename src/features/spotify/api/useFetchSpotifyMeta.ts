import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCallback } from "react";

export type SpotifyMeta = {
  title: string;
  artist: string;
  durationMs?: number;
  spotifyUrl?: string;
  coverUrl?: string;
};

export const useFetchSpotifyMeta = () => {
  const action = useAction(api.spotifySongs.fetchTrackMeta);

  const fetchMeta = useCallback(
    async (url: string): Promise<SpotifyMeta> => {
      const res = await action({ url });
      return res as SpotifyMeta;
    },
    [action]
  );

  return { fetchMeta };
};
