export interface CastMember {
  id: string;
  name: string;
  character: string;
  image?: string;
}

export interface Episode {
  id: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnail: string;
  isFree: boolean;
  isLocked: boolean;
  videoUrl: string;
  planRequired?: "free" | "basic" | "standard" | "premium" | "vip";
}

export interface Season {
  seasonNumber: number;
  title: string;
  description?: string;
  episodes: Episode[];
}

export interface TvShow {
  id: string;
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  imdbRating: string;
  ageRating: string;
  year: string;
  genres: string[];
  featured?: boolean;
  isPremium?: boolean;
  badge?: "NEW" | "HOT" | "TRENDING" | "EXCLUSIVE" | "TOP";
  planRequired?: "free" | "basic" | "standard" | "premium" | "vip";
  seasonsCount: number;
  episodesCount: number;
  seasons: Season[];
  cast: CastMember[];
  releaseDate?: string;
  director?: string;
  language?: string;
}

export interface TvShowFilters {
  genre?: string;
  search?: string;
  sortBy?: "popular" | "new" | "rated" | "az";
  page?: number;
  limit?: number;
}
