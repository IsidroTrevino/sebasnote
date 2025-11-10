import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Content shape stored in cards.content for Spotify songs
 * {
 *   type: 'spotify_song',
 *   title: string,
 *   artist: string,
 *   rating: number,
 *   ratingMin: number (default 0),
 *   ratingMax: number (default 10, can be 5, 10, 100, etc.),
 *   ratingDescription?: string,
 *   durationMs?: number,
 *   spotifyUrl?: string,
 *   coverUrl?: string
 * }
 */

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    artist: v.string(),
    rating: v.number(),
    ratingMin: v.optional(v.number()),
    ratingMax: v.optional(v.number()),
    ratingDescription: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    spotifyUrl: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found or unauthorized");
    }

    const content = {
      type: "spotify_song" as const,
      title: args.title,
      artist: args.artist,
      rating: args.rating,
      ratingMin: args.ratingMin ?? 0,
      ratingMax: args.ratingMax ?? 10,
      ratingDescription: args.ratingDescription,
      durationMs: args.durationMs,
      spotifyUrl: args.spotifyUrl,
      coverUrl: args.coverUrl,
    };

    const cardId = await ctx.db.insert("cards", {
      boardId: args.boardId,
      userId,
      content,
      // width/height are irrelevant for table view but keep defaults
      width: 300,
      height: 200,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return cardId;
  },
});

export const listByBoard = query({
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

    // Fetch all cards for the board then filter by spotify_song type
    const cards = await ctx.db
      .query("cards")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();

    const songs = cards
      .filter((c) => (c as any).content?.type === "spotify_song")
      .map((c) => ({
        _id: c._id,
        _creationTime: c._creationTime,
        createdAt: (c as any).createdAt ?? 0,
        updatedAt: (c as any).updatedAt ?? 0,
        boardId: c.boardId,
        userId: c.userId,
        content: c.content as any,
      }));

    // Sort: rating desc, then createdAt asc
    songs.sort((a, b) => {
      const ra = a.content.rating ?? 0;
      const rb = b.content.rating ?? 0;
      if (rb !== ra) return rb - ra;
      const ca = a.createdAt ?? 0;
      const cb = b.createdAt ?? 0;
      return ca - cb;
    });

    return songs;
  },
});

export const updateRating = mutation({
  args: {
    id: v.id("cards"),
    rating: v.number(),
    ratingMin: v.optional(v.number()),
    ratingMax: v.optional(v.number()),
    ratingDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) throw new Error("Not authorized");

    const content = (card as any).content || {};
    if (content.type !== "spotify_song") {
      throw new Error("Not a Spotify song card");
    }

    const updated = {
      ...content,
      rating: args.rating,
      ratingMin: args.ratingMin ?? content.ratingMin ?? 0,
      ratingMax: args.ratingMax ?? content.ratingMax ?? 10,
      ratingDescription: args.ratingDescription,
    };

    await ctx.db.patch(args.id, {
      content: updated,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.id);
    if (!card || card.userId !== userId) throw new Error("Card not found or unauthorized");

    // Optionally verify type
    const content = (card as any).content || {};
    if (content.type !== "spotify_song") {
      throw new Error("Not a Spotify song card");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

function extractTrackId(url: string): string | null {
  // Matches /track/{id}
  const match = url.match(/\/track\/([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1] : null;
}

async function fetchWithClientCredentials(trackId: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Get access token
  // Use form params to avoid needing Buffer/btoa in Convex runtime
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);

  const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!tokenResp.ok) {
    return null;
  }

  const tokenJson: { access_token: string } = await tokenResp.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) return null;

  // Fetch track
  const trackResp = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!trackResp.ok) {
    return null;
  }

  const trackJson: any = await trackResp.json();
  const title: string = trackJson.name;
  const artist: string = Array.isArray(trackJson.artists) && trackJson.artists.length > 0 ? trackJson.artists.map((a: any) => a.name).join(", ") : "";
  const durationMs: number = trackJson.duration_ms;
  const spotifyUrl: string = trackJson.external_urls?.spotify || `https://open.spotify.com/track/${trackId}`;
  const coverUrl: string =
    (trackJson.album?.images && trackJson.album.images[0]?.url) || "";

  return { title, artist, durationMs, spotifyUrl, coverUrl };
}

async function fetchWithOEmbed(url: string) {
  try {
    const resp = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!resp.ok) return null;
    const data: any = await resp.json();
    // oEmbed: title (track name), author_name (artist), thumbnail_url
    const spotifyUrl = url;
    const coverUrl: string = data.thumbnail_url || "";
    let title: string = data.title || "";
    let artist: string = data.author_name || "";

    // Fallback: parse artist from title when author_name is missing
    if (!artist && title) {
      // Patterns: "Song — Artist", "Song - Artist", "Song by Artist"
      const byIdx = title.toLowerCase().lastIndexOf(" by ");
      if (byIdx !== -1) {
        artist = title.slice(byIdx + 4).trim();
        title = title.slice(0, byIdx).trim();
      } else {
        const dash = title.includes(" — ") ? " — " : (title.includes(" - ") ? " - " : null);
        if (dash) {
          const parts = title.split(dash);
          if (parts.length >= 2) {
            // Heuristic: assume right side is artist
            artist = parts.pop()!.trim();
            title = parts.join(dash).trim();
          }
        }
      }
    }

    return { title, artist, durationMs: undefined, spotifyUrl, coverUrl };
  } catch {
    return null;
  }
}

export const fetchTrackMeta = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    const id = extractTrackId(args.url);
    if (!id) {
      throw new Error("Invalid Spotify track URL");
    }

    // Prefer official Web API via client credentials if env vars exist
    const viaApi = await fetchWithClientCredentials(id);
    if (viaApi) return viaApi;

    // Fallback to oEmbed (no duration, artist may be empty)
    const viaOEmbed = await fetchWithOEmbed(args.url);
    if (viaOEmbed) return viaOEmbed;

    throw new Error("Failed to fetch Spotify metadata");
  },
});
