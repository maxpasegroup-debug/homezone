"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  Share2,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ReelItem = {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  viewsCount: number;
  likesCount: number;
  savesCount: number;
  sharesCount: number;
  leadsCount: number;
  property: {
    id: string;
    title: string;
    city: string;
    locality: string | null;
    owner: {
      fullName: string | null;
      id: string;
      role: string;
      verificationStatus: string;
    } | null;
  } | null;
};

type FeedResponse = {
  nextCursor: string | null;
  reels: ReelItem[];
};

type ContactAction = "CALL" | "INQUIRY" | "WHATSAPP";

export function ReelsFeed({
  initialNextCursor,
  initialReels
}: {
  initialNextCursor: string | null;
  initialReels: ReelItem[];
}) {
  const [reels, setReels] = useState(initialReels);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeLeadReel, setActiveLeadReel] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("I am interested in this property reel.");
  const [status, setStatus] = useState("");
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set());
  const [followedProfiles, setFollowedProfiles] = useState<Set<string>>(new Set());
  const viewed = useRef(new Set<string>());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function postInteraction(reelId: string, action: "like" | "save" | "share" | "view") {
    const response = await fetch(`/api/reels/${reelId}/${action}`, {
      method: "POST"
    });

    if (response.status === 401) {
      window.location.href = `/auth?next=/reels`;
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    const response = await fetch(`/api/reels?cursor=${nextCursor}&take=6`);
    setLoadingMore(false);

    if (!response.ok) return;

    const data = (await response.json()) as FeedResponse;
    setReels((current) => [...current, ...data.reels]);
    setNextCursor(data.nextCursor);
  }

  async function handleLike(reelId: string) {
    const data = await postInteraction(reelId, "like");
    if (!data) return;

    setReels((current) =>
      current.map((reel) =>
        reel.id === reelId ? { ...reel, likesCount: data.likesCount } : reel
      )
    );
    setLikedReels((current) => {
      const next = new Set(current);
      if (data.liked) {
        next.add(reelId);
      } else {
        next.delete(reelId);
      }
      return next;
    });
  }

  async function handleSave(reelId: string) {
    const data = await postInteraction(reelId, "save");
    if (!data) return;

    setReels((current) =>
      current.map((reel) =>
        reel.id === reelId ? { ...reel, savesCount: data.savesCount } : reel
      )
    );
    setSavedReels((current) => {
      const next = new Set(current);
      if (data.saved) {
        next.add(reelId);
      } else {
        next.delete(reelId);
      }
      return next;
    });
  }

  async function handleShare(reelId: string) {
    const data = await postInteraction(reelId, "share");
    if (!data) return;

    const url = `${window.location.origin}/reels`;
    if (navigator.share) {
      await navigator.share({ title: "HomeZone property reel", url }).catch(() => null);
    } else {
      await navigator.clipboard?.writeText(url).catch(() => null);
    }

    setReels((current) =>
      current.map((reel) =>
        reel.id === reelId ? { ...reel, sharesCount: data.sharesCount } : reel
      )
    );
  }

  async function handleFollow(profileId: string) {
    const response = await fetch(`/api/profiles/${profileId}/follow`, {
      method: "POST"
    });

    if (response.status === 401) {
      window.location.href = "/auth?next=/reels";
      return;
    }

    if (!response.ok) {
      setStatus("Could not update follow status.");
      return;
    }

    const data = await response.json();
    setFollowedProfiles((current) => {
      const next = new Set(current);
      if (data.following) {
        next.add(profileId);
      } else {
        next.delete(profileId);
      }
      return next;
    });
    setStatus(data.following ? "Profile followed." : "Profile unfollowed.");
  }

  async function submitLead(reelId: string, contactAction: ContactAction) {
    if (!name.trim() || !phone.trim()) {
      setActiveLeadReel(reelId);
      setStatus("Add your name and phone to create a lead.");
      return;
    }

    const response = await fetch(`/api/reels/${reelId}/lead`, {
      body: JSON.stringify({
        contactAction,
        message,
        name,
        phone
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (response.status === 401) {
      window.location.href = "/auth?next=/reels";
      return;
    }

    if (!response.ok) {
      setStatus("Could not create lead from this reel.");
      return;
    }

    setStatus("Lead created from reel.");
    setReels((current) =>
      current.map((reel) =>
        reel.id === reelId ? { ...reel, leadsCount: reel.leadsCount + 1 } : reel
      )
    );
  }

  useEffect(() => {
    reels.forEach((reel) => {
      if (viewed.current.has(reel.id)) return;
      viewed.current.add(reel.id);
      void postInteraction(reel.id, "view").then((data) => {
        if (!data) return;
        setReels((current) =>
          current.map((item) =>
            item.id === reel.id ? { ...item, viewsCount: data.viewsCount } : item
          )
        );
      });
    });
  }, [reels]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        void loadMore();
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  return (
    <div className="mt-10 space-y-6">
      {reels.map((reel) => {
        const owner = reel.property?.owner;
        const canFollow = owner?.role === "BROKER" || owner?.role === "BUILDER";

        return (
          <Card className="overflow-hidden bg-slate-950 text-white shadow-soft" key={reel.id}>
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.78fr)_minmax(320px,0.42fr)]">
              <video
                className="aspect-[9/14] w-full bg-black object-cover lg:max-h-[720px]"
                controls
                poster={reel.thumbnailUrl ?? undefined}
                src={reel.videoUrl}
              />
              <div className="flex flex-col justify-between p-5 sm:p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                    {reel.property?.city ?? "Property Reel"}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{reel.title}</h2>
                  <p className="mt-2 text-sm text-white/68">
                    {reel.property
                      ? [reel.property.locality, reel.property.city].filter(Boolean).join(", ")
                      : "Reel-first property discovery"}
                  </p>
                  {owner ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                        {owner.fullName ?? `${owner.role} profile`}
                      </span>
                      <Link
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/15"
                        href={{
                          pathname: "/creators/[id]",
                          query: {
                            id: owner.id
                          }
                        }}
                      >
                        Creator profile
                      </Link>
                      {canFollow ? (
                        <Button
                          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                          onClick={() => handleFollow(owner.id)}
                          size="sm"
                          variant="outline"
                        >
                          <UserPlus className="h-4 w-4" />
                          {followedProfiles.has(owner.id) ? "Following" : "Follow"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-white/72 sm:grid-cols-5 lg:grid-cols-2">
                    <span className="flex items-center gap-1 rounded-2xl bg-white/10 px-3 py-2">
                      <Eye className="h-4 w-4" />
                      {reel.viewsCount}
                    </span>
                    <span className="rounded-2xl bg-white/10 px-3 py-2">{reel.leadsCount} leads</span>
                    <span className="rounded-2xl bg-white/10 px-3 py-2">{reel.likesCount} likes</span>
                    <span className="rounded-2xl bg-white/10 px-3 py-2">{reel.savesCount} saves</span>
                    <span className="rounded-2xl bg-white/10 px-3 py-2">{reel.sharesCount} shares</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleLike(reel.id)} size="sm" variant="secondary">
                      <Heart className="h-4 w-4" />
                      {likedReels.has(reel.id) ? "Unlike" : "Like"}
                    </Button>
                    <Button onClick={() => handleSave(reel.id)} size="sm" variant="secondary">
                      <Bookmark className="h-4 w-4" />
                      {savedReels.has(reel.id) ? "Saved" : "Save"}
                    </Button>
                    <Button onClick={() => handleShare(reel.id)} size="sm" variant="secondary">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>

                  <Link
                    className="inline-flex text-sm font-bold text-white/78 hover:text-white"
                    href={{
                      pathname: "/reels/[id]",
                      query: {
                        id: reel.id
                      }
                    }}
                  >
                    Open reel detail
                  </Link>

                  <div className="rounded-2xl bg-white/10 p-3">
                    {activeLeadReel === reel.id ? (
                      <div className="mb-3 grid gap-2">
                        <input
                          className="h-10 rounded-xl border border-white/10 bg-white px-3 text-sm font-semibold text-slate-950 outline-none"
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Your name"
                          value={name}
                        />
                        <input
                          className="h-10 rounded-xl border border-white/10 bg-white px-3 text-sm font-semibold text-slate-950 outline-none"
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="Phone"
                          value={phone}
                        />
                        <textarea
                          className="min-h-20 rounded-xl border border-white/10 bg-white p-3 text-sm font-semibold text-slate-950 outline-none"
                          onChange={(event) => setMessage(event.target.value)}
                          value={message}
                        />
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button onClick={() => submitLead(reel.id, "CALL")} size="sm">
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                      <Button onClick={() => submitLead(reel.id, "WHATSAPP")} size="sm">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button onClick={() => submitLead(reel.id, "INQUIRY")} size="sm">
                        <Send className="h-4 w-4" />
                        Inquiry
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {!reels.length ? (
        <Card className="p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No reels yet</h2>
          <p className="mt-3 text-muted-foreground">
            Published property reels will appear here after moderation.
          </p>
        </Card>
      ) : null}

      {status ? (
        <p className="rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-700">
          {status}
        </p>
      ) : null}

      <div ref={sentinelRef} />
      {loadingMore ? (
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-violet-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading more reels
        </p>
      ) : null}
    </div>
  );
}
