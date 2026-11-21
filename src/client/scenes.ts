import type { ArtKind, RoomId } from "../shared/Domain.ts"

export interface SceneItem {
  readonly kind: ArtKind
  readonly color: string
  readonly accent: string
  readonly x: number
  readonly y: number
  readonly scale: number
}

export interface Scene {
  readonly wall: string
  readonly floor: string
  readonly items: ReadonlyArray<SceneItem>
}

// Positions are in a 1200×600 canvas; the floor starts at y = 470. Each item is
// drawn on a 400×400 canvas with its feet at y ≈ 330, so `y = floorY - 330 * scale`.
const at = (kind: ArtKind, color: string, accent: string, cx: number, floorY: number, scale: number): SceneItem => ({
  kind,
  color,
  accent,
  scale,
  x: cx - 200 * scale,
  y: floorY - 330 * scale
})

export const scenes: Record<RoomId, Scene> = {
  "living-room": {
    wall: "#E8E1D5",
    floor: "#CDB394",
    items: [
      at("mirror", "#B8913E", "#B8913E", 940, 250, 0.5),
      at("floor-lamp", "#EFE6D2", "#B8913E", 300, 505, 1.3),
      at("sofa", "#8FA58A", "#C89B6D", 600, 505, 1.3),
      at("cushion", "#D1A33F", "#FFFFFF", 500, 392, 0.3),
      at("cushion", "#E2B3A5", "#FFFFFF", 700, 392, 0.3),
      at("plant", "#ECE7DE", "#5E8A5F", 940, 505, 0.75),
      at("coffee-table", "#C89B6D", "#C89B6D", 600, 585, 0.95)
    ]
  },
  bedroom: {
    wall: "#DDE2E8",
    floor: "#C9B79D",
    items: [
      at("mirror", "#2B2B2B", "#2B2B2B", 260, 350, 0.42),
      at("bed", "#B9BCC2", "#C89B6D", 600, 540, 1.45),
      at("dresser", "#F4F1EA", "#C89B6D", 1000, 520, 0.8),
      at("table-lamp", "#F3EFE6", "#B8913E", 990, 412, 0.4),
      at("plant", "#C0714F", "#5E8A5F", 200, 530, 0.8),
      at("pendant-lamp", "#F5F2EC", "#333333", 600, 140, 0.55)
    ]
  },
  dining: {
    wall: "#EDE4D6",
    floor: "#B99C7B",
    items: [
      at("pendant-lamp", "#C98E6E", "#333333", 600, 170, 0.7),
      at("dining-chair", "#D9B48A", "#D9B48A", 380, 530, 0.95),
      at("dining-chair", "#D9B48A", "#D9B48A", 820, 530, 0.95),
      at("dining-table", "#D9B48A", "#D9B48A", 600, 560, 1.35),
      at("vase", "#CFE0DC", "#6E8F62", 600, 345, 0.42),
      at("mugs", "#7E95A3", "#F1ECE3", 720, 330, 0.3),
      at("bookcase", "#F4F1EA", "#F4F1EA", 1080, 520, 1.05)
    ]
  },
  workspace: {
    wall: "#E3E7E1",
    floor: "#C7AF8E",
    items: [
      at("bookcase", "#C89B6D", "#C89B6D", 190, 520, 1.15),
      at("desk", "#C89B6D", "#C89B6D", 640, 520, 1.25),
      at("dining-chair", "#33302D", "#33302D", 640, 560, 0.85),
      at("floor-lamp", "#3B3B3B", "#3B3B3B", 1020, 520, 1.05),
      at("plant", "#35517A", "#5E8A5F", 1100, 560, 0.55)
    ]
  },
  outdoor: {
    wall: "#CFE3EA",
    floor: "#A8805A",
    items: [
      at("plant", "#C0714F", "#5E8A5F", 160, 520, 1.0),
      at("lounger", "#6E8FB0", "#9C6B43", 450, 540, 1.25),
      at("armchair", "#D9CBB0", "#9C6B43", 820, 520, 0.95),
      at("dining-table", "#A9774B", "#3C3C3C", 1040, 540, 0.75),
      at("vase", "#D5A46A", "#6E8F62", 1040, 375, 0.3)
    ]
  }
}
