import type { ReactNode } from "react"
import type { ArtKind } from "../../shared/Domain.ts"

// Every product is drawn as a vector illustration on a 400×400 canvas, so the
// store needs no photography. Shoes are drawn in side profile, toe to the right.

export const shade = (hex: string, amount: number): string => {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  const target = amount < 0 ? 0 : 255
  const p = Math.min(1, Math.abs(amount))
  const mix = (c: number) => Math.round((target - c) * p + c)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** Darken light colours / lighten dark ones, for overlays that must stay visible. */
const contrastShade = (hex: string, amount: number) => shade(hex, luminance(hex) > 0.55 ? -amount : amount)

export interface Paint {
  readonly primary: string
  readonly secondary: string
  readonly tertiary: string
}

/** The brand mark: a forward-leaning bolt. Drawn in a 100×100 box. */
export const BOLT_PATH = "M14 74 L64 20 L58 46 L90 38 L38 90 L44 64 Z"

const Bolt = ({ x, y, size, fill, rotate = 0 }: { x: number; y: number; size: number; fill: string; rotate?: number }) => (
  <path d={BOLT_PATH} fill={fill} transform={`translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2}) scale(${size / 100})`} />
)

// ---------------------------------------------------------------------------
// Shoes
// ---------------------------------------------------------------------------

const outline = (c: string) => ({ stroke: shade(c, -0.28), strokeWidth: 2, strokeLinejoin: "round" as const })

function Laces({ from, to, count, color }: { from: [number, number]; to: [number, number]; count: number; color: string }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        const x = from[0] + (to[0] - from[0]) * t
        const y = from[1] + (to[1] - from[1]) * t
        return (
          <g key={i}>
            <path d={`M${x - 6} ${y + 4} L${x + 12} ${y - 10}`} stroke={color} strokeWidth="6" strokeLinecap="round" />
            <circle cx={x + 6} cy={y + 12} r="3" fill={shade(color, -0.35)} opacity="0.55" />
          </g>
        )
      })}
    </g>
  )
}

