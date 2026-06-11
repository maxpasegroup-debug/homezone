import {
  Baby,
  BriefcaseBusiness,
  Building2,
  Car,
  GraduationCap,
  HeartHandshake,
  Home,
  Landmark,
  Leaf,
  MapPinned,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Umbrella,
  UsersRound,
  Waves
} from "lucide-react";

export const lifeQuestions = [
  {
    key: "family",
    label: "Life stage",
    options: ["Single", "Couple", "Family with kids", "Joint family", "Retirement planning"],
    icon: UsersRound
  },
  {
    key: "work",
    label: "Work style",
    options: ["Office commute", "Hybrid work", "Work from home", "Business owner", "NRI investor"],
    icon: BriefcaseBusiness
  },
  {
    key: "priority",
    label: "Main priority",
    options: ["Schools nearby", "Peaceful living", "Rental income", "Future resale", "Luxury lifestyle"],
    icon: Sparkles
  },
  {
    key: "timeline",
    label: "Timeline",
    options: ["Move now", "3-6 months", "1 year", "Long-term investment"],
    icon: MapPinned
  }
];

export const lifeAreas = [
  {
    area: "Kakkanad",
    city: "Kochi",
    score: 93,
    bestFor: "IT families, school access, rental demand",
    propertyTypes: ["3BHK villa", "2/3BHK apartment", "Gated community"],
    reasons: ["Workplace access", "Strong rentals", "Family services"],
    icon: Building2
  },
  {
    area: "Edappally",
    city: "Kochi",
    score: 89,
    bestFor: "Metro access, shopping, hospital access",
    propertyTypes: ["Apartment", "Luxury flat", "Rental unit"],
    reasons: ["Metro nearby", "Retail access", "High convenience"],
    icon: Car
  },
  {
    area: "Ayyanthole",
    city: "Thrissur",
    score: 85,
    bestFor: "Peaceful family living and retirement",
    propertyTypes: ["Independent house", "Villa", "Residential plot"],
    reasons: ["Calm locality", "Civic access", "Long-term comfort"],
    icon: Leaf
  },
  {
    area: "Ramanattukara",
    city: "Calicut",
    score: 82,
    bestFor: "Land banking and highway growth",
    propertyTypes: ["Residential land", "Commercial land", "Farm land"],
    reasons: ["Highway corridor", "Future growth", "Land appreciation"],
    icon: TrendingUp
  }
];

export const lifeSignals = [
  {
    title: "Family Comfort",
    text: "Schools, hospitals, groceries, safety, and travel effort.",
    icon: HeartHandshake
  },
  {
    title: "Kids Ready",
    text: "School access, play areas, low traffic, and future space needs.",
    icon: Baby
  },
  {
    title: "Work Commute",
    text: "Office distance, transit, road quality, and peak-hour friction.",
    icon: BriefcaseBusiness
  },
  {
    title: "Retirement Fit",
    text: "Quiet area, health access, walkability, and maintenance comfort.",
    icon: Umbrella
  },
  {
    title: "Investment Path",
    text: "Rental yield, resale demand, growth corridor, and risk comfort.",
    icon: Landmark
  },
  {
    title: "Lifestyle Match",
    text: "City energy, privacy, luxury, green space, or coastal preference.",
    icon: Waves
  }
];

export const recommendationPaths = [
  {
    title: "Family-first buyer",
    match: "Villa or gated apartment near schools and work hubs",
    icon: Home
  },
  {
    title: "Rental investor",
    match: "Compact apartment near jobs, metro, hospitals, or colleges",
    icon: TrendingUp
  },
  {
    title: "Retirement planner",
    match: "Low-maintenance house in peaceful locality with health access",
    icon: ShieldCheck
  },
  {
    title: "Education-focused parent",
    match: "Apartment or villa near school clusters and safe commute routes",
    icon: GraduationCap
  }
];
