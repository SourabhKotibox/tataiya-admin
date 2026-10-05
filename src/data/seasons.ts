export interface AdminSeason {
  id: string;
  tvShowId: string;
  seasonNumber: number;
  title: string;
  description: string;
  poster: string;
  releaseDate: string;
  status: "published" | "draft";
  createdAt: string;
}

export const INITIAL_SEASONS: AdminSeason[] = [
  {
    id: "season-1-show-1",
    tvShowId: "show-1",
    seasonNumber: 1,
    title: "Protocol Zero",
    description: "The initial cyber infiltration of the high council orbital telemetry.",
    poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2025-01-15",
    status: "published",
    createdAt: "2025-01-15",
  },
  {
    id: "season-2-show-1",
    tvShowId: "show-1",
    seasonNumber: 2,
    title: "Apex Directive",
    description: "The aftermath of the grid blackout and rogue AI awakening.",
    poster: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2025-06-20",
    status: "published",
    createdAt: "2025-06-20",
  },
  {
    id: "season-1-show-2",
    tvShowId: "show-2",
    seasonNumber: 1,
    title: "Blood On The Coast",
    description: "The rise of dockland syndicate lieutenant Arjun Gawli.",
    poster: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2024-11-20",
    status: "published",
    createdAt: "2024-11-20",
  },
  {
    id: "season-1-show-3",
    tvShowId: "show-3",
    seasonNumber: 1,
    title: "Deep Resonance",
    description: "Acoustic investigation of missing submersible distress signals.",
    poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2025-02-01",
    status: "published",
    createdAt: "2025-02-01",
  },
  {
    id: "season-1-show-4",
    tvShowId: "show-4",
    seasonNumber: 1,
    title: "Gilded Chains",
    description: "An unexpected arranged wedding triggers deadly palace intrigue.",
    poster: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2024-09-12",
    status: "published",
    createdAt: "2024-09-12",
  },
  {
    id: "season-1-show-5",
    tvShowId: "show-5",
    seasonNumber: 1,
    title: "Zero Day Threat",
    description: "Coordinated federal takedown of an offshore ransomware hub.",
    poster: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2025-03-01",
    status: "draft",
    createdAt: "2025-03-01",
  },
  {
    id: "season-1-show-6",
    tvShowId: "show-6",
    seasonNumber: 1,
    title: "Going Viral",
    description: "Late night writers scramble after their celebrity guest bails.",
    poster: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80",
    releaseDate: "2024-08-10",
    status: "published",
    createdAt: "2024-08-10",
  },
];

const SEASONS_STORAGE_KEY = "tataiya_admin_seasons_list";

export function getAdminSeasons(): AdminSeason[] {
  try {
    const raw = localStorage.getItem(SEASONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_SEASONS;
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
