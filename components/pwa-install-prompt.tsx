"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY_DISMISSED_UNTIL = "ecofresh_pwa_install_dismissed_until";
const STORAGE_KEY_INSTALLED = "ecofresh_pwa_installed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissedActive(): boolean {
  try {
    const dismissedUntilStr = localStorage.getItem(STORAGE_KEY_DISMISSED_UNTIL);
    if (!dismissedUntilStr) return false;
    const dismissedUntil = parseInt(dismissedUntilStr, 10);
    return !isNaN(dismissedUntil) && dismissedUntil > Date.now();
  } catch {
    return false;
  }
}

function isPermanentlyInstalled(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY_INSTALLED) === "true") {
      return true;
    }
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Register Service Worker safely in production
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // SW registration ignored in unsupported environments
        });
    }

    // 2. Check if already installed
    if (isPermanentlyInstalled()) {
      setIsInstalled(true);
      return;
    }

    // 3. Check dismissal in localStorage (7-day rule)
    if (isDismissedActive()) {
      setIsDismissed(true);
      return;
    }

    // 4. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isIosDevice && isSafari && !isStandalone) {
      setIsIos(true);
      setIsDismissed(false);
    }

    // 5. Listen for beforeinstallprompt on Chromium (Windows / Android / Mac)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only display if NOT currently dismissed and NOT installed
      if (!isDismissedActive() && !isPermanentlyInstalled()) {
        setIsDismissed(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 6. Listen for successful install event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      } catch {
        // ignore
      }
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        try {
          localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
        } catch {
          // ignore
        }
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(!showIosGuide);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      const dismissedUntil = Date.now() + SEVEN_DAYS_MS;
      localStorage.setItem(STORAGE_KEY_DISMISSED_UNTIL, dismissedUntil.toString());
    } catch {
      // ignore
    }
  };

  // Do not render if not mounted, already installed, dismissed, or no install capability
  if (!mounted || isInstalled || isDismissed) {
    return null;
  }

  // Only show if deferredPrompt exists OR if on iOS Safari
  if (!deferredPrompt && !isIos) {
    return null;
  }

  return (
    <aside
      aria-label="تثبيت تطبيق إيكو فريش"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden"
      dir="rtl"
    >
      <div className="rounded-2xl border-2 border-emerald-600/40 bg-[#012d1d] text-white p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                تثبيت تطبيق EcoFresh
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-md">
                  PWA
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                استخدم النظام كتطبيق مستقل على جهازك لتجربة أسرع بدون المتصفح.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="إغلاق"
            aria-label="إغلاق إشعار التثبيت"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* iOS Step-by-Step Instructions */}
        {isIos && showIosGuide && (
          <div className="mt-3 p-3 bg-emerald-950/80 rounded-xl border border-emerald-500/30 text-xs text-emerald-100 space-y-1.5 animate-in fade-in duration-200">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-cyan-300" />
              طريقة التثبيت على iPhone / iPad:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-200">
              <li>اضغط على زر المشاركة (Share) أسفل الشاشة.</li>
              <li>اختر «إضافة إلى الصفحة الرئيسية» (Add to Home Screen).</li>
              <li>اضغط «إضافة» (Add) في الزاوية العلوية.</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-emerald-800/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-emerald-200 hover:text-white hover:bg-white/10 h-8 px-3"
          >
            لاحقاً
          </Button>

          <Button
            size="sm"
            onClick={handleInstallClick}
            className="bg-emerald-500 hover:bg-emerald-400 text-[#012d1d] font-bold text-xs h-8 px-4 gap-1.5 shadow-sm"
          >
            {isIos ? (
              <>
                <Share className="h-3.5 w-3.5" />
                كيفية التثبيت
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                تثبيت الآن
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
