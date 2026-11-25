import type { ColorFamily, Gender } from "../shared/Domain.ts"
import { ColorOption, Product, ProductId, Sport } from "../shared/Domain.ts"

// Seed data for the in-memory catalog. KINETIK is a fictional brand and every
// product name here is invented.

export const sports: ReadonlyArray<Sport> = [
  new Sport({ id: "running", name: "Running", tagline: "Every mile, your way" }),
  new Sport({ id: "training", name: "Training & Gym", tagline: "Built for the work" }),
  new Sport({ id: "lifestyle", name: "Lifestyle", tagline: "Off-duty, on-point" }),
  new Sport({ id: "basketball", name: "Basketball", tagline: "Own the court" }),
  new Sport({ id: "trail", name: "Trail", tagline: "Leave the road behind" })
]

const c = (id: string, name: string, family: ColorFamily, primary: string, secondary: string, tertiary: string) =>
  new ColorOption({ id, name, family, primary, secondary, tertiary })

const MENS = ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"] as const
const WOMENS = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11"] as const
const UNISEX = ["M 6 / W 7.5", "M 7 / W 8.5", "M 8 / W 9.5", "M 9 / W 10.5", "M 10 / W 11.5", "M 11 / W 12.5", "M 12 / W 13.5"] as const
const BIG_KIDS = ["3.5Y", "4Y", "4.5Y", "5Y", "5.5Y", "6Y", "6.5Y", "7Y"] as const
const LITTLE_KIDS = ["10.5C", "11C", "11.5C", "12C", "12.5C", "13C", "1Y", "2Y", "3Y"] as const
const APPAREL = ["XS", "S", "M", "L", "XL", "XXL"] as const
const SOCKS = ["S", "M", "L", "XL"] as const
const ONE_SIZE = ["One Size"] as const

type Input = Omit<ConstructorParameters<typeof Product>[0], "id" | "sizes" | "genders" | "unavailableSizes"> & {
  readonly id: string
  readonly sizes: ReadonlyArray<string>
  readonly genders: ReadonlyArray<Gender>
  readonly unavailableSizes?: ReadonlyArray<string>
}

const p = ({ id, sizes, genders, unavailableSizes = [], ...rest }: Input) =>
  new Product({
    ...rest,
    id: ProductId.make(id),
    sizes: sizes as unknown as Product["sizes"],
    genders: [...genders],
    unavailableSizes: [...unavailableSizes]
  })

