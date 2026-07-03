import {
  BadgeCheck,
  Banknote,
  Bot,
  Brush,
  Building,
  ClipboardCheck,
  Hammer,
  Home,
  KeyRound,
  Leaf,
  Lightbulb,
  Paintbrush,
  Scale,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench
} from "lucide-react";

export const serviceCategories = [
  {
    title: "Interior Design",
    icon: Paintbrush,
    demand: "High demand",
    text: "Modular kitchens, wardrobes, furnishing, and full-home interiors."
  },
  {
    title: "Architecture",
    icon: Building,
    demand: "Verified experts",
    text: "Plans, elevation, approvals, and design consultation."
  },
  {
    title: "Construction",
    icon: Hammer,
    demand: "End-to-end",
    text: "Home construction, renovation, extensions, and project execution."
  },
  {
    title: "Renovation",
    icon: Wrench,
    demand: "Project-ready",
    text: "Civil repair, upgrades, waterproofing, extensions, and remodelling."
  },
  {
    title: "Painting",
    icon: Paintbrush,
    demand: "Fast quotes",
    text: "Interior painting, exterior painting, textures, and finishing."
  },
  {
    title: "Loans",
    icon: Banknote,
    demand: "Fast support",
    text: "Home loans, eligibility checks, balance transfer, and documentation."
  },
  {
    title: "Legal",
    icon: Scale,
    demand: "Critical",
    text: "Document verification, sale deed review, and legal opinion."
  },
  {
    title: "Insurance",
    icon: ShieldCheck,
    demand: "Protection",
    text: "Home insurance, property cover, loan-linked insurance, and advice."
  },
  {
    title: "Movers",
    icon: Truck,
    demand: "Local + city",
    text: "Packing, moving, relocation, storage, and vehicle transport."
  },
  {
    title: "Cleaning",
    icon: Brush,
    demand: "Quick booking",
    text: "Deep cleaning, move-in cleaning, bathroom, sofa, and kitchen cleaning."
  },
  {
    title: "Solar",
    icon: Leaf,
    demand: "Savings",
    text: "Solar consultation, installation, subsidy guidance, and maintenance."
  },
  {
    title: "Home Automation",
    icon: Lightbulb,
    demand: "Smart homes",
    text: "Smart locks, lights, security cameras, sensors, and automation."
  },
  {
    title: "Electrical",
    icon: Lightbulb,
    demand: "Verified technicians",
    text: "Wiring, panels, fixtures, safety checks, and maintenance."
  },
  {
    title: "Plumbing",
    icon: Wrench,
    demand: "Quick support",
    text: "Leaks, sanitary work, pumps, fixtures, and repair jobs."
  },
  {
    title: "Landscaping",
    icon: Leaf,
    demand: "Outdoor living",
    text: "Garden design, lawns, irrigation, terrace gardens, and maintenance."
  },
  {
    title: "Furniture",
    icon: Home,
    demand: "Custom builds",
    text: "Loose furniture, custom carpentry, wardrobes, and modular units."
  },
  {
    title: "Loan Assistance",
    icon: Banknote,
    demand: "Bank support",
    text: "Eligibility, documents, loan options, and approval coordination."
  },
  {
    title: "Packers & Movers",
    icon: Truck,
    demand: "Move-in ready",
    text: "Packing, moving, storage, local shifting, and vehicle transport."
  }
];

export const featuredProviders = [
  {
    name: "NestCraft Interiors",
    category: "Interior Design",
    city: "Kochi",
    rating: 4.8,
    jobs: 126,
    verified: true,
    price: "From Rs 1.8L",
    response: "Responds in 20 min"
  },
  {
    name: "ClearTitle Legal",
    category: "Legal",
    city: "Kerala",
    rating: 4.9,
    jobs: 312,
    verified: true,
    price: "From Rs 2,999",
    response: "Same-day review"
  },
  {
    name: "MoveMate Packers",
    category: "Movers",
    city: "Kochi",
    rating: 4.7,
    jobs: 204,
    verified: true,
    price: "From Rs 4,500",
    response: "Instant quote"
  },
  {
    name: "SunGrid Solar",
    category: "Solar",
    city: "Thrissur",
    rating: 4.6,
    jobs: 88,
    verified: true,
    price: "From Rs 65K",
    response: "Free site check"
  }
];

export const serviceMoments = [
  {
    title: "Before buying",
    services: ["Legal", "Loans", "Property Inspection"],
    icon: ClipboardCheck
  },
  {
    title: "After booking",
    services: ["Insurance", "Interiors", "Cleaning"],
    icon: KeyRound
  },
  {
    title: "Before moving",
    services: ["Movers", "Home Automation", "Solar"],
    icon: Home
  },
  {
    title: "For owners",
    services: ["Renovation", "Listing Photos", "Maintenance"],
    icon: Wrench
  }
];

export const aiServiceSuggestions = [
  {
    title: "Legal check is recommended",
    text: "The property is resale. Verify title chain and encumbrance certificate before token payment.",
    icon: Scale
  },
  {
    title: "Loan eligibility can be checked",
    text: "Budget and income inputs can help estimate EMI comfort and bank fit.",
    icon: Banknote
  },
  {
    title: "Move-in package available",
    text: "Cleaning, movers, basic interiors, and smart lock setup can be bundled.",
    icon: Sparkles
  }
];

export const trustSignals = [
  {
    title: "Verified providers",
    icon: BadgeCheck
  },
  {
    title: "WhatsApp updates",
    icon: Bot
  },
  {
    title: "Transparent quotes",
    icon: Banknote
  },
  {
    title: "AI-matched services",
    icon: Sparkles
  }
];

