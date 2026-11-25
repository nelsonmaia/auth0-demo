// Real photography used for campaign imagery. Every photo is CC0 (public
// domain) from StockSnap or rawpixel, found via Openverse, so no attribution is
// required; credits are listed on the /credits page anyway.

export interface PhotoInfo {
  readonly src: string
  readonly alt: string
  readonly width: number
  readonly height: number
  readonly position: string
  readonly title: string
  readonly creator: string
  readonly source: string
  readonly landing: string
}

export const photos = {
  "hero-sprint": {
    src: "/photos/hero-sprint.webp",
    alt: "A sprinter launching forward on an open road under a blue sky",
    width: 960,
    height: 541,
    position: "60% 50%",
    title: "Man Running",
    creator: "The Lazy Artist Gallery",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/man-running-APW0W8GBMM"
  },
  "feature-hoop": {
    src: "/photos/feature-hoop.webp",
    alt: "A colourful outdoor basketball hoop against the sky",
    width: 960,
    height: 639,
    position: "50% 40%",
    title: "Basketball Ring",
    creator: "Sasha Elaizz",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/basketball-ring-9ENJG43WPV"
  },
  "feature-fleece": {
    src: "/photos/feature-fleece.webp",
    alt: "A man in an orange hoodie against a teal wall",
    width: 960,
    height: 1444,
    position: "50% 30%",
    title: "Man Casual",
    creator: "Unknown",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/man-casual-XYQ5LBSIPZ"
  },
  "sport-running": {
    src: "/photos/sport-running.webp",
    alt: "Runners crossing a bridge in the city",
    width: 960,
    height: 720,
    position: "60% 50%",
    title: "Brooklybridge Running",
    creator: "Curtis Mac Newton",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/brooklybridge-running-X2Q7LBUF6U"
  },
  "sport-training": {
    src: "/photos/sport-training.webp",
    alt: "An athlete lifting a barbell in the gym",
    width: 1024,
    height: 683,
    position: "50% 50%",
    title: "Free man lifting weights gym",
    creator: "Unknown",
    source: "rawpixel",
    landing: "https://www.rawpixel.com/image/5926278/photo-image-public-domain-free-plates"
  },
  "sport-lifestyle": {
    src: "/photos/sport-lifestyle.webp",
    alt: "A woman in a grey sweatshirt sitting by a painted wall",
    width: 960,
    height: 1440,
    position: "50% 30%",
    title: "People Woman",
    creator: "Elijah Henderson",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/people-woman-G4O3GECRXM"
  },
  "sport-basketball": {
    src: "/photos/sport-basketball.webp",
    alt: "A basketball court lined with palm trees at sunset",
    width: 960,
    height: 640,
    position: "50% 50%",
    title: "Basketball Court",
    creator: "Nick Jio",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/basketball-court-BTIEX3RTYY"
  },
  "sport-trail": {
    src: "/photos/sport-trail.webp",
    alt: "Trail runners climbing a rocky forest path",
    width: 960,
    height: 638,
    position: "50% 50%",
    title: "Running Fitness",
    creator: "David Marcu",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/running-fitness-SA83WAUPEP"
  },
  "essentials-men": {
    src: "/photos/essentials-men.webp",
    alt: "A man running along a garden path in black training gear",
    width: 960,
    height: 1440,
    position: "50% 35%",
    title: "Male Running",
    creator: "Direct Media",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/male-running-A7K7DWFAB5"
  },
  "essentials-women": {
    src: "/photos/essentials-women.webp",
    alt: "A woman doing a yoga handstand on a tree-lined road",
    width: 960,
    height: 640,
    position: "50% 50%",
    title: "Girl Yoga",
    creator: "Burst",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/girl-yoga-BK5DTOTKWW"
  },
  "essentials-kids": {
    src: "/photos/essentials-kids.webp",
    alt: "Kids running and playing in a sunny park",
    width: 960,
    height: 640,
    position: "40% 40%",
    title: "Kids Playing",
    creator: "Family Moments",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/kids-playing-MQJR2N5ZH2"
  },
  "action-running": {
    src: "/photos/action-running.webp",
    alt: "A runner in black training gear on a woodland path",
    width: 960,
    height: 1440,
    position: "50% 40%",
    title: "Male Running",
    creator: "Direct Media",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/male-running-82OY5XSDOD"
  },
  "action-basketball": {
    src: "/photos/action-basketball.webp",
    alt: "A basketball resting on an outdoor court",
    width: 960,
    height: 640,
    position: "60% 50%",
    title: "Basketball Ball",
    creator: "Matt Moloney",
    source: "StockSnap",
    landing: "https://stocksnap.io/photo/basketball-ball-XREEJO0CPH"
  }
} satisfies Record<string, PhotoInfo>

export type PhotoName = keyof typeof photos
