"use client";

import { useState } from "react";
import { Languages, Mic, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VoiceInputButton } from "@/components/voice/voice-input-button";

export function VoiceExperience() {
  const [language, setLanguage] = useState<"English" | "Malayalam" | "Hindi">("Malayalam");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchWithVoice() {
    if (!transcript) return;

    setLoading(true);
    const response = await fetch("/api/ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: transcript,
        language
      })
    });
    setLoading(false);
    const data = await response.json().catch(() => null);
    setResult(data?.explanation ?? "Could not convert voice search.");
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-800 p-8 text-white sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Mic className="h-7 w-7" />
            </div>
            <p className="mt-7 text-sm font-semibold text-white/65">
              Phase F
            </p>
            <h1 className="mt-2 text-4xl font-bold sm:text-6xl">
              Talk to find property.
            </h1>
            <p className="mt-5 leading-7 text-white/72">
              HomeZone supports browser voice input for English, Malayalam, and
              Hindi-ready property search flows.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4 text-violet-700" />
                Voice language
              </span>
              <select
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 font-semibold outline-none"
                onChange={(event) =>
                  setLanguage(event.target.value as "English" | "Malayalam" | "Hindi")
                }
                value={language}
              >
                <option>Malayalam</option>
                <option>English</option>
                <option>Hindi</option>
              </select>
            </label>

            <div className="mt-5">
              <VoiceInputButton language={language} onTranscript={setTranscript} />
            </div>

            <textarea
              className="mt-5 min-h-32 w-full rounded-[1.5rem] border border-border bg-white p-4 font-semibold outline-none"
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Your voice transcript appears here..."
              value={transcript}
            />

            <Button className="mt-5 w-full" disabled={!transcript || loading} onClick={searchWithVoice} size="lg">
              <Search className="h-4 w-4" />
              {loading ? "Searching..." : "Convert to AI Search"}
            </Button>

            {result ? (
              <div className="mt-5 rounded-[1.5rem] bg-violet-50 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
                  <Sparkles className="h-4 w-4" />
                  HomeZone understood
                </p>
                <p className="mt-3 text-lg font-bold leading-8">{result}</p>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Search by speaking", "Say what you need instead of using filters."],
          ["List by speaking", "Owners can narrate property details."],
          ["Guide by speaking", "Future OpenAI Realtime Voice can power live conversations."]
        ].map(([title, text]) => (
          <Card className="p-6 shadow-sm" key={title}>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
