"use client";

import { useState } from "react";

const COUNTRIES = [
  { code: "US", name: "United States", dial: "+1", price: "$1.15" },
  { code: "GB", name: "United Kingdom", dial: "+44", price: "$1.40" },
  { code: "CA", name: "Canada", dial: "+1", price: "$1.15" },
  { code: "AU", name: "Australia", dial: "+61", price: "$2.00" },
  { code: "DE", name: "Germany", dial: "+49", price: "$1.50" },
  { code: "FR", name: "France", dial: "+33", price: "$1.50" },
  { code: "ES", name: "Spain", dial: "+34", price: "$1.60" },
  { code: "IT", name: "Italy", dial: "+39", price: "$1.60" },
  { code: "NL", name: "Netherlands", dial: "+31", price: "$1.50" },
  { code: "BE", name: "Belgium", dial: "+32", price: "$1.60" },
  { code: "SE", name: "Sweden", dial: "+46", price: "$1.40" },
  { code: "NO", name: "Norway", dial: "+47", price: "$1.40" },
  { code: "DK", name: "Denmark", dial: "+45", price: "$1.40" },
  { code: "FI", name: "Finland", dial: "+358", price: "$1.50" },
  { code: "CH", name: "Switzerland", dial: "+41", price: "$1.80" },
  { code: "AT", name: "Austria", dial: "+43", price: "$1.60" },
  { code: "PT", name: "Portugal", dial: "+351", price: "$1.50" },
  { code: "IE", name: "Ireland", dial: "+353", price: "$1.40" },
  { code: "PL", name: "Poland", dial: "+48", price: "$1.30" },
  { code: "BR", name: "Brazil", dial: "+55", price: "$2.00" },
  { code: "MX", name: "Mexico", dial: "+52", price: "$1.80" },
  { code: "AR", name: "Argentina", dial: "+54", price: "$2.00" },
  { code: "CO", name: "Colombia", dial: "+57", price: "$2.00" },
  { code: "CL", name: "Chile", dial: "+56", price: "$2.00" },
  { code: "PE", name: "Peru", dial: "+51", price: "$2.20" },
  { code: "SG", name: "Singapore", dial: "+65", price: "$3.00" },
  { code: "JP", name: "Japan", dial: "+81", price: "$3.50" },
  { code: "HK", name: "Hong Kong", dial: "+852", price: "$2.50" },
  { code: "NZ", name: "New Zealand", dial: "+64", price: "$2.20" },
  { code: "ZA", name: "South Africa", dial: "+27", price: "$2.00" },
  { code: "IL", name: "Israel", dial: "+972", price: "$2.50" },
];

const DEMO_NUMBERS: Record<string, string[]> = {
  US: ["+1 (415) 882-9910", "+1 (212) 554-7823", "+1 (310) 766-4491"],
  GB: ["+44 20 7946 0312", "+44 161 496 0247", "+44 113 496 0183"],
  CA: ["+1 (416) 555-0192", "+1 (604) 555-0147", "+1 (514) 555-0183"],
  AU: ["+61 2 8765 4321", "+61 3 9876 5432", "+61 7 5566 7788"],
  DE: ["+49 30 1234 5678", "+49 89 9876 5432", "+49 40 1122 3344"],
  FR: ["+33 1 23 45 67 89", "+33 9 78 56 34 12", "+33 4 56 78 90 12"],
  ES: ["+34 91 234 5678", "+34 93 456 7890", "+34 95 678 9012"],
  IT: ["+39 02 1234 5678", "+39 06 9876 5432", "+39 011 456 7890"],
  NL: ["+31 20 234 5678", "+31 10 987 6543", "+31 40 123 4567"],
  BE: ["+32 2 234 5678", "+32 3 987 6543", "+32 9 876 5432"],
  SE: ["+46 8 1234 5678", "+46 31 987 6543", "+46 40 123 4567"],
  NO: ["+47 21 23 45 67", "+47 31 98 76 54", "+47 55 12 34 56"],
  DK: ["+45 32 12 34 56", "+45 43 98 76 54", "+45 55 23 45 67"],
  FI: ["+358 9 1234 5678", "+358 3 9876 5432", "+358 2 3456 7890"],
  CH: ["+41 44 234 5678", "+41 31 987 6543", "+41 22 456 7890"],
  AT: ["+43 1 234 5678", "+43 316 987 6543", "+43 662 123 4567"],
  PT: ["+351 21 234 5678", "+351 22 987 6543", "+351 289 123 456"],
  IE: ["+353 1 234 5678", "+353 21 987 654", "+353 61 123 456"],
  PL: ["+48 22 234 5678", "+48 12 987 6543", "+48 71 345 6789"],
  BR: ["+55 11 3456-7890", "+55 21 9876-5432", "+55 31 2345-6789"],
  MX: ["+52 55 1234 5678", "+52 33 9876 5432", "+52 81 3456 7890"],
  AR: ["+54 11 3456-7890", "+54 351 876-5432", "+54 261 234-5678"],
  CO: ["+57 1 234 5678", "+57 4 987 6543", "+57 2 345 6789"],
  CL: ["+56 2 2345 6789", "+56 22 876 5432", "+56 32 345 6789"],
  PE: ["+51 1 234 5678", "+51 54 987 654", "+51 44 234 567"],
  SG: ["+65 6123 4567", "+65 6987 6543", "+65 6345 6789"],
  JP: ["+81 3 1234 5678", "+81 6 9876 5432", "+81 52 345 6789"],
  HK: ["+852 2123 4567", "+852 2987 6543", "+852 2345 6789"],
  NZ: ["+64 9 234 5678", "+64 4 987 6543", "+64 3 234 5678"],
  ZA: ["+27 11 234 5678", "+27 21 987 6543", "+27 31 345 6789"],
  IL: ["+972 2 234 5678", "+972 3 987 6543", "+972 4 345 6789"],
};

