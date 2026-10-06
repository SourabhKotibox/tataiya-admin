export interface AdminEpisode {
  id: string;
  tvShowId: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  thumbnail: string;
  videoUrl: string;
  videoUploadType?: "url" | "hls" | "local" | string;
  videoFilePath?: string;
  duration: number; // in seconds
  releaseDate: string;
  isFree: boolean;
  isLocked: boolean;
  status: "published" | "draft";
  subtitleUrl?: string;
  createdAt: string;
}

export const INITIAL_EPISODES: AdminEpisode[] = [];

const EPISODES_STORAGE_KEY = "tataiya_admin_episodes_list";

export function getAdminEpisodes(): AdminEpisode[] {
  try {
    const raw = localStorage.getItem(EPISODES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function getAdminEpisodeById(id: string): AdminEpisode | undefined {
  return getAdminEpisodes().find((e) => e.id === id);
}

export function getAdminEpisodesByShowId(tvShowId: string): AdminEpisode[] {
  return getAdminEpisodes().filter((e) => e.tvShowId === tvShowId);
}

export function getAdminEpisodesBySeasonId(seasonId: string): AdminEpisode[] {
  return getAdminEpisodes().filter((e) => e.seasonId === seasonId);
}

export function saveAdminEpisode(episode: AdminEpisode): void {
  const list = getAdminEpisodes();
  const index = list.findIndex((e) => e.id === episode.id);
  let updated: AdminEpisode[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = episode;
  } else {
    updated = [episode, ...list];
  }
  try {
    localStorage.setItem(EPISODES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("admin-episodes-updated"));
  } catch {}
}

export function deleteAdminEpisode(id: string): void {
  const list = getAdminEpisodes();
  const updated = list.filter((e) => e.id !== id);
  try {
    localStorage.setItem(EPISODES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("admin-episodes-updated"));
  } catch {}
}
