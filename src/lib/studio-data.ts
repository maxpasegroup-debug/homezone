import {
  BadgeIndianRupee,
  Camera,
  Clapperboard,
  FileText,
  Megaphone,
  Plane,
  Share2,
  Sparkles
} from "lucide-react";

export const studioServices = [
  {
    title: "Photography",
    price: "From ₹2,999",
    icon: Camera,
    text: "Premium property photos for listings, ads, and brochures."
  },
  {
    title: "Drone Shoot",
    price: "From ₹7,999",
    icon: Plane,
    text: "Aerial visuals for villas, land, commercial, and builder projects."
  },
  {
    title: "Walkthrough Video",
    price: "From ₹5,999",
    icon: Clapperboard,
    text: "Guided video tour optimized for WhatsApp, reels, and YouTube."
  },
  {
    title: "AI Brochure",
    price: "From ₹999",
    icon: FileText,
    text: "Instant brochure copy, highlights, layout direction, and CTA."
  },
  {
    title: "Reels Creation",
    price: "From ₹1,499",
    icon: Share2,
    text: "Short-form property reels with hooks and lead-focused captions."
  },
  {
    title: "Meta + Google Ads",
    price: "From ₹4,999",
    icon: Megaphone,
    text: "Campaign setup request for lead generation and property promotion."
  }
];

export const creativeOutputs = [
  {
    title: "Property Description",
    icon: Sparkles,
    text: "AI writes a clean, emotional, buyer-friendly listing description."
  },
  {
    title: "WhatsApp Message",
    icon: BadgeIndianRupee,
    text: "Short lead message with price, location, key benefit, and callback CTA."
  },
  {
    title: "Reel Script",
    icon: Clapperboard,
    text: "15-second hook, scene order, voiceover, and closing contact prompt."
  }
];

export const studioPackages = [
  {
    name: "Starter Listing",
    price: "₹4,999",
    items: ["Photography", "AI description", "WhatsApp creative"]
  },
  {
    name: "Reel Launch",
    price: "₹9,999",
    items: ["Walkthrough video", "3 reels", "Thumbnail design"]
  },
  {
    name: "Builder Spotlight",
    price: "Custom",
    items: ["Drone shoot", "YouTube feature", "Lead campaign"]
  }
];
