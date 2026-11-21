import type { ReactNode } from "react"
import type { ArtKind } from "../../shared/Domain.ts"

// Every product is drawn as a small vector illustration on a 400×400 canvas.
// No photos are needed, so the store loads fast and works offline.

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

interface Paint {
  readonly color: string
  readonly accent: string
}

const LEAF = "#5E8A5F"

const shapes: Record<ArtKind, (paint: Paint) => ReactNode> = {
  sofa: ({ color, accent }) => (
    <g>
      <rect x="66" y="142" width="268" height="132" rx="26" fill={shade(color, -0.12)} />
      <rect x="84" y="156" width="74" height="78" rx="18" fill={shade(color, 0.06)} />
      <rect x="163" y="156" width="74" height="78" rx="18" fill={shade(color, 0.06)} />
      <rect x="242" y="156" width="74" height="78" rx="18" fill={shade(color, 0.06)} />
      <rect x="80" y="226" width="118" height="46" rx="14" fill={shade(color, 0.14)} />
      <rect x="202" y="226" width="118" height="46" rx="14" fill={shade(color, 0.14)} />
      <rect x="44" y="196" width="50" height="104" rx="22" fill={color} />
      <rect x="306" y="196" width="50" height="104" rx="22" fill={color} />
      <rect x="60" y="264" width="280" height="38" rx="10" fill={shade(color, -0.2)} />
      <rect x="78" y="300" width="10" height="26" rx="3" fill={accent} transform="rotate(8 83 300)" />
      <rect x="312" y="300" width="10" height="26" rx="3" fill={accent} transform="rotate(-8 317 300)" />
    </g>
  ),
  armchair: ({ color, accent }) => (
    <g>
      <rect x="116" y="104" width="168" height="170" rx="64" fill={shade(color, -0.1)} />
      <rect x="134" y="120" width="132" height="120" rx="48" fill={shade(color, 0.08)} />
      <rect x="128" y="232" width="144" height="46" rx="16" fill={shade(color, 0.16)} />
      <rect x="96" y="190" width="44" height="104" rx="22" fill={color} />
      <rect x="260" y="190" width="44" height="104" rx="22" fill={color} />
      <rect x="110" y="270" width="180" height="32" rx="12" fill={shade(color, -0.2)} />
      <rect x="128" y="298" width="10" height="34" rx="3" fill={accent} transform="rotate(12 133 298)" />
      <rect x="262" y="298" width="10" height="34" rx="3" fill={accent} transform="rotate(-12 267 298)" />
    </g>
  ),
  "dining-chair": ({ color }) => (
    <g>
      <rect x="138" y="88" width="12" height="236" rx="5" fill={shade(color, -0.18)} />
      <rect x="250" y="88" width="12" height="236" rx="5" fill={shade(color, -0.18)} />
      <path d="M132 96 Q200 76 268 96 L268 132 Q200 114 132 132 Z" fill={color} />
      <rect x="160" y="140" width="10" height="76" rx="4" fill={shade(color, -0.08)} />
      <rect x="195" y="136" width="10" height="80" rx="4" fill={shade(color, -0.08)} />
      <rect x="230" y="140" width="10" height="76" rx="4" fill={shade(color, -0.08)} />
      <path d="M118 214 L282 214 L292 240 L108 240 Z" fill={shade(color, 0.1)} />
      <rect x="108" y="238" width="184" height="12" rx="4" fill={shade(color, -0.12)} />
      <rect x="114" y="248" width="13" height="86" rx="5" fill={color} />
      <rect x="273" y="248" width="13" height="86" rx="5" fill={color} />
    </g>
  ),
  "dining-table": ({ color, accent }) => (
    <g>
      <path d="M58 196 L342 196 L362 222 L38 222 Z" fill={shade(color, 0.12)} />
      <rect x="38" y="220" width="324" height="14" rx="3" fill={shade(color, -0.12)} />
      <rect x="62" y="234" width="276" height="16" fill={shade(color, -0.25)} />
      <rect x="62" y="234" width="16" height="96" rx="3" fill={accent === color ? shade(color, -0.05) : accent} />
      <rect x="322" y="234" width="16" height="96" rx="3" fill={accent === color ? shade(color, -0.05) : accent} />
      <rect x="96" y="234" width="12" height="78" rx="3" fill={shade(accent, -0.25)} />
      <rect x="292" y="234" width="12" height="78" rx="3" fill={shade(accent, -0.25)} />
    </g>
  ),
  "coffee-table": ({ color }) => (
    <g>
      <rect x="132" y="222" width="12" height="96" rx="4" fill={shade(color, -0.22)} transform="rotate(10 138 222)" />
      <rect x="256" y="222" width="12" height="96" rx="4" fill={shade(color, -0.22)} transform="rotate(-10 262 222)" />
      <ellipse cx="200" cy="286" rx="104" ry="24" fill={shade(color, -0.1)} />
      <ellipse cx="200" cy="282" rx="104" ry="24" fill={shade(color, 0.08)} />
      <rect x="194" y="232" width="12" height="96" rx="4" fill={shade(color, -0.3)} />
      <ellipse cx="200" cy="222" rx="146" ry="40" fill={shade(color, -0.16)} />
      <ellipse cx="200" cy="214" rx="146" ry="40" fill={shade(color, 0.12)} />
      <rect x="160" y="196" width="46" height="8" rx="2" fill="#3E5C76" opacity="0.8" />
      <rect x="164" y="189" width="40" height="8" rx="2" fill="#D98F5C" opacity="0.85" />
      <circle cx="244" cy="200" r="12" fill="#F5F1EA" />
      <circle cx="244" cy="200" r="8" fill="#7A5236" />
    </g>
  ),
  desk: ({ color }) => (
    <g>
      <rect x="226" y="108" width="108" height="72" rx="6" fill="#2F3337" />
      <rect x="232" y="114" width="96" height="58" rx="3" fill="#7FA3B8" />
      <rect x="274" y="180" width="12" height="18" fill="#2F3337" />
      <rect x="256" y="194" width="48" height="6" rx="3" fill="#2F3337" />
      <path d="M96 186 L156 186 L164 198 L88 198 Z" fill="#C9CDD2" />
      <rect x="98" y="150" width="56" height="38" rx="3" fill="#DADDE1" transform="skewX(-8)" />
      <rect x="40" y="198" width="320" height="16" rx="4" fill={color} />
      <rect x="40" y="212" width="320" height="6" fill={shade(color, -0.2)} />
      <rect x="220" y="218" width="120" height="38" rx="3" fill={shade(color, -0.06)} />
      <rect x="262" y="234" width="36" height="5" rx="2.5" fill={shade(color, -0.35)} />
      <rect x="52" y="218" width="12" height="112" rx="3" fill={shade(color, -0.3)} />
      <rect x="336" y="218" width="12" height="112" rx="3" fill={shade(color, -0.3)} />
      <path d="M64 320 L132 320" stroke={shade(color, -0.3)} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="80" cy="186" rx="15" ry="6" fill="#B66F4E" />
      <path d="M68 186 Q80 150 82 140 M80 186 Q70 160 60 154 M84 186 Q96 164 100 156" stroke={LEAF} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  ),
  bed: ({ color, accent }) => (
    <g>
      <rect x="44" y="120" width="312" height="140" rx="22" fill={color} />
      <rect x="58" y="132" width="284" height="80" rx="16" fill={shade(color, 0.12)} />
      <rect x="40" y="250" width="320" height="52" rx="12" fill={shade(color, -0.14)} />
      <rect x="54" y="226" width="292" height="38" rx="10" fill="#FBF9F4" />
      <rect x="84" y="196" width="104" height="44" rx="18" fill="#FFFFFF" />
      <rect x="212" y="196" width="104" height="44" rx="18" fill="#F7F4EE" />
      <path d="M54 240 L346 240 L352 286 Q200 300 48 286 Z" fill={shade(color, 0.42)} />
      <path d="M54 240 L346 240 L348 252 L52 252 Z" fill={shade(color, 0.28)} />
      <rect x="60" y="300" width="12" height="22" rx="3" fill={accent} />
      <rect x="328" y="300" width="12" height="22" rx="3" fill={accent} />
    </g>
  ),
  bookcase: ({ color }) => {
    const books: Array<[number, number, number, string]> = [
      [126, 88, 14, "#3F5E4B"], [142, 94, 12, "#D1A33F"], [156, 84, 16, "#B5603B"], [174, 96, 10, "#2F3E57"],
      [128, 156, 18, "#C99A93"], [148, 150, 12, "#5B7C99"], [162, 162, 14, "#E8DFCF"],
      [226, 220, 14, "#7E7F4E"], [242, 214, 16, "#2B2B2B"], [260, 224, 12, "#C56A4A"],
      [126, 282, 16, "#4F6B5A"], [144, 288, 12, "#D8CBB4"], [158, 280, 14, "#7F93A8"], [174, 290, 10, "#B8913E"]
    ]
    const inner = shade(color, -0.22)
    return (
      <g>
        <rect x="108" y="60" width="184" height="286" rx="4" fill={color} stroke={shade(color, -0.2)} strokeWidth="2" />
        {[72, 138, 204, 270].map((y) => <rect key={y} x="120" y={y} width="160" height="56" fill={inner} />)}
        {books.map(([x, y, w, fill], i) => {
          const shelfBottom = [128, 194, 260, 326].find((b) => b > y) ?? 326
          return <rect key={i} x={x} y={y} width={w} height={shelfBottom - y} rx="2" fill={fill} />
        })}
        <rect x="222" y="104" width="30" height="24" rx="4" fill="#ECE7DE" />
        <path d="M228 104 Q222 84 214 80 M237 104 Q238 82 246 76 M244 104 Q256 92 262 92" stroke={LEAF} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="160" cy="236" r="16" fill="#E8DFCF" />
        <rect x="108" y="342" width="184" height="10" fill={shade(color, -0.12)} />
      </g>
    )
  },
  dresser: ({ color, accent }) => (
    <g>
      <rect x="56" y="140" width="288" height="168" rx="8" fill={color} stroke={shade(color, -0.2)} strokeWidth="2" />
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => (
          <g key={`${row}-${col}`}>
            <rect x={70 + col * 134} y={154 + row * 50} width="126" height="42" rx="4" fill={shade(color, 0.08)} stroke={shade(color, -0.1)} strokeWidth="1.5" />
            <rect x={70 + col * 134 + 43} y={154 + row * 50 + 4} width="40" height="5" rx="2.5" fill={shade(color, -0.3)} />
          </g>
        ))
      )}
      <rect x="70" y="306" width="10" height="22" rx="3" fill={accent} />
      <rect x="320" y="306" width="10" height="22" rx="3" fill={accent} />
      <rect x="96" y="104" width="30" height="36" rx="6" fill="#E8DFCF" />
      <rect x="250" y="96" width="56" height="44" rx="3" fill="#F7F4EE" stroke="#2B2B2B" strokeWidth="4" />
      <path d="M256 132 L272 116 L284 126 L300 108" stroke="#8FA58A" strokeWidth="4" fill="none" />
    </g>
  ),
  wardrobe: ({ color, accent }) => (
    <g>
      <rect x="106" y="48" width="188" height="300" rx="6" fill={color} stroke={shade(color, -0.2)} strokeWidth="2" />
      <rect x="114" y="56" width="84" height="284" rx="3" fill={shade(color, 0.08)} stroke={shade(color, -0.12)} strokeWidth="1.5" />
      <rect x="202" y="56" width="84" height="284" rx="3" fill={shade(color, 0.08)} stroke={shade(color, -0.12)} strokeWidth="1.5" />
      <rect x="186" y="170" width="5" height="44" rx="2.5" fill={accent} />
      <rect x="209" y="170" width="5" height="44" rx="2.5" fill={accent} />
      <rect x="112" y="346" width="12" height="10" fill={shade(color, -0.35)} />
      <rect x="276" y="346" width="12" height="10" fill={shade(color, -0.35)} />
    </g>
  ),
  "floor-lamp": ({ color, accent }) => (
    <g>
      <circle cx="268" cy="196" r="70" fill="url(#glow)" />
      <path d="M118 336 L118 120 Q118 60 190 62 Q260 64 268 132" stroke={accent} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M232 132 L304 132 L322 190 L214 190 Z" fill={color} stroke={shade(color, -0.18)} strokeWidth="2" strokeLinejoin="round" />
      <path d="M232 132 L304 132 L306 140 L230 140 Z" fill={shade(color, -0.12)} />
      <ellipse cx="118" cy="338" rx="44" ry="12" fill="#9C9C9C" />
      <ellipse cx="118" cy="334" rx="44" ry="12" fill="#D9D6D0" />
      <rect x="150" y="328" width="18" height="6" rx="3" fill={accent} />
    </g>
  ),
  "table-lamp": ({ color, accent }) => (
    <g>
      <circle cx="200" cy="190" r="110" fill="url(#glow)" />
      <path d="M96 196 Q100 96 200 92 Q300 96 304 196 Z" fill={color} stroke={shade(color, -0.18)} strokeWidth="2" />
      <path d="M96 196 Q200 214 304 196 L304 200 Q200 220 96 200 Z" fill={shade(color, -0.15)} />
      <path d="M132 160 Q150 118 196 108" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="10" fill="none" strokeLinecap="round" />
      <rect x="186" y="206" width="28" height="70" rx="4" fill={shade(color, -0.06)} stroke={shade(color, -0.18)} strokeWidth="2" />
      <path d="M150 312 Q150 272 200 272 Q250 272 250 312 Z" fill={color} stroke={shade(color, -0.18)} strokeWidth="2" />
      <rect x="146" y="308" width="108" height="14" rx="7" fill={shade(color, -0.18)} />
      <path d="M250 316 Q300 320 318 340" stroke={accent} strokeWidth="3" fill="none" />
    </g>
  ),
  "pendant-lamp": ({ color, accent }) => (
    <g>
      <circle cx="200" cy="250" r="120" fill="url(#glow)" />
      <rect x="198" y="0" width="4" height="118" fill={accent} />
      <rect x="186" y="112" width="28" height="18" rx="4" fill={accent} />
      <path d="M200 124 L326 240 L74 240 Z" fill={color} stroke={shade(color, -0.18)} strokeWidth="2" strokeLinejoin="round" />
      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M200 126 L${200 + i * 23} 240`} stroke={shade(color, -0.12)} strokeWidth="2" />
      ))}
      <path d="M74 240 L326 240 L318 252 L82 252 Z" fill={shade(color, -0.2)} />
      <ellipse cx="200" cy="250" rx="34" ry="8" fill="#FFF3C9" />
    </g>
  ),
  rug: ({ color, accent }) => (
    <g>
      <path d="M96 150 L304 150 L364 318 L36 318 Z" fill={color} />
      <path d="M108 160 L292 160 L344 308 L56 308 Z" fill="none" stroke={accent} strokeWidth="5" opacity="0.8" />
      {[0, 1, 2, 3].map((i) => {
        const y = 186 + i * 32
        const spread = 20 + i * 12
        return (
          <path
            key={i}
            d={`M${120 - spread} ${y} Q${160 - spread / 2} ${y - 16} 200 ${y} T${280 + spread} ${y}`}
            stroke={accent}
            strokeWidth="5"
            fill="none"
            opacity="0.75"
          />
        )
      })}
      {Array.from({ length: 17 }, (_, i) => (
        <path key={i} d={`M${40 + i * 20} 318 L${38 + i * 20} 332`} stroke={shade(color, -0.15)} strokeWidth="3" />
      ))}
    </g>
  ),
  plant: ({ color, accent }) => (
    <g>
      <path d="M200 216 Q140 120 96 110 Q132 170 196 222 Z" fill={accent} />
      <path d="M204 216 Q262 116 312 104 Q280 172 208 222 Z" fill={shade(accent, -0.15)} />
      <path d="M200 220 Q186 110 214 54 Q236 130 206 222 Z" fill={shade(accent, 0.1)} />
      <path d="M196 220 Q120 190 80 200 Q132 236 196 228 Z" fill={shade(accent, -0.05)} />
      <path d="M206 220 Q280 186 324 196 Q276 236 206 228 Z" fill={shade(accent, 0.04)} />
      <ellipse cx="200" cy="322" rx="88" ry="12" fill={shade(color, -0.22)} />
      <path d="M126 218 L274 218 L258 318 L142 318 Z" fill={color} stroke={shade(color, -0.12)} strokeWidth="2" />
      <rect x="118" y="210" width="164" height="22" rx="6" fill={shade(color, 0.08)} />
      <path d="M150 250 L152 300" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />
    </g>
  ),
  mirror: ({ color }) => (
    <g>
      <defs>
        <linearGradient id="mirrorGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9F0F2" />
          <stop offset="1" stopColor="#B8C8CF" />
        </linearGradient>
      </defs>
      <path d="M200 40 L200 70" stroke={color} strokeWidth="3" />
      <circle cx="200" cy="38" r="6" fill={shade(color, -0.2)} />
      <circle cx="200" cy="200" r="132" fill={color} />
      <circle cx="200" cy="200" r="122" fill="url(#mirrorGlass)" />
      <path d="M130 170 L190 110" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <path d="M146 200 L218 128" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
  cushion: ({ color, accent }) => (
    <g>
      <path
        d="M92 112 Q200 92 308 112 Q326 200 308 288 Q200 308 92 288 Q74 200 92 112 Z"
        fill={color}
      />
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 7 }, (_, col) => (
          <path
            key={`${row}-${col}`}
            d={`M${112 + col * 28} ${134 + row * 26} l7 8 l7 -8`}
            stroke={shade(color, -0.12)}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        ))
      )}
      <path d="M110 128 Q200 112 290 128" stroke={accent} strokeOpacity="0.4" strokeWidth="6" fill="none" strokeLinecap="round" />
    </g>
  ),
  throw: ({ color, accent }) => (
    <g>
      <rect x="70" y="232" width="260" height="64" rx="16" fill={shade(color, -0.12)} />
      <rect x="84" y="176" width="232" height="64" rx="16" fill={color} />
      <rect x="96" y="122" width="208" height="62" rx="16" fill={shade(color, 0.1)} />
      {[140, 196, 252].map((y, i) => (
        <rect key={y} x={100 - i * 12} y={y + 14} width={200 + i * 24} height="6" fill={accent} opacity="0.55" />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${86 + i * 21} 296 L${84 + i * 21} 312`} stroke={shade(color, -0.12)} strokeWidth="3" strokeLinecap="round" />
      ))}
    </g>
  ),
  mugs: ({ color, accent }) => {
    const mug = (x: number, y: number, fill: string, key: number) => (
      <g key={key}>
        <path d={`M${x + 58} ${y + 24} q28 0 28 26 q0 26 -28 26`} stroke={fill} strokeWidth="10" fill="none" />
        <rect x={x} y={y} width="64" height="84" rx="10" fill={fill} />
        <ellipse cx={x + 32} cy={y + 4} rx="30" ry="6" fill={shade(fill, -0.3)} />
        <rect x={x} y={y + 56} width="64" height="28" rx="8" fill={shade(fill, -0.12)} />
        <rect x={x + 10} y={y + 14} width="8" height="36" rx="4" fill={accent} opacity="0.35" />
      </g>
    )
    return (
      <g>
        {mug(90, 154, shade(color, 0.12), 0)}
        {mug(190, 154, shade(color, -0.12), 1)}
        {mug(136, 232, color, 2)}
        {mug(240, 232, shade(color, 0.28), 3)}
      </g>
    )
  },
  vase: ({ color, accent }) => (
    <g>
      <path d="M200 182 Q190 110 150 70 M204 182 Q210 100 250 60 M202 182 Q200 120 204 50" stroke={accent} strokeWidth="4" fill="none" />
      {[[150, 72, -30], [178, 96, -20], [250, 62, 30], [228, 92, 24], [204, 52, 0], [196, 120, -10]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="16" ry="8" fill={i % 2 ? accent : shade(accent, 0.15)} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <path d="M168 178 L232 178 Q240 210 262 240 Q284 286 252 324 L148 324 Q116 286 138 240 Q160 210 168 178 Z" fill={color} opacity="0.85" />
      {[-36, -18, 0, 18, 36].map((dx) => (
        <path key={dx} d={`M${200 + dx * 0.35} 182 Q${200 + dx * 1.4} 270 ${200 + dx} 322`} stroke={shade(color, -0.12)} strokeWidth="2.5" fill="none" />
      ))}
      <path d="M150 300 Q138 270 158 240" stroke="#FFFFFF" strokeWidth="6" opacity="0.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  basket: ({ color }) => {
    const basket = (x: number, y: number, w: number, h: number, key: number) => (
      <g key={key}>
        <path d={`M${x} ${y} L${x + w} ${y} L${x + w - 14} ${y + h} L${x + 14} ${y + h} Z`} fill={color} />
        {Array.from({ length: Math.floor(h / 14) }, (_, i) => (
          <path key={i} d={`M${x + 2 + i} ${y + 10 + i * 14} L${x + w - 2 - i} ${y + 10 + i * 14}`} stroke={shade(color, -0.2)} strokeWidth="3" />
        ))}
        {Array.from({ length: Math.floor(w / 18) }, (_, i) => (
          <path key={`v${i}`} d={`M${x + 12 + i * 18} ${y} L${x + 14 + i * 17} ${y + h}`} stroke={shade(color, 0.12)} strokeWidth="2" />
        ))}
        <rect x={x - 4} y={y - 8} width={w + 8} height="14" rx="7" fill={shade(color, -0.12)} />
        <path d={`M${x + 18} ${y + 22} q12 -10 24 0`} stroke={shade(color, -0.4)} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d={`M${x + w - 42} ${y + 22} q12 -10 24 0`} stroke={shade(color, -0.4)} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    )
    return (
      <g>
        <rect x="74" y="150" width="120" height="28" rx="10" fill="#E9DDC7" transform="rotate(-6 134 164)" />
        {basket(60, 172, 170, 150, 0)}
        {basket(230, 220, 120, 102, 1)}
      </g>
    )
  },
  lounger: ({ color, accent }) => (
    <g>
      <path d="M60 262 L250 262 L330 164" stroke={accent} strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M64 236 L246 236 L322 138 L344 150 L262 256 L64 256 Z" fill={color} />
      {color !== "#6E8FB0" ? null : [100, 150, 200].map((x) => <rect key={x} x={x} y="236" width="20" height="20" fill="#F4F1EA" />)}
      <path d="M260 250 L280 224 L300 198 L320 172" stroke={shade(color, -0.2)} strokeWidth="3" />
      <rect x="72" y="262" width="12" height="62" rx="4" fill={shade(accent, -0.15)} />
      <rect x="226" y="262" width="12" height="62" rx="4" fill={shade(accent, -0.15)} />
      <circle cx="78" cy="326" r="10" fill="#3A3A3A" />
      <path d="M96 288 L220 288" stroke={accent} strokeWidth="8" strokeLinecap="round" />
    </g>
  )
}

const floorless = new Set<ArtKind>(["pendant-lamp", "mirror"])

export function ArtDefs() {
  return (
    <defs>
      <radialGradient id="glow">
        <stop offset="0" stopColor="#FFE9A8" stopOpacity="0.75" />
        <stop offset="1" stopColor="#FFE9A8" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

export function ArtShape({ kind, color, accent }: { kind: ArtKind; color: string; accent: string }) {
  return <>{shapes[kind]({ color, accent })}</>
}

export function ProductArt({
  kind,
  color,
  accent,
  tint = "#EFEBE4",
  label,
  className
}: {
  kind: ArtKind
  color: string
  accent: string
  tint?: string
  label?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={label} className={className}>
      <ArtDefs />
      <rect width="400" height="400" fill={tint} />
      {floorless.has(kind) ? null : <ellipse cx="200" cy="334" rx="160" ry="16" fill="#000" opacity="0.06" />}
      <ArtShape kind={kind} color={color} accent={accent} />
    </svg>
  )
}

/** A whole room composed from product shapes, used for hero and room banners. */
export function RoomScene({
  wall,
  floor,
  items,
  label,
  className
}: {
  wall: string
  floor: string
  items: ReadonlyArray<{ kind: ArtKind; color: string; accent: string; x: number; y: number; scale: number }>
  label?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className={className}>
      <ArtDefs />
      <rect width="1200" height="600" fill={wall} />
      <rect y="470" width="1200" height="130" fill={floor} />
      <rect y="466" width="1200" height="8" fill={shade(wall, -0.08)} />
      <g className="scene-items">
        {items.map((item, i) => (
          <g key={i} transform={`translate(${item.x} ${item.y}) scale(${item.scale})`}>
            <ArtShape kind={item.kind} color={item.color} accent={item.accent} />
          </g>
        ))}
      </g>
    </svg>
  )
}
