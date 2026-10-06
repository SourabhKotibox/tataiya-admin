import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Save, Layers, ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import {
  useGetTVShows,
  useGetSeasonList,
  useCreateSeason,
  useUpdateSeason,
  getImageUrl,
} from "@/lib/api-client";

export default function SeasonForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: serverShowsData } = useGetTVShows({ limit: 100 });
  const { data: serverSeasonsData } = useGetSeasonList({});
  const createSeasonMutation = useCreateSeason();
  const updateSeasonMutation = useUpdateSeason();

  const tvShows = useMemo(() => {
    const raw: any[] = serverShowsData?.data || [];
    return raw.map((s) => ({
      id: s._id || s.id,
      title: s.title || "Untitled",
      year: s.releaseDate ? new Date(s.releaseDate).getFullYear() : (s.year || 2026),
      poster: getImageUrl(s.poster || s.thumbnail),
    }));
  }, [serverShowsData]);

  const [tvShowId, setTvShowId] = useState<string>("");
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState({ filePath: "", preview: "" });
  const [posterPickerOpen, setPosterPickerOpen] = useState(false);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"published" | "draft">("published");

  useEffect(() => {
    if (!tvShowId && tvShows.length > 0 && !id) {
      setTvShowId(tvShows[0].id);
    }
  }, [tvShows, tvShowId, id]);

  useEffect(() => {
    if (!id || !serverSeasonsData?.data) return;
    const match = serverSeasonsData.data.find((season: any) => (season.id || season._id) === id);
    if (!match) return;

    const sid = match.tvShowId?._id || match.tvShowId;
    if (sid) setTvShowId(sid);
    setSeasonNumber(match.seasonNumber ?? match.season ?? 1);
    setTitle(match.title || "");
    setDescription(match.description || "");
    const existingPoster = match.poster || match.posterImage || match.thumbnail || "";
    setPoster({
      filePath: existingPoster,
      preview: existingPoster ? getImageUrl(existingPoster) : "",
    });
    setReleaseDate(match.releaseDate ? new Date(match.releaseDate).toISOString().slice(0, 10) : "");
    setStatus(match.status === "draft" ? "draft" : "published");
  }, [id, serverSeasonsData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvShowId) {
      toast({ title: "Please select a TV Show", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Season Title is required", variant: "destructive" });
      return;
    }

    const selectedShow = tvShows.find((s) => s.id === tvShowId);
    const resolvedPoster = poster.filePath || poster.preview || selectedShow?.poster || "";
    const seasonPayload = {
      tvShowId,
      seasonNumber: Number(seasonNumber) || 1,
      title: title.trim(),
      description: description.trim(),
      poster: resolvedPoster || undefined,
      posterImage: resolvedPoster || undefined,
      releaseDate: releaseDate || null,
      status,
    };

    try {
      if (isEdit && id) {
        await updateSeasonMutation.mutateAsync({ id, data: seasonPayload });
      } else {
        await createSeasonMutation.mutateAsync(seasonPayload);
      }
      toast({
        title: isEdit ? "Season Updated" : "Season Created",
        description: `"${seasonPayload.title}" (Season ${seasonPayload.seasonNumber}) saved successfully.`,
      });
      setLocation("/admin/seasons");
    } catch (err: any) {
      console.error("Season save error:", err);
      toast({
        title: isEdit ? "Season Update Failed" : "Season Save Failed",
        description: err?.message || "Failed to save Season to the server.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/admin/seasons")}
          className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Seasons
        </Button>

        <h1 className="text-xl sm:text-2xl font-black text-foreground">
          {isEdit ? "Edit Season" : "Add New Season"}
        </h1>
      </div>

      {/* Note */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Layers className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Seasons Section Only:</strong> This form creates or updates a TV Show Season.
          Episodes are managed separately inside the <strong>Episodes</strong> admin section.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Target TV Show */}
        <div>
          <Label className="text-xs font-bold mb-1.5 block">Select TV Show *</Label>
          <Select value={tvShowId} onValueChange={setTvShowId}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Select TV Show..." />
            </SelectTrigger>
            <SelectContent>
              {tvShows.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title} ({s.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">Season Number *</Label>
            <Input
              type="number"
              min={1}
              required
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(parseInt(e.target.value) || 1)}
              className="h-10"
            />
          </div>

          <div>
            <Label className="text-xs font-bold mb-1.5 block">Release Date</Label>
            <Input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold mb-1.5 block">Season Title / Subtitle *</Label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Protocol Zero, Blood On The Coast..."
            className="h-10"
          />
        </div>

        <div>
          <Label className="text-xs font-bold mb-1.5 block">Season Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Storyline synopsis for this season..."
          />
        </div>

        {/* Season Poster with Media Library Picker */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold block">Season Poster</Label>
            {poster.preview && (
              <button
                type="button"
                onClick={() => setPoster({ filePath: "", preview: "" })}
                className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                Clear Poster
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div
              onClick={() => setPosterPickerOpen(true)}
              className="w-32 h-44 border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden relative group flex-shrink-0"
            >
              {poster.preview ? (
                <>
                  <img src={poster.preview} alt="Season poster preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[11px] font-semibold text-white bg-black/70 px-2 py-1 rounded-full border border-white/20 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Change
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Select Poster</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPosterPickerOpen(true)}
                className="gap-2 text-xs h-9 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Pick Poster from Library
              </Button>
              <Input
                value={poster.filePath}
                onChange={(e) => {
                  const val = e.target.value;
                  setPoster({ filePath: val, preview: val ? getImageUrl(val) : "" });
                }}
                placeholder="Or paste image URL (https://...)"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Supported: PNG, JPG, WebP. Recommended aspect ratio: 2:3 or 9:16.
              </p>
            </div>
          </div>
        </div>

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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/admin/seasons")}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createSeasonMutation.isPending || updateSeasonMutation.isPending}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" /> {isEdit ? "Update Season" : "Create Season"}
          </Button>
        </div>
      </form>

      {/* Media Picker Modal */}
      <MediaPicker
        open={posterPickerOpen}
        onClose={() => setPosterPickerOpen(false)}
        onSelect={(m) => setPoster({ filePath: m.filePath, preview: m.url })}
        source="seasons"
        accept="image/*"
      />
    </div>
  );
}
