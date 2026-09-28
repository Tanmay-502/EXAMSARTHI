import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AccessibilityProvider } from "@/lib/accessibility/AccessibilityProvider";
import { VoiceProvider } from "@/lib/voice/VoiceProvider";
import { GlobalVoiceAssistant } from "@/components/voice/GlobalVoiceAssistant";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";

import { MotionConfig } from "framer-motion";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EXAMSAARTHI V2",
  description: "Accessible examination platform",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    import type { CSSProperties } from "react";

<html lang="en" style={{ "--voice-dock-height": "56px" } as CSSProperties}>
      <body className={`${inter.className} antialiased dark`} style={{ paddingBottom: "var(--voice-dock-height)" }}>
        <MotionConfig reducedMotion="user">
          <I18nProvider>
            <AccessibilityProvider>
              <VoiceProvider>
                <GlobalVoiceAssistant>
                  <VoiceOverlay />
                  <ServiceWorkerRegistration />
                  <div data-voice-dock-content="true" className="min-h-screen">
                    {children}
                  </div>
                </GlobalVoiceAssistant>
              </VoiceProvider>
            </AccessibilityProvider>
          </I18nProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
