import {
  BellRing,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Flame,
  MessageCircle,
  PhoneCall,
  Star,
  UserRound,
  Workflow
} from "lucide-react";

export const brokerLeads = [
  {
    name: "Anjana Nair",
    need: "3BHK villa in Kochi under ₹85L",
    source: "AI Search",
    score: 94,
    stage: "Hot",
    next: "Call today",
    phone: "+91 98XXXXXX12"
  },
  {
    name: "Rohit Menon",
    need: "Apartment near Edappally for rental income",
    source: "Property Reel",
    score: 82,
    stage: "Site Visit",
    next: "Visit tomorrow",
    phone: "+91 90XXXXXX44"
  },
  {
    name: "Fathima K",
    need: "Land near highway, Calicut",
    source: "WhatsApp",
    score: 73,
    stage: "Nurture",
    next: "Send options",
    phone: "+91 96XXXXXX71"
  },
  {
    name: "Suresh Kumar",
    need: "Sell house in Thrissur",
    source: "Studio",
    score: 68,
    stage: "New",
    next: "Verify listing",
    phone: "+91 99XXXXXX38"
  }
];

export const pipelineStages = [
  {
    title: "New",
    count: 18,
    value: "₹8.2Cr",
    icon: UserRound
  },
  {
    title: "Qualified",
    count: 11,
    value: "₹5.9Cr",
    icon: CheckCircle2
  },
  {
    title: "Site Visit",
    count: 6,
    value: "₹3.4Cr",
    icon: CalendarCheck
  },
  {
    title: "Negotiation",
    count: 3,
    value: "₹1.8Cr",
    icon: Workflow
  }
];

export const automationItems = [
  {
    title: "Auto greeting",
    text: "Send instant WhatsApp intro when a new lead arrives.",
    icon: MessageCircle
  },
  {
    title: "Follow-up reminders",
    text: "Remind broker before the lead goes cold.",
    icon: BellRing
  },
  {
    title: "Lead nurture",
    text: "Send property suggestions based on budget and location.",
    icon: Bot
  },
  {
    title: "Site visit confirmation",
    text: "Confirm date, time, location, and contact person.",
    icon: CalendarCheck
  }
];

export const proPlans = [
  {
    name: "Pro Starter",
    price: "₹1,999/mo",
    bestFor: "Solo brokers",
    features: ["100 leads", "Basic CRM", "WhatsApp reminders"]
  },
  {
    name: "Pro Growth",
    price: "₹4,999/mo",
    bestFor: "Broker teams",
    features: ["500 leads", "AI lead scoring", "Team pipeline"]
  },
  {
    name: "Pro Elite",
    price: "Custom",
    bestFor: "Large agencies",
    features: ["Unlimited leads", "Campaign support", "Priority Studio"]
  }
];

export const assistantCards = [
  {
    title: "Top lead today",
    value: "Anjana Nair",
    note: "High budget fit and ready for site visit.",
    icon: Flame
  },
  {
    title: "Follow-up due",
    value: "7 leads",
    note: "AI recommends calling before 6 PM.",
    icon: Clock3
  },
  {
    title: "Best listing to push",
    value: "Kakkanad Villa",
    note: "Matches 11 active buyer leads.",
    icon: Star
  },
  {
    title: "Call priority",
    value: "3 hot leads",
    note: "Likely to respond to WhatsApp + call.",
    icon: PhoneCall
  }
];
