export interface AdminSeason {
  id: string;
  tvShowId: string;
  seasonNumber: number;
  title: string;
  description: string;
  poster: string;
  posterImage?: string;
  releaseDate: string;
  status: "published" | "draft";
  createdAt: string;
}

export const INITIAL_SEASONS: AdminSeason[] = [];

const SEASONS_STORAGE_KEY = "tataiya_admin_seasons_list";

export function getAdminSeasons(): AdminSeason[] {
  try {
    const raw = localStorage.getItem(SEASONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function getAdminSeasonById(id: string): AdminSeason | undefined {
  return getAdminSeasons().find((s) => s.id === id);
}

export function getAdminSeasonsByShowId(tvShowId: string): AdminSeason[] {
  return getAdminSeasons().filter((s) => s.tvShowId === tvShowId);
}

export function saveAdminSeason(season: AdminSeason): void {
  const list = getAdminSeasons();
  const index = list.findIndex((s) => s.id === season.id);
  let updated: AdminSeason[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = season;
  } else {
    updated = [season, ...list];
  }
  try {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("admin-seasons-updated"));
  } catch {}
}

export function deleteAdminSeason(id: string): void {
  const list = getAdminSeasons();
  const updated = list.filter((s) => s.id !== id);
  try {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("admin-seasons-updated"));
  } catch {}
}
