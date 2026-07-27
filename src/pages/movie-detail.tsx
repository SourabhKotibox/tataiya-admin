
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Play, Plus, Share2, Heart, Star, Film,
  ChevronLeft, Crown,
  Check, ChevronRight, Loader2, Download
} from "lucide-react";
import { useGetWebDetail, getImageUrl, useGetWishlist, useToggleWishlist, useGetAppProfile, useToggleLike, useRequestDownload, useRemoveDownload, useGetDownloads, cacheDownloadedVideo, removeOfflineVideo, hasOfflineVideo, useRecordShare } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { PortraitCard, LandscapeCard } from "@/components/ContentCard";

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function MovieDetailPage() {
  const [, params] = useRoute("/movie/:id");
  const [, setLocation] = useLocation();
  const id = (params as any)?.id;
  const { toast } = useToast();

  const recordShareMutation = useRecordShare();

  const [user, setUser] = useState<any>(null);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  const { data: detailData, isLoading } = useGetWebDetail(id || "");
  const item = detailData;
  const { data: profileData } = useGetAppProfile();

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("appUser") || localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
        else setUser(null);
      } catch (e) {}
    };
    loadUser();

    const refresh = async () => {
      const token = localStorage.getItem("appAccessToken") || localStorage.getItem("accessToken");
      if (!token) return;
      try {
        const { getAppProfile } = await import("@/lib/api-client");
        const res = await getAppProfile();
        const profile = res?.data?.user || res?.data?.profile || res?.data;
        if (!profile) return;
        const next = {
          id: profile.id || profile._id,
          name: profile.name,
          avatar: profile.avatar || null,
          email: profile.email || null,
          subscriptionPlan: profile.subscriptionPlan || "free",
          subscriptionStatus: profile.subscriptionStatus || (profile.subscription ? "active" : "inactive"),
          subscriptionExpiry: profile.subscriptionExpiry || null,
          subscription: !!profile.subscription,
        };
        localStorage.setItem("appUser", JSON.stringify(next));
        localStorage.setItem("user", JSON.stringify(next));
        setUser(next);
        window.dispatchEvent(new Event("user-updated"));
      } catch { /* keep cached */ }
    };
    refresh();

    window.addEventListener("user-updated", loadUser);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("user-updated", loadUser);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    setUser(null);
    window.location.reload();
  };

  const related = detailData?.related || [];

  const isLiked = profileData?.likeRecords?.some((l: any) => l.contentId === id) || false;
  const toggleLikeMutation = useToggleLike();

  // Downloads — use web endpoint as single source of truth (cross-device consistent)
  const { data: downloadsData } = useGetDownloads({ limit: 200 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const downloadRecord = downloadItems.find((d: any) => d.contentId === id);
  const inDownloadList = !!downloadRecord;
  const [isOfflineHere, setIsOfflineHere] = useState(false);
  const requestDownloadMutation = useRequestDownload();
  const removeDownloadMutation = useRemoveDownload();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    hasOfflineVideo(id).then((ok) => {
      if (!cancelled) setIsOfflineHere(ok);
    });
    return () => { cancelled = true; };
  }, [id, dlProgress, inDownloadList]);

  // Wishlist — real API
  const { data: wishlistData } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = wishlistData?.items || [];
  const inWatchlist = wishlistItems.some((w: any) => w.id === id || w.contentId === id);
  const toggleWishlistMutation = useToggleWishlist();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen text-foreground flex flex-col items-center justify-center" style={{ background: "#0c0c14" }}>
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) { setLocation("/"); return null; }

  const isPremium = item.badge === "TOP" || item.badge === "EXCLUSIVE";

  const getPlanLevel = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "premium": return 3;
      case "standard": return 2;
      case "basic": return 1;
      default: return 0;
    }
  };

  const profileUser = profileData?.user || profileData;
  const status = String(profileUser?.subscriptionStatus || user?.subscriptionStatus || "").toLowerCase();
  const plan = String(profileUser?.subscriptionPlan || user?.subscriptionPlan || "free").toLowerCase();
  const expiryRaw = profileUser?.subscriptionExpiry || user?.subscriptionExpiry;
  const hasPaidPlan =
    (profileUser?.subscription === true || (status === "active" && plan !== "free")) &&
    (!expiryRaw || new Date(expiryRaw).getTime() >= Date.now());
  const userPlan = hasPaidPlan ? plan : "free";
  const planRequired = String(item?.planRequired || "free").toLowerCase();
  // Any active paid plan unlocks paid titles
  const isLocked = planRequired !== "free" && !hasPaidPlan;

  const heroBg = getImageUrl(item.backdrop || item.poster || item.posterImage || item.thumbnail) || "";
  const posterImg = getImageUrl(item.poster || item.posterImage || item.thumbnail || item.backdrop) || "";

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#0c0c14" }}>
      <PublicHeader
        activeTab="movies"
        setActiveTab={(tab) => {
          if (tab === "home") setLocation("/");
          else setLocation(`/browse/${tab}`);
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      {/* ══════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden min-h-[320px] max-h-[520px] sm:min-h-[480px] sm:max-h-[620px]">
        {/* Backdrop */}
        {heroBg && (
          <img
            src={heroBg}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover object-[center_20%] sm:object-top"
            style={{ filter: "brightness(0.45)" }}
          />
        )}
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c14]/90 via-[#0c0c14]/30 to-transparent" />

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-[68px] sm:pt-[72px]">
          <div className="px-4 sm:px-10 lg:px-16">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>

        {/* Content over hero */}
        <div className="relative z-10 flex items-end min-h-[320px] sm:min-h-[480px] max-h-[520px] sm:max-h-[620px] pb-8 sm:pb-10 px-4 sm:px-10 lg:px-16 pt-24 sm:pt-[120px]">
          <div className="flex items-end gap-8 w-full">
            {/* Poster */}
            {posterImg && (
              <div className="hidden sm:block flex-shrink-0 w-36 lg:w-48 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ aspectRatio: "2/3" }}>
                <img src={posterImg} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            {/* Text */}
            <div className="flex-1 min-w-0">
              {/* Genres */}
              <div className="flex flex-wrap items-center gap-x-0 gap-y-1 mb-2 sm:mb-3">
                {(item.genres || []).map((g: string, i: number) => (
                  <span key={g} className="text-foreground/80 text-sm font-medium">
                    {g}{i < item.genres.length - 1 && <span className="mx-2 text-foreground/80">•</span>}
                  </span>
                ))}
              </div>
              {/* Title */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-3 tracking-tight drop-shadow-lg">
                {item.title}
              </h1>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Content type badge */}
          <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-lg border bg-amber-400/15 border-amber-400/35 text-amber-300">
            <Film className="w-3 h-3" />
            Movie
          </span>
          {item.imdbRating && (
            <span className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/35 text-amber-400 text-xs font-black px-2.5 py-1 rounded-md">
              <Star className="w-3 h-3 fill-amber-400" /> IMDb {item.imdbRating}
            </span>
          )}
          {item.ageRating && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80">
              {item.ageRating}
            </span>
          )}
          {item.year && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80">
              {item.year}
            </span>
          )}
          {(item.durationFormatted || item.duration) && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80">
              {item.durationFormatted || item.duration}
            </span>
          )}
          {item.language && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80 uppercase">
              {item.language}
            </span>
          )}
          {isPremium && (
            <span className="flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-md bg-amber-500 text-black">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-foreground/80 text-sm sm:text-[15px] leading-relaxed mb-6 max-w-2xl line-clamp-3">
          {item.description}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Watch Now */}
          <button
            onClick={() => {
              if (isLocked) {
                setPlansModalOpen(true);
              } else if (item.trailerUrl) {
                setLocation(`/watch/${id}/0`);
              } else {
                setLocation(`/watch/${id}`);
              }
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 font-black rounded-xl text-sm tracking-wide transition-all active:scale-95 shadow-lg bg-amber-400 hover:bg-amber-300 text-black shadow-amber-900/40"
          >
            {isLocked ? <Crown className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
            {isLocked ? "Unlock Now" : "Watch Now"}
          </button>

          <button
            onClick={() => {
              if (!user) { setLocation("/login"); return; }
              toggleWishlistMutation.mutate(
                { contentId: id!, contentType: 'movie' },
                {
                  onSuccess: () => {
                    toast({
                      title: inWatchlist ? "Removed from watchlist" : "Added to watchlist",
                    });
                  },
                  onError: (err: any) => {
                    toast({
                      title: "Failed to update watchlist",
                      description: err?.message || "Please try again.",
                      variant: "destructive",
                    });
                  },
                }
              );
            }}
            disabled={toggleWishlistMutation.isPending}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 disabled:opacity-70 ${
              inWatchlist
                ? "bg-amber-400/20 border-amber-400 text-amber-400"
                : "bg-white/8 border-white/20 text-foreground hover:bg-white/12 hover:border-white/35"
            }`}
          >
            {toggleWishlistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inWatchlist ? "In Watchlist" : "Watchlist"}
          </button>

          {/* Download — only when movie allows downloads; Offline = cached on THIS device */}
          {(item.downloadAllowed !== false || inDownloadList || isOfflineHere) && (
          <button
            onClick={async () => {
              if (!user) { setLocation("/login"); return; }
              if (item.downloadAllowed === false && !inDownloadList && !isOfflineHere) {
                toast({ title: "Download unavailable", description: "Downloading is disabled for this movie." });
                return;
              }
              // Remove only when this device has the offline file (or user clears list entry)
              if (isOfflineHere && downloadRecord) {
                removeDownloadMutation.mutate(
                  { id: downloadRecord.id, contentId: id! },
                  {
                    onSuccess: async () => {
                      await removeOfflineVideo(id!);
                      setIsOfflineHere(false);
                      toast({ title: "Removed from this device" });
                    },
                    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
                  }
                );
                return;
              }
              // Cache on THIS device (even if another device already added it to the list)
              requestDownloadMutation.mutate(
                { contentId: id!, contentType: 'movie' },
                {
                  onSuccess: async (data: any) => {
                    const downloadUrl = data?.data?.downloadUrl || data?.downloadUrl;
                    if (downloadUrl) {
                      setDlProgress(0);
                      const ok = await cacheDownloadedVideo(downloadUrl, id!, undefined, setDlProgress);
                      setDlProgress(null);
                      setIsOfflineHere(ok);
                      toast({
                        title: ok ? "Saved offline on this device" : "Added to Downloads list",
                        description: ok
                          ? "Play without internet here in Tataiya. Other phones/browsers need their own download."
                          : "List synced, but offline file is not on this device yet — check storage/CORS and retry.",
                      });
                    } else {
                      toast({ title: "Added to downloads" });
                    }
                  },
                  onError: (err: any) => toast({ title: "Download failed", description: err?.message || "Please try again.", variant: "destructive" }),
                }
              );
            }}
            disabled={requestDownloadMutation.isPending || removeDownloadMutation.isPending || dlProgress !== null}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 disabled:opacity-70 ${
              isOfflineHere
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                : inDownloadList
                ? "bg-amber-400/15 border-amber-400/50 text-amber-300"
                : "bg-white/8 border-white/20 text-foreground hover:bg-white/12 hover:border-white/35"
            }`}
          >
            {requestDownloadMutation.isPending || dlProgress !== null ? (
              dlProgress !== null && dlProgress > 0
                ? <span className="text-xs font-bold">{dlProgress}%</span>
                : <Loader2 className="w-4 h-4 animate-spin" />
            ) : removeDownloadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOfflineHere ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {dlProgress !== null
              ? "Downloading..."
              : isOfflineHere
              ? "Offline here"
              : inDownloadList
              ? "Save offline here"
              : "Download"}
          </button>
          )}

          {/* Like button */}
          <button
            onClick={() => {
              if (!user) { setLocation("/login"); return; }
              toggleLikeMutation.mutate({ contentId: id!, contentType: 'movie' });
            }}
            disabled={toggleLikeMutation.isPending}
            className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all active:scale-95 disabled:opacity-70 ${
              isLiked
                ? "bg-rose-500/20 border-rose-500 text-rose-400"
                : "bg-white/8 border-white/20 text-foreground hover:border-white/35"
            }`}
          >
            {toggleLikeMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            )}
          </button>

          <button
            onClick={() => {
              recordShareMutation.mutate({
                contentId: id,
                contentType: "movie",
              });
              navigator.clipboard.writeText(window.location.href);
              toast({
                title: "Link Copied",
                description: "Movie link copied to clipboard successfully!",
              });
            }}
            className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-white/20 bg-white/8 text-foreground hover:border-white/35 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
            </div>{/* end text block */}
          </div>{/* end poster+text row */}
        </div>{/* end hero content */}
      </div>{/* end hero banner */}

      {/* ══════════════════════════════════════════
          2.5. CAST & CREW
      ══════════════════════════════════════════ */}
      {((item.cast && item.cast.length > 0) || (item.crew && item.crew.length > 0) || (item.crewMembers && item.crewMembers.length > 0)) && (
        <div className="pb-10">
          <div className="flex items-center gap-3 mb-5 px-6 sm:px-10 lg:px-16">
            <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
            <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">Cast & Crew</h2>
          </div>
          <div
            className="flex gap-6 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {item.cast?.map((c: any) => (
              <div key={`cast-${c.id}-${c.character}`} className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                  <img
                    src={getImageUrl(c.image || "")}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                    }}
                  />
                </div>
                <h4 className="text-foreground font-bold text-xs sm:text-sm mt-3 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                <p className="text-foreground/80 text-[10px] sm:text-xs mt-0.5 line-clamp-1 font-semibold">{c.character || c.role || 'Cast'}</p>
              </div>
            ))}

            {item.crew?.map((c: any) => (
              <div key={`crew-${c.id}-${c.role}`} className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                  <img
                    src={getImageUrl(c.image || "")}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                    }}
                  />
                </div>
                <h4 className="text-foreground font-bold text-xs sm:text-sm mt-3 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                <p className="text-foreground/80 text-[10px] sm:text-xs mt-0.5 line-clamp-1 font-semibold">{c.role || 'Director'}</p>
              </div>
            ))}

            {item.crewMembers?.map((c: any) => (
              <div key={`crewMem-${c.id}-${c.role}`} className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                  <img
                    src={getImageUrl(c.image || "")}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                    }}
                  />
                </div>
                <h4 className="text-foreground font-bold text-xs sm:text-sm mt-3 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                <p className="text-foreground/80 text-[10px] sm:text-xs mt-0.5 line-clamp-1 font-semibold">{c.role || 'Crew'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          3. MORE LIKE THIS
      ══════════════════════════════════════════ */}
      {related.length > 0 && (
        <div className="pb-12">
          <div className="flex items-center gap-3 mb-5 px-6 sm:px-10 lg:px-16">
            <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
            <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">More Like This</h2>
            <div className="flex-1" />
            <button
              onClick={() => {
                const firstGenre = item.genres?.[0] || '';
                const path = "/browse/movie";
                window.open(firstGenre ? `${path}?genre=${encodeURIComponent(firstGenre)}` : path, "_blank");
              }}
              className="text-foreground hover:text-primary text-xs transition-colors flex items-center gap-0.5 font-semibold"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            className="flex gap-4 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {related.map((r) => (
              <LandscapeCard key={r.id} item={r} onClick={() => setLocation(`/movie/${r.id}`)} />
            ))}
          </div>
        </div>
      )}

      <PublicFooter />

      <SubscriptionPlansModal 
        isOpen={plansModalOpen} 
        onClose={() => setPlansModalOpen(false)} 
      />

      <style>{`
        body { background: #0c0c14 !important; }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
