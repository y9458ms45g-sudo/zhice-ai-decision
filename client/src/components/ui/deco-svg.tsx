import React from 'react';

const DecoSvg: React.FC = () => (
  <svg
    width="0"
    height="0"
    style={{ position: 'absolute' }}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <symbol id="i-bow" viewBox="0 0 120 84">
        <g fill="currentColor">
          <path d="M60 42C50 16 20 6 14 24c-6 19 26 28 46 18Z" />
          <path d="M60 42c10-26 40-36 46-18 6 19-26 28-46 18Z" />
          <path d="M56 44c-8 14-16 26-26 34 6 2 14-4 20-14 3-5 5-12 6-18Z" />
          <path d="M64 44c8 14 16 26 26 34-6 2-14-4-20-14-3-5-5-12-6-18Z" />
        </g>
        <path
          d="M60 42C50 16 20 6 14 24c-6 19 26 28 46 18Z"
          fill="rgba(255,255,255,.34)"
        />
        <ellipse cx="60" cy="42" rx="9.5" ry="11.5" fill="currentColor" />
        <ellipse cx="56.5" cy="37.5" rx="3.2" ry="3.8" fill="#fff" opacity=".62" />
      </symbol>

      <symbol id="i-cat" viewBox="0 0 140 124">
        <path
          d="M99 116c19 0 27-18 20-28"
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path d="M42 120c-6-24-4-48 6-56h44c10 8 12 32 6 56Z" fill="currentColor" />
        <path d="M38 54 35 22l27 15Z" fill="currentColor" />
        <path d="M102 54l3-32-27 15Z" fill="currentColor" />
        <path d="M43 49 42 33l14 9Z" fill="#FFB7C9" />
        <path d="M97 49l1-16-14 9Z" fill="#FFB7C9" />
        <ellipse cx="70" cy="61" rx="39" ry="34" fill="currentColor" />
        <path
          d="M51 58q7-8 14 0M75 58q7-8 14 0"
          fill="none"
          stroke="#6B4A54"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <ellipse cx="46" cy="72" rx="7.5" ry="4.8" fill="#FFAEC4" opacity=".8" />
        <ellipse cx="94" cy="72" rx="7.5" ry="4.8" fill="#FFAEC4" opacity=".8" />
        <path d="M65 69h10l-5 4.5Z" fill="#FF9DBB" />
        <path
          d="M70 74q-5 7-11 2M70 74q5 7 11 2"
          fill="none"
          stroke="#6B4A54"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M33 64H19M33 72l-14 5M107 64h14M107 72l14 5"
          stroke="#C9A2AC"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity=".75"
          fill="none"
        />
        <ellipse cx="54" cy="114" rx="12" ry="7.5" fill="#fff" opacity=".9" />
        <ellipse cx="86" cy="114" rx="12" ry="7.5" fill="#fff" opacity=".9" />
      </symbol>

      <symbol id="i-cake" viewBox="0 0 120 134">
        <ellipse cx="60" cy="124" rx="49" ry="8.5" fill="#F0DCE4" />
        <path d="M16 76h88v30a11 11 0 0 1-11 11H27a11 11 0 0 1-11-11Z" fill="#F7DDB6" />
        <path d="M16 76h88v11H16Z" fill="#FFF3E2" />
        <rect x="14" y="65" width="92" height="13" rx="6.5" fill="#FFF9F0" />
        <path d="M31 44h58v22H31Z" fill="#F7DDB6" />
        <path d="M31 44h58v6H31Z" fill="#FFF3E2" opacity=".8" />
        <path
          d="M29 47c0-13 8-17 12-8 4-13 13-15 17-6 5-13 15-13 19-4 6-11 13-6 11 6-1 7-5 11-5 11Z"
          fill="#FFF9F0"
        />
        <path d="M60 24c8 0 13 6 13 13 0 10-13 18-13 18s-13-8-13-18c0-7 5-13 13-13Z" fill="#FF8FA8" />
        <path d="M55.5 22h9l-4.5 6Z" fill="#8FD9A8" />
        <circle cx="56" cy="30" r="1.8" fill="#fff" opacity=".65" />
        <g fill="#FF9DBB">
          <rect x="33" y="90" width="9" height="3.6" rx="1.8" transform="rotate(-22 37 92)" />
        </g>
        <g fill="#9BC5F0">
          <rect x="52" y="99" width="9" height="3.6" rx="1.8" transform="rotate(16 56 101)" />
        </g>
        <g fill="#84D3B6">
          <rect x="72" y="88" width="9" height="3.6" rx="1.8" transform="rotate(-14 76 90)" />
        </g>
        <g fill="#FFD36B">
          <rect x="82" y="102" width="9" height="3.6" rx="1.8" transform="rotate(24 86 104)" />
        </g>
        <g fill="#B99CEC">
          <rect x="40" y="108" width="9" height="3.6" rx="1.8" transform="rotate(-8 44 110)" />
        </g>
        <circle cx="30" cy="70" r="2.6" fill="#FFC9DE" />
        <circle cx="90" cy="70" r="2.6" fill="#C7DEFA" />
      </symbol>

      <symbol id="i-heart" viewBox="0 0 24 24">
        <path
          d="M12 21C3.8 15.2 1.6 10.2 4.4 7.2 6.7 4.7 10.1 5.6 12 8.6c1.9-3 5.3-3.9 7.6-1.4 2.8 3 .6 8-7.6 13.8Z"
          fill="currentColor"
        />
      </symbol>

      <symbol id="i-spark" viewBox="0 0 24 24">
        <path
          d="M12 1.5c1.1 6.7 4.2 9.8 10.9 10.9-6.7 1.1-9.8 4.2-10.9 10.9-1.1-6.7-4.2-9.8-10.9-10.9C7.8 11.3 10.9 8.2 12 1.5Z"
          fill="currentColor"
        />
      </symbol>

      <symbol id="i-flower" viewBox="0 0 40 40">
        <g fill="currentColor">
          <circle cx="20" cy="9.5" r="7" />
          <circle cx="31" cy="16.8" r="7" />
          <circle cx="26.8" cy="29" r="7" />
          <circle cx="13.2" cy="29" r="7" />
          <circle cx="9" cy="16.8" r="7" />
        </g>
        <circle cx="20" cy="20" r="5.6" fill="#FFE7A8" />
      </symbol>

      <symbol id="i-cherry" viewBox="0 0 40 40">
        <path
          d="M20 15c0-8 8-13 15-11"
          fill="none"
          stroke="#8FD9A8"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="13" cy="27" r="8.4" fill="#FF7E9B" />
        <circle cx="27" cy="31" r="7.2" fill="#FF9DBB" />
        <circle cx="10" cy="24" r="2.6" fill="#fff" opacity=".7" />
      </symbol>

      <symbol id="i-paw" viewBox="0 0 32 32">
        <ellipse cx="16" cy="21" rx="8.5" ry="7" fill="currentColor" />
        <ellipse cx="6.5" cy="13" rx="3.6" ry="4.4" fill="currentColor" />
        <ellipse cx="12.5" cy="8" rx="3.4" ry="4.4" fill="currentColor" />
        <ellipse cx="19.5" cy="8" rx="3.4" ry="4.4" fill="currentColor" />
        <ellipse cx="25.5" cy="13" rx="3.6" ry="4.4" fill="currentColor" />
      </symbol>
    </defs>
  </svg>
);

export default DecoSvg;
