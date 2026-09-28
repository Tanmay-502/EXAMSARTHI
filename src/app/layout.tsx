import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AccessibilityProvider } from "@/lib/accessibility/AccessibilityProvider";
import { VoiceProvider } from "@/lib/voice/VoiceProvider";
import { GlobalVoiceAssistant } from "@/components/voice/GlobalVoiceAssistant";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import { MotionConfig } from "framer-motion";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-telugu" });

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
    <html lang="en" className={`${inter.variable} ${devanagari.variable} ${telugu.variable}`}>
      <body className="font-sans antialiased dark">
        <MotionConfig reducedMotion="user">
          <I18nProvider>
            <AccessibilityProvider>
              <VoiceProvider>
                <GlobalVoiceAssistant>
                  <VoiceOverlay />
                  <ServiceWorkerRegistration />
                  <AppShell>{children}</AppShell>
                </GlobalVoiceAssistant>
              </VoiceProvider>
            </AccessibilityProvider>
          </I18nProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