function RunnerShoe({ primary, secondary, tertiary }: Paint, variant: "runner" | "racer" | "trail" | "trainer") {
  const lift = variant === "racer" ? 22 : variant === "trainer" ? -8 : 0
  const rubber = variant === "trail" ? "#2A2A2A" : shade(tertiary, -0.45)
  const upper = (
    <g transform={`translate(0 ${-lift})`}>
      {/* upper */}
      <path
        d="M44 272 L44 236 C40 202 44 172 58 150 C78 154 104 166 126 168 C134 150 150 136 172 130 C182 128 188 134 188 142 C214 172 258 198 302 214 C332 224 354 238 358 262 L358 272 Z"
        fill={primary}
        {...outline(primary)}
      />
      {/* collar lining */}
      <path d="M58 150 C78 156 104 166 126 168 L130 180 C104 178 78 168 60 162 Z" fill={shade(primary, -0.3)} />
      {/* tongue */}
      <path d="M150 142 C154 124 168 114 184 116 C194 118 196 128 192 138 L178 152 Z" fill={contrastShade(primary, 0.1)} {...outline(primary)} />
      {/* heel counter + pull tab */}
      <path d="M44 250 C40 206 44 176 58 150 L70 152 C66 182 70 214 90 250 Z" fill={contrastShade(primary, 0.12)} />
      <path d="M52 152 L50 126 C50 118 62 118 63 126 L66 154 Z" fill={secondary} />
      {/* toe cap */}
      <path d="M296 212 C330 222 354 238 358 262 L300 262 C292 244 290 226 296 212 Z" fill={contrastShade(primary, 0.08)} />
      {variant === "trainer" ? (
        <path d="M150 182 L200 262 L226 262 L174 186 Z" fill={secondary} opacity="0.9" />
      ) : null}
      {/* brand bolt */}
      <Bolt x={variant === "trainer" ? 218 : 136} y={variant === "trainer" ? 178 : 168} size={variant === "trainer" ? 70 : 96} fill={secondary} rotate={-8} />
      <Laces from={[184, 150]} to={[286, 206]} count={6} color={contrastShade(primary, 0.85)} />
    </g>
  )

  const top = 236 - lift
  return (
    <g>
      {upper}
      {/* midsole */}
      <path
        d={`M40 ${top - 4} C62 ${top + 4} 94 ${top + 10} 124 ${top + 12} L344 ${top + 22 + lift * 0.4} C364 ${top + 26 + lift * 0.4} 374 ${top + 32 + lift * 0.2} 372 274 C368 286 348 294 320 294 L60 294 C46 294 38 286 38 270 Z`}
        fill={tertiary}
        {...outline(tertiary)}
      />
      <path d={`M74 ${282 - lift * 0.3} C150 ${272 - lift * 0.6} 230 ${272 - lift * 0.5} 310 ${282 - lift * 0.2}`} stroke={shade(tertiary, -0.14)} strokeWidth="3" fill="none" />
      {variant === "racer" ? (
        <path d={`M60 ${274 - lift * 0.4} C150 ${262 - lift * 0.4} 250 ${262 - lift * 0.3} 360 ${270}`} stroke={secondary} strokeWidth="4" fill="none" />
      ) : null}
      {/* outsole */}
      <path d="M38 282 C38 296 46 302 60 302 L320 302 C348 302 366 294 374 278 L370 274 C360 288 342 294 320 294 L60 294 C48 294 40 290 38 282 Z" fill={rubber} />
      {variant === "trail"
        ? Array.from({ length: 13 }, (_, i) => <rect key={i} x={54 + i * 23} y="298" width="14" height="10" rx="2" fill="#2A2A2A" />)
        : null}
      {variant === "trail" ? (
        <path d={`M316 ${232 - lift} C344 ${240 - lift} 362 ${252 - lift} 366 270 L344 270 C340 256 330 246 314 ${242 - lift} Z`} fill="#2F2F2F" />
      ) : null}
    </g>
  )
}

function CourtShoe({ primary, secondary, tertiary }: Paint, high: boolean) {
  return (
    <g>
      {high ? (
        <path
          d="M48 266 C42 220 42 160 52 108 C78 110 110 116 138 120 C144 104 158 94 176 92 C186 92 192 100 190 110 C198 150 232 190 282 210 C322 222 356 236 362 266 Z"
          fill={primary}
          {...outline(primary)}
        />
      ) : (
        <path
          d="M48 266 C44 232 46 202 56 178 C80 182 110 190 132 190 C140 174 152 164 170 160 C180 158 186 164 186 172 C220 198 270 214 316 222 C344 228 360 242 362 266 Z"
          fill={primary}
          {...outline(primary)}
        />
      )}
      {/* collar */}
      {high ? (
        <path d="M52 108 C78 110 110 116 138 120 L140 134 C110 132 78 126 54 122 Z" fill={shade(primary, -0.3)} />
      ) : (
        <path d="M56 178 C80 182 110 190 132 190 L134 202 C110 202 80 194 58 190 Z" fill={shade(primary, -0.3)} />
      )}
      {/* toe box with perforations */}
      <path d="M300 220 C332 226 358 240 362 266 L296 266 C290 248 292 232 300 220 Z" fill={contrastShade(primary, 0.05)} {...outline(primary)} />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={312 + (i % 4) * 11 + Math.floor(i / 4) * 4} cy={236 + Math.floor(i / 4) * 9} r="2" fill={shade(primary, -0.3)} />
      ))}
      {/* heel tab */}
      <path
        d={high ? "M48 266 C42 220 42 160 52 108 L80 112 C74 160 76 220 92 266 Z" : "M48 266 C44 232 46 202 56 178 L84 182 C80 208 80 238 92 266 Z"}
        fill={secondary}
        {...outline(secondary)}
      />
      {/* eyestay */}
      <path
        d={high ? "M150 118 L190 112 C200 160 240 196 300 220 L292 232 C230 210 186 170 150 132 Z" : "M140 192 L186 172 C220 198 262 212 304 222 L298 234 C250 226 196 212 140 206 Z"}
        fill={contrastShade(primary, 0.035)}
        stroke={shade(primary, -0.12)}
        strokeWidth="1.5"
      />
      {high ? <rect x="62" y="150" width="96" height="22" rx="11" fill={secondary} transform="rotate(4 110 161)" /> : null}
      {/* side bolt */}
      <Bolt x={high ? 150 : 128} y={high ? 168 : 180} size={high ? 104 : 96} fill={secondary} rotate={-6} />
      <Laces
        from={high ? [178, 118] : [176, 180]}
        to={high ? [282, 206] : [286, 214]}
        count={high ? 7 : 5}
        color={contrastShade(primary, 0.85)}
      />
      {/* cupsole */}
      <path d="M40 262 L366 262 C372 262 374 270 372 280 L368 296 C366 302 360 304 352 304 L54 304 C44 304 38 298 38 288 Z" fill={tertiary} {...outline(tertiary)} />
      <path d="M48 276 L362 276" stroke={shade(tertiary, -0.25)} strokeWidth="2" strokeDasharray="5 5" />
      <path d="M38 294 L372 294 L368 300 C366 304 360 306 352 306 L54 306 C44 306 39 302 38 294 Z" fill={shade(tertiary, -0.2)} />
    </g>
  )
}

