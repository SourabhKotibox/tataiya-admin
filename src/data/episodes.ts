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

export const INITIAL_EPISODES: AdminEpisode[] = [
  // Show 1 - Season 1
  {
    id: "ep-1",
    tvShowId: "show-1",
    seasonId: "season-1-show-1",
    episodeNumber: 1,
    title: "Dark Signal",
    shortDescription: "An anomalous broadcast originating from an abandoned station.",
    fullDescription: "An anomalous broadcast alerts Agent Cross to an imminent cyber incursion into upper sector databanks.",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration: 2740,
    releaseDate: "2025-01-15",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2025-01-15",
  },
  {
    id: "ep-2",
    tvShowId: "show-1",
    seasonId: "season-1-show-1",
    episodeNumber: 2,
    title: "Neon Labyrinth",
    shortDescription: "Cross ventures into the subterranean syndicate markets.",
    fullDescription: "Cross and Dr. Petrov venture into the subterranean syndicate markets of Sector 4 in pursuit of a rogue data broker.",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration: 2890,
    releaseDate: "2025-01-22",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2025-01-22",
  },
  {
    id: "ep-3",
    tvShowId: "show-1",
    seasonId: "season-1-show-1",
    episodeNumber: 3,
    title: "Blackout Protocol",
    shortDescription: "A sudden grid failure allows hostile operatives to strike.",
    fullDescription: "A sudden grid failure across the lower tier allows hostile operatives to penetrate high-security research vaults.",
    thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: 3120,
    releaseDate: "2025-01-29",
    isFree: false,
    isLocked: true,
    status: "published",
    createdAt: "2025-01-29",
  },
  // Show 1 - Season 2
  {
    id: "ep-4",
    tvShowId: "show-1",
    seasonId: "season-2-show-1",
    episodeNumber: 1,
    title: "Ghost In The Vault",
    shortDescription: "Whispers of an AI emergence force Cross out of hiding.",
    fullDescription: "Months after the citadel blackout, whispers of an AI singularity emergence force Cross out of hiding.",
    thumbnail: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    duration: 2980,
    releaseDate: "2025-06-20",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2025-06-20",
  },
  {
    id: "ep-5",
    tvShowId: "show-1",
    seasonId: "season-2-show-1",
    episodeNumber: 2,
    title: "Neural Fractures",
    shortDescription: "Anomalous telemetry points directly to high council members.",
    fullDescription: "Kiran discovers anomalous telemetry pointing directly to members of the governing high council.",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: 3240,
    releaseDate: "2025-06-27",
    isFree: false,
    isLocked: true,
    status: "published",
    createdAt: "2025-06-27",
  },
  // Show 2 - Season 1
  {
    id: "ep-6",
    tvShowId: "show-2",
    seasonId: "season-1-show-2",
    episodeNumber: 1,
    title: "Port of Entry",
    shortDescription: "Arjun intercepts an unauthorized dock shipment.",
    fullDescription: "Arjun intercepts an unauthorized shipment that brings him directly onto Bashir Bhais radar.",
    thumbnail: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: 2580,
    releaseDate: "2024-11-20",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2024-11-20",
  },
  {
    id: "ep-7",
    tvShowId: "show-2",
    seasonId: "season-1-show-2",
    episodeNumber: 2,
    title: "Divided Loyalty",
    shortDescription: "Anti-gang units tighten their investigation.",
    fullDescription: "With anti-gang units tightening the noose, Pooja discovers evidence tying city officials to smuggling.",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration: 2750,
    releaseDate: "2024-11-27",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2024-11-27",
  },
  // Show 3 - Season 1
  {
    id: "ep-8",
    tvShowId: "show-3",
    seasonId: "season-1-show-3",
    episodeNumber: 1,
    title: "Hydrophone 12",
    shortDescription: "A mysterious low-frequency pulse detected off the Mariana Trench.",
    fullDescription: "A mysterious low-frequency pulse detected off the Mariana Trench puzzles international oceanographers.",
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    duration: 2400,
    releaseDate: "2025-02-01",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2025-02-01",
  },
  // Show 4 - Season 1
  {
    id: "ep-9",
    tvShowId: "show-4",
    seasonId: "season-1-show-4",
    episodeNumber: 1,
    title: "The Royal Proclamation",
    shortDescription: "The royal house announces a coronation engagement.",
    fullDescription: "The royal house announces the coronation engagement, sending shockwaves through political circles.",
    thumbnail: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    duration: 2500,
    releaseDate: "2024-09-12",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2024-09-12",
  },
  // Show 6 - Season 1
  {
    id: "ep-10",
    tvShowId: "show-6",
    seasonId: "season-1-show-6",
    episodeNumber: 1,
    title: "The Pilot Disaster",
    shortDescription: "The celebrity guest cancels minutes before airtime.",
    fullDescription: "When the celebrity guest cancels thirty minutes before airtime, the writers improvise a bizarre sketch with the janitor.",
    thumbnail: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: 1350,
    releaseDate: "2024-08-10",
    isFree: true,
    isLocked: false,
    status: "published",
    createdAt: "2024-08-10",
  },
];

const EPISODES_STORAGE_KEY = "tataiya_admin_episodes_list";

export function getAdminEpisodes(): AdminEpisode[] {
  try {
    const raw = localStorage.getItem(EPISODES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_EPISODES;
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
