"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreatorFollowButton({
  initialFollowersCount,
  profileId
}: {
  initialFollowersCount: number;
  profileId: string;
}) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function toggleFollow() {
    setLoading(true);
    setStatus("");

    const response = await fetch(`/api/profiles/${profileId}/follow`, {
      method: "POST"
    });

    setLoading(false);

    if (response.status === 401) {
      window.location.href = `/auth?next=/creators/${profileId}`;
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

  return (
    <div>
      <Button disabled={loading} onClick={toggleFollow}>
        <UserPlus className="h-4 w-4" />
        {following ? "Following" : "Follow"} {followersCount}
      </Button>
      {status ? (
        <p className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
          {status}
        </p>
      ) : null}
    </div>
  );
}
