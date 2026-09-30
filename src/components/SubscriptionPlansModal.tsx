import { useState, useEffect } from "react";
import { X, Crown, Check, Loader2, Sparkles, Flame, Play } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useGetWebSubscriptionPlans, useGetAppProfile, useCreateSubscriptionRazorpayOrder, useVerifySubscriptionRazorpayPayment } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export const normalizePlanKey = (name?: string) => {
  const n = String(name || "free").toLowerCase().trim();
  if (!n || n === "free" || /\bfree\b/.test(n)) return "free";
  if (n.includes("vip")) return "vip";
  if (n.includes("premium")) return "premium";
  if (n.includes("standard")) return "standard";
  if (n.includes("basic")) return "basic";
  return n;
};

export const getPlanLevel = (plan?: string) => {
  const k = normalizePlanKey(plan);
  switch (k) {
    case "vip": return 4;
    case "premium": return 3;
    case "standard": return 2;
    case "basic": return 1;
    default: return 0;
  }
};

const isUserSubscribed = (u: any): boolean => {
  if (!u) return false;
  if (u.subscription === false) return false;
  const status = String(u.subscriptionStatus || "").toLowerCase();
  const planKey = normalizePlanKey(u.subscriptionPlan);
  if (planKey === "free") return false;
  if (u.subscriptionExpiry) {
    const exp = new Date(u.subscriptionExpiry);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) return false;
  }
  return u.subscription === true || status === "active";
};

const isPlanActive = (plan: any, u: any): boolean => {
  if (!isUserSubscribed(u)) return false;
  const planId = String(plan?._id || plan?.id || "");
  const userPlanId = String(u?.subscriptionPlanId || "");
  if (userPlanId && planId && userPlanId === planId) return true;

  const planKey = normalizePlanKey(plan?.name);
  const userPlanKey = normalizePlanKey(u?.subscriptionPlan);
  return planKey !== "free" && planKey === userPlanKey;
};

const persistSubscribedUser = (user: any, planName: string, expiry?: string | Date | null) => {
  const updatedUser = {
    ...user,
    subscriptionPlan: normalizePlanKey(planName),
    subscriptionStatus: "active",
    subscription: true,
    subscriptionExpiry: expiry || null,
  };
  localStorage.setItem("appUser", JSON.stringify(updatedUser));
  localStorage.setItem("user", JSON.stringify(updatedUser));
  window.dispatchEvent(new Event("user-updated"));
  return updatedUser;
};

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
  requiredPlan?: string;
}

