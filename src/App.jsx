import { useState, useEffect, useRef } from "react";

// ─── REPLACE THIS WITH YOUR REAL GUMROAD LINK ────────────────────────────────
const GUMROAD_URL = "https://poolfund.gumroad.com/l/fndbt";
const FOUNDING_TOTAL = 100;
const FOUNDING_PRICE = 19;
const PRO_PRICE = 4;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  cream: "#FAF7F2", warm: "#F2EBD9",
  gold: "#C9A84C", goldLight: "#E2C06E", goldDark: "#8C6E28", goldFaint: "#C9A84C18",
  forest: "#1E3D30", forestMid: "#2D5A42", forestLight: "#3D7A5A",
  coral: "#D95F3B", coralLight: "#F07850",
  ink: "#0E0B08", inkMid: "#161210", inkLight: "#1E1A14",
  muted: "#7A6E5F", border: "#E4D9C4", borderDark: "#2A2318", borderGold: "#C9A84C33",
  white: "#FFFFFF", receipt: "#FEFCF8", receiptBg: "#F7F3EC",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => Number(n || 0).toFixed(2);
const calcPct = (paid, total) => Math.min((paid / total) * 100, 100);

const STORAGE_KEY = "pf_goals_v1";
const WAITLIST_KEY = "pf_waitlist";
const loadGoals = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const saveGoals = (g) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch {} };

const DEFAULT_RULES = {
  commitmentLevel: "hard", refundPolicy: "no_refund", refundDeadlineDays: 3,
  redistributionRule: "split", reminderEscalation: true, gracePeriodDays: 2, requireAgreement: true,
};
const RULE_LABELS = {
  refundPolicy: {
    no_refund: "No Refunds",
    full_before_deadline: "Full Refund Before Deadline",
    partial: "Partial Refund",
    no_refund_after_purchase: "No Refund After Purchase",
  },
  redistributionRule: {
    split: "Split Among Remaining",
    adjust_goal: "Adjust Goal Down",
    creator_covers: "Creator Covers It",
    cancel_goal: "Cancel Goal",
  },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0 = null;
    const step = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return val;
}

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

// ─── Logo SVG Components ──────────────────────────────────────────────────────
function LogoIcon({ size = 40, animated = false }) {
  const r1 = size * 0.425, r2 = size * 0.325, cx = size / 2;
  const circ = 2 * Math.PI * r1;
  const offset = circ * 0.25;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      style={animated ? { animation: "pfFloat 3s ease-in-out infinite" } : {}}>
      <defs>
        <linearGradient id="pfCoinGrad" x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2C06E" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#8C6E28" />
        </linearGradient>
        <filter id="pfGlow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cx} r={r1} stroke={C.gold} strokeWidth={size * 0.012} opacity="0.2" fill="none" />
      <circle cx={cx} cy={cx} r={r1}
        stroke={C.gold} strokeWidth={size * 0.044}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" fill="none"
        transform={`rotate(-90 ${cx} ${cx})`}
        filter="url(#pfGlow)" opacity="0.95" />
      <circle cx={cx} cy={cx} r={r2} fill="url(#pfCoinGrad)" />
      <circle cx={cx} cy={cx} r={r2 * 0.85} fill="none" stroke="#F0D080" strokeWidth={size * 0.012} opacity="0.4" />
      <text x={cx} y={cx}
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize={size * 0.275} fontWeight="900"
        fill={C.inkLight} textAnchor="middle"
        dominantBaseline="central" alignmentBaseline="central">P</text>
      <ellipse cx={cx * 0.82} cy={cx * 0.8}
        rx={size * 0.06} ry={size * 0.037}
        fill="white" opacity="0.18"
        transform={`rotate(-35 ${cx * 0.82} ${cx * 0.8})`} />
    </svg>
  );
}

