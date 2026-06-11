export type PropertyIntent = "buy" | "rent" | "invest" | "sell" | "market";

export type PropertyListing = {
  id: string;
  title: string;
  location: string;
  city: string;
  type: string;
  intent: Exclude<PropertyIntent, "sell" | "market">;
  priceLabel: string;
  priceLakhs: number;
  bedrooms: number;
  area: string;
  score: number;
  rentalYield: string;
  lifestyle: string[];
  highlights: string[];
};

export const propertyListings: PropertyListing[] = [
  {
    id: "hz-kochi-villa-01",
    title: "Calm 3BHK Family Villa",
    location: "Kakkanad, Kochi",
    city: "Kochi",
    type: "Villa",
    intent: "buy",
    priceLabel: "₹78L",
    priceLakhs: 78,
    bedrooms: 3,
    area: "1,850 sqft",
    score: 91,
    rentalYield: "3.8%",
    lifestyle: ["Family", "IT commute", "Schools"],
    highlights: ["Near Infopark", "Low-noise street", "Covered parking"]
  },
  {
    id: "hz-kochi-flat-02",
    title: "Smart 2BHK Apartment",
    location: "Edappally, Kochi",
    city: "Kochi",
    type: "Apartment",
    intent: "buy",
    priceLabel: "₹58L",
    priceLakhs: 58,
    bedrooms: 2,
    area: "1,120 sqft",
    score: 86,
    rentalYield: "4.4%",
    lifestyle: ["Metro access", "Rental income", "Shopping"],
    highlights: ["Metro nearby", "Strong rental demand", "Ready to move"]
  },
  {
    id: "hz-thrissur-house-03",
    title: "Independent House With Garden",
    location: "Ayyanthole, Thrissur",
    city: "Thrissur",
    type: "House",
    intent: "buy",
    priceLabel: "₹66L",
    priceLakhs: 66,
    bedrooms: 3,
    area: "1,650 sqft",
    score: 83,
    rentalYield: "3.2%",
    lifestyle: ["Peaceful", "Family", "Retirement"],
    highlights: ["Garden space", "Good road access", "Residential area"]
  },
  {
    id: "hz-tvm-rent-04",
    title: "Furnished 2BHK Near Technopark",
    location: "Kazhakkoottam, Trivandrum",
    city: "Trivandrum",
    type: "Flat",
    intent: "rent",
    priceLabel: "₹24K/mo",
    priceLakhs: 0.24,
    bedrooms: 2,
    area: "980 sqft",
    score: 88,
    rentalYield: "High demand",
    lifestyle: ["Work commute", "Furnished", "Young family"],
    highlights: ["Near Technopark", "Furnished", "Low deposit"]
  },
  {
    id: "hz-calicut-land-05",
    title: "Highway-Facing Residential Land",
    location: "Ramanattukara, Calicut",
    city: "Calicut",
    type: "Land",
    intent: "invest",
    priceLabel: "₹42L",
    priceLakhs: 42,
    bedrooms: 0,
    area: "12 cents",
    score: 82,
    rentalYield: "Growth play",
    lifestyle: ["Investment", "Highway", "Future growth"],
    highlights: ["Highway access", "Clear frontage", "Growth corridor"]
  },
  {
    id: "hz-uae-invest-06",
    title: "Dubai Marina Studio Investment",
    location: "Dubai Marina, UAE",
    city: "Dubai",
    type: "Apartment",
    intent: "invest",
    priceLabel: "AED 720K",
    priceLakhs: 163,
    bedrooms: 1,
    area: "515 sqft",
    score: 79,
    rentalYield: "6.1%",
    lifestyle: ["NRI", "Rental income", "Global"],
    highlights: ["Marina demand", "Managed rental", "International buyer fit"]
  }
];