function Slide({ primary, secondary, tertiary }: Paint) {
  return (
    <g>
      <path d="M40 270 C40 254 56 250 80 252 L330 256 C360 258 372 268 370 280 C368 292 354 298 330 298 L64 298 C48 298 40 290 40 270 Z" fill={tertiary} {...outline(tertiary)} />
      <path d="M44 290 L366 290 C362 298 350 304 330 304 L64 304 C52 304 46 298 44 290 Z" fill={shade(tertiary, -0.25)} />
      <path d="M146 258 C146 196 184 164 236 164 C292 164 332 202 336 258 Z" fill={primary} {...outline(primary)} />
      <path d="M160 258 C162 210 192 184 236 184" stroke={shade(primary, -0.2)} strokeWidth="4" fill="none" />
      <Bolt x={196} y={172} size={86} fill={secondary} rotate={-4} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Apparel & accessories (front view)
// ---------------------------------------------------------------------------

function Tee({ primary, secondary }: Paint) {
  return (
    <g>
      <path
        d="M140 82 L172 70 C182 88 218 88 228 70 L260 82 L326 126 L298 184 L264 164 L264 330 L136 330 L136 164 L102 184 L74 126 Z"
        fill={primary}
        {...outline(primary)}
      />
      <path d="M172 70 C182 92 218 92 228 70" stroke={shade(primary, -0.22)} strokeWidth="7" fill="none" />
      <path d="M104 178 L82 136 M296 178 L318 136" stroke={shade(primary, -0.12)} strokeWidth="3" />
      <Bolt x={226} y={112} size={30} fill={secondary} />
    </g>
  )
}

function Hoodie({ primary, secondary }: Paint, zip: boolean) {
  return (
    <g>
      <path d="M152 100 C150 50 250 50 248 100 Z" fill={shade(primary, -0.18)} {...outline(primary)} />
      <path
        d="M140 92 L260 92 L318 128 L344 286 L310 292 L290 176 L286 336 L114 336 L110 176 L90 292 L56 286 L82 128 Z"
        fill={primary}
        {...outline(primary)}
      />
      <path d="M164 92 C170 120 230 120 236 92" fill={shade(primary, -0.25)} />
      <rect x="114" y="316" width="172" height="20" fill={shade(primary, -0.12)} />
      <path d="M56 286 L90 292 L88 304 L54 298 Z" fill={shade(primary, -0.12)} />
      <path d="M310 292 L344 286 L346 298 L312 304 Z" fill={shade(primary, -0.12)} />
      {zip ? (
        <>
          <path d="M200 106 L200 336" stroke={secondary} strokeWidth="5" />
          <rect x="194" y="130" width="12" height="20" rx="3" fill={secondary} />
          <path d="M226 160 L270 154" stroke={shade(primary, -0.3)} strokeWidth="3" />
          <Bolt x={124} y={130} size={34} fill={secondary} />
        </>
      ) : (
        <>
          <path d="M184 112 L180 166 M216 112 L220 166" stroke={secondary} strokeWidth="4" strokeLinecap="round" />
          <path d="M140 246 L260 246 L276 312 L124 312 Z" fill={shade(primary, -0.1)} {...outline(primary)} />
          <Bolt x={184} y={176} size={36} fill={secondary} />
        </>
      )}
    </g>
  )
}

function Shorts({ primary, secondary }: Paint) {
  return (
    <g>
      <rect x="116" y="110" width="168" height="30" rx="6" fill={shade(primary, -0.15)} {...outline(primary)} />
      <path d="M118 140 L282 140 L304 300 L214 308 L200 206 L186 308 L96 300 Z" fill={primary} {...outline(primary)} />
      <path d="M118 140 L100 296" stroke={secondary} strokeWidth="8" />
      <path d="M282 140 L300 296" stroke={secondary} strokeWidth="8" />
      <path d="M194 126 L186 170 M206 126 L214 170" stroke={contrastShade(primary, 0.7)} strokeWidth="3" strokeLinecap="round" />
      <Bolt x={232} y={256} size={30} fill={secondary} />
    </g>
  )
}

function Leggings({ primary, secondary }: Paint) {
  return (
    <g>
      <rect x="132" y="56" width="136" height="36" rx="8" fill={shade(primary, -0.12)} {...outline(primary)} />
      <path d="M134 92 L266 92 L262 170 L244 346 L208 346 L200 176 L192 346 L156 346 L138 170 Z" fill={primary} {...outline(primary)} />
      <path d="M200 92 L200 176" stroke={shade(primary, -0.25)} strokeWidth="2" />
      <path d="M150 120 C170 150 230 150 250 120" stroke={secondary} strokeWidth="2" fill="none" opacity="0.6" />
      <Bolt x={140} y={100} size={26} fill={contrastShade(primary, 0.6)} />
    </g>
  )
}

function Socks({ primary, secondary, tertiary }: Paint) {
  const sock = (dx: number, dy: number, fill: string) => (
    <g transform={`translate(${dx} ${dy})`}>
      <path d="M140 60 L208 60 L208 224 C208 246 226 258 266 262 C300 266 310 300 284 314 L166 314 C142 314 132 296 138 268 Z" fill={fill} {...outline(fill)} />
      {[72, 84, 96, 108].map((y) => <path key={y} d={`M140 ${y} L208 ${y}`} stroke={shade(fill, -0.12)} strokeWidth="2" />)}
      <path d="M138 268 C132 296 142 314 166 314 L190 314 C176 300 170 284 172 262 Z" fill={tertiary} />
      <path d="M266 262 C300 266 310 300 284 314 L262 314 C276 298 276 278 266 262 Z" fill={tertiary} />
      <Bolt x={156} y={124} size={34} fill={secondary} />
    </g>
  )
  return (
    <g>
      {sock(-36, -18, shade(primary, luminance(primary) > 0.5 ? -0.08 : 0.12))}
      {sock(20, 20, primary)}
    </g>
  )
}

function Cap({ primary, secondary }: Paint) {
  return (
    <g>
      <path d="M86 244 C86 160 148 112 214 112 C282 112 330 166 330 244 Z" fill={primary} {...outline(primary)} />
      <path d="M214 112 C190 150 180 196 182 244 M214 112 C254 150 270 196 268 244" stroke={shade(primary, -0.2)} strokeWidth="3" fill="none" />
      <circle cx="214" cy="114" r="8" fill={shade(primary, -0.2)} />
      <path d="M300 236 C338 236 380 250 392 270 C356 280 318 274 290 260 Z" fill={shade(primary, -0.12)} {...outline(primary)} />
      <rect x="82" y="238" width="252" height="14" rx="6" fill={shade(primary, -0.18)} />
      <Bolt x={198} y={170} size={50} fill={secondary} />
    </g>
  )
}

function Duffel({ primary, secondary, tertiary }: Paint) {
  return (
    <g>
      <path d="M140 170 C140 110 260 110 260 170" stroke={shade(primary, -0.25)} strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M60 196 C60 168 80 154 108 154 L292 154 C320 154 340 168 340 196 L340 286 C340 300 330 310 316 310 L84 310 C70 310 60 300 60 286 Z" fill={primary} {...outline(primary)} />
      <path d="M60 196 C60 168 80 154 108 154 L128 154 L128 310 L84 310 C70 310 60 300 60 286 Z" fill={tertiary} />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={82 + (i % 3) * 14} cy={210 + Math.floor(i / 3) * 14} r="3" fill={shade(tertiary, -0.4)} />
      ))}
      <path d="M128 170 L330 170" stroke={secondary} strokeWidth="4" strokeDasharray="2 4" />
      <rect x="300" y="164" width="10" height="16" rx="2" fill={secondary} />
      <rect x="60" y="292" width="280" height="18" fill={shade(primary, -0.2)} />
      <Bolt x={196} y={200} size={74} fill={secondary} />
    </g>
  )
}

