import type { PaymentProduct } from "@prisma/client";
import {
  BadgeIndianRupee,
  Camera,
  Clapperboard,
  FileText,
  Megaphone,
  Mic2,
  Paintbrush,
  Plane,
  Share2,
  Sofa,
  Sparkles,
  Youtube
} from "lucide-react";

export type StudioService = {
  addOns: string[];
  deliveryTime: string;
  description: string;
  icon: typeof Camera;
  price: string;
  priceAmount: number;
  product: PaymentProduct;
  samples: string[];
  title: string;
};

export const studioServices: StudioService[] = [
  {
    addOns: ["Twilight shoot", "Extra edited photos", "Same-day delivery"],
    deliveryTime: "2-3 days",
    description: "Premium interior, exterior, amenity, and lifestyle photos for listings, ads, and brochures.",
    icon: Camera,
    price: "From Rs 2,999",
    priceAmount: 299900,
    product: "STUDIO_PHOTOGRAPHY",
    samples: [
      "Luxury villa exterior",
      "Apartment interior",
      "Amenity gallery"
    ],
    title: "Property Photography"
  },
  {
    addOns: ["Boundary highlight", "Location flyover", "Infra map overlay"],
    deliveryTime: "3-5 days",
    description: "Aerial photography for villas, land, commercial properties, and builder projects.",
    icon: Plane,
    price: "From Rs 7,999",
    priceAmount: 799900,
    product: "STUDIO_DRONE",
    samples: ["Land parcel aerial", "Villa community", "Road frontage"],
    title: "Drone Photography"
  },
  {
    addOns: ["Voice-over", "Subtitles", "Vertical reel cutdowns"],
    deliveryTime: "5-7 days",
    description: "Guided walkthrough video optimized for WhatsApp, YouTube, reels, and lead campaigns.",
    icon: Clapperboard,
    price: "From Rs 5,999",
    priceAmount: 599900,
    product: "STUDIO_VIDEOGRAPHY",
    samples: ["Villa walkthrough", "Apartment tour", "Commercial space tour"],
    title: "Walkthrough Video"
  },
  {
    addOns: ["Regional language script", "AI voice-over", "Caption pack"],
    deliveryTime: "2-4 days",
    description: "AI-assisted short video created from photos, clips, listing details, and marketing hooks.",
    icon: Sparkles,
    price: "From Rs 2,999",
    priceAmount: 299900,
    product: "STUDIO_REELS",
    samples: ["Photo-to-video reel", "Investment pitch", "Rental promo"],
    title: "AI Video"
  },
  {
    addOns: ["Print-ready PDF", "WhatsApp brochure", "Investor version"],
    deliveryTime: "1-2 days",
    description: "Elegant AI brochure with property highlights, pricing, amenities, location, and CTA.",
    icon: FileText,
    price: "From Rs 999",
    priceAmount: 99900,
    product: "STUDIO_BROCHURE",
    samples: ["Villa brochure", "Land brochure", "Builder project PDF"],
    title: "AI Brochure"
  },
  {
    addOns: ["Thumbnail design", "Listing banner", "Premium badge kit"],
    deliveryTime: "2-3 days",
    description: "Premium listing visual design for stronger first impressions across HomeZone and social channels.",
    icon: Paintbrush,
    price: "From Rs 2,499",
    priceAmount: 249900,
    product: "STUDIO_DESIGN",
    samples: ["Listing cover", "Ad banner", "Thumbnail set"],
    title: "Premium Listing Design"
  },
  {
    addOns: ["10-post pack", "Story templates", "Malayalam captions"],
    deliveryTime: "3-5 days",
    description: "Social creatives, captions, reels hooks, thumbnails, and WhatsApp share assets.",
    icon: Share2,
    price: "From Rs 4,999",
    priceAmount: 499900,
    product: "STUDIO_DESIGN",
    samples: ["Instagram carousel", "Story pack", "WhatsApp creative"],
    title: "Social Media Package"
  },
  {
    addOns: ["Host intro", "Area explainer", "Lead form link"],
    deliveryTime: "7-10 days",
    description: "HomeZone media feature for standout properties, projects, and investment opportunities.",
    icon: Youtube,
    price: "From Rs 14,999",
    priceAmount: 1499900,
    product: "STUDIO_VIDEOGRAPHY",
    samples: ["Property spotlight", "Builder feature", "Area investment video"],
    title: "YouTube Feature"
  },
  {
    addOns: ["Audience setup", "Lead form", "Creative testing"],
    deliveryTime: "2-4 days",
    description: "Meta campaign setup for property lead generation using existing property creatives.",
    icon: Megaphone,
    price: "From Rs 4,999",
    priceAmount: 499900,
    product: "STUDIO_ADS",
    samples: ["Lead ad setup", "Creative variants", "Campaign checklist"],
    title: "Meta Ads Setup"
  },
  {
    addOns: ["Keyword plan", "Landing page review", "Call extension setup"],
    deliveryTime: "2-4 days",
    description: "Google Ads setup for search visibility and high-intent property inquiries.",
    icon: BadgeIndianRupee,
    price: "From Rs 4,999",
    priceAmount: 499900,
    product: "STUDIO_ADS",
    samples: ["Search campaign", "Keyword sheet", "Conversion checklist"],
    title: "Google Ads Setup"
  },
  {
    addOns: ["Furniture style choice", "Before-after creative", "Room labels"],
    deliveryTime: "2-3 days",
    description: "Virtually stage empty rooms with tasteful furniture and buyer-friendly interior styling.",
    icon: Sofa,
    price: "From Rs 3,999",
    priceAmount: 399900,
    product: "STUDIO_VIRTUAL_STAGING",
    samples: ["Living room staging", "Bedroom staging", "Office staging"],
    title: "Virtual Staging"
  },
  {
    addOns: ["Malayalam voice", "Hindi voice", "Subtitle sync"],
    deliveryTime: "1-2 days",
    description: "Clear AI voice-over for videos, reels, walkthroughs, and property explainers.",
    icon: Mic2,
    price: "From Rs 1,499",
    priceAmount: 149900,
    product: "STUDIO_VOICEOVER",
    samples: ["English voice-over", "Malayalam voice-over", "Short reel narration"],
    title: "AI Voice-over"
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
    price: "Rs 4,999",
    items: ["Photography", "AI description", "WhatsApp creative"],
    product: "STUDIO_PHOTOGRAPHY" as PaymentProduct
  },
  {
    name: "Reel Launch",
    price: "Rs 9,999",
    items: ["Walkthrough video", "3 reels", "Thumbnail design"],
    product: "STUDIO_REELS" as PaymentProduct
  },
  {
    name: "Builder Spotlight",
    price: "Custom",
    items: ["Drone shoot", "YouTube feature", "Lead campaign"],
    product: "STUDIO_DRONE" as PaymentProduct
  }
];

export function getStudioService(titleOrProduct: string) {
  return studioServices.find(
    (service) => service.title === titleOrProduct || service.product === titleOrProduct
  );
}
