import * as React from "react";

export default function CablesBackground(): JSX.Element {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M-100,700 C300,400 600,550 1000,250 S1500,100 1900,350"  stroke="#CD7925" strokeWidth="1.5" fill="none" opacity="0.07"/>
      <path d="M-100,750 C250,450 550,600 950,300 S1450,150 1850,400"   stroke="#CD7925" strokeWidth="1"   fill="none" opacity="0.05"/>
      <path d="M-100,650 C350,350 650,500 1050,200 S1550,50  1950,300"  stroke="#CD7925" strokeWidth="1"   fill="none" opacity="0.04"/>
      <path d="M-100,800 C300,500 700,650 1100,350 S1600,200 2000,450"  stroke="#F7A900" strokeWidth="1"   fill="none" opacity="0.03"/>
      <path d="M-100,850 C400,550 800,700 1200,400 S1700,250 2100,500"  stroke="#CD7925" strokeWidth="2"   fill="none" opacity="0.025"/>
      <path d="M1800,0   C1500,300 1200,150  800,400 S300,600  -100,350" stroke="#CD7925" strokeWidth="1"   fill="none" opacity="0.04"/>
    </svg>
  );
}
