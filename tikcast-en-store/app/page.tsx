import BuyForm from "./components/BuyForm";

// TikCast_en sales page — ported from the Muse static sales page
// (deep navy night-town, sky blue #38bdf8, sun yellow #ffd23f).
// No technical generation costs are shown — only the product and its price.

const faqs: Array<[string, string]> = [
  [
    "How much do I pay, exactly?",
    "$20, once. The price is charged in US dollars with no extra checkout fees. If your card is in another currency, your own bank converts it at its normal rate.",
  ],
  [
    "Can I do this on my phone?",
    "Yes. The method works on a phone and on a computer — use whichever you have. A computer is more comfortable for some steps, but it is not required.",
  ],
  [
    "What do I need?",
    "A phone or a computer, a Claude account, and a Higgsfield account. The ebook walks you through connecting everything, step by step.",
  ],
  [
    "How do I get the ebook after paying?",
    "Right after payment you are sent back to this site with your personal download link. Bookmark it — you can come back and download the ebook again from the same link.",
  ],
  [
    "Do I need any skills?",
    "No. You don't need to know animation, coding or editing. You type your idea and follow the guide — the AI tools do the heavy lifting.",
  ],
  [
    "Will my videos go viral?",
    "Results are not guaranteed. The ebook shows you exactly the format and workflow behind Shorts that reached millions of views, but views, followers and income depend on your own content and how often you post.",
  ],
  [
    "Is Claude or Higgsfield included?",
    "No. The $20 covers the ebook only. Claude and Higgsfield accounts are created separately on their own sites — the guide shows you how.",
  ],
  [
    "What if I get stuck?",
    "Every step is written so you can follow it in order, with the exact prompts to copy. If a step fails, redo it slowly — the troubleshooting notes in the ebook cover the common mistakes.",
  ],
  [
    "Can I get a refund?",
    "This is a digital download delivered instantly, so all sales are final. If your download link does not work, contact us and we will fix your access.",
  ],
  [
    "What language is the ebook in?",
    "English — the same language as the videos you will post on X, TikTok, YouTube Shorts and Reels.",
  ],
];

export default function HomePage() {
  return (
    <>
      <div className="hero wrap">
        <h1>
          Make viral <span className="sky">faceless Shorts</span> with <span className="sun">AI</span>.
        </h1>
        <p className="lead">
          The complete TikCast_en guide: how one idea — “In this town, [one absurd rule]” —
          becomes a finished vertical video with voice, captions and animation. No face on
          camera. No filming.
        </p>
        <a className="btn" href="#buy">
          Get instant access — $20
        </a>
        <div className="stats">
          <div className="stat">
            <b>200M+</b>
            <span>views on this format</span>
          </div>
          <div className="stat">
            <b>25 pages</b>
            <span>the full method, in English</span>
          </div>
          <div className="stat">
            <b>1 idea</b>
            <span>in — a finished Short out</span>
          </div>
        </div>
      </div>

      <section className="wrap" id="watch">
        <h2>Watch the format</h2>
        <p className="sub">Real Shorts from the channel — this is the style the ebook teaches.</p>
        <div className="watch-grid">
          {/* Replace each placeholder with the channel's own video embeds
              (YouTube youtube-nocookie iframes) — see README. */}
          <div className="watch-ph">
            <div>
              <b>“Ahh, almost… almost! 🤏”</b>
              Watch on the channel — video slot 1
            </div>
          </div>
          <div className="watch-ph">
            <div>
              <b>“Tung Tung Tung is the chief”</b>
              Watch on the channel — video slot 2
            </div>
          </div>
          <div className="watch-ph">
            <div>
              <b>“Promises need to be kept”</b>
              Watch on the channel — video slot 3
            </div>
          </div>
        </div>
      </section>

      <section className="wrap" id="get">
        <h2>What you get</h2>
        <p className="sub">One ebook, everything inside — yours to come back to any time.</p>
        <div className="grid">
          <div className="card">
            <span className="emoji">📕</span>
            <h3>The ebook — 25 pages</h3>
            <p>The full workflow, from measuring a viral style to posting on X first, then TikTok, YouTube Shorts and Reels.</p>
          </div>
          <div className="card">
            <span className="emoji">🎬</span>
            <h3>The 4-beat script system</h3>
            <p>Paradox, escalation, twist, payoff that loops — with a complete 32-second example script in English.</p>
          </div>
          <div className="card">
            <span className="emoji">📋</span>
            <h3>10 copy-paste prompts</h3>
            <p>Research, script, voice, character, scene building and the one-prompt full production — ready to use.</p>
          </div>
          <div className="card">
            <span className="emoji">🗓️</span>
            <h3>7-day + 30-day plans</h3>
            <p>Day by day: your first published Short in 7 days, a real channel rhythm in 30.</p>
          </div>
        </div>
      </section>

      <section className="wrap" id="how">
        <h2>How it works</h2>
        <p className="sub">From idea to finished vertical video.</p>
        <div className="steps">
          <div className="step">
            <div className="n">1</div>
            <div>
              <h3>Set it up once</h3>
              <p>Follow the ebook to connect the AI tools together. One short setup, done once.</p>
            </div>
          </div>
          <div className="step">
            <div className="n">2</div>
            <div>
              <h3>Type your idea</h3>
              <p>“Make me a Short about a town where it rains upwards.” The AI writes the story, makes the voice and builds the scene.</p>
            </div>
          </div>
          <div className="step">
            <div className="n">3</div>
            <div>
              <h3>Post it</h3>
              <p>You get a vertical video with voice, captions and animation — ready for X, TikTok, YouTube Shorts and Reels.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap" id="need">
        <h2>What you need</h2>
        <p className="sub">Check this before you buy.</p>
        <div className="grid">
          <div className="card">
            <span className="emoji">📱💻</span>
            <h3>A phone or a computer</h3>
            <p>Both work. Use the device you already have.</p>
          </div>
          <div className="card">
            <span className="emoji">🤖</span>
            <h3>A Claude account</h3>
            <p>The AI assistant that writes, builds and assembles your Shorts. Not included — created on Claude's site.</p>
          </div>
          <div className="card">
            <span className="emoji">🎨</span>
            <h3>A Higgsfield account</h3>
            <p>Generates the characters, voices and visuals. Not included — the ebook shows the connection step by step.</p>
          </div>
        </div>
        <div className="notice">📱 Works on phone AND computer — no expensive gear, no camera, no showing your face.</div>
      </section>

      <section className="wrap" id="faq">
        <h2>Questions</h2>
        <p className="sub">Everything buyers ask before they start.</p>
        {faqs.map(([q, a]) => (
          <details className="faq" key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="wrap" id="buy">
        <div className="cta-final">
          <h2>Start making Shorts today</h2>
          <p className="sub">The TikCast_en ebook — the format, the workflow, the prompts, the plan.</p>
        </div>
        <div className="buybox">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <strong>Faceless Shorts Ebook</strong>
            <span className="price">$20</span>
          </div>
          <BuyForm />
          <div className="fine">One-time payment. No subscription. Instant delivery after payment.</div>
        </div>
      </section>
    </>
  );
}
