import {
  Banknote,
  BarChart3,
  Building2,
  Car,
  Factory,
  GraduationCap,
  Landmark,
  LineChart,
  MapPinned,
  Plane,
  School,
  ShieldCheck,
  Sparkles,
  Train,
  TrendingUp
} from "lucide-react";

export const investmentAreas = [
  {
    name: "Kakkanad",
    city: "Kochi",
    score: 91,
    price: "₹6,100/sqft",
    growth: "+12.4%",
    rentalYield: "4.1%",
    demand: "Very High",
    bestFor: "IT professionals, family buyers, rental investors"
  },
  {
    name: "Edappally",
    city: "Kochi",
    score: 87,
    price: "₹7,450/sqft",
    growth: "+9.8%",
    rentalYield: "4.4%",
    demand: "High",
    bestFor: "Metro access, retail access, rental demand"
  },
  {
    name: "Ramanattukara",
    city: "Calicut",
    score: 82,
    price: "₹9.2L/cent",
    growth: "+14.1%",
    rentalYield: "Growth play",
    demand: "Rising",
    bestFor: "Land investors, highway frontage, future resale"
  },
  {
    name: "Dubai Marina",
    city: "Dubai",
    score: 79,
    price: "AED 1,650/sqft",
    growth: "+7.7%",
    rentalYield: "6.1%",
    demand: "Global",
    bestFor: "NRI investors, rental income, global exposure"
  }
];

export const marketSignals = [
  {
    title: "Rental Yield",
    value: "4.4%",
    text: "Strongest current rental signal in Edappally apartment segment.",
    icon: Banknote
  },
  {
    title: "Future Growth",
    value: "+14.1%",
    text: "Ramanattukara land shows strong growth due to highway activity.",
    icon: TrendingUp
  },
  {
    title: "Demand Index",
    value: "92/100",
    text: "Kakkanad has sustained buyer and rental demand from IT workforce.",
    icon: BarChart3
  },
  {
    title: "Risk Comfort",
    value: "Low-Med",
    text: "Mature city assets are safer; growth corridors need more diligence.",
    icon: ShieldCheck
  }
];

export const infrastructureSignals = [
  {
    title: "Metro / Transit",
    impact: "+8%",
    icon: Train
  },
  {
    title: "Airport Access",
    impact: "+6%",
    icon: Plane
  },
  {
    title: "IT / Jobs Hub",
    impact: "+12%",
    icon: Factory
  },
  {
    title: "Schools",
    impact: "+5%",
    icon: School
  },
  {
    title: "Road Expansion",
    impact: "+9%",
    icon: Car
  },
  {
    title: "University Belt",
    impact: "+4%",
    icon: GraduationCap
  }
];

export const priceTrend = [
  { year: "2022", value: 100 },
  { year: "2023", value: 112 },
  { year: "2024", value: 126 },
  { year: "2025", value: 137 },
  { year: "2026", value: 151 }
];

export const investorProfiles = [
  "Rental income",
  "5-year resale",
  "Low-risk family asset",
  "Land banking",
  "NRI portfolio"
];

export const intelligenceFeatures = [
  {
    title: "Investment Score",
    text: "Compare assets using location, price, demand, growth, yield, and risk.",
    icon: Sparkles
  },
  {
    title: "Hotspot Detection",
    text: "Identify growing corridors before prices fully mature.",
    icon: MapPinned
  },
  {
    title: "Area Analysis",
    text: "Understand who lives there, what drives demand, and what to verify.",
    icon: Building2
  },
  {
    title: "Infrastructure Impact",
    text: "Estimate how transit, roads, schools, airports, and jobs affect demand.",
    icon: Landmark
  },
  {
    title: "Price Trends",
    text: "Visualize growth direction and compare multiple areas.",
    icon: LineChart
  }
];