function LogoWordmark({ dark = false, size = "md" }) {
  const fs = size === "sm" ? 18 : size === "lg" ? 32 : 24;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: fs * 0.4 }}>
      <LogoIcon size={fs * 1.4} />
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: fs, fontWeight: 900,
        color: dark ? C.inkLight : C.white,
        letterSpacing: "-0.02em", lineHeight: 1,
      }}>
        Pool<span style={{ fontWeight: 400, fontStyle: "italic", color: C.gold }}>Fund</span>
      </span>
    </div>
  );
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
function ProgressRing({ p, size = 72, stroke = 6, complete }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={complete ? C.forestLight : C.gold}
        strokeWidth={stroke} strokeDasharray={circ}
        strokeDashoffset={circ - (Math.min(p, 100) / 100) * circ}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

function Pill({ children, color = C.gold, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 9px",
      borderRadius: 99, background: bg || color + "22", color,
      fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Confetti({ active }) {
  if (!active) return null;
  const items = Array.from({ length: 28 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 1.2,
    color: [C.gold, C.coral, C.forestLight, C.goldLight, C.coralLight][i % 5],
    size: 6 + Math.random() * 9, dur: 1.5 + Math.random(),
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {items.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: "-20px", left: `${p.left}%`,
          width: p.size, height: p.size, borderRadius: p.id % 3 === 0 ? "50%" : 3,
          background: p.color, animation: `pfFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function EmailCapture({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");

  async function submit(e) {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Enter a valid email."); return; }
    setState("loading");
    await new Promise(r => setTimeout(r, 800));
    const list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
    if (!list.includes(email)) localStorage.setItem(WAITLIST_KEY, JSON.stringify([...list, email]));
    setState("success");
    onSuccess?.();
  }

  if (state === "success") return (
    <div style={{ padding: "18px 22px", borderRadius: 14, background: C.forestMid + "33", border: `1.5px solid ${C.forestLight}55`, textAlign: "center" }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>🎉</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: C.white, marginBottom: 3 }}>You're on the list!</div>
      <div style={{ fontSize: 13, color: C.goldLight }}>We'll email you founding member pricing first.</div>
    </div>
  );

  return (
    <form onSubmit={submit}>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="email" placeholder="your@email.com" value={email}
          onChange={e => { setEmail(e.target.value); setErr(""); }}
          style={{ flex: 1, padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${err ? C.coral : C.borderGold}`, background: "#ffffff0A", color: C.white, fontFamily: "'DM Sans',sans-serif", fontSize: 15, outline: "none" }} />
        <button type="submit" disabled={state === "loading"} style={{ padding: "13px 22px", borderRadius: 12, border: "none", background: state === "loading" ? C.goldDark : C.gold, color: C.ink, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", whiteSpace: "nowrap", opacity: state === "loading" ? 0.7 : 1 }}>
          {state === "loading" ? "Joining..." : "Join Waitlist →"}
        </button>
      </div>
      {err && <div style={{ fontSize: 12, color: C.coral, marginTop: 5 }}>{err}</div>}
      <div style={{ fontSize: 12, color: "#ffffff44", marginTop: 7 }}>No spam. No credit card. Unsubscribe any time.</div>
    </form>
  );
}

function SocialProof() {
  const ref = useRef(null);
  const inView = useInView(ref);
  const wl = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]").length;
  const n = useCountUp(Math.max(wl + 47, 47), 1000, inView);
  return (
    <div ref={ref} style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", padding: "48px 24px" }}>
      {[{ n, s: "+", l: "On the waitlist" }, { n: 100, s: "", l: "Founding spots total" }, { n: PRO_PRICE, p: "$", s: "/mo", l: "Pro plan price" }, { n: 0, s: "", l: "Credit card to start" }].map((s, i) => (
        <div key={i} style={{ textAlign: "center", minWidth: 90 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{s.p || ""}{i === 0 ? n : s.n}{s.s}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState(null);
  const items = [
    { q: "Is this really free to start?", a: "Yes. Create a goal, invite your group, track everything — completely free. No credit card, no trial, no tricks. The free plan gives you 1 active goal with up to 5 contributors." },
    { q: "What's the difference between Free and Pro?", a: "Free is for trying it out with one goal. Pro ($4/month or $19 founding lifetime) gives you unlimited goals, unlimited contributors, and all future features." },
    { q: "Does PoolFund actually move money?", a: "Not yet — PoolFund is a tracker, not a payment processor. Contributors pay each other via Venmo, Zelle, Cash App, or however they prefer. PoolFund tracks who paid what and shows everyone the progress. Real payment processing is coming soon." },
    { q: "What are Backer Rules?", a: "Backer Rules let the goal creator set expectations before anyone joins — refund policy, what happens if someone backs out, whether contributors need to formally agree. It eliminates the awkward 'I didn't know' conversation." },
    { q: "What happens to my goals if I cancel Pro?", a: "Your data is always yours. If you downgrade, your goals and history are preserved — you just can't create new ones until you're under the free plan limit." },
    { q: "Can I use this for large groups?", a: "Absolutely. PoolFund handles any group size. Large groups are where it shines most — tracking 20 people manually is a nightmare, and PoolFund makes it effortless." },
  ];
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Sans',sans-serif" }}>FAQ</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: C.white, margin: 0 }}>Common questions</h2>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ background: C.inkLight, borderRadius: 13, border: `1.5px solid ${open === i ? C.gold + "55" : C.borderDark}`, overflow: "hidden", marginBottom: 8, transition: "border-color 0.2s" }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", padding: "17px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, color: C.white, fontSize: 14, textAlign: "left", fontFamily: "'DM Sans',sans-serif" }}>{item.q}</span>
            <span style={{ color: C.gold, fontSize: 18, flexShrink: 0, transition: "transform 0.2s", transform: open === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
          </button>
          {open === i && <div style={{ padding: "0 20px 16px", fontSize: 14, color: "#ffffffaa", lineHeight: 1.75, fontFamily: "'DM Sans',sans-serif" }}>{item.a}</div>}
        </div>
      ))}
    </div>
  );
}

function StickyBar({ onLaunchApp, visible }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: C.ink + "F0", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.borderDark}`, padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transform: visible ? "translateY(0)" : "translateY(100%)", transition: "transform 0.3s cubic-bezier(.4,0,.2,1)" }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: C.white, fontSize: 14 }}>PoolFund <span style={{ color: C.gold }}>— Free to start</span></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onLaunchApp} style={{ padding: "8px 16px", borderRadius: 9, border: `1.5px solid ${C.borderDark}`, background: "transparent", color: C.muted, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Try Free</button>
        <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: C.gold, color: C.ink, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer", textDecoration: "none" }}>Founding Access — ${FOUNDING_PRICE}</a>
      </div>
    </div>
  );
}

function Landing({ onEnterApp }) {
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [sticky, setSticky] = useState(false);
  const wl = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]").length;
  const spotsLeft = Math.max(FOUNDING_TOTAL - (wl + 23), 12);

  useEffect(() => {
    const fn = () => setSticky(window.scrollY > 500);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const Btn = ({ children, onClick, href, gold, outline, style: s }) => {
    const base = { padding: "14px 32px", borderRadius: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 16, cursor: "pointer", textDecoration: "none", display: "inline-block", transition: "all 0.2s", ...s };
    const variant = gold
      ? { border: "none", background: C.gold, color: C.ink, boxShadow: `0 4px 22px ${C.gold}44` }
      : outline
      ? { border: `1.5px solid ${C.borderDark}`, background: "transparent", color: C.white }
      : { border: `1.5px solid ${C.gold}`, background: "transparent", color: C.gold };
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ ...base, ...variant }}>{children}</a>;
    return <button onClick={onClick} style={{ ...base, ...variant }}>{children}</button>;
  };

  return (
    <div style={{ background: C.ink, minHeight: "100vh", color: C.white, fontFamily: "'DM Sans',sans-serif", overflowX: "hidden" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: `1px solid ${C.borderDark}`, position: "sticky", top: 0, zIndex: 50, background: C.ink + "F0", backdropFilter: "blur(12px)" }}>
        <LogoWordmark size="sm" />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onEnterApp} style={{ padding: "8px 16px", borderRadius: 99, border: `1.5px solid ${C.borderDark}`, background: "transparent", color: C.muted, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Try Free</button>
          <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 18px", borderRadius: 99, border: "none", background: C.gold, color: C.ink, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", textDecoration: "none", boxShadow: `0 4px 16px ${C.gold}44` }}>
            Founding Access — ${FOUNDING_PRICE}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "76px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 99, marginBottom: 26, background: C.goldFaint, border: `1px solid ${C.borderGold}`, fontSize: 12, fontWeight: 700, color: C.goldLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, animation: "pfPulse 2s infinite", display: "inline-block" }} />
          {spotsLeft} founding spots remaining · ${FOUNDING_PRICE} lifetime
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <LogoIcon size={88} animated />
        </div>

        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(40px,7vw,78px)", fontWeight: 900, margin: "0 0 22px", lineHeight: 1.04, letterSpacing: "-0.02em" }}>
          Stop chasing people<br />
          <span style={{ backgroundImage: `linear-gradient(135deg,${C.gold},${C.goldLight})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>for their share.</span>
        </h1>
        <p style={{ fontSize: "clamp(15px,2.5vw,19px)", color: "#ffffff77", lineHeight: 1.75, margin: "0 auto 44px", maxWidth: 560 }}>
          PoolFund is the private hub for group gifts, trips & celebrations. Set the rules, send the invite, track every dollar — and get a beautiful receipt when you're done.
        </p>

        {/* Email capture */}
        <div style={{ maxWidth: 500, margin: "0 auto 14px" }}>
          {waitlistDone
            ? <div style={{ padding: "16px 20px", borderRadius: 13, background: C.forestMid + "33", border: `1.5px solid ${C.forestLight}55`, textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 5 }}>🎉</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 2 }}>You're on the list!</div>
                <div style={{ fontSize: 13, color: C.goldLight }}>We'll email you founding member pricing first.</div>
              </div>
            : <EmailCapture onSuccess={() => setWaitlistDone(true)} />
          }
        </div>
        <div style={{ fontSize: 13, color: "#ffffff44", marginBottom: 40 }}>
          or{" "}
          <button onClick={onEnterApp} style={{ background: "none", border: "none", color: C.goldLight, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, textDecoration: "underline", textDecorationColor: C.gold + "44" }}>
            launch the app free right now →
          </button>
        </div>

        {/* App mock preview */}
        <div style={{ maxWidth: 340, margin: "0 auto", background: "#1A1510", border: `1px solid ${C.borderDark}`, borderRadius: 22, padding: 22, boxShadow: `0 40px 80px #00000066, 0 0 0 1px ${C.gold}11` }}>
          <div style={{ fontSize: 10, color: "#ffffff44", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>🎁 Group Gift · In Progress</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.white, marginBottom: 14 }}>Mom's Birthday Gift</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <ProgressRing p={75} size={60} stroke={5} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.white }}>75%</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.white }}>$150<span style={{ fontSize: 13, color: "#ffffff44" }}> / $200</span></div>
              <div style={{ fontSize: 11, color: C.goldLight }}>$50 still needed</div>
            </div>
          </div>
          {[{ n: "Sarah", p: 50, o: 50, done: true }, { n: "Marcus", p: 50, o: 50, done: true }, { n: "Destiny", p: 50, o: 100, done: false, left: 50 }].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: `1px solid ${C.borderDark}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.done ? C.forestLight : "#2A2318", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.white, flexShrink: 0 }}>{m.done ? "✓" : m.n[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{m.n}</div>
                <div style={{ fontSize: 10, color: "#ffffff44" }}>${m.p} of ${m.o}</div>
              </div>
              {m.done
                ? <span style={{ fontSize: 10, fontWeight: 800, color: C.forestLight, background: C.forestLight + "22", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}>Paid ✓</span>
                : <span style={{ fontSize: 10, fontWeight: 800, color: C.coral, background: C.coral + "22", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase" }}>Owes ${m.left}</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div style={{ borderTop: `1px solid ${C.borderDark}`, borderBottom: `1px solid ${C.borderDark}` }}>
        <SocialProof />
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "76px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>How It Works</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,4vw,42px)", fontWeight: 900, margin: 0 }}>Four steps. Zero awkward texts.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 14 }}>
          {[
            { emoji: "🎯", title: "Set the goal", desc: "Name it, total amount, deadline." },
            { emoji: "📋", title: "Set the rules", desc: "Refund policy, what happens if someone bails." },
            { emoji: "💬", title: "Send the invite", desc: "One-tap message in 3 tones for any group chat." },
            { emoji: "🧾", title: "Get the receipt", desc: "Beautiful summary once the goal is funded." },
          ].map((s, i) => (
            <div key={i} style={{ background: C.inkLight, borderRadius: 16, border: `1px solid ${C.borderDark}`, padding: "22px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 9 }}>{s.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", marginBottom: 5 }}>STEP {i + 1}</div>
              <div style={{ fontWeight: 700, color: C.white, fontSize: 14, marginBottom: 5 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div style={{ background: C.inkMid, borderTop: `1px solid ${C.borderDark}`, borderBottom: `1px solid ${C.borderDark}` }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Built For</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,36px)", fontWeight: 900, margin: "0 0 32px" }}>Every reason to chip in together</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
            {[["🎁","Group Gifts"],["✈️","Group Trips"],["🎂","Birthday Funds"],["💍","Wedding Pools"],["🏖️","Vacations"],["🎓","Grad Gifts"],["🎉","Bachelorettes"],["🏈","Fantasy Leagues"],["🍕","Office Lunches"],["🎄","Holiday Gifts"],["⚽","Team Dues"],["🎭","Group Events"]].map(([e, l], i) => (
              <div key={i} style={{ padding: "9px 16px", borderRadius: 99, border: `1.5px solid ${C.borderDark}`, background: C.inkLight, fontWeight: 600, fontSize: 13, color: C.white, display: "flex", alignItems: "center", gap: 6 }}><span>{e}</span>{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: C.inkMid, borderTop: `1px solid ${C.borderDark}`, padding: "76px 0" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,4vw,42px)", fontWeight: 900, margin: "0 0 10px" }}>Start free. Own it forever for ${FOUNDING_PRICE}.</h2>
            <p style={{ fontSize: 15, color: "#ffffff66", margin: 0 }}>The founding member price disappears once the {FOUNDING_TOTAL} spots are gone.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18, alignItems: "start" }}>
            {/* Free */}
            <div style={{ borderRadius: 18, border: `1.5px solid ${C.borderDark}`, background: C.inkLight, padding: "22px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>Free Forever</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 900, color: C.white, lineHeight: 1, marginBottom: 18 }}>$0</div>
              {["1 active goal","Up to 5 contributors","Manual payment tracking","Share link","Invite message"].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontWeight: 800, fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#ffffff66" }}>{f}</span>
                </div>
              ))}
              <button onClick={onEnterApp} style={{ display: "block", marginTop: 20, padding: "12px", width: "100%", borderRadius: 10, border: `1.5px solid ${C.borderDark}`, background: "transparent", color: C.muted, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Start Free →</button>
            </div>
            {/* Pro */}
            <div style={{ borderRadius: 18, border: `1.5px solid ${C.borderDark}`, background: C.inkLight, padding: "22px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.goldLight, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>Pro Plan</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 900, color: C.white, lineHeight: 1, marginBottom: 18 }}>${PRO_PRICE}<span style={{ fontSize: 16, color: C.muted, fontWeight: 400 }}>/mo</span></div>
              {["Unlimited goals","Unlimited contributors","Backer rules","Invite messages","Receipts & history","Reminder escalation"].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.forestLight, fontWeight: 800, fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#ffffffaa" }}>{f}</span>
                </div>
              ))}
              <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 20, padding: "12px", borderRadius: 10, border: `1.5px solid ${C.forestLight}55`, background: "transparent", color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>Start Pro →</a>
            </div>
            {/* Founding */}
            <div style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${C.gold}55`, boxShadow: `0 0 50px ${C.gold}18` }}>
              <div style={{ background: `linear-gradient(135deg,${C.goldDark},${C.gold})`, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.ink, letterSpacing: "0.15em", textTransform: "uppercase" }}>⭐ Founding Member</div>
                  <div style={{ fontSize: 12, color: C.ink + "bb", marginTop: 1 }}>Limited to {FOUNDING_TOTAL} people</div>
                </div>
                <div style={{ background: C.ink + "33", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.ink }}>{spotsLeft} left</div>
              </div>
              <div style={{ height: 3, background: C.ink + "44" }}><div style={{ height: "100%", width: `${Math.round(((FOUNDING_TOTAL - spotsLeft) / FOUNDING_TOTAL) * 100)}%`, background: C.ink + "88" }} /></div>
              <div style={{ background: C.inkLight, padding: "20px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 900, color: C.white, lineHeight: 1 }}>${FOUNDING_PRICE}</div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>$48/yr</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.goldLight }}>Save 60%</div>
                  </div>
                </div>
                {["Lifetime Pro access — pay once","Unlimited goals & contributors","All future features included","Direct line to the founder"].map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 9 }}>
                    <span style={{ color: C.gold, fontWeight: 800, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: "#ffffffcc" }}>{f}</span>
                  </div>
                ))}
                <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 20, padding: "14px", borderRadius: 12, border: "none", background: C.gold, color: C.ink, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", textAlign: "center", textDecoration: "none", boxShadow: `0 4px 18px ${C.gold}44` }}>
                  Claim Founding Spot →
                </a>
                <div style={{ textAlign: "center", marginTop: 9, fontSize: 11, color: "#ffffff44" }}>Secure checkout via Gumroad</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second email capture */}
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "76px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, margin: "0 0 12px" }}>
            Want to know when<br /><span style={{ color: C.gold }}>Pro launches?</span>
          </h2>
          <p style={{ fontSize: 14, color: "#ffffff66", margin: 0, lineHeight: 1.7 }}>Join the waitlist and get founding member pricing before anyone else.</p>
        </div>
        <EmailCapture onSuccess={() => {}} />
      </div>

      {/* FAQ */}
      <div style={{ borderTop: `1px solid ${C.borderDark}`, paddingTop: 76 }}>
        <FAQ />
      </div>

      {/* Footer CTA */}
      <div style={{ borderTop: `1px solid ${C.borderDark}`, background: C.inkMid, padding: "76px 24px 110px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, margin: "0 0 14px", lineHeight: 1.1 }}>
          Ready to stop the awkward<br /><span style={{ color: C.gold }}>"you still owe me" texts?</span>
        </h2>
        <p style={{ fontSize: 15, color: "#ffffff55", margin: "0 0 36px", lineHeight: 1.7 }}>Create your first goal free. No credit card. No download. Works right now.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onEnterApp} style={{ padding: "14px 30px", borderRadius: 12, border: `1.5px solid ${C.borderDark}`, background: "transparent", color: C.white, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Start Free →</button>
          <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ padding: "14px 30px", borderRadius: 12, border: "none", background: C.gold, color: C.ink, fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", textDecoration: "none", boxShadow: `0 4px 22px ${C.gold}44` }}>
            Get Founding Access — ${FOUNDING_PRICE} →
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.borderDark}`, padding: "18px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <LogoWordmark size="sm" />
        <div style={{ fontSize: 12, color: "#ffffff33" }}>© 2025 PoolFund · Stop the awkward money texts</div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Privacy", "Terms", "Contact"].map(l => <span key={l} style={{ fontSize: 12, color: "#ffffff33", cursor: "pointer" }}>{l}</span>)}
        </div>
      </div>

      <StickyBar onLaunchApp={onEnterApp} visible={sticky} />
    </div>
  );
}

// ─── INVITE MESSAGE ───────────────────────────────────────────────────────────
function generateInviteMessage(goal, tone, creatorName) {
  const perPerson = goal.members.length > 0 ? goal.amount / goal.members.length : goal.amount;
  const typeEmoji = { gift: "🎁", trip: "✈️", party: "🎉", other: "✨" }[goal.type] || "✨";
  const dl = goal.deadline ? new Date(goal.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  const url = `https://poolfund.app/goal/${goal.id}`;
  const rules = goal.rules;
  const rl = rules ? [
    rules.refundPolicy === "no_refund" ? "🔒 No refunds once you commit" : rules.refundPolicy === "full_before_deadline" ? `⏳ Full refund if you back out ${rules.refundDeadlineDays}+ days before deadline` : rules.refundPolicy === "partial" ? "💸 Partial refund if you back out" : "🛍️ No refunds after the goal is purchased",
    rules.redistributionRule === "split" ? "➗ If someone backs out, their share splits among the rest" : rules.redistributionRule === "adjust_goal" ? "📉 If someone backs out, the goal adjusts down" : rules.redistributionRule === "creator_covers" ? "🙋 Creator covers any shortfall" : "❌ If anyone backs out, the goal is canceled",
    rules.requireAgreement ? "✍️ You'll need to agree before being added" : null,
  ].filter(Boolean) : [];

  const lines = (arr) => arr.filter(l => l !== null).join("\n");

  if (tone === "casual") return lines([`${typeEmoji} ${goal.name} — PoolFund`, ``, { gift: `Hey everyone! 🎉 Let's do this — I set up a PoolFund so we can all chip in for ${goal.name}!`, trip: `Okay the trip is HAPPENING 🙌 I set up a PoolFund — let's get everyone locked in!`, party: `Party time! 🎉 I set up a fund for ${goal.name}. Tap the link to join!`, other: `Hey! I set up a PoolFund for ${goal.name} — super easy to chip in 👇` }[goal.type] || `Hey! I set up a PoolFund for ${goal.name} 👇`, ``, `💰 Your share: $${fmt(perPerson)} each`, `🎯 Total goal: $${fmt(goal.amount)}`, dl ? `📅 Deadline: ${dl}` : null, ``, rl.length > 0 ? `Quick rules:` : null, ...rl, ``, `Track progress & lock in your spot 👇`, url, ``, creatorName ? `— ${creatorName}` : null]);
  if (tone === "direct") return lines([`${typeEmoji} ${goal.name}`, ``, `Goal: $${fmt(goal.amount)} | Your share: $${fmt(perPerson)}`, dl ? `Deadline: ${dl}` : null, ``, rl.length > 0 ? rl.join("\n") : null, ``, `Link: ${url}`, creatorName ? `— ${creatorName}` : null]);
  return lines([`${typeEmoji} ${goal.name} — Group Contribution Request`, ``, `Hi everyone,`, ``, `I've created a PoolFund to coordinate our contribution for ${goal.name}. Here are the details:`, ``, `• Total goal: $${fmt(goal.amount)}`, `• Individual share: $${fmt(perPerson)}`, dl ? `• Deadline: ${dl}` : null, ``, rl.length > 0 ? `Participation terms:` : null, ...rl.map(l => `• ${l.replace(/^[^\s]+\s/, "")}`), ``, `Please follow the link to view progress and confirm your participation:`, url, ``, `Thank you,`, creatorName || `The Organizer`]);
}

function InviteMessage({ goal, onBack, onDone, isPostCreate }) {
  const [tone, setTone] = useState("casual");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedTone, setCopiedTone] = useState(null);
  const msg = generateInviteMessage(goal, tone, name);
  const typeEmoji = { gift: "🎁", trip: "✈️", party: "🎉", other: "✨" }[goal.type] || "✨";
  const tones = [{ key: "casual", icon: "😄", label: "Casual", desc: "Friendly & emoji-filled" }, { key: "direct", icon: "⚡", label: "Direct", desc: "Just the facts" }, { key: "formal", icon: "🤝", label: "Formal", desc: "Professional tone" }];

  function copy(t) {
    navigator.clipboard?.writeText(generateInviteMessage(goal, t || tone, name));
    setCopied(true); setCopiedTone(t || tone);
    setTimeout(() => { setCopied(false); setCopiedTone(null); }, 2600);
  }

  const bg = isPostCreate ? C.forest : C.cream;
  const textC = isPostCreate ? C.white : C.ink;
  const mutedC = isPostCreate ? "#ffffff77" : C.muted;
  const cardBg = isPostCreate ? "#ffffff0D" : C.warm;
  const cardBorder = isPostCreate ? "#ffffff18" : C.border;
  const inp = { width: "100%", padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${isPostCreate ? "#ffffff22" : C.border}`, background: isPostCreate ? "#ffffff11" : C.white, color: textC, fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans',sans-serif" }}>
      {isPostCreate ? (
        <div style={{ padding: "30px 20px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.goldLight, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Goal Created!</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: C.white, margin: "0 0 6px" }}>{goal.name}</h1>
          <p style={{ fontSize: 13, color: "#ffffff77", margin: 0 }}>Now invite your group — pick a tone and copy the message.</p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 12px", gap: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, padding: "4px 6px 0" }}>←</button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{typeEmoji} Invite Message</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif" }}>{goal.name}</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 18px 60px" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: mutedC, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>Your name (signs the message)</div>
          <input placeholder="e.g. Marcus, Destiny..." value={name} onChange={e => setName(e.target.value)} style={inp} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: mutedC, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 9 }}>Message Tone</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
            {tones.map(t => (
              <button key={t.key} onClick={() => setTone(t.key)} style={{ padding: "11px 6px", borderRadius: 11, cursor: "pointer", textAlign: "center", border: `1.5px solid ${tone === t.key ? C.gold : cardBorder}`, background: tone === t.key ? C.gold + "22" : cardBg, fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                <div style={{ fontSize: 20, marginBottom: 3 }}>{t.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 12, color: tone === t.key ? C.goldLight : isPostCreate ? "#ffffffaa" : C.ink }}>{t.label}</div>
                <div style={{ fontSize: 10, color: mutedC, marginTop: 1 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: mutedC, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 9 }}>Preview</div>
          <div style={{ background: cardBg, borderRadius: 16, padding: "14px", border: `1.5px solid ${cardBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 9, borderBottom: `1px solid ${isPostCreate ? "#ffffff15" : C.border}` }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{typeEmoji}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: mutedC }}>Group Chat</div>
              <div style={{ marginLeft: "auto", fontSize: 10, color: mutedC }}>now</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.forestLight, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.white }}>{name ? name[0].toUpperCase() : "Y"}</div>
              <div style={{ background: isPostCreate ? "#2D5A42" : C.white, borderRadius: "14px 14px 14px 3px", padding: "10px 13px", maxWidth: "88%" }}>
                <pre style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: isPostCreate ? "#ffffffcc" : C.ink, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{msg}</pre>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => copy()} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: copied && copiedTone === tone ? C.forestLight : C.gold, color: C.white, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: `0 4px 18px ${C.gold}44`, transition: "all 0.3s", marginBottom: 12 }}>
          {copied && copiedTone === tone ? "✓ Copied to Clipboard!" : `📋 Copy ${tones.find(t => t.key === tone)?.label} Message`}
        </button>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: mutedC, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 9 }}>Copy All Three Versions</div>
          {tones.map(t => (
            <button key={t.key} onClick={() => copy(t.key)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${copiedTone === t.key ? C.gold : cardBorder}`, background: copiedTone === t.key ? C.gold + "18" : cardBg, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left", transition: "all 0.2s", width: "100%", marginBottom: 7 }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: isPostCreate ? (copiedTone === t.key ? C.goldLight : "#ffffffcc") : C.ink }}>{t.label} Version</div>
                <div style={{ fontSize: 11, color: mutedC }}>{t.desc}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: copiedTone === t.key ? C.gold : isPostCreate ? "#ffffff15" : C.warm, color: copiedTone === t.key ? C.white : mutedC, transition: "all 0.3s" }}>{copiedTone === t.key ? "✓ Copied!" : "Copy"}</div>
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 11, background: isPostCreate ? "#ffffff0A" : C.gold + "12", border: `1px solid ${isPostCreate ? "#ffffff15" : C.gold + "33"}`, marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: isPostCreate ? "#ffffffaa" : C.goldDark, lineHeight: 1.7 }}>💡 <strong>Pro tip:</strong> The link at the bottom takes your group to the live progress page — they can check in any time without asking you for updates.</div>
        </div>

        {isPostCreate
          ? <button onClick={onDone} style={{ width: "100%", padding: "13px", borderRadius: 12, border: `1.5px solid #ffffff33`, background: "transparent", color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Go to Goal Dashboard →</button>
          : <button onClick={onBack} style={{ width: "100%", padding: "12px", borderRadius: 11, border: `1.5px solid ${C.border}`, background: C.white, color: C.ink, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Back to Goal</button>
        }
      </div>
    </div>
  );
}

// ─── REMINDERS PANEL ─────────────────────────────────────────────────────────
function RemindersPanel({ goal, onClose }) {
  const RK = "pf_rem_v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(RK) || "[]"); } catch { return []; } };
  const save = (r) => { try { localStorage.setItem(RK, JSON.stringify(r)); } catch {} };
  const [reminders, setReminders] = useState(() => load().filter(r => r.goalId === goal.id));
  const [msg, setMsg] = useState(""); const [date, setDate] = useState(""); const [sent, setSent] = useState(null);
  const tp = goal.members.reduce((s, m) => s + (m.paid || 0), 0);
  const p = Math.round(calcPct(tp, goal.amount));
  const unpaid = goal.members.filter(m => (m.paid || 0) < m.owed && !m.backedOut);
  const templates = [`Hey! "${goal.name}" is ${p}% funded. Your share is still pending 🎯`, `Quick nudge: we still need your contribution for "${goal.name}". Almost there! 💪`, `Don't forget "${goal.name}"! Can you send your share? 🙌`];

  function addR() { if (!msg || !date) return; const r = { id: genId(), goalId: goal.id, message: msg, date, createdAt: new Date().toISOString() }; const all = [...load(), r]; save(all); setReminders(all.filter(x => x.goalId === goal.id)); setMsg(""); setDate(""); }
  function delR(id) { const all = load().filter(r => r.id !== id); save(all); setReminders(all.filter(r => r.goalId === goal.id)); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.cream, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", overflow: "auto", padding: "18px 18px 34px", fontFamily: "'DM Sans',sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 34, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif" }}>🔔 Reminders</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22 }}>×</button>
        </div>
        {unpaid.length > 0 && <div style={{ background: C.warm, borderRadius: 11, padding: "11px 14px", marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Still needs to pay</div>{unpaid.map(m => <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ fontWeight: 600, color: C.ink, fontSize: 13 }}>{m.name}</span><span style={{ color: C.coral, fontWeight: 700, fontSize: 13 }}>owes ${fmt(m.owed - (m.paid || 0))}</span></div>)}</div>}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Templates</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>{templates.map((t, i) => <button key={i} onClick={() => setMsg(t)} style={{ background: C.white, border: `1.5px solid ${msg === t ? C.gold : C.border}`, borderRadius: 9, padding: "9px 12px", textAlign: "left", cursor: "pointer", fontSize: 13, color: C.ink, fontFamily: "inherit", lineHeight: 1.5 }}>{t}</button>)}</div>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Reminder message..." style={{ width: "100%", padding: "11px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontFamily: "inherit", fontSize: 14, color: C.ink, resize: "none", height: 74, outline: "none", boxSizing: "border-box", background: C.white }} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1, padding: "10px 11px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontFamily: "inherit", fontSize: 14, outline: "none", background: C.white, color: C.ink }} />
          <button onClick={addR} style={{ padding: "10px 16px", borderRadius: 9, border: "none", background: C.gold, color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Schedule</button>
        </div>
        {reminders.length > 0 && <div style={{ marginTop: 16 }}>{reminders.map(r => <div key={r.id} style={{ background: C.white, borderRadius: 10, padding: "11px 13px", border: `1.5px solid ${C.border}`, marginBottom: 7, display: "flex", gap: 9, alignItems: "flex-start" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, marginBottom: 2 }}>{r.message}</div><div style={{ fontSize: 11, color: C.muted }}>📅 {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => { setSent(r.id); setTimeout(() => setSent(null), 2000); }} style={{ padding: "5px 8px", borderRadius: 6, border: "none", background: sent === r.id ? C.forestLight : C.forest, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{sent === r.id ? "Sent!" : "Send"}</button><button onClick={() => delR(r.id)} style={{ padding: "5px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "none", color: C.muted, fontSize: 11, cursor: "pointer" }}>✕</button></div></div>)}</div>}
      </div>
    </div>
  );
}

// ─── BACKER RULES BUILDER ─────────────────────────────────────────────────────
function BackerRulesBuilder({ rules, onChange }) {
  const set = (k, v) => onChange({ ...rules, [k]: v });
  const OR = ({ selected, onClick, emoji, label, sub, warn }) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 13px", borderRadius: 11, border: `1.5px solid ${selected ? C.gold : C.border}`, background: selected ? C.gold + "14" : C.white, textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "inherit", marginBottom: 7, transition: "all 0.18s" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `2px solid ${selected ? C.gold : C.border}`, background: selected ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{selected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.white }} />}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>{emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}<span style={{ fontWeight: 700, color: C.ink, fontSize: 13 }}>{label}</span>{warn && <Pill color={C.coral}>Strict</Pill>}</div>
        {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </button>
  );
  const Tog = ({ label, value, onT, sub }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
      <div><div style={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>{label}</div>{sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{sub}</div>}</div>
      <div onClick={() => onT(!value)} style={{ width: 42, height: 23, borderRadius: 99, cursor: "pointer", background: value ? C.forest : C.border, position: "relative", transition: "background 0.25s", flexShrink: 0 }}>
        <div style={{ width: 17, height: 17, borderRadius: "50%", background: C.white, position: "absolute", top: 3, left: value ? 22 : 3, transition: "left 0.25s" }} />
      </div>
    </div>
  );
  const Sec = ({ title, children }) => <div style={{ marginBottom: 18 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 9 }}>{title}</div>{children}</div>;
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <Sec title="Commitment Level">
        <OR selected={rules.commitmentLevel === "soft"} onClick={() => set("commitmentLevel", "soft")} emoji="🤝" label="Soft Commit" sub="I plan to contribute — no formal obligation." />
        <OR selected={rules.commitmentLevel === "hard"} onClick={() => set("commitmentLevel", "hard")} emoji="✍️" label="Hard Commit" sub="Contributors formally agree before joining." />
      </Sec>
      <Sec title="Refund Policy">
        <OR selected={rules.refundPolicy === "no_refund"} onClick={() => set("refundPolicy", "no_refund")} emoji="🔒" label="No Refunds" sub="Share is owed regardless." warn />
        <OR selected={rules.refundPolicy === "full_before_deadline"} onClick={() => set("refundPolicy", "full_before_deadline")} emoji="⏳" label="Full Refund Before Deadline" sub="Grace period before things get serious." />
        <OR selected={rules.refundPolicy === "partial"} onClick={() => set("refundPolicy", "partial")} emoji="💸" label="Partial Refund" sub="Get back what was paid, still owe the rest." />
        <OR selected={rules.refundPolicy === "no_refund_after_purchase"} onClick={() => set("refundPolicy", "no_refund_after_purchase")} emoji="🛍️" label="No Refund After Purchase" sub="Refunds only before the item is bought." />
        {rules.refundPolicy === "full_before_deadline" && <div style={{ background: C.warm, borderRadius: 9, padding: "11px 13px", marginTop: -4, marginBottom: 7 }}><div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Grace period days before deadline</div><div style={{ display: "flex", gap: 7 }}>{[1, 2, 3, 5, 7].map(d => <button key={d} onClick={() => set("refundDeadlineDays", d)} style={{ padding: "6px 11px", borderRadius: 7, border: `1.5px solid ${rules.refundDeadlineDays === d ? C.gold : C.border}`, background: rules.refundDeadlineDays === d ? C.gold + "18" : C.white, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: rules.refundDeadlineDays === d ? C.goldDark : C.muted }}>{d}d</button>)}</div></div>}
      </Sec>
      <Sec title="If Someone Backs Out — Their Share Goes To...">
        <OR selected={rules.redistributionRule === "split"} onClick={() => set("redistributionRule", "split")} emoji="➗" label="Split Among Remaining" sub="Divided equally among everyone still in." />
        <OR selected={rules.redistributionRule === "adjust_goal"} onClick={() => set("redistributionRule", "adjust_goal")} emoji="📉" label="Adjust Goal Down" sub="Total target drops, everyone keeps their share." />
        <OR selected={rules.redistributionRule === "creator_covers"} onClick={() => set("redistributionRule", "creator_covers")} emoji="🙋" label="Creator Covers It" sub="Organizer takes on the missing portion." />
        <OR selected={rules.redistributionRule === "cancel_goal"} onClick={() => set("redistributionRule", "cancel_goal")} emoji="❌" label="Cancel Goal" sub="Anyone backs out, the whole goal is void." warn />
      </Sec>
      <Sec title="Reminders & Agreements">
        <Tog label="Automatic Reminder Escalation" value={rules.reminderEscalation} onT={v => set("reminderEscalation", v)} sub="Friendly nudge → firm notice → removal warning" />
        <Tog label="Require Agreement to Join" value={rules.requireAgreement} onT={v => set("requireAgreement", v)} sub="Contributors must tap 'I Agree' before being added" />
      </Sec>
      <Sec title="Grace Period to Confirm">
        <div style={{ display: "flex", gap: 7 }}>{[0, 1, 2, 3, 5].map(d => <button key={d} onClick={() => set("gracePeriodDays", d)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${rules.gracePeriodDays === d ? C.gold : C.border}`, background: rules.gracePeriodDays === d ? C.gold + "18" : C.white, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: rules.gracePeriodDays === d ? C.goldDark : C.muted }}>{d === 0 ? "None" : `${d}d`}</button>)}</div>
      </Sec>
    </div>
  );
}

// ─── RULES SUMMARY CARD ───────────────────────────────────────────────────────
function RulesSummaryCard({ rules, compact, onToggle }) {
  const items = [
    { icon: "✍️", label: "Commitment", val: rules.commitmentLevel === "hard" ? "Hard Commit Required" : "Soft Commit" },
    { icon: "💸", label: "Refund Policy", val: RULE_LABELS.refundPolicy[rules.refundPolicy] },
    { icon: "➗", label: "If Someone Bails", val: RULE_LABELS.redistributionRule[rules.redistributionRule] },
    { icon: "⏱️", label: "Grace Period", val: rules.gracePeriodDays === 0 ? "None" : `${rules.gracePeriodDays} days` },
    { icon: "🔔", label: "Reminders", val: rules.reminderEscalation ? "Auto-escalating" : "Manual only" },
    { icon: "🤝", label: "Agreement", val: rules.requireAgreement ? "Must agree to join" : "Not required" },
  ];
  const sc = [rules.commitmentLevel === "hard", rules.refundPolicy === "no_refund" || rules.refundPolicy === "cancel_goal", rules.requireAgreement].filter(Boolean).length;
  const sl = sc >= 3 ? "Strict" : sc >= 1 ? "Moderate" : "Flexible";
  const sColor = sc >= 3 ? C.coral : sc >= 1 ? C.gold : C.forestLight;
  if (compact) return <div style={{ background: C.warm, borderRadius: 11, padding: "10px 13px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }} onClick={onToggle}><span style={{ fontSize: 15 }}>📋</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Backer Rules</div><div style={{ fontSize: 11, color: C.muted }}>{RULE_LABELS.refundPolicy[rules.refundPolicy]} · {RULE_LABELS.redistributionRule[rules.redistributionRule]}</div></div><Pill color={sColor}>{sl}</Pill><span style={{ color: C.muted, fontSize: 13 }}>▼</span></div>;
  return (
    <div>
      <div style={{ background: C.forest, borderRadius: "13px 13px 0 0", padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 17 }}>📋</span><div style={{ fontWeight: 800, color: C.white, fontSize: 14 }}>Backer Rules</div></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Pill color={sColor} bg={sColor + "30"}>{sl}</Pill><span style={{ color: "#ffffff66", fontSize: 13 }}>▲</span></div>
      </div>
      <div style={{ background: C.warm, borderRadius: "0 0 13px 13px", border: `1px solid ${C.border}`, borderTop: "none" }}>
        {items.map((item, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 15px", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none" }}><span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginTop: 1 }}>{item.val}</div></div></div>)}
        {rules.requireAgreement && <div style={{ margin: "0 13px 13px", background: C.gold + "15", border: `1px solid ${C.gold}33`, borderRadius: 9, padding: "9px 11px" }}><div style={{ fontSize: 12, color: C.goldDark, lineHeight: 1.6 }}><strong>Agreement: </strong>{rules.refundPolicy === "no_refund" ? "Contributions are non-refundable." : rules.refundPolicy === "full_before_deadline" ? `Full refund ${rules.refundDeadlineDays} days before deadline.` : "Partial refund on payments made."} If you back out, your share will be {rules.redistributionRule === "split" ? "split among remaining contributors" : rules.redistributionRule === "adjust_goal" ? "removed from the goal target" : rules.redistributionRule === "creator_covers" ? "covered by the creator" : "grounds to cancel the entire goal"}.</div></div>}
      </div>
    </div>
  );
}

// ─── RECEIPT ──────────────────────────────────────────────────────────────────
function Receipt({ goal, onBack }) {
  const [copied, setCopied] = useState(false);
  const tp = goal.members.reduce((s, m) => s + (m.paid || 0), 0);
  const p = calcPct(tp, goal.amount); const complete = p >= 100;
  const typeEmoji = { gift: "🎁", trip: "✈️", party: "🎉", other: "✨" }[goal.type] || "✨";
  const rid = `PF-${goal.id.toUpperCase().slice(0, 6)}`;
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const nowT = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const backedOut = goal.members.filter(m => m.backedOut);

  function copyText() {
    const lines = [`━━━━━━━━━━━━━━━━━━━━━━`, `       POOLFUND`, `  GOAL SUMMARY RECEIPT`, `━━━━━━━━━━━━━━━━━━━━━━`, ``, `${typeEmoji} ${goal.name}`, `Receipt #: ${rid}`, `Generated: ${now}`, ``, `──────────────────────`, `CONTRIBUTIONS`, `──────────────────────`, ...goal.members.map(m => { const paid = m.paid || 0; const status = m.backedOut ? "BACKED OUT" : paid >= m.owed ? "✓ PAID" : `OWES $${fmt(m.owed - paid)}`; return `${m.name.padEnd(14)} $${fmt(paid).padStart(6)}  ${status}`; }), ``, `──────────────────────`, `Goal Total:    $${fmt(goal.amount)}`, `Collected:     $${fmt(tp)}`, `Outstanding:   $${fmt(Math.max(goal.amount - tp, 0))}`, `Progress:      ${Math.round(p)}%`, `──────────────────────`, complete ? `STATUS: ✓ GOAL COMPLETE` : `STATUS: IN PROGRESS`].join("\n");
    navigator.clipboard?.writeText(lines); setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  const Dash = ({ my = 13 }) => <div style={{ margin: `${my}px 0`, borderTop: `2px dashed ${C.border}`, opacity: 0.6 }} />;
  const Row = ({ label, value, color }) => <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ fontSize: 12, color: color || C.muted, fontFamily: "'DM Mono',monospace" }}>{label}</span><span style={{ fontSize: 12, fontWeight: 600, color: color || C.ink, fontFamily: "'DM Mono',monospace" }}>{value}</span></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#E8E0D0", fontFamily: "'DM Sans',sans-serif", paddingBottom: 60 }}>
      <div style={{ background: C.forest, padding: "13px 17px", display: "flex", alignItems: "center", gap: 9, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "#ffffff22", border: "none", color: C.white, borderRadius: 99, padding: "7px 13px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>← Back</button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>Goal Summary</div>
        <button onClick={copyText} style={{ padding: "7px 13px", borderRadius: 99, border: `1px solid ${C.goldLight}55`, background: copied ? C.forestLight : "transparent", color: copied ? C.white : C.goldLight, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s" }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
        <button onClick={() => window.print()} style={{ padding: "7px 13px", borderRadius: 99, border: "none", background: C.gold, color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🖨 Print</button>
      </div>
      <div style={{ maxWidth: 390, margin: "24px auto 0", padding: "0 18px" }}>
        <div style={{ textAlign: "center", marginBottom: 13 }}>{complete ? <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 18px", borderRadius: 99, background: C.forestLight, color: C.white, fontWeight: 700, fontSize: 13 }}>✓ Goal Complete</div> : <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 18px", borderRadius: 99, background: C.gold, color: C.white, fontWeight: 700, fontSize: 13 }}>{Math.round(p)}% Funded</div>}</div>
        <div style={{ background: C.receipt, borderRadius: 4, boxShadow: "0 8px 40px #00000025", overflow: "hidden" }}>
          <div style={{ height: 12, background: "#E8E0D0", overflow: "hidden" }}><svg width="400" height="12" viewBox="0 0 400 12" preserveAspectRatio="none"><path d="M0,0 Q10,12 20,6 Q30,0 40,6 Q50,12 60,6 Q70,0 80,6 Q90,12 100,6 Q110,0 120,6 Q130,12 140,6 Q150,0 160,6 Q170,12 180,6 Q190,0 200,6 Q210,12 220,6 Q230,0 240,6 Q250,12 260,6 Q270,0 280,6 Q290,12 300,6 Q310,0 320,6 Q330,12 340,6 Q350,0 360,6 Q370,12 380,6 Q390,0 400,6 L400,0 Z" fill={C.receipt} /></svg></div>
          <div style={{ padding: "6px 22px 0" }}>
            <div style={{ textAlign: "center", padding: "16px 0 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>PoolFund</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 900, color: C.ink }}>Goal Summary</div>
            </div>
            <Dash />
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{typeEmoji}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: C.ink }}>{goal.name}</div>
              {goal.deadline && <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>DEADLINE: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</div>}
            </div>
            <div style={{ background: C.receiptBg, borderRadius: 8, padding: "10px 12px", marginBottom: 11 }}><Row label="Receipt No." value={rid} /><Row label="Generated" value={`${now} ${nowT}`} /><Row label="Contributors" value={`${goal.members.length} people`} /></div>
            <Dash />
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Mono',monospace", display: "flex", justifyContent: "space-between" }}><span>CONTRIBUTOR</span><span>PAID / OWED</span></div>
              {goal.members.map((m, i) => { const paid = m.paid || 0; const done = paid >= m.owed && !m.backedOut; return (<div key={i} style={{ marginBottom: 9 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 21, height: 21, borderRadius: "50%", background: m.backedOut ? "#ffeeee" : done ? C.forestLight : C.warm, border: `1.5px solid ${m.backedOut ? C.coral : done ? C.forestLight : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: m.backedOut ? C.coral : done ? C.white : C.muted }}>{m.backedOut ? "✗" : done ? "✓" : m.name[0]?.toUpperCase()}</div><div><div style={{ fontWeight: 700, color: m.backedOut ? C.muted : C.ink, fontSize: 12, textDecoration: m.backedOut ? "line-through" : "none" }}>{m.name}</div><div style={{ fontSize: 9, color: m.backedOut ? C.coral : done ? C.forestLight : C.coral, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{m.backedOut ? "BACKED OUT" : done ? "PAID IN FULL" : `OWES $${fmt(m.owed - paid)}`}</div></div></div><div style={{ textAlign: "right" }}><div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 12, color: m.backedOut ? C.muted : C.ink }}>${fmt(paid)}</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: C.muted }}>of ${fmt(m.owed)}</div></div></div>{!m.backedOut && <div style={{ height: 3, background: C.border, borderRadius: 99, marginTop: 4, marginLeft: 28 }}><div style={{ height: "100%", width: `${calcPct(paid, m.owed)}%`, background: done ? C.forestLight : C.gold, borderRadius: 99 }} /></div>}</div>); })}
            </div>
            <Dash />
            <div style={{ marginBottom: 9 }}><Row label="Goal Target" value={`$${fmt(goal.amount)}`} /><Row label="Total Collected" value={`$${fmt(tp)}`} />{goal.amount - tp > 0 && <Row label="Outstanding" value={`$${fmt(Math.max(goal.amount - tp, 0))}`} color={C.coral} />}<Row label="Progress" value={`${Math.round(p)}%`} /></div>
            <div style={{ background: complete ? C.forest : C.ink, borderRadius: 9, padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 9, fontWeight: 700, color: "#ffffff66", textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>Total Raised</div><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: C.white }}>${fmt(tp)}</div></div><div style={{ position: "relative" }}><ProgressRing p={p} size={46} stroke={4} complete={complete} /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: C.white }}>{Math.round(p)}%</div></div></div>
            {goal.rules && <><Dash /><div style={{ marginBottom: 11 }}><div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>Backer Rules Applied</div><Row label="Refund Policy" value={RULE_LABELS.refundPolicy[goal.rules.refundPolicy]} /><Row label="If Someone Bails" value={RULE_LABELS.redistributionRule[goal.rules.redistributionRule]} /><Row label="Commitment" value={goal.rules.commitmentLevel === "hard" ? "Hard Commit" : "Soft Commit"} />{backedOut.length > 0 && <Row label="Backed Out" value={backedOut.map(m => m.name).join(", ")} color={C.coral} />}</div></>}
            <Dash color={C.muted} my={7} />
            <div style={{ textAlign: "center", padding: "9px 0 16px" }}>{complete ? <div style={{ display: "inline-block", padding: "4px 13px", borderRadius: 3, border: `2.5px solid ${C.forestLight}`, color: C.forestLight, fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", transform: "rotate(-2deg)", marginBottom: 9 }}>✓ GOAL COMPLETE</div> : <div style={{ display: "inline-block", padding: "4px 13px", borderRadius: 3, border: `2.5px solid ${C.gold}`, color: C.gold, fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", transform: "rotate(-1.5deg)", marginBottom: 9 }}>IN PROGRESS</div>}<div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono',monospace", marginTop: 9, lineHeight: 1.8 }}>Thank you for using PoolFund<br /><span style={{ color: C.gold }}>poolfund.app</span></div><div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 1, opacity: 0.15 }}>{Array.from({ length: 36 }, (_, i) => <div key={i} style={{ width: i % 3 === 0 ? 2 : 1, height: i % 5 === 0 ? 22 : 16, background: C.ink }} />)}</div><div style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: C.muted, marginTop: 2, letterSpacing: "0.1em" }}>{rid}</div></div>
          </div>
          <div style={{ height: 12, background: "#E8E0D0", overflow: "hidden" }}><svg width="400" height="12" viewBox="0 0 400 12" preserveAspectRatio="none"><path d="M0,12 Q10,0 20,6 Q30,12 40,6 Q50,0 60,6 Q70,12 80,6 Q90,0 100,6 Q110,12 120,6 Q130,0 140,6 Q150,12 160,6 Q170,0 180,6 Q190,12 200,6 Q210,0 220,6 Q230,12 240,6 Q250,0 260,6 Q270,12 280,6 Q290,0 300,6 Q310,12 320,6 Q330,0 340,6 Q350,12 360,6 Q370,0 380,6 Q390,12 400,6 L400,12 Z" fill={C.receipt} /></svg></div>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
          <button onClick={copyText} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: copied ? C.forestLight : C.white, color: copied ? C.white : C.ink, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s" }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
          <button onClick={() => window.print()} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: C.gold, color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 14px ${C.gold}44` }}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}

// ─── SHARE PAGE ───────────────────────────────────────────────────────────────
function SharePage({ goal, onBack, onInvite }) {
  const [copied, setCopied] = useState(false); const [showRules, setShowRules] = useState(false);
  const tp = goal.members.reduce((s, m) => s + (m.paid || 0), 0);
  const p = calcPct(tp, goal.amount); const complete = p >= 100;
  const typeEmoji = { gift: "🎁", trip: "✈️", party: "🎉", other: "✨" }[goal.type] || "✨";
  return (
    <div style={{ minHeight: "100vh", background: C.forest, fontFamily: "'DM Sans',sans-serif", paddingBottom: 40 }}>
      <div style={{ padding: "17px 17px 0" }}><button onClick={onBack} style={{ background: "#ffffff22", border: "none", color: C.white, borderRadius: 99, padding: "8px 15px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>← Back</button></div>
      <div style={{ padding: "24px 21px 0", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>{typeEmoji}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.goldLight, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 7 }}>You're invited to contribute</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: C.white, margin: "0 0 5px" }}>{goal.name}</h1>
        {goal.deadline && <div style={{ fontSize: 12, color: "#ffffff66" }}>Deadline: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
      </div>
      <div style={{ padding: "20px 21px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: C.forestMid, borderRadius: 19, padding: "20px", textAlign: "center", border: "1px solid #ffffff15", marginBottom: 13 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 11, position: "relative" }}><ProgressRing p={p} size={90} stroke={8} complete={complete} /><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.white }}>{Math.round(p)}%</div><div style={{ fontSize: 9, color: "#ffffff55" }}>funded</div></div></div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.white }}>${fmt(tp)}<span style={{ fontSize: 14, color: "#ffffff55", fontWeight: 400 }}> / ${fmt(goal.amount)}</span></div>
          {!complete && <div style={{ fontSize: 13, color: C.goldLight, marginTop: 4 }}>${fmt(goal.amount - tp)} still needed</div>}
          {complete && <div style={{ fontSize: 13, color: C.goldLight, fontWeight: 700, marginTop: 4 }}>🎉 Goal fully funded!</div>}
        </div>
        {goal.rules && <div style={{ marginBottom: 13 }}><RulesSummaryCard rules={goal.rules} compact={!showRules} onToggle={() => setShowRules(s => !s)} /></div>}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#ffffff55", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Contributors</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 17 }}>
          {goal.members.map(m => { const done = (m.paid || 0) >= m.owed && !m.backedOut; return <div key={m.id} style={{ background: "#ffffff0E", borderRadius: 12, padding: "12px 14px", border: `1px solid ${m.backedOut ? "#D95F3B44" : done ? "#3D7A5A44" : "#ffffff10"}`, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 33, height: 33, borderRadius: "50%", flexShrink: 0, background: m.backedOut ? "#D95F3B33" : done ? C.forestLight : "#ffffff15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: m.backedOut ? C.coral : C.white }}>{m.backedOut ? "✗" : done ? "✓" : m.name[0]?.toUpperCase()}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: m.backedOut ? "#ffffff55" : C.white, fontSize: 13, textDecoration: m.backedOut ? "line-through" : "none" }}>{m.name}</div><div style={{ fontSize: 11, color: "#ffffff55" }}>${fmt(m.paid || 0)} of ${fmt(m.owed)}</div></div>{m.backedOut ? <Pill color={C.coral}>Backed Out</Pill> : done ? <Pill color={C.forestLight}>Paid ✓</Pill> : <div style={{ fontSize: 12, color: C.goldLight, fontWeight: 700 }}>Owes ${fmt(m.owed - (m.paid || 0))}</div>}</div>; })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <button onClick={() => { navigator.clipboard?.writeText(`https://poolfund.app/goal/${goal.id}`); setCopied(true); setTimeout(() => setCopied(false), 2500); }} style={{ padding: "12px 8px", borderRadius: 11, border: `1.5px solid ${C.gold}44`, background: copied ? C.forestLight : C.gold + "22", color: copied ? C.white : C.goldLight, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s" }}>{copied ? "✓ Copied!" : "🔗 Copy Link"}</button>
          <button onClick={onInvite} style={{ padding: "12px 8px", borderRadius: 11, border: "none", background: C.gold, color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 3px 11px ${C.gold}44` }}>💬 Invite Message</button>
        </div>
      </div>
    </div>
  );
}

// ─── GOAL DETAIL ──────────────────────────────────────────────────────────────
function GoalDetail({ goal, onUpdate, onDelete, onBack, onShare, onReceipt, onInvite }) {
  const [confetti, setConfetti] = useState(false);
  const [payingId, setPayingId] = useState(null); const [payAmt, setPayAmt] = useState("");
  const [showReminders, setShowReminders] = useState(false); const [showRules, setShowRules] = useState(false);
  const [backingOutId, setBackingOutId] = useState(null);
  const tp = goal.members.reduce((s, m) => s + (m.paid || 0), 0);
  const p = calcPct(tp, goal.amount); const complete = p >= 100;
  const typeEmoji = { gift: "🎁", trip: "✈️", party: "🎉", other: "✨" }[goal.type] || "✨";

  function logPay(mid) { const a = parseFloat(payAmt); if (!a || a <= 0) return; const u = { ...goal, members: goal.members.map(m => m.id === mid ? { ...m, paid: Math.min((m.paid || 0) + a, m.owed) } : m) }; onUpdate(u); setPayingId(null); setPayAmt(""); const np = u.members.reduce((s, m) => s + (m.paid || 0), 0); if (np >= goal.amount && tp < goal.amount) { setTimeout(() => setConfetti(true), 200); setTimeout(() => setConfetti(false), 3500); } }
  function markBO(mid) { const m = goal.members.find(x => x.id === mid); const rem = m.owed - (m.paid || 0); let ums = goal.members.map(x => x.id === mid ? { ...x, backedOut: true } : x); const rules = goal.rules || DEFAULT_RULES; if (rules.redistributionRule === "split") { const act = ums.filter(x => !x.backedOut); if (act.length > 0) { const ex = rem / act.length; ums = ums.map(x => x.backedOut ? x : { ...x, owed: x.owed + ex }); } } else if (rules.redistributionRule === "adjust_goal") { onUpdate({ ...goal, amount: Math.max(goal.amount - rem, tp), members: ums }); setBackingOutId(null); return; } onUpdate({ ...goal, members: ums }); setBackingOutId(null); }

  const inp = { padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.ink, outline: "none", background: C.white, boxSizing: "border-box", width: "100%" };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 15px 80px", fontFamily: "'DM Sans',sans-serif" }}>
      <Confetti active={confetti} />
      {showReminders && <RemindersPanel goal={goal} onClose={() => setShowReminders(false)} />}
      {backingOutId && <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}><div style={{ background: C.white, borderRadius: 18, padding: "24px 22px", maxWidth: 330, width: "100%", fontFamily: "'DM Sans',sans-serif" }}><div style={{ fontSize: 28, textAlign: "center", marginBottom: 10 }}>⚠️</div><div style={{ fontWeight: 800, fontSize: 16, color: C.ink, textAlign: "center", fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>Mark as Backed Out?</div><div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, marginBottom: 17 }}>{goal.rules?.redistributionRule === "split" && "Their remaining share will be split among other contributors."}{goal.rules?.redistributionRule === "adjust_goal" && "The goal total will be reduced by their remaining share."}{goal.rules?.redistributionRule === "creator_covers" && "Their share will need to be covered by the creator."}{goal.rules?.redistributionRule === "cancel_goal" && "⚠️ Per the rules, this will cancel the entire goal."}{!goal.rules && "Their status will be updated to Backed Out."}</div><div style={{ display: "flex", gap: 8 }}><button onClick={() => setBackingOutId(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", color: C.muted }}>Cancel</button><button onClick={() => markBO(backingOutId)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: C.coral, color: C.white, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Confirm</button></div></div></div>}

      <div style={{ display: "flex", alignItems: "center", padding: "18px 0 9px", gap: 9 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, padding: "4px 5px 0" }}>←</button>
        <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{typeEmoji} {goal.type}</div><div style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{goal.name}</div></div>
      </div>
      {goal.deadline && <div style={{ fontSize: 12, color: C.muted, marginBottom: 11, marginLeft: 38 }}>📅 Due {new Date(goal.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}

      <div style={{ background: complete ? C.forest : C.ink, borderRadius: 18, padding: "19px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14, transition: "background 0.6s" }}>
        <div style={{ position: "relative", flexShrink: 0 }}><ProgressRing p={p} size={78} stroke={6} complete={complete} /><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{Math.round(p)}%</div></div></div>
        <div style={{ flex: 1 }}>{complete ? <div style={{ fontSize: 13, fontWeight: 800, color: C.goldLight, fontFamily: "'Playfair Display',serif", marginBottom: 3 }}>🎉 Goal Reached!</div> : <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Collected</div>}<div style={{ fontSize: 24, fontWeight: 800, color: C.white }}>${fmt(tp)}<span style={{ fontSize: 13, color: "#666", fontWeight: 400 }}> / ${fmt(goal.amount)}</span></div>{!complete && <div style={{ fontSize: 12, color: C.goldLight, marginTop: 2 }}>${fmt(goal.amount - tp)} still needed</div>}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 7, marginBottom: 15 }}>
        {[{ label: "📤 Share", action: onShare }, { label: "💬 Invite", action: onInvite }, { label: "🔔 Remind", action: () => setShowReminders(true) }, { label: "🧾 Receipt", action: onReceipt }].map((btn, i) => (
          <button key={i} onClick={btn.action} style={{ padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.white, color: C.ink, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{btn.label}</button>
        ))}
      </div>

      {goal.rules && <div style={{ marginBottom: 15 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Backer Rules</div><RulesSummaryCard rules={goal.rules} compact={!showRules} onToggle={() => setShowRules(s => !s)} /></div>}

      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Contributors</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {goal.members.map(m => {
          const mp = calcPct(m.paid || 0, m.owed); const done = (m.paid || 0) >= m.owed && !m.backedOut;
          const rem = Math.max(m.owed - (m.paid || 0), 0); const isBO = m.backedOut;
          return (
            <div key={m.id} style={{ background: isBO ? "#fff5f5" : C.white, borderRadius: 13, border: `1.5px solid ${isBO ? C.coral + "44" : done ? C.forestLight + "55" : C.border}`, overflow: "hidden", opacity: isBO ? 0.8 : 1 }}>
              <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: isBO ? "#ffdddd" : done ? C.forestLight : C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.white }}>{isBO ? "✗" : done ? "✓" : m.name[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                    <div style={{ fontWeight: 700, color: isBO ? C.muted : C.ink, fontSize: 14, textDecoration: isBO ? "line-through" : "none" }}>{m.name}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{isBO ? <Pill color={C.coral}>Backed Out</Pill> : done ? <Pill color={C.forestLight}>Paid ✓</Pill> : <Pill color={C.coral}>Owes ${fmt(rem)}</Pill>}{goal.rules?.requireAgreement && !isBO && (m.agreed ? <Pill color={C.forestLight}>Agreed ✓</Pill> : <Pill color={C.muted}>Pending</Pill>)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>${fmt(m.paid || 0)} paid of ${fmt(m.owed)}</div>
                </div>
              </div>
              {!isBO && <div style={{ height: 3, background: C.border }}><div style={{ height: "100%", width: `${mp}%`, background: done ? C.forestLight : C.gold, transition: "width 0.7s ease" }} /></div>}
              {!isBO && !done && <div style={{ padding: "8px 14px", display: "flex", gap: 7 }}>
                {payingId === m.id
                  ? <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}><div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>$</span><input autoFocus type="number" placeholder={fmt(rem)} value={payAmt} onChange={e => setPayAmt(e.target.value)} style={{ ...inp, paddingLeft: 23 }} onKeyDown={e => e.key === "Enter" && logPay(m.id)} /></div><button onClick={() => logPay(m.id)} style={{ padding: "9px 13px", borderRadius: 8, border: "none", background: C.gold, color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Log</button><button onClick={() => setPayingId(null)} style={{ padding: "9px 9px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>×</button></div>
                  : <><button onClick={() => { setPayingId(m.id); setPayAmt(""); }} style={{ flex: 1, background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", cursor: "pointer", fontSize: 12, color: C.muted, fontFamily: "inherit" }}>+ Log Payment</button><button onClick={() => setBackingOutId(m.id)} style={{ background: "none", border: `1.5px solid ${C.coral}33`, borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontSize: 12, color: C.coral, fontFamily: "inherit", fontWeight: 600 }}>Bailed</button>{goal.rules?.requireAgreement && !m.agreed && <button onClick={() => onUpdate({ ...goal, members: goal.members.map(x => x.id === m.id ? { ...x, agreed: true } : x) })} style={{ background: C.forestLight + "15", border: `1.5px solid ${C.forestLight}55`, borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontSize: 12, color: C.forestLight, fontFamily: "inherit", fontWeight: 600 }}>Agreed ✓</button>}</>
                }
              </div>}
            </div>
          );
        })}
      </div>
      <button onClick={onDelete} style={{ marginTop: 26, width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #ffcccc", background: "none", color: "#cc4444", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Delete this goal</button>
    </div>
  );
}

// ─── CREATE GOAL ──────────────────────────────────────────────────────────────
function CreateGoal({ onCreate, onBack }) {
  const [step, setStep] = useState(1); const [type, setType] = useState(""); const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [deadline, setDeadline] = useState(""); const [members, setMembers] = useState([{ id: genId(), name: "", paid: 0 }]); const [splitMode, setSplitMode] = useState("equal"); const [rules, setRules] = useState({ ...DEFAULT_RULES }); const [skipRules, setSkipRules] = useState(false);
  const vMs = members.filter(m => m.name.trim()); const eqShare = vMs.length > 0 ? (parseFloat(amount) || 0) / vMs.length : 0;
  const inp = { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: C.ink, outline: "none", background: C.white, boxSizing: "border-box" };
  const lbl = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" };
  function go() { const ms = vMs.map(m => ({ ...m, owed: splitMode === "equal" ? eqShare : (parseFloat(m.owed) || eqShare), paid: 0, agreed: false })); if (!name || !amount || ms.length < 1) return; onCreate({ id: genId(), type, name, amount: parseFloat(amount), deadline, members: ms, splitMode, rules: skipRules ? null : rules, createdAt: new Date().toISOString() }); }
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 15px 60px", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 0 14px" }}>
        <button onClick={step > 1 ? () => setStep(s => s - 1) : onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, padding: "4px 5px 0" }}>←</button>
        <div><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>New Goal · Step {step} of 4</div><div style={{ fontSize: 19, fontWeight: 800, color: C.ink, fontFamily: "'Playfair Display',serif" }}>{["What are you pooling for?", "Set the details", "Add contributors", "Set the backer rules"][step - 1]}</div></div>
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>{[1, 2, 3, 4].map(s => <div key={s} style={{ height: 4, flex: 1, borderRadius: 99, background: s <= step ? s === 4 ? C.forest : C.gold : C.border, transition: "background 0.3s" }} />)}</div>

      {step === 1 && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[{ key: "gift", emoji: "🎁", label: "Group Gift", sub: "Birthday, holiday, retirement..." }, { key: "trip", emoji: "✈️", label: "Group Trip", sub: "Vacation, weekend getaway..." }, { key: "party", emoji: "🎉", label: "Party / Event", sub: "Celebration, dinner, experience..." }, { key: "other", emoji: "✨", label: "Something Else", sub: "Any custom goal" }].map(t => <button key={t.key} onClick={() => { setType(t.key); setStep(2); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 17px", borderRadius: 13, border: `1.5px solid ${type === t.key ? C.gold : C.border}`, background: type === t.key ? C.gold + "11" : C.white, textAlign: "left", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}><span style={{ fontSize: 26 }}>{t.emoji}</span><div><div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>{t.label}</div><div style={{ fontSize: 12, color: C.muted }}>{t.sub}</div></div></button>)}</div>}

      {step === 2 && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><div><label style={lbl}>Goal Name</label><input style={inp} placeholder={type === "gift" ? "e.g. Mom's Birthday Gift" : "Goal name..."} value={name} onChange={e => setName(e.target.value)} /></div><div><label style={lbl}>Total Amount</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontWeight: 700 }}>$</span><input style={{ ...inp, paddingLeft: 26 }} type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></div></div><div><label style={lbl}>Deadline (optional)</label><input style={inp} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></div><button onClick={() => setStep(3)} disabled={!name || !amount} style={{ padding: "12px", borderRadius: 11, border: "none", background: (!name || !amount) ? C.border : C.forest, color: C.white, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Continue →</button></div>}

      {step === 3 && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><div><label style={lbl}>How to split?</label><div style={{ display: "flex", gap: 7 }}>{[["equal", "Split Equally"], ["custom", "Custom Amounts"]].map(([k, l]) => <button key={k} onClick={() => setSplitMode(k)} style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${splitMode === k ? C.gold : C.border}`, background: splitMode === k ? C.gold + "18" : C.white, fontWeight: 600, color: splitMode === k ? C.goldDark : C.muted, fontSize: 13, fontFamily: "inherit" }}>{l}</button>)}</div></div><div><label style={lbl}>Contributors</label><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{members.map((m, i) => <div key={m.id} style={{ display: "flex", gap: 6, alignItems: "center" }}><input style={{ ...inp, flex: 1 }} placeholder={`Person ${i + 1}`} value={m.name} onChange={e => setMembers(ms => ms.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))} />{splitMode === "custom" && <div style={{ position: "relative", width: 80 }}><span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 12 }}>$</span><input style={{ ...inp, paddingLeft: 18, width: "100%", fontSize: 12 }} type="number" placeholder="0" value={m.owed || ""} onChange={e => setMembers(ms => ms.map(x => x.id === m.id ? { ...x, owed: e.target.value } : x))} /></div>}{splitMode === "equal" && m.name && <div style={{ minWidth: 56, textAlign: "right", fontWeight: 700, color: C.gold, fontSize: 12 }}>${fmt(eqShare)}</div>}{members.length > 1 && <button onClick={() => setMembers(ms => ms.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 17 }}>×</button>}</div>)}</div><button onClick={() => setMembers(ms => [...ms, { id: genId(), name: "", paid: 0 }])} style={{ marginTop: 8, background: "none", border: `1.5px dashed ${C.border}`, borderRadius: 9, padding: "8px", width: "100%", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "inherit" }}>+ Add Person</button></div><button onClick={() => setStep(4)} style={{ padding: "12px", borderRadius: 11, border: "none", background: C.forest, color: C.white, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Continue →</button></div>}

      {step === 4 && <div>
        <div style={{ background: C.forest, borderRadius: 13, padding: "14px 16px", marginBottom: 17, display: "flex", gap: 11, alignItems: "flex-start" }}><span style={{ fontSize: 21 }}>📋</span><div><div style={{ fontWeight: 800, color: C.white, fontSize: 14, marginBottom: 3 }}>Set the ground rules</div><div style={{ fontSize: 13, color: "#ffffff88", lineHeight: 1.6 }}>Shown to every contributor when they join. Everyone agrees before being added.</div></div></div>
        <BackerRulesBuilder rules={rules} onChange={setRules} />
        <div style={{ marginTop: 6, marginBottom: 13 }}><button onClick={() => setSkipRules(s => !s)} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: "7px 0", fontFamily: "inherit" }}><div style={{ width: 17, height: 17, borderRadius: 3, border: `2px solid ${skipRules ? C.muted : C.gold}`, background: skipRules ? "none" : C.gold + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{skipRules && <span style={{ fontSize: 10, color: C.muted }}>–</span>}</div><span style={{ fontSize: 13, color: C.muted }}>Skip rules (not recommended)</span></button></div>
        {!skipRules && <div style={{ background: C.warm, borderRadius: 11, padding: "11px 13px", marginBottom: 15, border: `1px solid ${C.border}` }}><div style={{ fontSize: 11, fontWeight: 700, color: C.goldDark, marginBottom: 3 }}>📝 Agreement Preview</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>Contributors will see: <em>"{rules.refundPolicy === "no_refund" ? "Contributions are non-refundable." : rules.refundPolicy === "full_before_deadline" ? `Full refund ${rules.refundDeadlineDays} days before deadline.` : "Partial refund on payments made."} If you back out, your share will be {rules.redistributionRule === "split" ? "split among remaining contributors" : rules.redistributionRule === "adjust_goal" ? "removed from the goal target" : rules.redistributionRule === "creator_covers" ? "covered by the creator" : "grounds to cancel the entire goal"}."</em></div></div>}
        <button onClick={go} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gold, color: C.white, fontWeight: 800, fontSize: 15, fontFamily: "inherit", boxShadow: `0 4px 18px ${C.gold}44` }}>🎯 Create Goal</button>
      </div>}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function GoalCard({ goal, onSelect }) {
  const tp = goal.members.reduce((s, m) => s + (m.paid || 0), 0);
  const p = calcPct(tp, goal.amount); const done = p >= 100;
  const boc = goal.members.filter(m => m.backedOut).length;
  const typeEmoji = { gift: "🎁", trip: "✈️", party: "🎉", other: "✨" }[goal.type] || "✨";
  return (
    <button onClick={() => onSelect(goal.id)} style={{ width: "100%", background: C.white, borderRadius: 13, border: `1.5px solid ${done ? C.forestLight + "66" : C.border}`, padding: "13px", cursor: "pointer", textAlign: "left", display: "flex", gap: 11, alignItems: "center", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
      <div style={{ position: "relative", flexShrink: 0 }}><ProgressRing p={p} size={48} stroke={4} complete={done} /><div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{typeEmoji}</div></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: 14, marginBottom: 2 }}>{goal.name}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{goal.members.length} contributors · ${fmt(tp)} of ${fmt(goal.amount)}</div>
        <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>{goal.rules && <Pill color={C.forest}>Rules Set</Pill>}{boc > 0 && <Pill color={C.coral}>{boc} Backed Out</Pill>}{done && <Pill color={C.forestLight}>Done ✓</Pill>}</div>
      </div>
    </button>
  );
}

function Home({ goals, onCreate, onSelect }) {
  const active = goals.filter(g => { const p = g.members.reduce((s, m) => s + (m.paid || 0), 0); return p < g.amount; });
  const done = goals.filter(g => { const p = g.members.reduce((s, m) => s + (m.paid || 0), 0); return p >= g.amount; });
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 15px 60px", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ padding: "24px 0 15px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <LogoWordmark dark size="md" />
        </div>
        <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>Everyone chips in, everyone stays accountable.</p>
      </div>
      <button onClick={onCreate} style={{ width: "100%", padding: "13px", borderRadius: 13, border: "none", background: C.gold, color: C.white, fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 4px 18px ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>＋ Start a New Goal</button>
      {active.length > 0 && <div style={{ marginTop: 22 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Active Goals</div><div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{active.map(g => <GoalCard key={g.id} goal={g} onSelect={onSelect} />)}</div></div>}
      {done.length > 0 && <div style={{ marginTop: 22 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Completed 🎉</div><div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{done.map(g => <GoalCard key={g.id} goal={g} onSelect={onSelect} />)}</div></div>}
      {goals.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}><div style={{ fontSize: 44, marginBottom: 10 }}>🎯</div><div style={{ fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>No goals yet</div><div style={{ fontSize: 13 }}>Tap above to create your first group goal</div></div>}
      <div style={{ marginTop: 28, borderRadius: 16, overflow: "hidden", border: `1.5px solid ${C.border}` }}>
        <div style={{ background: C.forest, padding: "14px 16px" }}><div style={{ color: C.goldLight, fontWeight: 800, fontSize: 15, fontFamily: "'Playfair Display',serif" }}>PoolFund Pro</div><div style={{ color: "#ffffff66", fontSize: 12, marginTop: 1 }}>Unlimited goals, rules, invites & receipts</div></div>
        <div style={{ background: C.white, padding: "13px 16px" }}>{["Unlimited active goals", "Backer rules on every goal", "Invite messages in 3 tones", "Automatic reminder escalation", "Goal receipts with rules history"].map((f, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13, color: C.ink }}><span style={{ color: C.gold, fontWeight: 700 }}>✓</span>{f}</div>)}<div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><span style={{ fontSize: 21, fontWeight: 800, color: C.ink }}>${PRO_PRICE}</span><span style={{ fontSize: 12, color: C.muted }}>/month</span></div><a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: C.forest, color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}>Upgrade</a></div></div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [goals, setGoals] = useState(() => loadGoals());
  const [screen, setScreen] = useState("landing");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => { saveGoals(goals); }, [goals]);

  function handleCreate(goal) { setGoals(g => [goal, ...g]); setActiveId(goal.id); setScreen("invite_postcreate"); }
  function handleUpdate(u) { setGoals(g => g.map(x => x.id === u.id ? u : x)); }
  function handleDelete() { setGoals(g => g.filter(x => x.id !== activeId)); setScreen("home"); }

  const activeGoal = goals.find(g => g.id === activeId);
  const bgColor = { landing: C.ink, share: C.forest, receipt: "#E8E0D0", invite_postcreate: C.forest, invite: C.cream }[screen] || C.cream;

  return (
    <div style={{ minHeight: "100vh", background: bgColor }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button:active { transform: scale(0.97); }
        input:focus, textarea:focus { border-color: ${C.gold} !important; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes pfFall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes pfFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pfPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .gold-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 36px ${C.gold}55 !important; }
        .gold-btn { transition: all 0.2s; }
      `}</style>

      {screen === "landing" && <Landing onEnterApp={() => setScreen("home")} />}
      {screen === "home" && <Home goals={goals} onCreate={() => setScreen("create")} onSelect={id => { setActiveId(id); setScreen("detail"); }} />}
      {screen === "create" && <CreateGoal onCreate={handleCreate} onBack={() => setScreen("home")} />}
      {screen === "detail" && activeGoal && <GoalDetail goal={activeGoal} onUpdate={handleUpdate} onDelete={handleDelete} onBack={() => setScreen("home")} onShare={() => setScreen("share")} onReceipt={() => setScreen("receipt")} onInvite={() => setScreen("invite")} />}
      {screen === "share" && activeGoal && <SharePage goal={activeGoal} onBack={() => setScreen("detail")} onInvite={() => setScreen("invite")} />}
      {screen === "receipt" && activeGoal && <Receipt goal={activeGoal} onBack={() => setScreen("detail")} />}
      {screen === "invite" && activeGoal && <InviteMessage goal={activeGoal} onBack={() => setScreen("share")} isPostCreate={false} />}
      {screen === "invite_postcreate" && activeGoal && <InviteMessage goal={activeGoal} onBack={() => setScreen("detail")} onDone={() => setScreen("detail")} isPostCreate={true} />}
    </div>
  );
}
