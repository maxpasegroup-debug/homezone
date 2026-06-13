import Link from "next/link";
import { VoiceExperience } from "@/components/voice/voice-experience";

export default function VoicePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.14),_transparent_36%),linear-gradient(180deg,#fff_0%,#faf7ff_58%,#fff_100%)]">
      <section className="container py-10 sm:py-16">
        <Link className="text-sm font-bold text-violet-700" href="/">
          HomeZone
        </Link>
        <div className="mt-10">
          <VoiceExperience />
        </div>
      </section>
    </main>
  );
}
