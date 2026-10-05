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

export const INITIAL_TV_SHOWS: AdminTvShow[] = [
  {
    id: "show-1",
    title: "Shadow Chronicles",
    shortDescription: "An elite counter-espionage unit unravels an urban cyber conspiracy.",
    fullDescription: "In a neon-drenched metropolis veiled in secrets, an elite counter-espionage unit unravels a conspiracy threatening the fragile peace between rogue corporate dynasties.",
    poster: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=85",
    genres: ["Sci-Fi", "Thriller", "Action"],
    language: "Hindi",
    year: "2025",
    rating: "8.9",
    ageRating: "16+",
    contentType: "series",
    tags: ["Cyberpunk", "Espionage", "Mystery"],
    isPremium: true,
    featured: true,
    status: "published",
    createdAt: "2025-01-15",
    director: "Alexandria Vance",
  },
  {
    id: "show-2",
    title: "The Mumbai Syndicate",
    shortDescription: "A raw crime saga along Mumbai's coastal docklands.",
    fullDescription: "A raw, gripping crime saga chronicling the ruthless power struggle along Mumbai's docklands as an ambitious street lieutenant climbs the underworld hierarchy.",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&auto=format&fit=crop&q=85",
    genres: ["Crime", "Drama", "Thriller"],
    language: "Hindi",
    year: "2024",
    rating: "8.7",
    ageRating: "18+",
    contentType: "series",
    tags: ["Underworld", "Gangster", "Mumbai"],
    isPremium: true,
    featured: false,
    status: "published",
    createdAt: "2024-11-20",
    director: "Kabir Roy",
  },
  {
    id: "show-3",
    title: "Silent Echoes",
    shortDescription: "Forensic acoustic specialist probes anomalous deep-sea signals.",
    fullDescription: "A reclusive forensic acoustic specialist is dragged into the investigation of bizarre auditory recordings retrieved from a missing deep-sea submersibles.",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=85",
    genres: ["Mystery", "Sci-Fi", "Drama"],
    language: "English",
    year: "2025",
    rating: "8.4",
    ageRating: "13+",
    contentType: "series",
    tags: ["Ocean", "Mystery", "Submersible"],
    isPremium: false,
    featured: false,
    status: "published",
    createdAt: "2025-02-01",
    director: "Clara M. Oswald",
  },
  {
    id: "show-4",
    title: "Royal Hearts: Palace of Secrets",
    shortDescription: "Behind the gilded gates of Rajasthan, an alliance sparks intrigue.",
    fullDescription: "Behind the gilded gates of royal estates in Rajasthan, an unexpected arranged alliance sparks dangerous palace intrigue and forbidden romance.",
    poster: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600&auto=format&fit=crop&q=85",
    genres: ["Romance", "Drama"],
    language: "Hindi",
    year: "2024",
    rating: "8.1",
    ageRating: "13+",
    contentType: "series",
    tags: ["Royal", "Palace", "Romance"],
    isPremium: true,
    featured: false,
    status: "published",
    createdAt: "2024-09-12",
    director: "Simran Kapoor",
  },
  {
    id: "show-5",
    title: "Cyber Patrol Unit",
    shortDescription: "Ethical hackers and federal detectives tackle dark web syndicates.",
    fullDescription: "A fast-paced cyber intelligence thriller following an eclectic squad of ethical hackers and federal detectives tackling dark web syndicates.",
    poster: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=85",
    genres: ["Action", "Sci-Fi", "Crime"],
    language: "English",
    year: "2025",
    rating: "8.5",
    ageRating: "16+",
    contentType: "series",
    tags: ["Cyber", "Hacking", "Action"],
    isPremium: true,
    featured: false,
    status: "draft",
    createdAt: "2025-03-01",
    director: "Kenji Sato",
  },
  {
    id: "show-6",
    title: "Laugh Tracks Inc.",
    shortDescription: "The chaotic writers room of a late night show trying to go viral.",
    fullDescription: "A hilarious, witty workplace comedy following the chaotic writers room of a failing late-night comedy show desperately trying to go viral.",
    poster: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=85",
    genres: ["Comedy"],
    language: "Hindi",
    year: "2024",
    rating: "7.9",
    ageRating: "U/A 13+",
    contentType: "series",
    tags: ["Comedy", "Writers", "Workplace"],
    isPremium: false,
    featured: false,
    status: "published",
    createdAt: "2024-08-10",
    director: "Gaurav Dave",
  },
];

const STORAGE_KEY = "tataiya_admin_tvshows_list";

export function getAdminTvShows(): AdminTvShow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_TV_SHOWS;
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
