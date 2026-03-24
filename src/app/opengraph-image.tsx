import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DeVerzekeringsAgent — Vergelijk, bespaar en wij bewaken 24/7";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* Shield icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          DeVerzekeringsAgent
        </div>

        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Vergelijk verzekeringen & energie. Bespaar direct. Wij bewaken je premie 24/7.
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 40,
            color: "rgba(255,255,255,0.5)",
            fontSize: 18,
          }}
        >
          <span>&#10003; Gratis & onafhankelijk</span>
          <span>&#10003; 12+ verzekeraars</span>
          <span>&#10003; AVG-veilig</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
