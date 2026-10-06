import { TvShow, Episode } from "../types";
import { getAdminTvShows } from "@/data/tvShows";
import { getAdminSeasonsByShowId } from "@/data/seasons";
import { getAdminEpisodesBySeasonId } from "@/data/episodes";

export const TV_SHOW_GENRES = [
  "All",
  "Action",
  "Drama",
  "Thriller",
  "Sci-Fi",
  "Crime",
  "Romance",
  "Comedy",
  "Fantasy",
  "Mystery",
] as const;

export const TV_SHOW_SORT_OPTIONS = [
  { label: "Popular", value: "popular" },
  { label: "New Releases", value: "new" },
  { label: "Top Rated", value: "rated" },
  { label: "A–Z", value: "az" },
] as const;

// TV Shows dataset is loaded strictly from backend APIs
export const MOCK_TV_SHOWS: TvShow[] = [];

// Unified relational data loader connecting Admin TV Shows, Seasons, and Episodes
export function getAllTvShows(): TvShow[] {
  try {
    const adminShows = getAdminTvShows();
    if (adminShows && adminShows.length > 0) {
      return adminShows.map((s) => {
        const seasons = getAdminSeasonsByShowId(s.id).map((season) => {
          const episodes: Episode[] = getAdminEpisodesBySeasonId(season.id).map((ep) => ({
            id: ep.id,
            season: season.seasonNumber,
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            description: ep.shortDescription || ep.fullDescription,
            duration: ep.duration,
            thumbnail: ep.thumbnail,
            isFree: ep.isFree,
            isLocked: ep.isLocked,
            videoUrl: ep.videoUrl,
          }));

          return {
            seasonNumber: season.seasonNumber,
            title: season.title,
            description: season.description,
            episodes,
          };
        });

        const totalEps = seasons.reduce((acc, sea) => acc + sea.episodes.length, 0);

        return {
          id: s.id,
          title: s.title,
          description: s.fullDescription || s.shortDescription,
          poster: s.poster || s.posterImage || s.thumbnail || s.backdrop,
          backdrop: s.backdrop || s.bannerImage || s.poster,
          imdbRating: s.rating,
          ageRating: s.ageRating,
          year: s.year,
          genres: s.genres,
          featured: s.featured,
          isPremium: s.isPremium,
          seasonsCount: seasons.length > 0 ? seasons.length : 1,
          episodesCount: totalEps,
          seasons,
          cast: [
            {
              id: "c1",
              name: s.director || "Director",
              character: "Creator",
              image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&fit=crop",
            },
          ],
          language: s.language,
          director: s.director,
        };
      });
    }
  } catch {}
  return [];
}

// Helper functions for TV Shows
export function getTvShows(filters: {
  genre?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
} = {}): { items: TvShow[]; total: number; page: number; totalPages: number } {
  const { genre = "All", search = "", sortBy = "popular", page = 1, limit = 12 } = filters;

  let results = [...getAllTvShows()];

  // Genre filter
  if (genre && genre !== "All") {
    results = results.filter((show) =>
      show.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
    );
  }

  // Search filter
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (show) =>
        show.title.toLowerCase().includes(q) ||
        show.description.toLowerCase().includes(q) ||
        show.genres.some((g) => g.toLowerCase() === q)
    );
  }

  // Sorting
  if (sortBy === "popular") {
    results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  } else if (sortBy === "rated") {
    results.sort((a, b) => parseFloat(b.imdbRating) - parseFloat(a.imdbRating));
  } else if (sortBy === "new") {
    results.sort((a, b) => parseInt(b.year) - parseInt(a.year));
  } else if (sortBy === "az") {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const paginatedItems = results.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    totalPages,
  };
}

export function getTvShowById(id: string): TvShow | undefined {
  return getAllTvShows().find((show) => show.id === id);
}

export function getFeaturedTvShow(): TvShow | undefined {
  const all = getAllTvShows();
  return all.find((s) => s.featured) || all[0];
}

// Local storage management helpers
const WATCHLIST_STORAGE_KEY = "tataiya_tvshows_watchlist";
const LIKES_STORAGE_KEY = "tataiya_tvshows_likes";
const CONTINUE_WATCHING_KEY = "tataiya_tvshows_continue_watching";

export interface ContinueWatchingRecord {
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  showTitle: string;
  thumbnail: string;
  progressPercent: number;
  lastWatchedAt: number;
}

export function getTvShowWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isTvShowWatchlisted(id: string): boolean {
  return getTvShowWatchlist().includes(id);
}

export function toggleTvShowWatchlist(id: string): boolean {
  const current = getTvShowWatchlist();
  const exists = current.includes(id);
  const updated = exists ? current.filter((item) => item !== id) : [...current, id];
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("tvshows-watchlist-updated"));
  } catch {}
  return !exists;
}

export function getTvShowLikes(): string[] {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isTvShowLiked(id: string): boolean {
  return getTvShowLikes().includes(id);
}

export function toggleTvShowLike(id: string): boolean {
  const current = getTvShowLikes();
  const exists = current.includes(id);
  const updated = exists ? current.filter((item) => item !== id) : [...current, id];
  try {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("tvshows-likes-updated"));
  } catch {}
  return !exists;
}

export function getContinueWatchingShows(): ContinueWatchingRecord[] {
  try {
    const raw = localStorage.getItem(CONTINUE_WATCHING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordTvShowProgress(record: Omit<ContinueWatchingRecord, "lastWatchedAt">): void {
  try {
    const list = getContinueWatchingShows().filter((item) => item.showId !== record.showId);
    list.unshift({ ...record, lastWatchedAt: Date.now() });
    localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(list.slice(0, 10)));
    window.dispatchEvent(new Event("tvshows-continue-updated"));
  } catch {}
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m ${remainingSecs > 0 ? `${remainingSecs}s` : ""}`.trim();
}
