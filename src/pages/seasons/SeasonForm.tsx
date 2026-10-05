import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Save, Layers, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAdminSeasonById, saveAdminSeason, AdminSeason } from "@/data/seasons";
import { getAdminTvShows } from "@/data/tvShows";

export default function SeasonForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const tvShows = getAdminTvShows();

  const [tvShowId, setTvShowId] = useState<string>(tvShows[0]?.id || "");
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState("");
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"published" | "draft">("published");

  useEffect(() => {
    if (id) {
      const existing = getAdminSeasonById(id);
      if (existing) {
        setTvShowId(existing.tvShowId);
        setSeasonNumber(existing.seasonNumber);
        setTitle(existing.title);
        setDescription(existing.description || "");
        setPoster(existing.poster || "");
        setReleaseDate(existing.releaseDate || "");
        setStatus(existing.status || "published");
      }
    }
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvShowId) {
      toast({ title: "Please select a TV Show", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Season Title is required", variant: "destructive" });
      return;
    }

    const seasonId = id || `season-${Date.now()}`;
    const selectedShow = tvShows.find((s) => s.id === tvShowId);

    const savedSeason: AdminSeason = {
      id: seasonId,
      tvShowId,
      seasonNumber: Number(seasonNumber) || 1,
      title: title.trim(),
      description: description.trim(),
      poster: poster.trim() || selectedShow?.poster || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
      releaseDate,
      status,
      createdAt: isEdit ? (getAdminSeasonById(seasonId)?.createdAt || releaseDate) : new Date().toISOString().split("T")[0],
    };

    saveAdminSeason(savedSeason);
    toast({
      title: isEdit ? "Season Updated" : "Season Created",
      description: `"${savedSeason.title}" (Season ${savedSeason.seasonNumber}) saved successfully.`,
    });
    setLocation("/admin/seasons");
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

          <div>
            <Label className="text-xs font-bold mb-1.5 block">Season Poster URL (optional)</Label>
            <Input
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
              placeholder="https://..."
            />
            {poster && (
              <div className="mt-2 w-24 h-36 rounded-lg overflow-hidden border border-border bg-zinc-900">
                <img src={poster} alt="Season preview" className="w-full h-full object-cover" />
              </div>
            )}
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
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" /> {isEdit ? "Update Season" : "Create Season"}
            </Button>
          </div>
        </form>
      </div>
  );
}
