export interface AdminTvShow {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  poster: string;
  backdrop: string;
  genres: string[];
  language: string;
  year: string;
  rating: string;
  ageRating: string;
  contentType: "series" | "short-drama";
  tags: string[];
  isPremium: boolean;
  featured: boolean;
  status: "published" | "draft";
  createdAt: string;
  director?: string;
}

export const INITIAL_TV_SHOWS: AdminTvShow[] = [];

const STORAGE_KEY = "tataiya_admin_tvshows_list";

export function getAdminTvShows(): AdminTvShow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function getAdminTvShowById(id: string): AdminTvShow | undefined {
  return getAdminTvShows().find((s) => s.id === id);
}

export function saveAdminTvShow(show: AdminTvShow): void {
  const list = getAdminTvShows();
  const index = list.findIndex((s) => s.id === show.id);
  let updated: AdminTvShow[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = show;
  } else {
    updated = [show, ...list];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("admin-tvshows-updated"));
  } catch {}
}

export function deleteAdminTvShow(id: string): void {
  const list = getAdminTvShows();
  const updated = list.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("admin-tvshows-updated"));
  } catch {}
}
