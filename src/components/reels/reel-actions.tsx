"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Heart, MessageCircle, Phone, Send, Share2, UserPlus } from "lucide-react";
import { ReportButton } from "@/components/reports/report-button";
import { Button } from "@/components/ui/button";

type ContactAction = "CALL" | "INQUIRY" | "WHATSAPP";

export function ReelActions({
  canFollow,
  followTargetId,
  initialFollowersCount,
  initialLikesCount,
  initialSavesCount,
  initialSharesCount,
  reelId
}: {
  canFollow?: boolean;
  followTargetId?: string | null;
  initialFollowersCount?: number;
  initialLikesCount: number;
  initialSavesCount: number;
  initialSharesCount: number;
  reelId: string;
}) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount ?? 0);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [saved, setSaved] = useState(false);
  const [savesCount, setSavesCount] = useState(initialSavesCount);
  const [sharesCount, setSharesCount] = useState(initialSharesCount);
  const [leadOpen, setLeadOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("I am interested in this property reel.");
  const [status, setStatus] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const viewed = useRef(false);

  const postInteraction = useCallback(async (action: "like" | "save" | "share" | "view") => {
    const response = await fetch(`/api/reels/${reelId}/${action}`, {
      method: "POST"
    });

    if (response.status === 401) {
      window.location.href = `/auth?next=/reels/${reelId}`;
      return null;
    }

    if (!response.ok) return null;
    return response.json();
  }, [reelId]);

  async function handleLike() {
    setBusyAction("like");
    const data = await postInteraction("like");
    setBusyAction(null);
    if (!data) return;
    setLiked(data.liked);
    setLikesCount(data.likesCount);
  }

  async function handleSave() {
    setBusyAction("save");
    const data = await postInteraction("save");
    setBusyAction(null);
    if (!data) return;
    setSaved(data.saved);
    setSavesCount(data.savesCount);
  }

  async function handleShare() {
    setBusyAction("share");
    const data = await postInteraction("share");
    setBusyAction(null);
    if (!data) return;

    const url = `${window.location.origin}/reels/${reelId}`;
    if (navigator.share) {
      await navigator.share({ title: "HomeZone property reel", url }).catch(() => null);
    } else {
      await navigator.clipboard?.writeText(url).catch(() => null);
    }

    setSharesCount(data.sharesCount);
  }

  async function handleFollow() {
    if (!followTargetId) return;

    setBusyAction("follow");
    const response = await fetch(`/api/profiles/${followTargetId}/follow`, {
      method: "POST"
    });
    setBusyAction(null);

    if (response.status === 401) {
      window.location.href = `/auth?next=/reels/${reelId}`;
      return;
    }

    if (!response.ok) {
      setStatus("Could not update follow status.");
      return;
    }

    const data = await response.json();
    setFollowing(data.following);
    setFollowersCount(data.followersCount);
  }

  async function submitLead(contactAction: ContactAction) {
    if (!name.trim() || !phone.trim()) {
      setLeadOpen(true);
      setStatus("Add your name and phone to create a lead.");
      return;
    }

    setBusyAction(contactAction);
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
    setBusyAction(null);

    if (response.status === 401) {
      window.location.href = `/auth?next=/reels/${reelId}`;
      return;
    }

    setStatus(response.ok ? "Lead created from reel." : "Could not create lead from this reel.");
  }

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void postInteraction("view");
  }, [postInteraction]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={busyAction === "like"} onClick={handleLike} size="sm" variant="secondary">
          <Heart className="h-4 w-4" />
          {liked ? "Unlike" : "Like"} {likesCount}
        </Button>
        <Button disabled={busyAction === "save"} onClick={handleSave} size="sm" variant="secondary">
          <Bookmark className="h-4 w-4" />
          {saved ? "Saved" : "Save"} {savesCount}
        </Button>
        <Button disabled={busyAction === "share"} onClick={handleShare} size="sm" variant="secondary">
          <Share2 className="h-4 w-4" />
          Share {sharesCount}
        </Button>
        {canFollow && followTargetId ? (
          <Button disabled={busyAction === "follow"} onClick={handleFollow} size="sm" variant="secondary">
            <UserPlus className="h-4 w-4" />
            {following ? "Following" : "Follow"} {followersCount}
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white/10 p-3">
        {leadOpen ? (
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
          <Button disabled={busyAction === "CALL"} onClick={() => submitLead("CALL")} size="sm">
            <Phone className="h-4 w-4" />
            Call
          </Button>
          <Button disabled={busyAction === "WHATSAPP"} onClick={() => submitLead("WHATSAPP")} size="sm">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button disabled={busyAction === "INQUIRY"} onClick={() => submitLead("INQUIRY")} size="sm">
            <Send className="h-4 w-4" />
            Inquiry
          </Button>
        </div>
      </div>

      <ReportButton entityId={reelId} entityType="reel" size="sm" />

      {status ? (
        <p className="rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
          {status}
        </p>
      ) : null}
    </div>
  );
}