export const products: ReadonlyArray<Product> = [
  // --- Running -----------------------------------------------------------------
  p({
    id: "tempo-runner-3-mens",
    name: "KINETIK Tempo Runner 3",
    subtitle: "Men's Road Running Shoes",
    description:
      "Responsive foam and a breathable engineered mesh upper make the Tempo Runner 3 our everyday trainer for easy miles and long runs alike.",
    details: ["Dual-density foam midsole", "Engineered mesh upper", "Rubber waffle outsole for grip", "Drop: 10 mm"],
    styleCode: "KT3-001",
    category: "shoes",
    genders: ["men"],
    sport: "running",
    art: "runner",
    colors: [
      c("black-volt", "Black/White-Volt", "black", "#1C1C1E", "#D4F33A", "#F2F2F2"),
      c("blue-crimson", "Racer Blue/Crimson", "blue", "#2A57D6", "#FF5A3C", "#F4F4F4"),
      c("white-grey", "White/Wolf Grey", "white", "#F1F1F1", "#9A9EA6", "#FFFFFF")
    ],
    sizes: MENS,
    unavailableSizes: ["7", "13"],
    price: 13_000,
    rating: 4.6,
    reviewCount: 1842,
    badge: "bestseller",
    stock: 80,
    popularity: 99,
    addedAt: "2026-06-12"
  }),
  p({
    id: "tempo-runner-3-womens",
    name: "KINETIK Tempo Runner 3",
    subtitle: "Women's Road Running Shoes",
    description:
      "Responsive foam and a breathable engineered mesh upper make the Tempo Runner 3 our everyday trainer for easy miles and long runs alike.",
    details: ["Dual-density foam midsole", "Engineered mesh upper", "Rubber waffle outsole for grip", "Drop: 10 mm"],
    styleCode: "KT3-101",
    category: "shoes",
    genders: ["women"],
    sport: "running",
    art: "runner",
    colors: [
      c("pink-white", "Pink Foam/White", "pink", "#F4B6C9", "#FFFFFF", "#FFFFFF"),
      c("lilac", "Lilac/Volt", "purple", "#B59CE6", "#D4F33A", "#F6F3FF"),
      c("black-white", "Black/White", "black", "#1C1C1E", "#FFFFFF", "#EDEDED")
    ],
    sizes: WOMENS,
    unavailableSizes: ["5"],
    price: 13_000,
    rating: 4.7,
    reviewCount: 1210,
    badge: "bestseller",
    stock: 70,
    popularity: 97,
    addedAt: "2026-06-12"
  }),
  p({
    id: "vector-elite",
    name: "KINETIK Vector Elite",
    subtitle: "Road Racing Shoes",
    description:
      "Built for race day. A full-length carbon plate and our lightest, bounciest foam help you chase a new personal best.",
    details: ["Full-length carbon-fibre plate", "Super-critical foam, 39 mm stack", "Ultralight translucent mesh", "Weight: 198 g (M 9)"],
    styleCode: "KVE-300",
    category: "shoes",
    genders: ["men", "women"],
    sport: "running",
    art: "racer",
    colors: [
      c("volt", "Volt/Black", "yellow", "#D9F94A", "#111111", "#FF6A3D"),
      c("white-crimson", "White/Bright Crimson", "white", "#F6F6F6", "#FF3B30", "#FFD7CC"),
      c("aqua", "Hyper Aqua/Black", "blue", "#5BE0E6", "#111111", "#F2F2F2")
    ],
    sizes: UNISEX,
    unavailableSizes: ["M 12 / W 13.5"],
    price: 25_000,
    rating: 4.8,
    reviewCount: 412,
    badge: "just-in",
    stock: 18,
    popularity: 93,
    addedAt: "2026-11-14"
  }),
  p({
    id: "glide-daily-mens",
    name: "KINETIK Glide Daily",
    subtitle: "Men's Road Running Shoes",
    description: "Soft, stable and ready for anything. The Glide Daily is the easy-going shoe for your first 5K and your hundredth.",
    details: ["Soft foam midsole", "Padded collar and tongue", "Durable rubber outsole"],
    styleCode: "KGD-020",
    category: "shoes",
    genders: ["men"],
    sport: "running",
    art: "runner",
    colors: [
      c("grey-orange", "Cool Grey/Total Orange", "grey", "#8E949C", "#FF7A1A", "#EFEFEF"),
      c("navy", "Midnight Navy/White", "blue", "#1E2A4A", "#FFFFFF", "#E9E9E9")
    ],
    sizes: MENS,
    price: 8_997,
    previousPrice: 11_000,
    rating: 4.4,
    reviewCount: 965,
    stock: 55,
    popularity: 84,
    addedAt: "2026-02-03"
  }),
  // --- Trail -------------------------------------------------------------------
  p({
    id: "ridgeline-trail-mens",
    name: "KINETIK Ridgeline Trail",
    subtitle: "Men's Trail Running Shoes",
    description: "Grippy lugs, a protective toe bumper and a rock plate keep you moving fast over roots, rocks and mud.",
    details: ["Multi-directional 4 mm lugs", "Rock plate underfoot", "Water-resistant upper", "Toe bumper"],
    styleCode: "KRT-500",
    category: "shoes",
    genders: ["men"],
    sport: "trail",
    art: "trail",
    colors: [
      c("olive", "Olive Flak/Safety Orange", "green", "#5E6B3A", "#FF7A1A", "#D9CBB0"),
      c("black-blue", "Black/Glacier Blue", "black", "#202124", "#8AD3F2", "#4A4A4A")
    ],
    sizes: MENS,
    unavailableSizes: ["8.5"],
    price: 14_000,
    rating: 4.6,
    reviewCount: 388,
    badge: "just-in",
    stock: 24,
    popularity: 80,
    addedAt: "2026-11-01"
  }),
  p({
    id: "ridgeline-trail-womens",
    name: "KINETIK Ridgeline Trail",
    subtitle: "Women's Trail Running Shoes",
    description: "Grippy lugs, a protective toe bumper and a rock plate keep you moving fast over roots, rocks and mud.",
    details: ["Multi-directional 4 mm lugs", "Rock plate underfoot", "Water-resistant upper", "Toe bumper"],
    styleCode: "KRT-510",
    category: "shoes",
    genders: ["women"],
    sport: "trail",
    art: "trail",
    colors: [
      c("teal", "Deep Teal/Sunset", "green", "#1F6F6B", "#FF8F6B", "#E6DCC8"),
      c("sand", "Sand Drift/Black", "brown", "#CDB895", "#1C1C1C", "#6B5B45")
    ],
    sizes: WOMENS,
    price: 14_000,
    rating: 4.7,
    reviewCount: 221,
    badge: "sustainable",
    stock: 20,
    popularity: 74,
    addedAt: "2026-10-20"
  }),
  // --- Lifestyle ---------------------------------------------------------------
  p({
    id: "halo-low-84-mens",
    name: "KINETIK Halo Low '84",
    subtitle: "Men's Shoes",
    description:
      "Inspired by an archive court shoe, the Halo Low '84 brings back crisp leather overlays, a cupsole and a heritage heel tab.",
    details: ["Full-grain leather upper", "Stitched rubber cupsole", "Perforated toe box", "Padded low-cut collar"],
    styleCode: "KHL-084",
    category: "shoes",
    genders: ["men"],
    sport: "lifestyle",
    art: "court-low",
    colors: [
      c("white-green", "White/Pine Green", "white", "#FAFAFA", "#1F5E3B", "#F1EBDD"),
      c("white-red", "White/University Red", "white", "#FAFAFA", "#C8102E", "#F1EBDD"),
      c("black-gum", "Black/Gum", "black", "#1E1E1E", "#3A3A3A", "#B5793F"),
      c("panda", "White/Black", "black", "#FAFAFA", "#151515", "#FFFFFF")
    ],
    sizes: MENS,
    unavailableSizes: ["9", "11.5"],
    price: 11_000,
    rating: 4.8,
    reviewCount: 3204,
    badge: "bestseller",
    stock: 120,
    popularity: 100,
    addedAt: "2025-09-15"
  }),
  p({
    id: "halo-low-84-womens",
    name: "KINETIK Halo Low '84",
    subtitle: "Women's Shoes",
    description:
      "Inspired by an archive court shoe, the Halo Low '84 brings back crisp leather overlays, a cupsole and a heritage heel tab.",
    details: ["Full-grain leather upper", "Stitched rubber cupsole", "Perforated toe box", "Padded low-cut collar"],
    styleCode: "KHL-184",
    category: "shoes",
    genders: ["women"],
    sport: "lifestyle",
    art: "court-low",
    colors: [
      c("sail-pink", "Sail/Soft Pink", "pink", "#F7F2E8", "#F2A7B8", "#F1EBDD"),
      c("white-blue", "White/Valerian Blue", "white", "#FAFAFA", "#3E5BA9", "#F1EBDD"),
      c("phantom", "Phantom/Light Bone", "white", "#EEE8DC", "#CDBFA8", "#FFFFFF")
    ],
    sizes: WOMENS,
    price: 11_000,
    rating: 4.8,
    reviewCount: 2876,
    stock: 110,
    popularity: 96,
    addedAt: "2025-09-15"
  }),
  p({
    id: "halo-high",
    name: "KINETIK Halo High",
    subtitle: "Shoes",
    description: "The high-top take on our archive court shoe, with a padded ankle collar and a hook-and-loop strap for lockdown.",
    details: ["Leather and suede upper", "Hook-and-loop ankle strap", "Stitched rubber cupsole"],
    styleCode: "KHH-090",
    category: "shoes",
    genders: ["men", "women"],
    sport: "lifestyle",
    art: "court-high",
    colors: [
      c("royal", "White/Game Royal", "blue", "#FAFAFA", "#1D4ED8", "#F1EBDD"),
      c("mocha", "Sail/Mocha", "brown", "#F3EEE3", "#6B4A35", "#E8DDC7"),
      c("bred", "Black/Varsity Red", "red", "#161616", "#C8102E", "#FFFFFF")
    ],
    sizes: UNISEX,
    unavailableSizes: ["M 6 / W 7.5"],
    price: 12_500,
    rating: 4.7,
    reviewCount: 734,
    stock: 40,
    popularity: 88,
    addedAt: "2026-04-08"
  }),
  p({
    id: "court-classic-womens",
    name: "KINETIK Court Classic",
    subtitle: "Women's Shoes",
    description: "Clean lines, a slim profile and a soft lining. The Court Classic goes with everything in your wardrobe.",
    details: ["Synthetic leather upper", "Foam sockliner", "Rubber cupsole"],
    styleCode: "KCC-210",
    category: "shoes",
    genders: ["women"],
    sport: "lifestyle",
    art: "court-low",
    colors: [
      c("white-white", "Triple White", "white", "#FBFBFB", "#E8E8E8", "#FFFFFF"),
      c("sage", "White/Sage", "green", "#FBFBFB", "#9BB59A", "#F4F1EA")
    ],
    sizes: WOMENS,
    price: 6_797,
    previousPrice: 8_500,
    rating: 4.5,
    reviewCount: 1530,
    stock: 60,
    popularity: 82,
    addedAt: "2025-05-20"
  }),
  p({
    id: "drift-slide",
    name: "KINETIK Drift Slide",
    subtitle: "Slides",
    description: "Cushioned, contoured and quick-drying. Your go-to after the gym, at the pool or around the house.",
    details: ["Soft one-piece foam footbed", "Padded strap", "Textured traction"],
    styleCode: "KDS-010",
    category: "shoes",
    genders: ["men", "women"],
    sport: "lifestyle",
    art: "slide",
    colors: [
      c("black", "Black/White", "black", "#1B1B1B", "#FFFFFF", "#2A2A2A"),
      c("bone", "Bone/Sail", "white", "#EBE3D3", "#8A7E6B", "#E0D6C2"),
      c("blue", "Game Royal/White", "blue", "#1D4ED8", "#FFFFFF", "#1A1A1A")
    ],
    sizes: UNISEX,
    price: 3_500,
    rating: 4.6,
    reviewCount: 2190,
    stock: 200,
    popularity: 85,
    addedAt: "2025-04-02"
  }),
  // --- Basketball & training ---------------------------------------------------
  p({
    id: "rise-pro",
    name: "KINETIK Rise Pro",
    subtitle: "Basketball Shoes",
    description: "Explosive cushioning, a supportive high collar and herringbone traction for players who live above the rim.",
    details: ["Responsive forefoot unit", "Herringbone traction", "Internal heel counter", "Padded high-top collar"],
    styleCode: "KRP-700",
    category: "shoes",
    genders: ["men", "women"],
    sport: "basketball",
    art: "court-high",
    colors: [
      c("orange", "Team Orange/Black", "orange", "#FF6B1A", "#111111", "#FFFFFF"),
      c("purple", "Court Purple/Gold", "purple", "#5B2A86", "#F5C242", "#FFFFFF"),
      c("black", "Black/Metallic Silver", "black", "#141414", "#C9CCD1", "#2B2B2B")
    ],
    sizes: UNISEX,
    price: 16_000,
    rating: 4.6,
    reviewCount: 318,
    badge: "just-in",
    stock: 22,
    popularity: 90,
    addedAt: "2026-11-18"
  }),
  p({
    id: "flux-trainer-2-mens",
    name: "KINETIK Flux Trainer 2",
    subtitle: "Men's Workout Shoes",
    description: "A wide, flat base for heavy lifts and a flexible forefoot for HIIT. The Flux Trainer 2 handles every station.",
    details: ["Wide, stable heel", "Rope-guard midfoot wrap", "Flexible forefoot grooves"],
    styleCode: "KFT-220",
    category: "shoes",
    genders: ["men"],
    sport: "training",
    art: "trainer",
    colors: [
      c("grey", "Smoke Grey/Volt", "grey", "#5F6368", "#D4F33A", "#EDEDED"),
      c("black", "Black/Anthracite", "black", "#151515", "#4A4A4A", "#202020")
    ],
    sizes: MENS,
    price: 10_000,
    rating: 4.5,
    reviewCount: 640,
    stock: 45,
    popularity: 78,
    addedAt: "2026-03-10"
  }),
  p({
    id: "flux-trainer-2-womens",
    name: "KINETIK Flux Trainer 2",
    subtitle: "Women's Workout Shoes",
    description: "A wide, flat base for heavy lifts and a flexible forefoot for HIIT. The Flux Trainer 2 handles every station.",
    details: ["Wide, stable heel", "Rope-guard midfoot wrap", "Flexible forefoot grooves"],
    styleCode: "KFT-320",
    category: "shoes",
    genders: ["women"],
    sport: "training",
    art: "trainer",
    colors: [
      c("white-pink", "White/Hyper Pink", "white", "#F7F7F7", "#FF4F9A", "#FFFFFF"),
      c("mint", "Mint Foam/Black", "green", "#A8E6CF", "#151515", "#F4F4F4")
    ],
    sizes: WOMENS,
    price: 10_000,
    rating: 4.6,
    reviewCount: 512,
    stock: 40,
    popularity: 76,
    addedAt: "2026-03-10"
  }),
  // --- Kids --------------------------------------------------------------------
  p({
    id: "tempo-runner-3-big-kids",
    name: "KINETIK Tempo Runner 3",
    subtitle: "Big Kids' Running Shoes",
    description: "Our everyday running shoe, sized down for big kids who never stop moving.",
    details: ["Soft foam midsole", "Breathable mesh upper", "Durable rubber outsole"],
    styleCode: "KT3-701",
    category: "shoes",
    genders: ["kids"],
    sport: "running",
    art: "runner",
    colors: [
      c("blue-volt", "Photo Blue/Volt", "blue", "#3B82F6", "#D4F33A", "#FFFFFF"),
      c("pink", "Pink Spell/White", "pink", "#FF8FB8", "#FFFFFF", "#FFFFFF")
    ],
    sizes: BIG_KIDS,
    price: 8_000,
    rating: 4.7,
    reviewCount: 402,
    stock: 50,
    popularity: 72,
    addedAt: "2026-07-01"
  }),
  p({
    id: "halo-low-little-kids",
    name: "KINETIK Halo Low",
    subtitle: "Little Kids' Shoes",
    description: "The classic court look with an easy hook-and-loop strap, so little ones can get going on their own.",
    details: ["Hook-and-loop strap", "Leather and synthetic upper", "Rubber cupsole"],
    styleCode: "KHL-384",
    category: "shoes",
    genders: ["kids"],
    sport: "lifestyle",
    art: "court-low",
    colors: [
      c("white-yellow", "White/Tour Yellow", "white", "#FAFAFA", "#F5C400", "#F1EBDD"),
      c("white-blue", "White/Photo Blue", "white", "#FAFAFA", "#3B82F6", "#F1EBDD")
    ],
    sizes: LITTLE_KIDS,
    price: 6_500,
    rating: 4.8,
    reviewCount: 288,
    stock: 60,
    popularity: 70,
    addedAt: "2026-05-05"
  }),
  // --- Clothing ----------------------------------------------------------------
  p({
    id: "breeze-tech-tee-mens",
    name: "KINETIK Breeze Tech",
    subtitle: "Men's Short-Sleeve Running Top",
    description: "Lightweight, quick-drying knit with mesh zones where you heat up most. Made with recycled polyester.",
    details: ["Sweat-wicking knit", "Mesh back panel", "Reflective details", "Standard fit"],
    styleCode: "KBT-040",
    category: "clothing",
    genders: ["men"],
    sport: "running",
    art: "tee",
    colors: [
      c("black", "Black/Reflective Silver", "black", "#1A1A1A", "#BFC3C8", "#1A1A1A"),
      c("volt", "Volt", "yellow", "#D4F33A", "#1A1A1A", "#D4F33A"),
      c("blue", "Racer Blue", "blue", "#2A57D6", "#FFFFFF", "#2A57D6")
    ],
    sizes: APPAREL,
    price: 4_000,
    rating: 4.5,
    reviewCount: 701,
    badge: "sustainable",
    stock: 150,
    popularity: 81,
    addedAt: "2026-05-28"
  }),
  p({
    id: "essential-tee-womens",
    name: "KINETIK Essential",
    subtitle: "Women's Cotton T-Shirt",
    description: "Soft, midweight cotton with a relaxed fit and a small embroidered logo. The tee you'll reach for first.",
    details: ["100% cotton jersey", "Relaxed fit", "Embroidered chest logo"],
    styleCode: "KET-110",
    category: "clothing",
    genders: ["women"],
    sport: "lifestyle",
    art: "tee",
    colors: [
      c("white", "White", "white", "#F7F7F7", "#1A1A1A", "#F7F7F7"),
      c("pink", "Pink Bloom", "pink", "#F6B7C8", "#1A1A1A", "#F6B7C8"),
      c("green", "Oil Green", "green", "#5A6B4C", "#F2F2F2", "#5A6B4C")
    ],
    sizes: APPAREL,
    price: 3_000,
    rating: 4.6,
    reviewCount: 1120,
    stock: 200,
    popularity: 79,
    addedAt: "2025-08-19"
  }),
  p({
    id: "thermal-fleece-hoodie-mens",
    name: "KINETIK Thermal Fleece",
    subtitle: "Men's Pullover Hoodie",
    description: "Brushed-back fleece that's soft, warm and made for everyday layering. With a roomy kangaroo pocket.",
    details: ["Brushed-back fleece", "Kangaroo pocket", "Ribbed cuffs and hem", "Standard fit"],
    styleCode: "KTF-610",
    category: "clothing",
    genders: ["men"],
    sport: "lifestyle",
    art: "hoodie",
    colors: [
      c("grey", "Dark Grey Heather", "grey", "#6E7176", "#F2F2F2", "#6E7176"),
      c("black", "Black", "black", "#1A1A1A", "#F2F2F2", "#1A1A1A"),
      c("navy", "Midnight Navy", "blue", "#1E2A4A", "#F2F2F2", "#1E2A4A"),
      c("sail", "Sail", "white", "#EFE9DD", "#1A1A1A", "#EFE9DD")
    ],
    sizes: APPAREL,
    unavailableSizes: ["XS"],
    price: 7_000,
    rating: 4.7,
    reviewCount: 2350,
    badge: "bestseller",
    stock: 160,
    popularity: 94,
    addedAt: "2025-10-01"
  }),
  p({
    id: "thermal-fleece-hoodie-womens",
    name: "KINETIK Thermal Fleece",
    subtitle: "Women's Oversized Hoodie",
    description: "Brushed-back fleece with an oversized, drop-shoulder fit. Cosy enough for the couch, polished enough for the street.",
    details: ["Brushed-back fleece", "Oversized fit", "Dropped shoulders"],
    styleCode: "KTF-710",
    category: "clothing",
    genders: ["women"],
    sport: "lifestyle",
    art: "hoodie",
    colors: [
      c("lilac", "Lilac Bloom", "purple", "#C7B4E8", "#1A1A1A", "#C7B4E8"),
      c("oat", "Oatmeal", "brown", "#D8CBB4", "#1A1A1A", "#D8CBB4"),
      c("black", "Black", "black", "#1A1A1A", "#F2F2F2", "#1A1A1A")
    ],
    sizes: APPAREL,
    price: 7_000,
    rating: 4.8,
    reviewCount: 1644,
    stock: 140,
    popularity: 92,
    addedAt: "2025-10-01"
  }),
  p({
    id: "storm-shell-jacket-womens",
    name: "KINETIK Storm Shell",
    subtitle: "Women's Running Jacket",
    description: "A packable, water-repellent shell that blocks wind and light rain, with reflective hits for darker runs.",
    details: ["Water-repellent finish", "Packs into its own pocket", "Reflective details", "Adjustable hood"],
    styleCode: "KSS-820",
    category: "clothing",
    genders: ["women"],
    sport: "running",
    art: "jacket",
    colors: [
      c("orange", "Safety Orange", "orange", "#FF7A1A", "#1A1A1A", "#FF7A1A"),
      c("black", "Black", "black", "#1A1A1A", "#BFC3C8", "#1A1A1A")
    ],
    sizes: APPAREL,
    price: 12_000,
    rating: 4.5,
    reviewCount: 188,
    badge: "just-in",
    stock: 30,
    popularity: 75,
    addedAt: "2026-11-05"
  }),
  p({
    id: "tempo-shorts-mens",
    name: "KINETIK Tempo",
    subtitle: "Men's 7\" Running Shorts",
    description: "Light, breathable shorts with a built-in brief and a zip pocket for your key or gel.",
    details: ["Built-in brief", "Zip back pocket", "Sweat-wicking woven fabric"],
    styleCode: "KTS-070",
    category: "clothing",
    genders: ["men"],
    sport: "running",
    art: "shorts",
    colors: [
      c("black", "Black", "black", "#1A1A1A", "#D4F33A", "#1A1A1A"),
      c("blue", "Thunder Blue", "blue", "#2B3F6B", "#FFFFFF", "#2B3F6B")
    ],
    sizes: APPAREL,
    price: 3_997,
    previousPrice: 5_000,
    rating: 4.5,
    reviewCount: 860,
    stock: 120,
    popularity: 77,
    addedAt: "2026-04-14"
  }),
  p({
    id: "studio-leggings-womens",
    name: "KINETIK Studio",
    subtitle: "Women's High-Waisted 7/8 Leggings",
    description: "Buttery-soft, squat-proof leggings with a high waistband that stays put through every rep.",
    details: ["High-rise waistband", "Hidden waistband pocket", "Four-way stretch"],
    styleCode: "KSL-780",
    category: "clothing",
    genders: ["women"],
    sport: "training",
    art: "leggings",
    colors: [
      c("black", "Black", "black", "#1A1A1A", "#3A3A3A", "#1A1A1A"),
      c("plum", "Plum Eclipse", "purple", "#5B2A55", "#7A3D72", "#5B2A55"),
      c("olive", "Medium Olive", "green", "#6B6E45", "#83875A", "#6B6E45")
    ],
    sizes: APPAREL,
    price: 6_500,
    rating: 4.7,
    reviewCount: 2012,
    badge: "bestseller",
    stock: 130,
    popularity: 91,
    addedAt: "2025-11-11"
  }),
  p({
    id: "hoops-mesh-shorts",
    name: "KINETIK Hoops",
    subtitle: "Basketball Shorts",
    description: "Breathable double-knit mesh with a 10\" inseam and side pockets. Built for pick-up games and practice.",
    details: ["Double-knit mesh", "Side pockets", "Elastic waistband with drawcord"],
    styleCode: "KHS-100",
    category: "clothing",
    genders: ["men", "women"],
    sport: "basketball",
    art: "shorts",
    colors: [
      c("red", "University Red", "red", "#C8102E", "#FFFFFF", "#C8102E"),
      c("purple", "Court Purple", "purple", "#5B2A86", "#F5C242", "#5B2A86"),
      c("black", "Black", "black", "#1A1A1A", "#FFFFFF", "#1A1A1A")
    ],
    sizes: APPAREL,
    price: 4_000,
    rating: 4.4,
    reviewCount: 455,
    stock: 90,
    popularity: 68,
    addedAt: "2026-08-22"
  }),
  // --- Accessories -------------------------------------------------------------
  p({
    id: "everyday-crew-socks",
    name: "KINETIK Everyday Cushioned",
    subtitle: "Training Crew Socks (3 Pairs)",
    description: "Cushioned under the heel and forefoot with arch support and sweat-wicking yarns.",
    details: ["Cushioned sole", "Arch band support", "3 pairs"],
    styleCode: "KSC-003",
    category: "accessories",
    genders: ["men", "women"],
    sport: "training",
    art: "socks",
    colors: [
      c("white", "White/Black", "white", "#F6F6F6", "#1A1A1A", "#D9D9D9"),
      c("black", "Black/White", "black", "#1A1A1A", "#F6F6F6", "#333333")
    ],
    sizes: SOCKS,
    price: 2_000,
    rating: 4.8,
    reviewCount: 4310,
    stock: 400,
    popularity: 89,
    addedAt: "2025-01-10"
  }),
  p({
    id: "club-cap",
    name: "KINETIK Club",
    subtitle: "Unstructured Cap",
    description: "A soft, washed-cotton cap with a curved bill and an adjustable strap.",
    details: ["Washed cotton twill", "Adjustable back strap", "Embroidered logo"],
    styleCode: "KCC-001",
    category: "accessories",
    genders: ["men", "women"],
    sport: "lifestyle",
    art: "cap",
    colors: [
      c("black", "Black/White", "black", "#1A1A1A", "#FFFFFF", "#1A1A1A"),
      c("khaki", "Khaki", "brown", "#B9A47E", "#1A1A1A", "#B9A47E"),
      c("navy", "Navy", "blue", "#1E2A4A", "#FFFFFF", "#1E2A4A")
    ],
    sizes: ONE_SIZE,
    price: 2_800,
    rating: 4.6,
    reviewCount: 990,
    stock: 250,
    popularity: 73,
    addedAt: "2025-06-30"
  }),
  p({
    id: "utility-duffel",
    name: "KINETIK Utility",
    subtitle: "Training Duffel Bag (40L)",
    description: "A tough, water-resistant duffel with a ventilated shoe compartment and a padded shoulder strap.",
    details: ["Ventilated shoe pocket", "Water-resistant base", "Padded shoulder strap", "40 litres"],
    styleCode: "KUD-040",
    category: "accessories",
    genders: ["men", "women"],
    sport: "training",
    art: "bag",
    colors: [
      c("black", "Black/White", "black", "#1A1A1A", "#FFFFFF", "#333333"),
      c("olive", "Cargo Khaki", "green", "#5E6B3A", "#1A1A1A", "#4A552E")
    ],
    sizes: ONE_SIZE,
    price: 5_500,
    rating: 4.7,
    reviewCount: 610,
    badge: "limited",
    stock: 8,
    popularity: 66,
    addedAt: "2026-09-09"
  })
]
