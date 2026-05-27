/** Product illustration for client hero (box + bag), CSS/SVG only */
export default function ClientProductIllustration({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="boxTop" x1="160" y1="120" x2="360" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3D4AD" />
          <stop offset="1" stopColor="#D4A574" />
        </linearGradient>
        <linearGradient id="boxSide" x1="160" y1="170" x2="360" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9B285" />
          <stop offset="1" stopColor="#C49A6C" />
        </linearGradient>
        <linearGradient id="bag" x1="330" y1="88" x2="468" y2="290" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2E5B3A" />
          <stop offset="1" stopColor="#1B3A24" />
        </linearGradient>
        <radialGradient id="shadow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(285 320) rotate(0) scale(190 24)">
          <stop stopColor="rgba(15,23,42,0.22)" />
          <stop offset="1" stopColor="rgba(15,23,42,0)" />
        </radialGradient>
        <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="290" cy="320" rx="190" ry="24" fill="url(#shadow)" />

      {/* paper bag */}
      <path
        d="M360 92 H458 C468 92 476 100 476 110 V292 C476 302 468 310 458 310 H352 C342 310 334 302 334 292 V130 C334 110 342 92 360 92 Z"
        fill="url(#bag)"
      />
      <path d="M360 92 H458 C468 92 476 100 476 110 V134 H334 V130 C334 110 342 92 360 92 Z" fill="rgba(255,255,255,0.06)" />
      <path
        d="M364 92 C364 62 392 50 410 64 C428 78 442 118 442 146"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M432 92 C432 62 460 50 478 64 C496 78 510 118 510 146"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="6"
        strokeLinecap="round"
        transform="translate(-34 0)"
      />
      <rect x="378" y="150" width="78" height="120" rx="14" fill="rgba(255,255,255,0.10)" />
      <path d="M408 184 h18" stroke="rgba(255,255,255,0.26)" strokeWidth="8" strokeLinecap="round" />

      {/* plant pot */}
      <ellipse cx="280" cy="170" rx="56" ry="16" fill="rgba(15,23,42,0.12)" filter="url(#soft)" />
      <path d="M240 170 H320 L306 250 C304 260 296 268 286 268 H274 C264 268 256 260 254 250 L240 170 Z" fill="#E8E2D6" stroke="#D8D1C5" strokeWidth="2" />
      <path d="M245 190 H315" stroke="rgba(0,0,0,0.06)" strokeWidth="10" strokeLinecap="round" />

      {/* plant leaves */}
      <path d="M276 88 C258 104 258 138 280 152 C302 166 330 154 338 130 C346 106 320 80 276 88 Z" fill="#22c55e" stroke="#16a34a" strokeWidth="2" />
      <path d="M264 104 C242 120 244 152 266 166 C288 180 314 170 320 150 C326 130 300 102 264 104 Z" fill="#4ade80" stroke="#22c55e" strokeWidth="2" opacity="0.95" />
      <path d="M292 96 C274 112 276 146 298 160 C320 174 348 164 356 140 C364 116 338 88 292 96 Z" fill="#16a34a" stroke="#15803d" strokeWidth="2" opacity="0.95" />

      {/* cardboard box */}
      <path d="M150 190 L312 140 L420 178 L258 228 Z" fill="url(#boxTop)" stroke="#B8956A" strokeWidth="2" />
      <path d="M150 190 L258 228 V306 L150 268 Z" fill="url(#boxSide)" stroke="#9A7B4F" strokeWidth="2" />
      <path d="M258 228 L420 178 V258 L258 306 Z" fill="#C09364" stroke="#9A7B4F" strokeWidth="2" />
      <path d="M248 148 L322 172" stroke="rgba(0,0,0,0.22)" strokeWidth="14" strokeLinecap="round" />
      <path d="M202 166 L278 194" stroke="rgba(0,0,0,0.22)" strokeWidth="14" strokeLinecap="round" />
      <path d="M190 252 H310" stroke="rgba(0,0,0,0.18)" strokeWidth="6" strokeLinecap="round" />
      <path d="M208 262 H290" stroke="rgba(0,0,0,0.10)" strokeWidth="6" strokeLinecap="round" />
      <path d="M178 286 H338" stroke="rgba(0,0,0,0.10)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