export default function SubscriptionPlansModal({ isOpen, onClose, onSubscribed, requiredPlan }: SubscriptionPlansModalProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { data: plansData, isLoading: loadingPlans } = useGetWebSubscriptionPlans();
  const { data: profileData } = useGetAppProfile();
  const createOrderMutation = useCreateSubscriptionRazorpayOrder();
  const verifyPaymentMutation = useVerifySubscriptionRazorpayPayment();
  const [user, setUser] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {}
  }, [isOpen]);

  const effectiveUser = profileData?.user || user;

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = (plansData?.data || []).filter((p: any) => {
    const name = String(p?.name || "").trim().toLowerCase();
    const price = Number(p?.totalPrice ?? p?.price ?? 0);
    return name !== "free" && price > 0;
  });

  const handleSubscribe = async (plan: any) => {
    if (!effectiveUser) {
      toast({
        title: "Authentication Required",
        description: "Please login first to subscribe.",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    if (isPlanActive(plan, effectiveUser)) {
      toast({
        title: "Already Subscribed",
        description: "You are already subscribed to this plan.",
      });
      return;
    }

    try {
      setSelectedPlanId(plan.id || plan._id);

      const orderData = await createOrderMutation.mutateAsync({
        planId: plan.id || plan._id,
        userId: effectiveUser.id || effectiveUser._id,
      });

      if (orderData?.alreadySubscribed) {
        toast({
          title: "Already Subscribed",
          description: "You are already subscribed to this plan.",
        });
        return;
      }

      if (orderData.isFree) {
        persistSubscribedUser(effectiveUser, plan.name);
        toast({
          title: "Subscription Successful",
          description: `Successfully subscribed to ${plan.name}! Full library unlocked.`,
        });
        if (onSubscribed) onSubscribed();
        onClose();
        return;
      }

      const res = await loadRazorpay();
      if (!res) {
        toast({ title: "Error", description: "Failed to load Razorpay SDK", variant: "destructive" });
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: settings.platformName || "Platform",
        description: `Subscription - ${plan.name}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            const verifyRes: any = await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id || plan._id,
              userId: effectiveUser.id || effectiveUser._id,
            });

            if (verifyRes?.alreadySubscribed) {
              toast({
                title: "Already Subscribed",
                description: "You are already subscribed to this plan.",
              });
              return;
            }

            persistSubscribedUser(
              effectiveUser,
              verifyRes?.subscriptionPlan || plan.name,
              verifyRes?.subscriptionExpiry || null
            );

            toast({
              title: "Subscription Successful",
              description: `Successfully subscribed to ${plan.name}! Full library unlocked.`,
            });
            if (onSubscribed) onSubscribed();
            onClose();
          } catch (verifyError: any) {
            toast({
              title: "Verification Failed",
              description: verifyError?.message || "Payment verification failed",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: effectiveUser.name,
          email: effectiveUser.email,
        },
        theme: {
          color: settings.primaryColor || "#e50914",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      toast({
        title: "Subscription",
        description: err?.message || "An error occurred during subscription.",
        variant: "destructive",
      });
    } finally {
      setSelectedPlanId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl bg-[#09090e] border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.15)] transition-all transform duration-300 animate-in fade-in zoom-in-95"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090e]/90 backdrop-blur sticky top-0 z-25">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
            <h3 className="text-foreground font-extrabold text-lg sm:text-xl tracking-tight">Choose Your Subscription Plan</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <p className="text-foreground/70 text-sm text-center max-w-lg mx-auto mb-8 leading-relaxed">
            {requiredPlan && normalizePlanKey(requiredPlan) !== "free"
              ? `This content requires an active ${normalizePlanKey(requiredPlan) === "vip" ? "VIP" : normalizePlanKey(requiredPlan).charAt(0).toUpperCase() + normalizePlanKey(requiredPlan).slice(1)} plan or higher. Select a plan below to unlock playback.`
              : "Unlock unlimited access to the entire Tataiya library. Supercharge your streaming experience with crystal-clear streaming, downloads, and zero ads."}
          </p>

          {loadingPlans ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-foreground/65 text-xs">Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan: any) => {
                const planKey = normalizePlanKey(plan.name);
                const reqKey = normalizePlanKey(requiredPlan);
                const isPremium = planKey === "premium" || planKey === "vip";
                const isReqMatch = reqKey !== "free" && planKey === reqKey;
                const isPopular = isReqMatch || plan.isPopular || (reqKey === "free" && planKey === "standard");
                const isActive = isPlanActive(plan, effectiveUser);

                return (
                  <div
                    key={plan.id || plan._id}
                    className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 border bg-zinc-950/40 hover:scale-[1.02] ${
                      isActive
                        ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-[#07130e]/60"
                        : isPopular 
                        ? "border-primary shadow-[0_0_30px_rgba(229,9,20,0.1)] md:-translate-y-2 bg-[#0d070b]/60" 
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Active / Popular / Required Badge */}
                    {isActive ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1 border border-emerald-400/40">
                        <Check className="w-3 h-3 text-white" /> Active Plan
                      </span>
                    ) : isReqMatch ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                        <Crown className="w-3 h-3 fill-black" /> Required Plan
                      </span>
                    ) : isPopular ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white animate-pulse" /> Popular
                      </span>
                    ) : null}

                    {/* Plan Header */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-base font-black uppercase tracking-wide ${isPremium ? 'text-amber-400' : 'text-foreground'}`}>
                            {plan.name}
                          </h4>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        {isPremium && <Sparkles className="w-4 h-4 text-amber-400" />}
                      </div>

                      {/* Plan Description */}
                      <p className="text-foreground/70 text-xs min-h-[36px] mb-4 leading-normal">
                        {plan.description}
                      </p>

                      {/* Plan Price */}
                      <div className="flex items-baseline gap-1 mt-1 mb-2">
                        <span className="text-3xl font-black text-foreground">{settings?.currencyPosition === 'before' ? (settings?.currencySymbol || '₹') + (plan.totalPrice ?? plan.price) : (plan.totalPrice ?? plan.price) + ' ' + (settings?.currencySymbol || '₹')}</span>
                        <span className="text-sm font-medium text-foreground/70">/ {plan.duration || 'month'}</span>
                      </div>

                      {/* Plan Features */}
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Access all premium content</span>
                        </li>
                        {plan.level >= 2 && (
                          <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>HD & 4K streaming quality</span>
                          </li>
                        )}
                        <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Valid for <strong className="text-foreground font-semibold">{plan.durationValue} {plan.duration}</strong></span>
                        </li>
                        {plan.discount > 0 && (
                          <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                            <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span><strong className="text-amber-400">{plan.discount}% discount</strong> applied</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Subscribe Button */}
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          toast({
                            title: "Already Subscribed",
                            description: "You are already subscribed to this plan.",
                          });
                        }}
                        className="w-full py-3 rounded-xl font-bold transition-all duration-300 text-sm tracking-wide flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer active:scale-95 shadow-md shadow-emerald-950/20"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={createOrderMutation.isPending && selectedPlanId === (plan.id || plan._id)}
                        className={`w-full py-3 rounded-xl font-bold transition-all duration-300 text-sm tracking-wide active:scale-95 flex items-center justify-center gap-2 ${
                          isPopular
                            ? "bg-primary text-white hover:bg-primary/90 shadow-[0_8px_20px_rgba(229,9,20,0.3)]"
                            : "bg-zinc-800 text-foreground hover:bg-zinc-700 hover:text-foreground"
                        } disabled:opacity-50 disabled:pointer-events-none cursor-pointer`}
                      >
                        {createOrderMutation.isPending && selectedPlanId === (plan.id || plan._id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Subscribe Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
