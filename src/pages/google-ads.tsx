import { useState, useEffect } from "react";
import { Globe, Smartphone, MonitorPlay, Save, Info, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSettings } from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";

function normalizeAdSenseClient(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (v.startsWith("ca-pub-")) return v;
  if (v.startsWith("pub-")) return `ca-${v}`;
  return v;
}

export default function GoogleAdsPage() {
  const { toast } = useToast();
  const { settings, refreshSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  const [formData, setFormData] = useState({
    adNetworkEnabled: false,
    adSenseClientId: "",
    adSenseBannerSlot: "",
    adMobPublisherId: "",
    adMobAppIdAndroid: "",
    adMobAppIdIos: "",
    adMobBannerAndroid: "",
    adMobBannerIos: "",
    adMobInterstitialAndroid: "",
    adMobInterstitialIos: "",
    vastPrerollUrl: "",
    vastMidrollUrl: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        adNetworkEnabled: settings.adNetworkEnabled || false,
        adSenseClientId: settings.adSenseClientId || "",
        adSenseBannerSlot: settings.adSenseBannerSlot || "",
        adMobPublisherId: settings.adMobPublisherId || "",
        adMobAppIdAndroid: settings.adMobAppIdAndroid || "",
        adMobAppIdIos: settings.adMobAppIdIos || "",
        adMobBannerAndroid: settings.adMobBannerAndroid || "",
        adMobBannerIos: settings.adMobBannerIos || "",
        adMobInterstitialAndroid: settings.adMobInterstitialAndroid || "",
        adMobInterstitialIos: settings.adMobInterstitialIos || "",
        vastPrerollUrl: settings.vastPrerollUrl || "",
        vastMidrollUrl: settings.vastMidrollUrl || "",
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggle = (checked: boolean) => {
    setFormData({ ...formData, adNetworkEnabled: checked });
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        adSenseClientId: normalizeAdSenseClient(formData.adSenseClientId),
      };
      await updateSettingsMutation.mutateAsync(payload);
      await refreshSettings();
      toast({ title: "Ad Networks saved successfully!" });
    } catch (error: any) {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 text-foreground bg-transparent">
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 px-6 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Google Ads Settings</h2>
          <p className="text-foreground/70 text-sm">Configure AdSense (web) &amp; AdMob (apps)</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" disabled={updateSettingsMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="max-w-4xl space-y-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-500" />
                Global Ad Networks
              </h2>
              <p className="text-sm text-foreground/70 mt-1">Enable third-party ads on home banners and player (subject to plan ad rules).</p>
            </div>
            <Switch checked={formData.adNetworkEnabled} onCheckedChange={handleToggle} />
          </div>
        </div>

        <div className={`space-y-6 transition-opacity duration-200 ${!formData.adNetworkEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          {/* AdSense — Web */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-6">
              <LayoutTemplate className="h-5 w-5 text-amber-500" />
              Google AdSense (Website)
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Publisher / Client ID</Label>
                <Input
                  name="adSenseClientId"
                  value={formData.adSenseClientId}
                  onChange={handleChange}
                  placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">From AdSense → Account → Account information. Format: ca-pub-…</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Display Ad Unit Slot ID</Label>
                <Input
                  name="adSenseBannerSlot"
                  value={formData.adSenseBannerSlot}
                  onChange={handleChange}
                  placeholder="1234567890"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">Create a Display ad unit in AdSense and paste the data-ad-slot number here.</p>
              </div>
            </div>
          </div>

          {/* AdMob — Apps */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-6">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              Google AdMob (Mobile Apps)
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Publisher ID</Label>
                <Input
                  name="adMobPublisherId"
                  value={formData.adMobPublisherId}
                  onChange={handleChange}
                  placeholder="pub-xxxxxxxxxxxxxxxx"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Android App ID</Label>
                  <Input name="adMobAppIdAndroid" value={formData.adMobAppIdAndroid} onChange={handleChange} placeholder="ca-app-pub-xxx~xxx" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">iOS App ID</Label>
                  <Input name="adMobAppIdIos" value={formData.adMobAppIdIos} onChange={handleChange} placeholder="ca-app-pub-xxx~xxx" className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Android Banner Ad Unit</Label>
                  <Input name="adMobBannerAndroid" value={formData.adMobBannerAndroid} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">iOS Banner Ad Unit</Label>
                  <Input name="adMobBannerIos" value={formData.adMobBannerIos} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Android Interstitial</Label>
                  <Input name="adMobInterstitialAndroid" value={formData.adMobInterstitialAndroid} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">iOS Interstitial</Label>
                  <Input name="adMobInterstitialIos" value={formData.adMobInterstitialIos} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-border">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-amber-500" />
                  VAST Pre-roll URL (Video Player Ads)
                </Label>
                <Input
                  name="vastPrerollUrl"
                  value={formData.vastPrerollUrl}
                  onChange={handleChange}
                  placeholder="https://…"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Optional VAST tag for automated pre-roll before movie playback.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">VAST Mid-roll URL</Label>
                <Input
                  name="vastMidrollUrl"
                  value={formData.vastMidrollUrl}
                  onChange={handleChange}
                  placeholder="https://…"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-amber-400" />
            Google AdSense Setup
          </h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-foreground/80">
            <li>Create an account at <a href="https://adsense.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">adsense.google.com</a>.</li>
            <li>Add your live website and wait for Google’s site approval (often a few days).</li>
            <li>Ads → By ad unit → create a <strong>Display</strong> unit (responsive).</li>
            <li>Paste <code className="text-amber-300">ca-pub-…</code> and the slot ID above, enable Global Ad Networks, Save.</li>
            <li>Add a home section with type <strong>Google Adsense Banner</strong> (Web Home Sections), or use Manual Ads for Image/Video/HTML campaigns.</li>
            <li>Real ads only show on an approved live domain — localhost shows a placeholder in development.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
