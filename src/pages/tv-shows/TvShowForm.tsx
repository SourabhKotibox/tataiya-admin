import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Save, Tv, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGetTVShowById,
  useCreateTVShow,
  useUpdateTVShow,
  useGetGenres,
  useGetLanguagesList,
  getImageUrl,
} from "@/lib/api-client";

const AVAILABLE_GENRES = [
  "Action", "Drama", "Crime", "Sci-Fi", "Comedy",
  "Romance", "Thriller", "Fantasy", "Mystery", "Horror"
];

export default function TvShowForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: serverShowData } = useGetTVShowById(id || "");
  const createShowMutation = useCreateTVShow();
  const updateShowMutation = useUpdateTVShow();
  const { data: genresData } = useGetGenres({ page: 1, limit: 100, admin: true });
  const { data: languagesData } = useGetLanguagesList();

  const genresList: any[] = useMemo(() => {
    return (genresData as any)?.data || [];
  }, [genresData]);

  const languagesList: any[] = useMemo(() => {
    return (languagesData as any)?.data || [];
  }, [languagesData]);

  const dynamicGenres = useMemo(() => {
    if (genresList.length > 0) {
      return genresList.map((g: any) => ({
        id: g._id || g.id || g.name,
        name: g.name || String(g),
      }));
    }
    return AVAILABLE_GENRES.map((name) => ({ id: name, name }));
  }, [genresList]);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [poster, setPoster] = useState("");
  const [backdrop, setBackdrop] = useState("");
  const [genres, setGenres] = useState<string[]>(["Drama"]);
  const [language, setLanguage] = useState("Hindi");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rating, setRating] = useState("8.5");
  const [ageRating, setAgeRating] = useState("16+");
  const [contentType, setContentType] = useState<"series" | "short-drama">("series");
  const [tagsInput, setTagsInput] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [director, setDirector] = useState("");

  useEffect(() => {
    if (serverShowData?.data || serverShowData) {
      const existing = serverShowData.data || serverShowData;
      setTitle(existing.title || "");
      setShortDescription(existing.shortDescription || "");
      setFullDescription(existing.description || existing.fullDescription || "");
      setPoster(existing.poster || existing.thumbnail || "");
      setBackdrop(existing.bannerImage || existing.backdrop || "");
      if (Array.isArray(existing.genres) && existing.genres.length > 0) {
        setGenres(existing.genres.map((g: any) => (typeof g === "string" ? g : g?._id || g?.name || "")).filter(Boolean));
      }
      if (Array.isArray(existing.languages) && existing.languages.length > 0) {
        const firstLang = existing.languages[0];
        setLanguage(typeof firstLang === "string" ? firstLang : firstLang?._id || firstLang?.name || "Hindi");
      } else if (existing.language) {
        setLanguage(existing.language);
      }
      setYear(existing.year ? String(existing.year) : "2026");
      setRating(existing.rating ? String(existing.rating) : "8.5");
      setAgeRating(existing.ageRating ? `${existing.ageRating}+` : "16+");
      setContentType(existing.contentType === "drama" || existing.contentType === "short-drama" ? "short-drama" : "series");
      setTagsInput(Array.isArray(existing.tags) ? existing.tags.join(", ") : "");
      setIsPremium((existing.planRequired && existing.planRequired !== "free") || Boolean(existing.isPremium));
      setFeatured(Boolean(existing.featured));
      setStatus(existing.status === "draft" ? "draft" : "published");
      setDirector(existing.producer || existing.director || "");
    }
  }, [serverShowData]);

  const toggleGenre = (val: string) => {
    setGenres((prev) => {
      const matchItem = dynamicGenres.find((dg) => dg.id === val || dg.name.toLowerCase() === val.toLowerCase());
      const targetId = matchItem?.id || val;
      const targetName = matchItem?.name || val;
      const alreadySelected = prev.some((p) => p === targetId || p.toLowerCase() === targetName.toLowerCase());
      if (alreadySelected) {
        return prev.filter((p) => p !== targetId && p.toLowerCase() !== targetName.toLowerCase());
      } else {
        return [...prev, targetId];
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Title is required.", variant: "destructive" });
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Map genres to ObjectIds if available
    const resolvedGenres = genres.map((g) => {
      const match = genresList.find(
        (item: any) => item._id === g || item.name?.toLowerCase() === g.toLowerCase()
      );
      return match ? match._id : g;
    });

    // Map language to ObjectId if available
    const matchLang = languagesList.find(
      (l: any) => l._id === language || l.name?.toLowerCase() === language.toLowerCase()
    );
    const resolvedLanguage = matchLang ? matchLang._id : language;

    const payload: any = {
      title: title.trim(),
      description: fullDescription.trim() || shortDescription.trim(),
      shortDescription: shortDescription.trim(),
      thumbnail: poster.trim() || undefined,
      poster: poster.trim() || undefined,
      bannerImage: backdrop.trim() || undefined,
      genres: resolvedGenres,
      languages: [resolvedLanguage],
      year: parseInt(year.trim(), 10) || new Date().getFullYear(),
      rating: rating.trim() || "8.0",
      ageRating: parseInt(ageRating.replace(/\D/g, "") || "16", 10),
      contentType: contentType === "short-drama" ? "short-drama" : "series",
      tags,
      planRequired: isPremium ? "vip" : "free",
      featured,
      status,
      director: director.trim(),
      producer: director.trim(),
    };

    try {
      if (isEdit && id) {
        await updateShowMutation.mutateAsync({ id, data: payload });
      } else {
        await createShowMutation.mutateAsync(payload);
      }
      toast({
        title: isEdit ? "TV Show Updated" : "TV Show Created",
        description: `"${payload.title}" has been saved successfully.`,
      });
      setLocation("/admin/tv-shows");
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err?.message || "Could not save TV Show.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/tv-shows")}
            className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to TV Shows
          </Button>

          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            {isEdit ? "Edit TV Show" : "Add New TV Show"}
          </h1>
        </div>

        {/* Note: STRICT isolation */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Tv className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">TV Show Level Only:</strong> This form manages the show metadata.
            To manage seasons and episodes, navigate to the dedicated <strong>Seasons</strong> and <strong>Episodes</strong> sections in the sidebar.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Section: Basic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Basic Information
            </h3>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">TV Show Title *</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shadow Chronicles"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Content Type</Label>
                <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="series">Standard TV Series</SelectItem>
                    <SelectItem value="short-drama">Short Drama</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languagesList.length > 0 ? (
                      languagesList.map((lang: any) => (
                        <SelectItem key={lang._id || lang.name} value={lang._id || lang.name}>
                          {lang.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Tamil">Tamil</SelectItem>
                        <SelectItem value="Telugu">Telugu</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Short Description</Label>
              <Input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief logline or tagline (1-2 sentences)..."
              />
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Full Description</Label>
              <Textarea
                rows={4}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                placeholder="Complete synopsis and storyline details..."
              />
            </div>
          </div>

          {/* Section: Media Assets */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Visual Artwork
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Poster Image URL (9:16)</Label>
                <Input
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  placeholder="https://..."
                />
                {poster && (
                  <div className="mt-2 w-24 h-36 rounded-lg overflow-hidden border border-border bg-zinc-900">
                    <img src={poster} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Backdrop / Hero Image URL (16:9)</Label>
                <Input
                  value={backdrop}
                  onChange={(e) => setBackdrop(e.target.value)}
                  placeholder="https://..."
                />
                {backdrop && (
                  <div className="mt-2 w-48 h-28 rounded-lg overflow-hidden border border-border bg-zinc-900">
                    <img src={backdrop} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Genres & Tags */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Genres & Classifications
            </h3>

            <div>
              <Label className="text-xs font-bold mb-2 block">Genres (Select multiple)</Label>
              <div className="flex flex-wrap gap-2">
                {dynamicGenres.map((g) => {
                  const selected = genres.some(
                    (item) => item === g.id || item.toLowerCase() === g.name.toLowerCase()
                  );
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGenre(g.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        selected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Tags (comma separated)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Cyberpunk, Action, Thriller..."
              />
            </div>
          </div>

          {/* Section: Metadata & Ratings */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Metadata & Ratings
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Release Year</Label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">IMDb Rating</Label>
                <Input
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="8.5"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Age Rating</Label>
                <Input
                  value={ageRating}
                  onChange={(e) => setAgeRating(e.target.value)}
                  placeholder="16+"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Director</Label>
                <Input
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder="Director name"
                />
              </div>
            </div>
          </div>

          {/* Section: Status & Publishing Controls */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Publishing & Access
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Premium / Free Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <Label className="text-xs font-bold block">VIP Access</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Require subscription</p>
                </div>
                <Switch
                  checked={isPremium}
                  onCheckedChange={setIsPremium}
                />
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <Label className="text-xs font-bold block">Featured</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Highlight on homepage</p>
                </div>
                <Switch
                  checked={featured}
                  onCheckedChange={setFeatured}
                />
              </div>

              {/* Publishing Status */}
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/tv-shows")}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" /> {isEdit ? "Update TV Show" : "Create TV Show"}
            </Button>
          </div>
        </form>
      </div>
  );
}