const shapes: Record<ArtKind, (paint: Paint) => ReactNode> = {
  runner: (p) => RunnerShoe(p, "runner"),
  racer: (p) => RunnerShoe(p, "racer"),
  trail: (p) => RunnerShoe(p, "trail"),
  trainer: (p) => RunnerShoe(p, "trainer"),
  "court-low": (p) => CourtShoe(p, false),
  "court-high": (p) => CourtShoe(p, true),
  slide: Slide,
  tee: Tee,
  hoodie: (p) => Hoodie(p, false),
  jacket: (p) => Hoodie(p, true),
  shorts: Shorts,
  leggings: Leggings,
  socks: Socks,
  cap: Cap,
  bag: Duffel
}

const isShoe = (kind: ArtKind) =>
  kind === "runner" || kind === "racer" || kind === "trail" || kind === "trainer" || kind === "court-low" ||
  kind === "court-high" || kind === "slide"

export type ArtView = "side" | "mirror" | "detail" | "top"

const viewTransforms: Record<ArtView, string | undefined> = {
  side: undefined,
  mirror: "translate(400 0) scale(-1 1)",
  detail: "translate(-180 -170) scale(1.9)",
  top: "rotate(-14 200 220) translate(0 -10)"
}

export function ArtShape({ kind, paint }: { kind: ArtKind; paint: Paint }) {
  return <>{shapes[kind](paint)}</>
}

export function ProductArt({
  kind,
  paint,
  view = "side",
  background = "#F5F5F5",
  label,
  className
}: {
  kind: ArtKind
  paint: Paint
  view?: ArtView
  background?: string
  label?: string
  className?: string
}) {
  const shoe = isShoe(kind)
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={label} className={className}>
      <rect width="400" height="400" fill={background} />
      <g transform={viewTransforms[view]}>
        {shoe ? <ellipse cx="206" cy="312" rx="168" ry="10" fill="#000" opacity="0.08" /> : null}
        <g transform={shoe ? "translate(0 10)" : undefined}>
          <ArtShape kind={kind} paint={paint} />
        </g>
      </g>
    </svg>
  )
}

/** The KINETIK logo: bolt mark plus wordmark. */
export function LogoMark({ size = 28, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d={BOLT_PATH} fill={color} />
    </svg>
  )
}
