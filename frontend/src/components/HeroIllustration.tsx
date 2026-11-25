import React from "react";

export const HeroIllustration: React.FC = () => {
  return (
    <div style={{ width: "100%", maxWidth: 540, margin: "0 auto" }}>
      <svg
        viewBox="0 0 560 410"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Student learning with AI academic assistant, open textbook, and analytics"
      >
        {/* Soft background organic blob */}
        <ellipse cx="290" cy="240" rx="220" ry="145" fill="#9CB6F8" fillOpacity="0.45" />
        <ellipse cx="450" cy="135" rx="44" ry="20" transform="rotate(-38 450 135)" fill="#7EA6F6" fillOpacity="0.55" />

        {/* Wall clock */}
        <circle cx="426" cy="95" r="24" fill="#FFFFFF" stroke="#B93B62" strokeWidth="3.5" />
        <line x1="426" y1="95" x2="426" y2="82" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="426" y1="95" x2="436" y2="99" stroke="#B93B62" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="426" cy="95" r="2.5" fill="#1E293B" />

        {/* Purple chat bubble */}
        <rect x="44" y="138" width="56" height="32" rx="8" fill="#5A46A8" />
        <path d="M90 170L104 178L96 164Z" fill="#5A46A8" />
        <circle cx="60" cy="154" r="3" fill="#FFFFFF" />
        <circle cx="72" cy="154" r="3" fill="#FFFFFF" />
        <circle cx="84" cy="154" r="3" fill="#FFFFFF" />

        {/* Yellow notes floating card */}
        <rect x="266" y="70" width="114" height="58" rx="8" fill="#F5BC4E" />
        <rect x="280" y="83" width="84" height="5" rx="2.5" fill="#FFF7DE" />
        <rect x="280" y="95" width="72" height="5" rx="2.5" fill="#FFF7DE" />
        <rect x="280" y="107" width="60" height="5" rx="2.5" fill="#FFF7DE" />

        {/* Colored binder folders on left */}
        <rect x="48" y="198" width="42" height="142" rx="6" fill="#F9844A" />
        <circle cx="69" cy="222" r="11" fill="#FDE6D8" />
        <rect x="92" y="206" width="38" height="134" rx="6" fill="#70A9F7" />
        <circle cx="111" cy="228" r="9" fill="#DCEBFF" />

        {/* Large blue monitor screen */}
        <rect x="118" y="148" width="296" height="190" rx="16" fill="#2B6DE0" />
        <rect x="128" y="160" width="276" height="162" rx="10" fill="#7B9BF2" />
        {/* Browser dots */}
        <circle cx="378" cy="170" r="3" fill="#FFFFFF" />
        <circle cx="388" cy="170" r="3" fill="#FFFFFF" />
        <circle cx="398" cy="170" r="3" fill="#FFFFFF" />
        {/* Screen inner content bars */}
        <rect x="142" y="180" width="68" height="10" rx="4" fill="#B8CCF9" />
        <rect x="142" y="198" width="52" height="8" rx="4" fill="#D5E2FC" />

        {/* AI Tutor / Instructor inside screen */}
        {/* Hair back */}
        <path d="M180 144C178 108 205 90 232 94C256 98 265 118 260 156C256 184 240 198 204 198C178 198 172 174 180 144Z" fill="#1F2430" />
        {/* Coral sweater & arms */}
        <path d="M158 322C162 254 184 214 222 214C254 214 282 240 296 276L334 232L356 248C334 294 316 322 284 322H158Z" fill="#E34B46" />
        {/* Neck & Face */}
        <rect x="210" y="176" width="20" height="24" rx="8" fill="#F8C6A8" />
        <ellipse cx="222" cy="150" rx="26" ry="30" fill="#FAD2B8" />
        {/* Bangs */}
        <path d="M196 144C202 122 224 114 246 126C232 132 214 136 196 144Z" fill="#1F2430" />
        {/* Glasses */}
        <rect x="210" y="144" width="14" height="10" rx="3" stroke="#1F2430" strokeWidth="2" fill="none" />
        <rect x="228" y="144" width="14" height="10" rx="3" stroke="#1F2430" strokeWidth="2" fill="none" />
        <line x1="224" y1="149" x2="228" y2="149" stroke="#1F2430" strokeWidth="2" />
        {/* Smile */}
        <path d="M219 164C223 168 230 168 233 163" stroke="#9C4A3A" strokeWidth="2" strokeLinecap="round" />
        {/* Tutor pointing hand & paper */}
        <path d="M338 234L356 176C358 171 364 173 363 179L354 240Z" fill="#FAD2B8" />
        <path d="M250 232L312 226L302 316L242 312Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />

        {/* Potted plant on stool (bottom left) */}
        <line x1="76" y1="306" x2="66" y2="366" stroke="#3B3A54" strokeWidth="5" strokeLinecap="round" />
        <line x1="112" y1="306" x2="122" y2="366" stroke="#3B3A54" strokeWidth="5" strokeLinecap="round" />
        <line x1="72" y1="342" x2="116" y2="342" stroke="#3B3A54" strokeWidth="4" />
        <rect x="66" y="298" width="56" height="10" rx="4" fill="#635A7A" />
        <path d="M78 268H110L104 298H84L78 268Z" fill="#E34B46" />
        <ellipse cx="94" cy="242" rx="10" ry="26" fill="#2EA46E" />
        <ellipse cx="81" cy="252" rx="8" ry="20" transform="rotate(-24 81 252)" fill="#45C486" />
        <ellipse cx="108" cy="252" rx="8" ry="20" transform="rotate(24 108 252)" fill="#1F8A5B" />

        {/* Teal chart board on right */}
        <rect x="444" y="198" width="96" height="84" rx="10" fill="#4FD1C5" stroke="#1E40AF" strokeWidth="3" />
        <rect x="462" y="246" width="12" height="24" rx="3" fill="#FFFFFF" />
        <rect x="482" y="232" width="12" height="38" rx="3" fill="#FFFFFF" />
        <rect x="502" y="218" width="12" height="52" rx="3" fill="#FFFFFF" />
        <path d="M460 250L486 230L514 212" stroke="#E53E3E" strokeWidth="3.5" strokeLinecap="round" />

        {/* Giant open textbook foreground */}
        <path d="M126 322L284 316L284 366L126 350Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M284 316L488 322L488 354L284 366Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M122 346L284 366L492 350V362L284 378L122 358Z" fill="#F97316" />

        {/* Student studying on right */}
        {/* Legs crossed */}
        <ellipse cx="424" cy="316" rx="52" ry="22" fill="#233368" />
        {/* Orange shirt */}
        <path d="M396 246C396 232 414 226 436 226C458 226 474 240 478 266L482 302H394L396 246Z" fill="#FB923C" />
        {/* Head & hair */}
        <circle cx="430" cy="204" r="18" fill="#FAD2B8" />
        <path d="M412 198C414 182 436 178 448 192C444 198 432 198 412 198Z" fill="#3B2F2F" />
        {/* Headset */}
        <path d="M416 196C416 184 442 184 444 198" stroke="#1E3A8A" strokeWidth="3" fill="none" />
        <circle cx="444" cy="204" r="4" fill="#1E3A8A" />
        {/* Student notebook */}
        <path d="M376 296L426 288L438 308L386 314Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
