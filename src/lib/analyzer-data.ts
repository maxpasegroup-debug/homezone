import {
  Banknote,
  FileWarning,
  Gavel,
  Home,
  LineChart,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";

export const analyzerInputs = [
  "Property Brochure",
  "Sale Deed",
  "Tax Receipt",
  "Location Pin",
  "Property Images",
  "Floor Plan"
];

export const healthMetrics = [
  {
    label: "Estimated Value",
    value: "₹72L - ₹78L",
    tone: "violet",
    icon: Banknote,
    note: "Based on locality, size, property type, and comparable demand."
  },
  {
    label: "Risk Score",
    value: "Low",
    tone: "emerald",
    icon: ShieldCheck,
    note: "Documents look complete in the current sample workflow."
  },
  {
    label: "Rental Potential",
    value: "High",
    tone: "cyan",
    icon: Home,
    note: "Strong tenant demand due to workplace and school access."
  },
  {
    label: "Investment Potential",
    value: "82/100",
    tone: "fuchsia",
    icon: TrendingUp,
    note: "Growth corridor, resale demand, and rental yield are favorable."
  }
];

export const scoreBreakdown = [
  {
    label: "Location",
    score: 88,
    icon: MapPinned
  },
  {
    label: "Pricing",
    score: 79,
    icon: Banknote
  },
  {
    label: "Amenities",
    score: 84,
    icon: Sparkles
  },
  {
    label: "Growth",
    score: 86,
    icon: LineChart
  },
  {
    label: "Demand",
    score: 90,
    icon: TrendingUp
  },
  {
    label: "Documents",
    score: 76,
    icon: Gavel
  }
];

export const legalNotes = [
  {
    title: "Verify title chain",
    text: "Ask for parent deed, latest tax receipt, possession certificate, and encumbrance certificate.",
    icon: Gavel
  },
  {
    title: "Check approvals",
    text: "Confirm building permit, occupancy status, floor plan approval, and local body compliance.",
    icon: FileWarning
  },
  {
    title: "Visit before payment",
    text: "Confirm road access, water source, parking, boundary, and nearby construction risks.",
    icon: ShieldAlert
  }
];