const POPULAR = ["US", "GB", "CA", "AU", "DE", "FR", "JP", "SG", "BR", "MX"];

const flag = (code: string) =>
  code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  );

function checkLoggedIn(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("tenant_id="));
}

export default function ClaimNumberSection() {
  const [selected, setSelected] = useState("US");
  const [searching, setSearching] = useState(false);

  const handleCountryChange = (code: string) => {
    if (code === selected) return;
    setSearching(true);
    setSelected(code);
    setTimeout(() => setSearching(false), 550);
  };

  const handleClaim = () => {
    if (checkLoggedIn()) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  };

  const country = COUNTRIES.find((c) => c.code === selected)!;
  const numbers = DEMO_NUMBERS[selected] ?? [];

  return (
    <section
      id="claim-number"
      style={{
        padding: "8rem 5%",
        background: "radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.03) 0%, transparent 80%), var(--bg)",
        borderTop: "1.5px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--green-light)",
              border: "1.5px solid rgba(5, 150, 105, 0.15)",
              padding: "0.5rem 1.4rem",
              borderRadius: 99,
              marginBottom: "1.5rem",
              fontWeight: 700,
              fontSize: "0.82rem",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "var(--green)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(5, 150, 105, 0.4)",
              }}
            />
            Numbers Available Now in 31+ Countries
          </div>

          <h2
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 800,
              textTransform: "uppercase",
              lineHeight: 1.1,
              margin: "0 0 1.5rem",
              letterSpacing: "-1px",
              color: "var(--text)",
            }}
          >
            Claim Your AI <br />
            <span style={{ background: "linear-gradient(135deg, var(--green) 0%, var(--blue) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Phone Number</span>
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              fontWeight: 500,
              color: "var(--text-muted)",
              maxWidth: 580,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Pick your country, see available numbers, and provision your AI
            agent&apos;s line instantly — no telecom setup required.
          </p>
        </div>

        {/* Quick country chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
            justifyContent: "center",
            marginBottom: "2.5rem",
          }}
        >
          {POPULAR.map((code) => {
            const c = COUNTRIES.find((x) => x.code === code)!;
            const active = selected === code;
            return (
              <button
                key={code}
                onClick={() => handleCountryChange(code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.5rem 1.25rem",
                  border: active
                    ? "1.5px solid var(--green)"
                    : "1.5px solid var(--border)",
                  borderRadius: 99,
                  background: active ? "var(--green-light)" : "#ffffff",
                  color: active ? "var(--green)" : "var(--text)",
                  fontWeight: active ? 700 : 550,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  boxShadow: active ? "0 4px 12px rgba(5, 150, 105, 0.08)" : "none",
                }}
              >
                {flag(code)} {c.name}
              </button>
            );
          })}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.45rem 0.75rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            +21 more ↓
          </span>
        </div>

        {/* Main panel */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid var(--border)",
            borderRadius: 24,
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.04)",
            overflow: "hidden",
          }}
        >
          {/* header bar */}
          <div
            style={{
              background: "var(--surface)",
              padding: "1.25rem 2rem",
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              flexWrap: "wrap",
              borderBottom: "1.5px solid var(--border)",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontWeight: 700,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 1,
                whiteSpace: "nowrap",
              }}
            >
              Select Country
            </span>

            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 380 }}>
              <select
                value={selected}
                onChange={(e) => handleCountryChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 2.5rem 0.65rem 1rem",
                  background: "#ffffff",
                  color: "var(--text)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  appearance: "none",
                  outline: "none",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.01)",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} style={{ background: "#ffffff", color: "var(--text)" }}>
                    {flag(c.code)} {c.name} ({c.dial})
                  </option>
                ))}
              </select>
              <span
                style={{
                  position: "absolute",
                  right: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                  fontSize: "0.7rem",
                }}
              >
                ▼
              </span>
            </div>

          </div>

          {/* Numbers body */}
          <div style={{ padding: "2rem" }}>
            {searching ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3.5rem 1rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: "1.25rem",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--green)",
                        animation: `eq 0.6s infinite alternate ease-in-out`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                Searching available numbers in {flag(selected)} {country.name}...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {numbers.map((num, i) => (
                  <div
                    key={num}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1.2rem 1.5rem",
                      border: i === 0 ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                      borderRadius: 16,
                      background: i === 0 ? "var(--green-light)" : "#ffffff",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      boxShadow: i === 0 ? "0 4px 20px rgba(5, 150, 105, 0.05)" : "none",
                      transition: "var(--transition)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>
                        {flag(selected)}
                      </span>
                      <div>
                        <div
                          className="mono"
                          style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", letterSpacing: 0.5 }}
                        >
                          {num}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: i === 0 ? "var(--green)" : "var(--text-muted)",
                            marginTop: 3,
                          }}
                        >
                          {i === 0 ? "⭐ Recommended choice · " : `Option ${i + 1} · `}
                          Voice-enabled
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleClaim}
                      className="btn-brutal"
                      style={{
                        fontSize: "0.85rem",
                        padding: "0.6rem 1.5rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Claim This Number →
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem 1.25rem",
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 12,
                fontWeight: 500,
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <span>ℹ️</span>
              Demo preview only — numbers are provisioned instantly after signup.
              No setup fees. Cancel anytime.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
