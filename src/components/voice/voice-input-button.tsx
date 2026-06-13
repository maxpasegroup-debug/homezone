"use client";

import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const languageMap = {
  English: "en-IN",
  Malayalam: "ml-IN",
  Hindi: "hi-IN"
};

export function VoiceInputButton({
  language = "English",
  onTranscript
}: {
  language?: keyof typeof languageMap;
  onTranscript: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageMap[language];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      setError(event.error || "Voice input failed.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    setError("");
    setListening(true);
    recognition.start();
  }

  return (
    <div className="space-y-2">
      <Button onClick={startListening} type="button" variant={listening ? "secondary" : "default"}>
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {listening ? "Listening..." : `Speak ${language}`}
      </Button>
      {error ? (
        <p className="text-xs font-bold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
