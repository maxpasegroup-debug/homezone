import {
  Bot,
  Building2,
  Camera,
  ChartNoAxesCombined,
  CircleDollarSign,
  Clapperboard,
  Compass,
  Home,
  LayoutDashboard,
  Map,
  Megaphone,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench
} from "lucide-react";

export const ecosystemModules = [
  {
    title: "AI Companion",
    route: "/search",
    status: "Core",
    text: "Guides every user through search, explanation, comparison, and next steps.",
    icon: Bot
  },
  {
    title: "Marketplace",
    route: "/",
    status: "Discovery",
    text: "Buy, sell, rent, and invest without a crowded portal experience.",
    icon: Home
  },
  {
    title: "Property Reels",
    route: "/#reels",
    status: "Video",
    text: "Short-form property discovery built for mobile-first users.",
    icon: Clapperboard
  },
  {
    title: "HomeZone Studio",
    route: "/studio",
    status: "Revenue",
    text: "Photography, drone, walkthroughs, reels, brochures, and ads.",
    icon: Camera
  },
  {
    title: "HomeZone Pro",
    route: "/pro",
    status: "CRM",
    text: "Broker leads, pipeline, AI scoring, and WhatsApp automation.",
    icon: UsersRound
  },
  {
    title: "Builder Hub",
    route: "/builder",
    status: "B2B",
    text: "Project showcase, campaigns, landing pages, media, and AI reports.",
    icon: Building2
  },
  {
    title: "Services",
    route: "/services",
    status: "After-sale",
    text: "Verified legal, loans, interiors, movers, solar, and home services.",
    icon: Wrench
  },
  {
    title: "Investment Engine",
    route: "/invest",
    status: "Intelligence",
    text: "Scores areas, yields, trends, hotspots, and infrastructure impact.",
    icon: ChartNoAxesCombined
  },
  {
    title: "Life Map",
    route: "/life-map",
    status: "Unique",
    text: "Recommends areas and property types based on real life needs.",
    icon: Compass
  },
  {
    title: "Analyzer",
    route: "/analyzer",
    status: "Trust",
    text: "Property health reports with score, value, risk, rental, and legal notes.",
    icon: ShieldCheck
  }
];

export const ecosystemMetrics = [
  {
    label: "User journeys",
    value: "6",
    icon: Map
  },
  {
    label: "Revenue engines",
    value: "5",
    icon: CircleDollarSign
  },
  {
    label: "AI decision layers",
    value: "7",
    icon: Sparkles
  },
  {
    label: "Business dashboards",
    value: "3",
    icon: LayoutDashboard
  }
];

export const operatingSystemFlows = [
  {
    title: "Buyer Journey",
    steps: ["Talk to AI", "Watch reels", "Analyze property", "Book services"],
    icon: Home
  },
  {
    title: "Owner Journey",
    steps: ["Create listing", "Book Studio", "Run campaign", "Manage inquiries"],
    icon: Megaphone
  },
  {
    title: "Broker Journey",
    steps: ["Capture leads", "Score priority", "Automate follow-ups", "Close deals"],
    icon: UsersRound
  },
  {
    title: "Builder Journey",
    steps: ["Showcase project", "Launch campaign", "Generate leads", "Read AI reports"],
    icon: Building2
  }
];

export const launchRoadmap = [
  "Connect Supabase auth, profiles, listings, leads, and service requests.",
  "Add WhatsApp OTP verification and gated dashboard/contact actions.",
  "Integrate OpenAI for search parsing, assistant replies, analyzer reports, and creative generation.",
  "Add Cloudinary/Supabase Storage for property images, reels, documents, and Studio assets.",
  "Connect payments for Pro, Studio, Builder, and service marketplace transactions."
];

export const ecosystemPrinciples = [
  "Public browsing stays open.",
  "Serious actions require WhatsApp-verified account creation.",
  "AI explains decisions in simple language.",
  "Video and voice remain first-class interactions.",
  "Dashboards stay focused, not crowded."
];
