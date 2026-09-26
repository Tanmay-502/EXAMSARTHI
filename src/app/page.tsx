import { VoiceGateway } from "@/components/voice/VoiceGateway";

export default function Home() {
  return (
    <main id="main-content" className="flex flex-col items-center justify-center flex-1 w-full h-full">
      <VoiceGateway />
    </main>
  );
}
