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

// Curated high quality TV Shows mock dataset
export const MOCK_TV_SHOWS: TvShow[] = [
  {
    id: "shadow-chronicles",
    title: "Shadow Chronicles",
    description:
      "In a neon-drenched metropolis veiled in secrets, an elite counter-espionage unit unravels a conspiracy threatening the fragile peace between rogue corporate dynasties.",
    poster: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=85",
    imdbRating: "8.9",
    ageRating: "16+",
    year: "2025",
    genres: ["Sci-Fi", "Thriller", "Action"],
    featured: true,
    isPremium: true,
    badge: "TRENDING",
    planRequired: "premium",
    seasonsCount: 2,
    episodesCount: 6,
    director: "Alexandria Vance",
    language: "English / Hindi",
    cast: [
      {
        id: "c1",
        name: "Marcus Holloway",
        character: "Agent Raymond Cross",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "c2",
        name: "Elena Rostova",
        character: "Dr. Anya Petrov",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "c3",
        name: "Dev Patel",
        character: "Kiran Mehta (Cipher)",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "c4",
        name: "Sarah Lin",
        character: "Director Evelyn Chen",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Protocol Zero",
        episodes: [
          {
            id: "sc-s1e1",
            season: 1,
            episodeNumber: 1,
            title: "Dark Signal",
            description: "An anomalous broadcast originating from an abandoned orbital station alerts Agent Cross to an imminent cyber incursion.",
            duration: 2740,
            thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          },
          {
            id: "sc-s1e2",
            season: 1,
            episodeNumber: 2,
            title: "Neon Labyrinth",
            description: "Cross and Dr. Petrov venture into the subterranean syndicate markets of Sector 4 in pursuit of a rogue data broker.",
            duration: 2890,
            thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          },
          {
            id: "sc-s1e3",
            season: 1,
            episodeNumber: 3,
            title: "Blackout Protocol",
            description: "A sudden grid failure across the lower tier allows hostile operatives to penetrate high-security research vaults.",
            duration: 3120,
            thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            planRequired: "premium",
          },
        ],
      },
      {
        seasonNumber: 2,
        title: "Season 2: Apex Directive",
        episodes: [
          {
            id: "sc-s2e1",
            season: 2,
            episodeNumber: 1,
            title: "Ghost In The Vault",
            description: "Months after the citadel blackout, whispers of an AI singularity emergence force Cross out of hiding.",
            duration: 2980,
            thumbnail: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
          },
          {
            id: "sc-s2e2",
            season: 2,
            episodeNumber: 2,
            title: "Neural Fractures",
            description: "Kiran discovers anomalous telemetry pointing directly to members of the governing high council.",
            duration: 3240,
            thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            planRequired: "premium",
          },
          {
            id: "sc-s2e3",
            season: 2,
            episodeNumber: 3,
            title: "Final Ascension",
            description: "With all protocols terminated, the final stand atop the Zenith Spire determines the destiny of humanity.",
            duration: 3480,
            thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            planRequired: "premium",
          },
        ],
      },
    ],
  },
  {
    id: "the-mumbai-syndicate",
    title: "The Mumbai Syndicate",
    description:
      "A raw, gripping crime saga chronicling the ruthless power struggle along Mumbai's docklands as an ambitious street lieutenant climbs the underworld hierarchy.",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&auto=format&fit=crop&q=85",
    imdbRating: "8.7",
    ageRating: "18+",
    year: "2024",
    genres: ["Crime", "Drama", "Thriller"],
    featured: false,
    badge: "HOT",
    isPremium: true,
    planRequired: "premium",
    seasonsCount: 1,
    episodesCount: 4,
    director: "Kabir Roy",
    language: "Hindi",
    cast: [
      {
        id: "ms1",
        name: "Vikram Malhotra",
        character: "Arjun Gawli",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "ms2",
        name: "Radhika Sen",
        character: "Advocate Pooja Deshmukh",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "ms3",
        name: "Naseer Qureshi",
        character: "Don Bashir Bhai",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80",
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Blood On The Coast",
        episodes: [
          {
            id: "ms-s1e1",
            season: 1,
            episodeNumber: 1,
            title: "Port of Entry",
            description: "Arjun intercepts an unauthorized shipment that brings him directly onto Bashir Bhai's radar.",
            duration: 2580,
            thumbnail: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          },
          {
            id: "ms-s1e2",
            season: 1,
            episodeNumber: 2,
            title: "Divided Loyalty",
            description: "With anti-gang units tightening the noose, Pooja discovers evidence tying city officials to maritime smuggling.",
            duration: 2750,
            thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          },
          {
            id: "ms-s1e3",
            season: 1,
            episodeNumber: 3,
            title: "Monsoon Fire",
            description: "A gun battle during a torrential rainstorm reshuffles the underworld leadership.",
            duration: 2900,
            thumbnail: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            planRequired: "premium",
          },
          {
            id: "ms-s1e4",
            season: 1,
            episodeNumber: 4,
            title: "Reign of Shadows",
            description: "Arjun must face his closest childhood friend to secure absolute control of the docks.",
            duration: 3100,
            thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            planRequired: "premium",
          },
        ],
      },
    ],
  },
  {
    id: "silent-echoes",
    title: "Silent Echoes",
    description:
      "A reclusive forensic acoustic specialist is dragged into the investigation of bizarre auditory recordings retrieved from a missing deep-sea submersibles.",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=85",
    imdbRating: "8.4",
    ageRating: "13+",
    year: "2025",
    genres: ["Mystery", "Sci-Fi", "Drama"],
    featured: false,
    badge: "EXCLUSIVE",
    isPremium: false,
    planRequired: "free",
    seasonsCount: 1,
    episodesCount: 3,
    director: "Clara M. Oswald",
    language: "English",
    cast: [
      {
        id: "se1",
        name: "Dr. Maya Jensen",
        character: "Acoustic Analyst",
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "se2",
        name: "Captain Thomas Ross",
        character: "Naval Liaison",
        image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80",
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Deep Resonance",
        episodes: [
          {
            id: "se-s1e1",
            season: 1,
            episodeNumber: 1,
            title: "Hydrophone 12",
            description: "A mysterious low-frequency pulse detected off the Mariana Trench puzzles international oceanographers.",
            duration: 2400,
            thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          },
          {
            id: "se-s1e2",
            season: 1,
            episodeNumber: 2,
            title: "Harmonic Distortion",
            description: "Maya isolates a patterned cadence within the oceanic noise that resembles an artificial distress beacon.",
            duration: 2650,
            thumbnail: "https://images.unsplash.com/photo-1468581264429-2548ef9eb732?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
          },
          {
            id: "se-s1e3",
            season: 1,
            episodeNumber: 3,
            title: "Submerged Truth",
            description: "The recovery team locates the hull of Submersible Horizon, discovering its airlocks were breached from within.",
            duration: 2950,
            thumbnail: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
          },
        ],
      },
    ],
  },
  {
    id: "royal-hearts",
    title: "Royal Hearts: Palace of Secrets",
    description:
      "Behind the gilded gates of royal estates in Rajasthan, an unexpected arranged alliance sparks dangerous palace intrigue and forbidden romance.",
    poster: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600&auto=format&fit=crop&q=85",
    imdbRating: "8.1",
    ageRating: "13+",
    year: "2024",
    genres: ["Romance", "Drama"],
    featured: false,
    badge: "TOP",
    isPremium: true,
    planRequired: "standard",
    seasonsCount: 1,
    episodesCount: 3,
    director: "Simran Kapoor",
    language: "Hindi",
    cast: [
      {
        id: "rh1",
        name: "Aarav Singh Rathore",
        character: "Yuvraj Devraj",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "rh2",
        name: "Ananya Singhal",
        character: "Meera Chaudhary",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Gilded Chains",
        episodes: [
          {
            id: "rh-s1e1",
            season: 1,
            episodeNumber: 1,
            title: "The Royal Proclamation",
            description: "The royal house announces the coronation engagement, sending shockwaves through political circles.",
            duration: 2500,
            thumbnail: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
          },
          {
            id: "rh-s1e2",
            season: 1,
            episodeNumber: 2,
            title: "Whispers in the Courtyard",
            description: "Meera stumbles upon ancestral ledgers documenting a generational debt owed to rival aristocrats.",
            duration: 2600,
            thumbnail: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            planRequired: "standard",
          },
          {
            id: "rh-s1e3",
            season: 1,
            episodeNumber: 3,
            title: "The Dussehra Ball",
            description: "Masked revelers conceal an assassin hired to disrupt the celebratory alliance.",
            duration: 2820,
            thumbnail: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            planRequired: "standard",
          },
        ],
      },
    ],
  },
  {
    id: "cyber-patrol-unit",
    title: "Cyber Patrol Unit",
    description:
      "A fast-paced cyber intelligence thriller following an eclectic squad of ethical hackers and federal detectives tackling dark web syndicates.",
    poster: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&auto=format&fit=crop&q=85",
    imdbRating: "8.5",
    ageRating: "16+",
    year: "2025",
    genres: ["Action", "Sci-Fi", "Crime"],
    featured: false,
    badge: "NEW",
    isPremium: true,
    planRequired: "premium",
    seasonsCount: 1,
    episodesCount: 3,
    director: "Kenji Sato",
    language: "English / Japanese",
    cast: [
      {
        id: "cpu1",
        name: "Tatsuya Mori",
        character: "Lead Specialist Ren",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "cpu2",
        name: "Chloe Bennett",
        character: "Agent Tara Vane",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Zero Day Threat",
        episodes: [
          {
            id: "cpu-s1e1",
            season: 1,
            episodeNumber: 1,
            title: "Kernel Panic",
            description: "A catastrophic ransomware payload hits city emergency services, triggering a rapid counter-hack response.",
            duration: 2700,
            thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          },
          {
            id: "cpu-s1e2",
            season: 1,
            episodeNumber: 2,
            title: "Decrypted Mirrors",
            description: "Ren tracks an encrypted blockchain trail into international offshore server hubs.",
            duration: 2850,
            thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            planRequired: "premium",
          },
          {
            id: "cpu-s1e3",
            season: 1,
            episodeNumber: 3,
            title: "Firewall Overdrive",
            description: "The cyber unit launches a high-stakes coordinated takedown on a notorious black-hat enclave.",
            duration: 3100,
            thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80",
            isFree: false,
            isLocked: true,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            planRequired: "premium",
          },
        ],
      },
    ],
  },
  {
    id: "laugh-tracks-inc",
    title: "Laugh Tracks Inc.",
    description:
      "A hilarious, witty workplace comedy following the chaotic writers' room of a failing late-night comedy show desperately trying to go viral.",
    poster: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=85",
    imdbRating: "7.9",
    ageRating: "U/A 13+",
    year: "2024",
    genres: ["Comedy"],
    featured: false,
    badge: "TOP",
    isPremium: false,
    planRequired: "free",
    seasonsCount: 1,
    episodesCount: 3,
    director: "Gaurav Dave",
    language: "English / Hindi",
    cast: [
      {
        id: "lt1",
        name: "Rohan Joshi",
        character: "Head Writer Sam",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
      },
      {
        id: "lt2",
        name: "Mallika Dua",
        character: "Showrunner Natasha",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1: Going Viral",
        episodes: [
          {
            id: "lt-s1e1",
            season: 1,
            episodeNumber: 1,
            title: "The Pilot Disaster",
            description: "When the celebrity guest cancels thirty minutes before airtime, the writers improvise a bizarre sketch with the janitor.",
            duration: 1350,
            thumbnail: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          },
          {
            id: "lt-s1e2",
            season: 1,
            episodeNumber: 2,
            title: "Meme Economy",
            description: "Sam accidentally turns the show sponsor into a viral internet meme, sparking advertiser fury.",
            duration: 1420,
            thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          },
          {
            id: "lt-s1e3",
            season: 1,
            episodeNumber: 3,
            title: "Sweeps Week Madness",
            description: "The team pulls an all-nighter during sweeps week with unexpected comedic revelations.",
            duration: 1500,
            thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
            isFree: true,
            isLocked: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          },
        ],
      },
    ],
  },
];

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
          poster: s.poster,
          backdrop: s.backdrop,
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
  return MOCK_TV_SHOWS;
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
        show.genres.some((g) => g.toLowerCase().includes(q))
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

export function getFeaturedTvShow(): TvShow {
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
    if (!raw) {
      // Seed default realistic continue watching entries for demonstration
      return [
        {
          showId: "shadow-chronicles",
          seasonNumber: 1,
          episodeNumber: 1,
          episodeTitle: "Dark Signal",
          showTitle: "Shadow Chronicles",
          thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
          progressPercent: 65,
          lastWatchedAt: Date.now() - 3600000,
        },
        {
          showId: "the-mumbai-syndicate",
          seasonNumber: 1,
          episodeNumber: 1,
          episodeTitle: "Port of Entry",
          showTitle: "The Mumbai Syndicate",
          thumbnail: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80",
          progressPercent: 30,
          lastWatchedAt: Date.now() - 86400000,
        },
      ];
    }
    return JSON.parse(raw);
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
