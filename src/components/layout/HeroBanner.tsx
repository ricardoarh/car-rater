import { HeartIcon } from './Icons';
import './HeroBanner.css';

/**
 * The automotive hero from the concept: a coast road at golden hour.
 * Drawn as inline SVG rather than a bitmap so it stays crisp, weighs almost
 * nothing and renders with no network connection at all.
 */
export function HeroBanner() {
  return (
    <div
      className="hero"
      role="img"
      aria-label="A coast road winding through hills at golden hour"
    >
      <svg className="hero__art" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6fa8c9" />
            <stop offset="42%" stopColor="#a8cbdb" />
            <stop offset="78%" stopColor="#e3d6bd" />
            <stop offset="100%" stopColor="#f0dfc2" />
          </linearGradient>
          <radialGradient id="hero-glow" cx="0.79" cy="0.36" r="0.46">
            <stop offset="0%" stopColor="#fff3d2" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#ffe9b8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffe9b8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-ridge3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fa9b4" />
            <stop offset="100%" stopColor="#a9bcc0" />
          </linearGradient>
          <linearGradient id="hero-ridge2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#63838a" />
            <stop offset="100%" stopColor="#7d9a94" />
          </linearGradient>
          <linearGradient id="hero-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6fa0b3" />
            <stop offset="100%" stopColor="#3f6c83" />
          </linearGradient>
          <linearGradient id="hero-ridge1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4c6f5b" />
            <stop offset="100%" stopColor="#31503f" />
          </linearGradient>
          <linearGradient id="hero-rock" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#cbab7e" />
            <stop offset="55%" stopColor="#a8895f" />
            <stop offset="100%" stopColor="#7d6644" />
          </linearGradient>
          <linearGradient id="hero-road" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#c3bcb0" />
            <stop offset="100%" stopColor="#8a857c" />
          </linearGradient>
          <linearGradient id="hero-verge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5e7d55" />
            <stop offset="100%" stopColor="#3d5b3c" />
          </linearGradient>
          <linearGradient id="hero-vignette" x1="0.1" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="rgba(8,26,24,0.46)" />
            <stop offset="46%" stopColor="rgba(8,26,24,0.06)" />
            <stop offset="100%" stopColor="rgba(8,26,24,0.34)" />
          </linearGradient>
        </defs>

        <rect width="400" height="220" fill="url(#hero-sky)" />
        <rect width="400" height="220" fill="url(#hero-glow)" />
        <circle cx="316" cy="78" r="13" fill="#fff6de" opacity="0.85" />

        {/* furthest ridgeline, hazy */}
        <path
          d="M0 112 C 26 100 44 106 66 98 C 92 88 108 100 132 94 C 158 87 176 96 200 90
             C 226 83 246 94 272 88 C 296 82 318 92 344 87 C 366 83 384 90 400 86 L400 220 H0Z"
          fill="url(#hero-ridge3)"
          opacity="0.85"
        />

        {/* the sea */}
        <path d="M104 118 H400 V146 H128Z" fill="url(#hero-sea)" />
        <path
          d="M160 126 h40 M226 133 h30 M286 122 h38 M198 139 h34"
          stroke="#d6eaf1"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* mid ridge */}
        <path
          d="M86 128 C 112 112 132 124 158 116 C 184 108 204 122 232 114
             C 258 107 280 122 308 116 C 334 110 362 124 400 118 L400 220 H86Z"
          fill="url(#hero-ridge2)"
        />

        {/* near hills */}
        <path
          d="M0 142 C 34 128 62 144 96 136 C 132 128 158 148 194 142
             C 232 136 258 154 296 148 C 332 142 366 156 400 150 L400 220 H0Z"
          fill="url(#hero-ridge1)"
        />
        <path
          d="M214 148 l7 -11 6 11 M248 154 l6 -10 6 10 M306 150 l6 -10 6 10"
          fill="#294435"
          opacity="0.6"
        />

        {/* the road */}
        <path
          d="M-16 220 C 30 188 68 166 104 152 C 146 136 192 142 238 140
             C 290 138 344 146 400 142 L400 160 C 344 164 292 156 240 158
             C 194 160 152 155 116 169 C 82 182 52 200 30 220Z"
          fill="url(#hero-road)"
        />
        <path
          d="M40 202 l16 -14 M84 172 l18 -10 M136 153 l20 -5 M190 147 l20 -1"
          stroke="#f6f2e6"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.78"
        />
        {/* grass verge above the road */}
        <path
          d="M-16 214 C 30 182 68 160 104 146 C 146 130 192 136 238 134
             C 290 132 344 140 400 136 L400 142 C 344 146 290 138 238 140
             C 192 142 146 136 104 152 C 68 166 30 188 -16 220Z"
          fill="url(#hero-verge)"
        />

        {/* foreground cliff on the left */}
        <path
          d="M0 58 C 14 50 26 54 38 48 C 52 42 60 56 72 66 C 84 76 92 96 100 118
             C 108 140 114 176 118 220 H0Z"
          fill="url(#hero-rock)"
        />
        <path
          d="M30 68 C 44 78 54 80 62 90 C 72 102 82 122 88 146 C 94 170 98 196 100 220
             L64 220 C 58 180 44 118 30 68Z"
          fill="#8d7352"
          opacity="0.5"
        />

        <rect width="400" height="220" fill="url(#hero-vignette)" />
      </svg>

      <p className="hero__script">
        Good cars,
        <br />
        happier adventures
      </p>
      <span className="hero__heart" aria-hidden="true">
        <HeartIcon size={26} />
      </span>
    </div>
  );
}
