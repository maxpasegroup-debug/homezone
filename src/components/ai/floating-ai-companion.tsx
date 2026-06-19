"use client";

import { useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function FloatingAICompanion() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("Is this property good for my family?");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I am HomeZone AI. Ask me about buying, selling, renting, investing, documents, price, or location fit."
    }
  ]);

  async function ask() {
    if (!input.trim()) return;

    const question = input.trim();
    setInput("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setLoading(true);

    const response = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        language: /[\u0D00-\u0D7F]/.test(question) ? "MALAYALAM" : "AUTO",
        message: question
      })
    });

    const data = await response.json().catch(() => null);
    setLoading(false);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content:
          data?.answer ??
          "HomeZone AI could not answer right now. Please try again."
      }
    ]);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="mb-4 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white shadow-soft">
          <div className="flex items-center justify-between bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-300" />
              <p className="font-bold">HomeZone AI</p>
            </div>
            <button onClick={() => setOpen(false)} title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                className={`rounded-2xl p-3 text-sm font-semibold leading-6 ${
                  message.role === "user"
                    ? "ml-8 bg-violet-600 text-white"
                    : "mr-8 bg-muted text-foreground"
                }`}
                key={`${message.role}-${index}`}
              >
                {message.content}
              </div>
            ))}
            {loading ? (
              <div className="mr-8 flex items-center gap-2 rounded-2xl bg-muted p-3 text-sm font-bold">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking
              </div>
            ) : null}
          </div>
          <div className="flex gap-2 border-t border-border p-3">
            <input
              className="h-11 min-w-0 flex-1 rounded-full bg-muted px-4 text-sm font-semibold outline-none"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") ask();
              }}
              value={input}
            />
            <Button onClick={ask} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <Button className="h-14 w-14 shadow-glow" onClick={() => setOpen(true)} size="icon">
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
