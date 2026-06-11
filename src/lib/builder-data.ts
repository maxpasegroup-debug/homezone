import {
  BarChart3,
  Building2,
  CalendarClock,
  FileText,
  Globe2,
  Megaphone,
  MessageSquareText,
  MousePointerClick,
  PlaySquare,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";

export const builderProjects = [
  {
    name: "Aster Sky Villas",
    location: "Kakkanad, Kochi",
    units: "42 villas",
    inventory: "18 available",
    leads: 126,
    score: 91,
    status: "Active Campaign"
  },
  {
    name: "Urban Nest Residences",
    location: "Edappally, Kochi",
    units: "128 apartments",
    inventory: "37 available",
    leads: 214,
    score: 88,
    status: "Launch Ready"
  },
  {
    name: "Green County Plots",
    location: "Calicut Bypass",
    units: "64 plots",
    inventory: "22 available",
    leads: 73,
    score: 82,
    status: "Nurture"
  }
];

export const builderMetrics = [
  {
    label: "Active Leads",
    value: "413",
    icon: Users
  },
  {
    label: "Project Views",
    value: "18.6K",
    icon: MousePointerClick
  },
  {
    label: "Campaign ROI",
    value: "4.8x",
    icon: TrendingUp
  },
  {
    label: "Bookings Pipeline",
    value: "₹42Cr",
    icon: BarChart3
  }
];

export const builderTools = [
  {
    title: "Project Showcase",
    text: "Premium project pages with videos, amenities, floor plans, inventory, and AI summaries.",
    icon: Building2
  },
  {
    title: "Lead Generation",
    text: "Capture verified buyer leads from search, reels, campaigns, and landing pages.",
    icon: Users
  },
  {
    title: "Campaign Management",
    text: "Request Meta, Google, YouTube, and WhatsApp campaigns from one builder dashboard.",
    icon: Megaphone
  },
  {
    title: "Landing Pages",
    text: "Create focused launch pages for each project, tower, offer, or location.",
    icon: Globe2
  },
  {
    title: "Media Requests",
    text: "Book drone shoots, walkthroughs, builder interviews, and project spotlight videos.",
    icon: PlaySquare
  },
  {
    title: "AI Reports",
    text: "Get weekly lead quality, demand, pricing, and campaign performance summaries.",
    icon: Sparkles
  }
];

export const campaignRequests = [
  {
    title: "New Launch Campaign",
    channel: "Meta + Google",
    status: "Creative pending",
    icon: Megaphone
  },
  {
    title: "Builder Spotlight",
    channel: "YouTube",
    status: "Shoot scheduled",
    icon: PlaySquare
  },
  {
    title: "Investor Landing Page",
    channel: "Web",
    status: "Draft ready",
    icon: FileText
  },
  {
    title: "WhatsApp Lead Nurture",
    channel: "CRM",
    status: "Automation active",
    icon: MessageSquareText
  }
];

export const aiReportHighlights = [
  "Edappally project leads are asking mostly for 2BHK under ₹75L.",
  "Kakkanad villa campaign has strong NRI engagement after 8 PM IST.",
  "Calicut plots need more road frontage visuals to improve conversion.",
  "AI recommends a weekend site-visit push for 43 warm leads."
];

export const builderTasks = [
  {
    title: "Upload updated floor plans",
    due: "Today",
    icon: FileText
  },
  {
    title: "Approve launch creatives",
    due: "Tomorrow",
    icon: Megaphone
  },
  {
    title: "Confirm drone shoot slot",
    due: "Friday",
    icon: CalendarClock
  }
];
