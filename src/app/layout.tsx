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
    <html lang="en">
      <body className={`${inter.className} antialiased dark`}>
        <MotionConfig reducedMotion="user">
          <I18nProvider>
            <AccessibilityProvider>
              <VoiceProvider>
                <GlobalVoiceAssistant>
                  <VoiceOverlay />
                  <ServiceWorkerRegistration />
                  {children}
                </GlobalVoiceAssistant>
              </VoiceProvider>
            </AccessibilityProvider>
          </I18nProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
