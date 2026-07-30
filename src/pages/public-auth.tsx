import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Play, Eye, EyeOff, Loader2, ArrowLeft, Wrench } from "lucide-react";
import { loginClient, registerClient, sendOtpClient, verifyOtpClient, getImageUrl } from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) { resolve(); return; }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

const baseUrl = (import.meta as any).env?.VITE_API_URL || "";

async function socialAuthRequest(provider: "google" | "apple", idToken: string, user?: any) {
  const token = localStorage.getItem("appAccessToken");
  const res = await fetch(`${baseUrl}/api/app/auth/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ idToken, ...(user ? { user } : {}) }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `${provider} sign-in failed`);
  return json;
}

const inputCls =
  "w-full bg-zinc-950 border border-zinc-900 text-white placeholder:text-white/70 px-4 py-3.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";

export default function PublicAuthPage() {
  const [location, setLocation] = useLocation();
  const isLogin = location === "/login";
  const [authMode, setAuthMode] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);

  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();

  const otpEnabled = true; // Always show Phone OTP on web; API uses Message Central when configured
  const otpLen = Number(settings.messageCentralOtpLength || 4);
  const countryCode = String(settings.messageCentralCountryCode || "91");
  const showSocial = settings.socialLogin && (!!settings.googleClientId || !!settings.appleClientId);

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return getImageUrl(settings.darkLogoUrl);
    if (resolvedTheme === "light" && settings.lightLogoUrl) return getImageUrl(settings.lightLogoUrl);
    if (settings.logoUrl) return getImageUrl(settings.logoUrl);
    return "/logo.png";
  };
  const logoUrl = getLogoUrl();

  useEffect(() => {
    setMaintenance(settings.maintenanceMode ?? false);
    setRegistrationDisabled(!(settings.userRegistration ?? true));
  }, [settings.maintenanceMode, settings.userRegistration]);

  useEffect(() => {
    setAuthMode("phone");
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const handleAuthSuccess = useCallback((res: any) => {
    localStorage.setItem("appAccessToken", res.accessToken);
    localStorage.setItem("appUser", JSON.stringify({
      id: res.userId,
      name: res.name,
      email: res.email || null,
      phone: res.phone || null,
      avatar: res.avatar || null,
      subscriptionPlan: res.subscriptionPlan || "free",
      subscriptionStatus: res.subscriptionStatus || "inactive",
      subscriptionExpiry: res.subscriptionExpiry || null,
      profileLimitCount: res.profileLimitCount || 1,
    }));
    setLocation("/");
    window.location.reload();
  }, [setLocation]);

  const handleAuthError = useCallback((err: any) => {
    if (err?.message?.includes("maintenance") || err?.maintenance) {
      setMaintenance(true);
    } else if (err?.message?.includes("registration")) {
      setRegistrationDisabled(true);
    }
    setError(err?.message || "An error occurred. Please try again.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginClient({ email, password });
        handleAuthSuccess(res);
      } else {
        const res = await registerClient({ email, password, name });
        handleAuthSuccess(res);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    const mobileNumber = phone.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtpClient(mobileNumber);
      if (!res?.success) throw new Error(res?.message || "Failed to send OTP");
      setVerificationId(res.verificationId || "");
      setOtpSent(true);
      setResendIn(45);
      setOtp("");
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const mobileNumber = phone.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    if (!new RegExp(`^\\d{${Math.min(4, otpLen)},8}$`).test(otp.trim())) {
      setError(`Enter the ${otpLen}-digit OTP`);
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtpClient({
        mobileNumber,
        otp: otp.trim(),
        verificationId: verificationId || undefined,
        deviceId: "web",
        deviceName: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : "web",
      });
      if (!res?.success || !res?.accessToken) throw new Error(res?.message || "OTP verification failed");
      handleAuthSuccess(res);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    if (!settings.googleClientId) return;
    setError("");
    setSocialLoading("google");
    try {
      await loadScript("https://accounts.google.com/gsi/client", "google-gsi");
      const idToken: string = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Google Sign In timed out")), 10000);
        window.google.accounts.id.initialize({
          client_id: settings.googleClientId,
          callback: (response: any) => {
            clearTimeout(timeout);
            if (response.credential) resolve(response.credential);
            else reject(new Error("No credential returned"));
          },
        });
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            clearTimeout(timeout);
            reject(new Error("Google Sign In was dismissed"));
          }
        });
      });
      const res = await socialAuthRequest("google", idToken);
      handleAuthSuccess(res);
    } catch (err: any) {
      if (err?.message !== "Google Sign In timed out") handleAuthError(err);
    } finally {
      setSocialLoading(null);
    }
  }, [settings.googleClientId, handleAuthSuccess, handleAuthError]);

  const handleAppleSignIn = useCallback(async () => {
    if (!settings.appleClientId) return;
    setError("");
    setSocialLoading("apple");
    try {
      await loadScript(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
        "apple-auth"
      );
      window.AppleID.auth.init({
        clientId: settings.appleClientId,
        scope: "name email",
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();
      const idToken = response?.authorization?.id_token;
      if (!idToken) throw new Error("No Apple ID token");
      const res = await socialAuthRequest("apple", idToken, response?.user);
      handleAuthSuccess(res);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setSocialLoading(null);
    }
  }, [settings.appleClientId, handleAuthSuccess, handleAuthError]);

  if (maintenance) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Wrench className="w-12 h-12 text-amber-400 mb-4" />
        <h1 className="text-white text-2xl font-black mb-2">Under Maintenance</h1>
        <p className="text-white/60 text-sm max-w-md">We're performing scheduled maintenance. Please check back shortly.</p>
        <Link href="/" className="mt-6 text-primary text-sm font-bold hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-black to-black pointer-events-none" />
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="w-full max-w-[420px] relative z-10 bg-zinc-950/80 backdrop-blur-xl border border-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            {logoUrl && logoUrl !== "/logo.png" ? (
              <img src={logoUrl} alt={settings.platformName || "Logo"} className="h-10 object-contain" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/50 group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
                <span className="text-white font-black text-2xl tracking-tight">{settings.platformName || "StreamIT"}</span>
              </>
            )}
          </Link>
          <h2 className="text-white font-black text-2xl tracking-tight mb-2">
            {isLogin ? "Welcome Back" : "Create Your Account"}
          </h2>
          <p className="text-white/75 text-xs sm:text-sm font-medium">
            {isLogin ? "Enjoy unlimited access to premium OTT content." : "Join us and start streaming the best movies and shows."}
          </p>
        </div>

        {!isLogin && registrationDisabled && authMode === "email" && (
          <div className="mb-5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-semibold">
            New registrations are currently disabled. Please try again later.
          </div>
        )}

        {error && (
          <div className="mb-5 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Email / Phone toggle — Phone OTP is default */}
        <div className="flex mb-5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={() => { setAuthMode("phone"); setError(""); setOtpSent(false); setOtp(""); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              authMode === "phone" ? "bg-primary text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Phone OTP
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("email"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              authMode === "email" ? "bg-primary text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Email
          </button>
        </div>

        {authMode === "phone" ? (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="w-16 shrink-0 flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-900 text-white/70 text-xs font-bold">
                +{countryCode}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className={inputCls}
                disabled={otpSent}
              />
            </div>

            {otpSent && (
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder={`${otpLen}-digit OTP`}
                className={inputCls}
              />
            )}

            {!otpSent ? (
              <button
                type="button"
                disabled={loading || phone.length !== 10}
                onClick={handleSendOtp}
                className="w-full mt-2 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl transition-all text-xs flex justify-center items-center h-[46px] shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full mt-2 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl transition-all text-xs flex justify-center items-center h-[46px] shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                </button>
                <button
                  type="button"
                  disabled={loading || resendIn > 0}
                  onClick={handleSendOtp}
                  className="text-xs text-white/60 hover:text-white font-semibold disabled:opacity-40"
                >
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); setVerificationId(""); setError(""); }}
                  className="text-xs text-white/50 hover:text-white font-medium"
                >
                  Change number
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <input
                type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className={inputCls}
              />
            )}
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className={inputCls}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`${inputCls} pr-10`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/75 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              disabled={loading || (!isLogin && registrationDisabled)}
              type="submit"
              className="w-full mt-2 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl transition-all text-xs flex justify-center items-center h-[46px] shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Log In" : "Register Now")}
            </button>
          </form>
        )}

        {showSocial && authMode === "email" && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-zinc-900" />
              <span className="text-white/70 text-xs font-semibold">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>

            <div className="flex flex-col gap-3">
              {settings.googleClientId && (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={socialLoading !== null}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-zinc-950 border border-zinc-800 text-white font-semibold rounded-xl text-sm hover:border-zinc-600 hover:bg-zinc-900 transition-all disabled:opacity-50"
                >
                  {socialLoading === "google" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span id="google-btn-inner">Continue with Google</span>
                </button>
              )}

              {settings.appleClientId && (
                <button
                  onClick={handleAppleSignIn}
                  disabled={socialLoading !== null}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-zinc-300 text-black font-semibold rounded-xl text-sm hover:bg-zinc-100 transition-all disabled:opacity-50"
                >
                  {socialLoading === "apple" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                    </svg>
                  )}
                  Continue with Apple
                </button>
              )}
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-900/60 text-center">
          <p className="text-white/75 text-xs font-medium">
            {isLogin ? "New to the platform?" : "Already have an account?"}{" "}
            <Link href={isLogin ? "/register" : "/login"} className="text-primary hover:underline font-bold transition-all ml-1">
              {isLogin ? "Sign Up Free" : "Log In"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
