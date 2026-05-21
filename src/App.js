import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// Palette — warm cream + sage. Mirrors the Verse Keeper design.
// All values are OKLCH for finer control on modern browsers.
// ─────────────────────────────────────────────────────────────
const LIGHT = {
  bg:          "oklch(0.965 0.013 80)",
  bg2:         "oklch(0.98 0.01 80)",
  card:        "oklch(0.99 0.008 80)",
  cardTint:    "oklch(0.945 0.018 80)",

  ink:         "oklch(0.27 0.02 55)",
  ink2:        "oklch(0.42 0.018 55)",
  ink3:        "oklch(0.58 0.016 60)",
  ink4:        "oklch(0.72 0.012 65)",

  accent:      "oklch(0.55 0.06 145)",
  accentSoft:  "oklch(0.93 0.025 145)",
  accentDeep:  "oklch(0.42 0.05 145)",

  amber:       "oklch(0.72 0.095 75)",
  amberSoft:   "oklch(0.94 0.035 80)",

  hair:        "oklch(0.88 0.014 75)",
  hair2:       "oklch(0.92 0.012 75)",

  danger:      "oklch(0.55 0.13 25)",
  dangerSoft:  "oklch(0.94 0.03 30)",
};

const DARK = {
  bg:          "oklch(0.22 0.012 55)",
  bg2:         "oklch(0.25 0.012 55)",
  card:        "oklch(0.28 0.014 55)",
  cardTint:    "oklch(0.31 0.016 55)",

  ink:         "oklch(0.93 0.012 75)",
  ink2:        "oklch(0.78 0.012 65)",
  ink3:        "oklch(0.6 0.014 60)",
  ink4:        "oklch(0.5 0.014 60)",

  accent:      "oklch(0.72 0.07 145)",
  accentSoft:  "oklch(0.32 0.04 145)",
  accentDeep:  "oklch(0.82 0.07 145)",

  amber:       "oklch(0.78 0.095 75)",
  amberSoft:   "oklch(0.32 0.05 75)",

  hair:        "oklch(0.34 0.014 55)",
  hair2:       "oklch(0.30 0.014 55)",

  danger:      "oklch(0.7 0.13 25)",
  dangerSoft:  "oklch(0.32 0.06 30)",
};

const SERIF = "'Lora', Georgia, serif";
const SANS  = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SUGGESTED_TAGS = ["Faith","Prayer","Comfort","Strength","Gratitude","Identity","Healing","Hope"];

const BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah",
  "Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
  "2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians",
  "2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James",
  "1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

const NUMBER_WORDS = {
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19,twenty:20,
  "twenty one":21,"twenty two":22,"twenty three":23,"twenty four":24,
  "twenty five":25,"twenty six":26,"twenty seven":27,"twenty eight":28,
  "twenty nine":29,thirty:30,"thirty one":31,
};

function parseVoiceInput(transcript) {
  const raw = transcript.toLowerCase().trim();
  let text = raw;
  Object.entries(NUMBER_WORDS).sort((a,b) => b[0].length - a[0].length).forEach(([word, num]) => {
    text = text.replace(new RegExp(`\\b${word}\\b`, "g"), num);
  });
  text = text.replace(/\bverse\s+(\d+)/gi, "$1");
  text = text.replace(/\bchapter\s+(\d+)/gi, "$1");
  text = text.replace(/\bcolon\b/gi, ":");
  let foundBook = null;
  let remaining = text;
  const sortedBooks = [...BOOKS].sort((a, b) => b.length - a.length);
  for (const book of sortedBooks) {
    const bookLower = book.toLowerCase();
    const idx = text.indexOf(bookLower);
    if (idx !== -1) {
      foundBook = book;
      remaining = text.slice(idx + bookLower.length).trim();
      break;
    }
  }
  if (!foundBook) return null;
  const nums = remaining.match(/\d+/g);
  if (!nums || nums.length < 2) return { book: foundBook, chapter: nums?.[0] || "", verse: "" };
  return { book: foundBook, chapter: nums[0], verse: nums[1] };
}

function useStorage() {
  const [verses, setVerses] = useState(() => {
    try { const s = localStorage.getItem("versekeeper_verses"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const save = (updated) => {
    setVerses(updated);
    try { localStorage.setItem("versekeeper_verses", JSON.stringify(updated)); } catch {}
  };
  return [verses, save];
}

// ─────────────────────────────────────────────────────────────
// Minimal line icon set
// ─────────────────────────────────────────────────────────────
const Icon = {
  Plus: (p={}) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  Search: (p={}) => (<svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Heart: (p={}) => (<svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.filled?"currentColor":"none"}><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Bookmark: (p={}) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill={p.filled?"currentColor":"none"}><path d="M6 4h12v17l-6-4-6 4V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Home: (p={}) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none"><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Book: (p={}) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 012-2h12v17H6a2 2 0 00-2 2V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M4 19a2 2 0 012-2h12" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Back: (p={}) => (<svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Close: (p={}) => (<svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Mic: (p={}) => (<svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Stop: (p={}) => (<svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>),
  Sun: (p={}) => (<svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Moon: (p={}) => (<svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none"><path d="M21 13.5A8.5 8.5 0 0110.5 3a8 8 0 00.5 17 8.5 8.5 0 0010-6.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Sparkle: (p={}) => (<svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>),
  Trash: (p={}) => (<svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none"><path d="M5 7h14M10 7V5a1 1 0 011-1h2a1 1 0 011 1v2M7 7l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function VerseKeeper() {
  const [verses, setVerses] = useStorage();
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ book:"", chapter:"", verse:"", verseText:"", note:"", tags:[] });
  const [formError, setFormError] = useState("");
  const [fetchingText, setFetchingText] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("versekeeper_dark") === "true"; } catch { return false; }
  });
  const [listening, setListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef(null);

  const C = darkMode ? DARK : LIGHT;

  useEffect(() => {
    try { localStorage.setItem("versekeeper_dark", darkMode); } catch {}
    document.body.style.background = C.bg;
    document.body.style.transition = "background 0.3s ease";
  }, [darkMode, C.bg]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVerseText = useCallback(async (book, chapter, verse) => {
    if (!book || !chapter || !verse) return;
    setFetchingText(true);
    try {
      const ref = `${book} ${chapter}:${verse}`;
      const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.text) setForm(f => ({ ...f, verseText: data.text.trim() }));
      else setForm(f => ({ ...f, verseText: "" }));
    } catch { setForm(f => ({ ...f, verseText: "" })); }
    setFetchingText(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.book && form.chapter && form.verse) fetchVerseText(form.book, form.chapter, form.verse);
    }, 600);
    return () => clearTimeout(timer);
  }, [form.book, form.chapter, form.verse, fetchVerseText]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast("Voice needs Chrome or Edge browser.", "error"); return; }
    const recognition = new SR();
    recognition.lang = "en-US"; recognition.continuous = false; recognition.interimResults = false;
    recognitionRef.current = recognition;
    setListening(true); setVoiceTranscript("");
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setVoiceTranscript(transcript);
      const parsed = parseVoiceInput(transcript);
      if (parsed && parsed.book) {
        setForm(f => ({ ...f, book: parsed.book, chapter: parsed.chapter || "", verse: parsed.verse || "", verseText: "" }));
        showToast(`Heard: ${parsed.book} ${parsed.chapter}${parsed.verse ? ":" + parsed.verse : ""}`);
      } else { showToast("Couldn't catch that — try saying 'Romans 8 28'", "error"); }
      setListening(false);
    };
    recognition.onerror = () => { setListening(false); showToast("Mic error. Check permissions.", "error"); };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  const saveVerse = () => {
    if (!form.book || !form.chapter || !form.verse) { setFormError("Please fill in Book, Chapter, and Verse to save."); return; }
    const newVerse = { id: Date.now(), book: form.book, chapter: parseInt(form.chapter), verse: parseInt(form.verse), verseText: form.verseText, note: form.note, tags: form.tags, createdAt: new Date().toISOString(), isFavorite: false };
    setVerses([newVerse, ...verses]);
    setForm({ book:"", chapter:"", verse:"", verseText:"", note:"", tags:[] });
    setFormError(""); setVoiceTranscript("");
    showToast("Saved. You can find it anytime under My Verses.");
    setScreen("saved");
  };

  const toggleFavorite = (id) => setVerses(verses.map(v => v.id === id ? { ...v, isFavorite: !v.isFavorite } : v));
  const deleteVerse = (id) => { setVerses(verses.filter(v => v.id !== id)); showToast("Verse removed.", "info"); };
  const toggleTag = (tag) => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));

  const filteredVerses = verses.filter(v => {
    const q = searchQ.toLowerCase();
    const matchesSearch = !q || v.book.toLowerCase().includes(q) || (v.note||"").toLowerCase().includes(q) || (v.verseText||"").toLowerCase().includes(q) || v.tags.some(t => t.toLowerCase().includes(q));
    const matchesTab = activeTab === "all" || (activeTab === "favorites" && v.isFavorite);
    return matchesSearch && matchesTab;
  });

  const dailyVerse = verses.length > 0 ? verses[new Date().getDate() % verses.length] : null;
  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

  const shell = {
    minHeight:"100vh", background:C.bg, fontFamily:SANS,
    display:"flex", flexDirection:"column",
    maxWidth:430, margin:"0 auto", position:"relative",
    color:C.ink, WebkitFontSmoothing:"antialiased",
    transition:"background 0.3s ease, color 0.3s ease",
    paddingBottom: 96,
  };

  return (
    <div style={shell}>
      {toast && <Toast toast={toast} C={C} />}

      {screen === "home"   && <HomeScreen   C={C} verses={verses} dailyVerse={dailyVerse} setScreen={setScreen} darkMode={darkMode} setDarkMode={setDarkMode} formatDate={formatDate} />}
      {screen === "save"   && <SaveScreen   C={C} form={form} setForm={setForm} formError={formError} fetchingText={fetchingText} listening={listening} voiceTranscript={voiceTranscript} startVoice={startVoice} stopVoice={stopVoice} saveVerse={saveVerse} toggleTag={toggleTag} darkMode={darkMode} setDarkMode={setDarkMode} setScreen={setScreen} />}
      {screen === "saved"  && <SavedScreen  C={C} verses={verses} filteredVerses={filteredVerses} activeTab={activeTab} setActiveTab={setActiveTab} toggleFavorite={toggleFavorite} deleteVerse={deleteVerse} formatDate={formatDate} darkMode={darkMode} setDarkMode={setDarkMode} setScreen={setScreen} />}
      {screen === "search" && <SearchScreen C={C} searchQ={searchQ} setSearchQ={setSearchQ} filteredVerses={filteredVerses} verses={verses} toggleFavorite={toggleFavorite} deleteVerse={deleteVerse} formatDate={formatDate} darkMode={darkMode} setDarkMode={setDarkMode} setScreen={setScreen} />}

      <TabBar screen={screen} setScreen={setScreen} C={C} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
function Toast({ toast, C }) {
  const bg = toast.type === "error" ? C.danger : toast.type === "info" ? C.ink2 : C.accent;
  return (
    <div style={{
      position:"fixed", top:14, left:"50%", transform:"translateX(-50%)",
      background: bg, color:"#fff", padding:"10px 18px", borderRadius:99,
      fontSize:13, fontFamily:SANS, zIndex:999, whiteSpace:"nowrap",
      boxShadow:"0 8px 24px rgba(40,25,15,0.18)", fontWeight:500,
      letterSpacing:"-0.005em", animation:"vkToast 0.3s ease",
    }}>
      {toast.msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top app bar (used on every screen)
// ─────────────────────────────────────────────────────────────
function TopBar({ left, right, C }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px 6px" }}>
      <div>{left}</div>
      <div style={{ display:"flex", gap:8 }}>{right}</div>
    </div>
  );
}

function CircleBtn({ children, onClick, C, accent }) {
  return (
    <button onClick={onClick} style={{
      width:38, height:38, borderRadius:999, border:0,
      background:C.card, color: accent ? C.amber : C.ink2,
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer",
      boxShadow:"0 1px 0 rgba(60,40,20,0.04), 0 1px 2px rgba(60,40,20,0.04)",
      transition:"transform 0.15s ease",
    }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.92)"} onMouseUp={e=>e.currentTarget.style.transform=""} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      {children}
    </button>
  );
}

function DarkToggle({ darkMode, setDarkMode, C }) {
  return (
    <CircleBtn onClick={() => setDarkMode(d => !d)} C={C}>
      {darkMode ? <Icon.Sun /> : <Icon.Moon />}
    </CircleBtn>
  );
}

// ─────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────
function HomeScreen({ C, verses, dailyVerse, setScreen, darkMode, setDarkMode, formatDate }) {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Hello," : hour < 12 ? "Good morning." : hour < 17 ? "Good afternoon." : hour < 21 ? "Good evening." : "Hello,";
  const favCount = verses.filter(v=>v.isFavorite).length;
  const tagCount = [...new Set(verses.flatMap(v=>v.tags))].length;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <TopBar C={C}
        left={
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:12, background:C.accentSoft, color:C.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon.Bookmark filled size={18}/>
            </div>
            <div style={{ fontFamily:SERIF, fontSize:17, fontWeight:500, color:C.ink, letterSpacing:"-0.01em" }}>Verse Keeper</div>
          </div>
        }
        right={<DarkToggle darkMode={darkMode} setDarkMode={setDarkMode} C={C} />}
      />

      <h1 style={{ fontFamily:SERIF, fontWeight:500, fontSize:32, lineHeight:1.1, letterSpacing:"-0.015em", color:C.ink, margin:"10px 22px 4px" }}>
        {greeting}
      </h1>
      <p style={{ fontFamily:SANS, fontSize:14, color:C.ink3, margin:"0 22px 18px", letterSpacing:0 }}>
        {verses.length === 0
          ? "Your scripture vault is ready."
          : `${verses.length} ${verses.length===1?"verse":"verses"} kept · ${favCount} ${favCount===1?"favorite":"favorites"}${tagCount?` · ${tagCount} tags`:""}`}
      </p>

      {dailyVerse ? (
        <HeroCard C={C} verse={dailyVerse} onClick={() => setScreen("saved")} formatDate={formatDate} />
      ) : (
        <EmptyHero C={C} onSave={() => setScreen("save")} />
      )}

      {verses.length > 1 && (
        <>
          <SectionLabel C={C} label="Recently kept" right={`${verses.length} ${verses.length===1?"verse":"verses"}`} onRight={() => setScreen("saved")} />
          {verses.filter(v => v.id !== dailyVerse?.id).slice(0, 4).map(v => (
            <VerseRow key={v.id} verse={v} C={C} onClick={() => setScreen("saved")} formatDate={formatDate} />
          ))}
        </>
      )}

      <FAB C={C} onClick={() => setScreen("save")} />
    </div>
  );
}

function HeroCard({ C, verse, onClick, formatDate }) {
  return (
    <div onClick={onClick} style={{
      margin:"6px 16px 8px", padding:"26px 24px 24px", borderRadius:28, cursor:"pointer",
      background:
        `radial-gradient(120% 100% at 100% 0%, ${C.amberSoft}, transparent 60%),` +
        `radial-gradient(120% 120% at 0% 100%, ${C.accentSoft}, transparent 60%),` +
        C.cardTint,
      position:"relative", overflow:"hidden",
      transition:"transform 0.15s ease",
    }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.99)"} onMouseUp={e=>e.currentTarget.style.transform=""} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, color:C.ink3, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:500, fontFamily:SANS }}>
        <Icon.Sparkle size={13}/>
        <span>From your collection</span>
      </div>
      <div style={{ fontFamily:SERIF, fontSize:20, lineHeight:1.45, color:C.ink, letterSpacing:"-0.005em" }}>
        {verse.verseText ? `"${verse.verseText}"` : `${verse.book} ${verse.chapter}:${verse.verse}`}
      </div>
      <div style={{ marginTop:16, fontFamily:SERIF, fontStyle:"italic", fontSize:14, color:C.accent }}>
        — {verse.book} {verse.chapter}:{verse.verse}
      </div>
      {verse.note && (
        <div style={{ marginTop:12, fontFamily:SERIF, fontSize:14, color:C.ink2, fontStyle:"italic", lineHeight:1.5 }}>
          {verse.note}
        </div>
      )}
      <div style={{ marginTop:14, fontSize:11, color:C.ink3, fontFamily:SANS }}>
        Saved {formatDate(verse.createdAt)}
      </div>
    </div>
  );
}

function EmptyHero({ C, onSave }) {
  return (
    <div style={{
      margin:"6px 16px 8px", padding:"36px 26px 30px", borderRadius:28,
      background:
        `radial-gradient(120% 100% at 100% 0%, ${C.amberSoft}, transparent 60%),` +
        `radial-gradient(120% 120% at 0% 100%, ${C.accentSoft}, transparent 60%),` +
        C.cardTint,
      textAlign:"center",
    }}>
      <div style={{ fontFamily:SERIF, fontSize:21, lineHeight:1.4, color:C.ink, letterSpacing:"-0.01em", marginBottom:10 }}>
        A quiet place to keep what spoke to you.
      </div>
      <p style={{ fontFamily:SANS, fontSize:14, color:C.ink3, margin:"0 0 22px", lineHeight:1.55 }}>
        Save your first verse — speak it, type it, however it comes.
      </p>
      <button onClick={onSave} style={{
        padding:"12px 24px", borderRadius:999, border:0,
        background:C.ink, color:C.bg, fontFamily:SANS, fontSize:14, fontWeight:500, cursor:"pointer",
        display:"inline-flex", alignItems:"center", gap:8,
      }}>
        <Icon.Plus size={16}/> Save your first verse
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section + verse row
// ─────────────────────────────────────────────────────────────
function SectionLabel({ C, label, right, onRight }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 22px", margin:"22px 0 10px" }}>
      <span style={{ fontFamily:SANS, fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:C.ink3, fontWeight:500 }}>{label}</span>
      {right && <span onClick={onRight} style={{ fontFamily:SANS, fontSize:13, color:C.accent, fontWeight:500, cursor:"pointer" }}>{right}</span>}
    </div>
  );
}

function VerseRow({ verse, C, onClick, formatDate }) {
  const body = verse.verseText || verse.note || "";
  const truncated = body.length > 140 ? body.slice(0, 140) + "…" : body;
  return (
    <div onClick={onClick} style={{
      background:C.card, borderRadius:24, margin:"0 16px 12px", padding:"18px 20px 16px",
      boxShadow:"0 1px 0 rgba(80,60,40,0.025), 0 2px 8px rgba(80,60,40,0.03)",
      cursor:"pointer", transition:"transform 0.15s ease",
    }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.99)"} onMouseUp={e=>e.currentTarget.style.transform=""} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontFamily:SERIF, fontStyle:"italic", fontSize:13, color:C.accent, letterSpacing:"0.01em" }}>
          {verse.book} {verse.chapter}:{verse.verse}
        </span>
        {verse.isFavorite && <span style={{ color:C.amber, display:"flex" }}><Icon.Heart filled size={15}/></span>}
      </div>
      {truncated && (
        <div style={{ fontFamily:SERIF, fontSize:17, lineHeight:1.5, color:C.ink, letterSpacing:"-0.005em" }}>
          "{truncated}"
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:14, fontSize:12, color:C.ink3, fontFamily:SANS }}>
        <span>{formatDate(verse.createdAt)}</span>
        {verse.tags.length > 0 && <span style={{ width:3, height:3, borderRadius:99, background:C.ink4 }} />}
        {verse.tags.slice(0,2).map(t => (
          <span key={t} style={{ background:C.accentSoft, color:C.accentDeep, padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:500, letterSpacing:"0.005em" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────
function SaveScreen({ C, form, setForm, formError, fetchingText, listening, voiceTranscript, startVoice, stopVoice, saveVerse, toggleTag, darkMode, setDarkMode, setScreen }) {
  const ready = form.book && form.chapter && form.verse;
  return (
    <div style={{ flex:1, paddingBottom:24 }}>
      <TopBar C={C}
        left={<CircleBtn onClick={() => setScreen("home")} C={C}><Icon.Back/></CircleBtn>}
        right={
          <>
            <DarkToggle darkMode={darkMode} setDarkMode={setDarkMode} C={C}/>
            <button disabled={!ready} onClick={saveVerse} style={{
              height:38, padding:"0 16px", borderRadius:999, border:0,
              background: ready ? C.ink : C.hair, color: ready ? C.bg : C.ink3,
              fontFamily:SANS, fontSize:14, fontWeight:500, cursor: ready ? "pointer" : "default",
              transition:"background 0.15s ease",
            }}>Save</button>
          </>
        }
      />

      <h2 style={{ fontFamily:SERIF, fontWeight:500, fontSize:28, lineHeight:1.1, letterSpacing:"-0.015em", color:C.ink, margin:"10px 22px 4px" }}>
        New verse
      </h2>
      <p style={{ fontFamily:SANS, fontSize:14, color:C.ink3, margin:"0 22px 22px" }}>
        Speak it, or type it — whichever feels right.
      </p>

      {/* Voice */}
      <div style={{ padding:"0 16px", marginBottom:16 }}>
        <button onClick={listening ? stopVoice : startVoice} style={{
          width:"100%", padding:"16px 20px", borderRadius:18, border:`1px solid ${listening ? "transparent" : C.hair}`,
          background: listening ? C.accent : C.card, color: listening ? C.bg : C.accent,
          fontFamily:SANS, fontSize:14, fontWeight:500, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          transition:"background 0.2s ease, color 0.2s ease",
        }}>
          {listening ? <Icon.Stop size={14}/> : <Icon.Mic size={18}/>}
          {listening ? "Listening… tap to stop" : "Tap to speak a verse reference"}
        </button>
        {listening && (
          <div style={{ marginTop:8, fontSize:12, color:C.accent, fontFamily:SANS, textAlign:"center", fontStyle:"italic" }}>
            Try "Romans 8 28" or "Psalms 23 verse 4"
          </div>
        )}
        {voiceTranscript && !listening && (
          <div style={{ marginTop:8, fontSize:12, color:C.ink3, fontFamily:SANS, textAlign:"center" }}>
            You said: <em>"{voiceTranscript}"</em>
          </div>
        )}
      </div>

      <Divider C={C} text="or type it" />

      {formError && (
        <div style={{
          margin:"0 22px 14px", background:C.dangerSoft, color:C.danger, padding:"10px 14px", borderRadius:12,
          fontSize:13, fontFamily:SANS, fontWeight:500,
        }}>{formError}</div>
      )}

      {/* Reference */}
      <FieldLabel C={C}>Reference</FieldLabel>
      <div style={{ padding:"0 22px" }}>
        <select value={form.book} onChange={e => setForm(f => ({ ...f, book:e.target.value, verseText:"" }))} style={input(C)}>
          <option value="">Select a book…</option>
          {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <input type="number" min="1" placeholder="Chapter" value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter:e.target.value, verseText:"" }))} style={{ ...input(C), flex:1 }} />
          <input type="number" min="1" placeholder="Verse" value={form.verse} onChange={e => setForm(f => ({ ...f, verse:e.target.value, verseText:"" }))} style={{ ...input(C), flex:1 }} />
        </div>
      </div>

      {/* KJV preview */}
      {(fetchingText || form.verseText) && (
        <div style={{
          margin:"16px 16px 0", padding:"18px 20px", borderRadius:24,
          background: C.accentSoft, color:C.accentDeep,
        }}>
          <div style={{ fontFamily:SANS, fontSize:11, fontWeight:500, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, opacity:0.85 }}>
            {fetchingText ? "Looking up verse…" : `${form.book} ${form.chapter}:${form.verse} · KJV`}
          </div>
          <div style={{ fontFamily:SERIF, fontSize:17, lineHeight:1.55, fontStyle:"italic", color:C.ink, letterSpacing:"-0.005em" }}>
            {fetchingText ? "…" : `"${form.verseText}"`}
          </div>
        </div>
      )}

      {/* Note */}
      <FieldLabel C={C}>My reflection <span style={{ color:C.ink4, textTransform:"none", letterSpacing:0, fontWeight:400 }}>· optional</span></FieldLabel>
      <div style={{ padding:"0 22px" }}>
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note:e.target.value }))}
          placeholder="What does this verse say to you right now?"
          rows={4}
          style={{ ...input(C), resize:"none", fontFamily:SERIF, fontSize:16, lineHeight:1.55, padding:"14px 16px" }}
        />
      </div>

      {/* Tags */}
      <FieldLabel C={C}>Tags</FieldLabel>
      <div style={{ padding:"0 22px", display:"flex", flexWrap:"wrap", gap:8 }}>
        {SUGGESTED_TAGS.map(tag => {
          const on = form.tags.includes(tag);
          return (
            <button key={tag} onClick={() => toggleTag(tag)} style={{
              padding:"8px 14px", borderRadius:999, fontSize:13, fontFamily:SANS, fontWeight:500,
              border:`1px solid ${on ? "transparent" : C.hair}`,
              background: on ? C.accent : C.card,
              color: on ? C.bg : C.ink2,
              cursor:"pointer", transition:"background 0.15s ease, color 0.15s ease",
            }}>{tag}</button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ children, C }) {
  return <div style={{ fontFamily:SANS, fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:C.ink3, fontWeight:500, padding:"22px 22px 8px" }}>{children}</div>;
}
function input(C) {
  return {
    width:"100%", padding:"13px 14px", borderRadius:14,
    border:`1px solid ${C.hair}`, background:C.card,
    fontFamily:SANS, fontSize:15, color:C.ink, outline:"none",
    boxSizing:"border-box", appearance:"none",
  };
}
function Divider({ C, text }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"4px 22px 14px" }}>
      <div style={{ flex:1, height:1, background:C.hair }} />
      <span style={{ fontSize:11, color:C.ink3, fontFamily:SANS, fontWeight:500, letterSpacing:"0.14em", textTransform:"uppercase" }}>{text}</span>
      <div style={{ flex:1, height:1, background:C.hair }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Saved (My Verses)
// ─────────────────────────────────────────────────────────────
function SavedScreen({ C, verses, filteredVerses, activeTab, setActiveTab, toggleFavorite, deleteVerse, formatDate, darkMode, setDarkMode, setScreen }) {
  return (
    <div style={{ flex:1 }}>
      <TopBar C={C}
        left={
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <CircleBtn onClick={() => setScreen("home")} C={C}><Icon.Back/></CircleBtn>
            <div style={{ fontFamily:SERIF, fontSize:22, fontWeight:500, color:C.ink, letterSpacing:"-0.01em" }}>My Verses</div>
          </div>
        }
        right={<DarkToggle darkMode={darkMode} setDarkMode={setDarkMode} C={C}/>}
      />

      <div style={{ display:"flex", gap:8, padding:"12px 16px 14px" }}>
        {[{ id:"all", label:`All · ${verses.length}` }, { id:"favorites", label:`Favorites · ${verses.filter(v=>v.isFavorite).length}` }].map(t => {
          const on = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding:"8px 16px", borderRadius:999, fontSize:13, fontFamily:SANS, fontWeight:500,
              border:`1px solid ${on ? "transparent" : C.hair}`,
              background: on ? C.ink : C.card,
              color: on ? C.bg : C.ink2,
              cursor:"pointer", whiteSpace:"nowrap",
            }}>{t.label}</button>
          );
        })}
      </div>

      {verses.length === 0
        ? <EmptyState C={C} title="No verses yet — your collection starts with one." body="Hear something today that stayed with you? Save it here." cta="Save my first verse" onCta={() => setScreen("save")} />
        : activeTab==="favorites" && verses.filter(v=>v.isFavorite).length===0
        ? <EmptyState C={C} title="The verses you return to most will live here." body="Tap the heart on any saved verse to add it." />
        : filteredVerses.length===0
        ? <EmptyState C={C} title="Nothing matched." body="Try a different filter." />
        : filteredVerses.map(v => <VerseCard key={v.id} verse={v} onFav={toggleFavorite} onDelete={deleteVerse} formatDate={formatDate} C={C} />)
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────
function SearchScreen({ C, searchQ, setSearchQ, filteredVerses, verses, toggleFavorite, deleteVerse, formatDate, darkMode, setDarkMode, setScreen }) {
  const highlight = (text) => {
    if (!searchQ) return text;
    const parts = text.split(new RegExp(`(${searchQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, "gi"));
    return parts.map((p, i) => p.toLowerCase() === searchQ.toLowerCase()
      ? <mark key={i} style={{ background:C.amberSoft, color:C.ink, padding:"0 2px", borderRadius:3 }}>{p}</mark>
      : p);
  };

  return (
    <div style={{ flex:1 }}>
      <TopBar C={C}
        left={
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <CircleBtn onClick={() => setScreen("home")} C={C}><Icon.Back/></CircleBtn>
            <div style={{ fontFamily:SERIF, fontSize:22, fontWeight:500, color:C.ink, letterSpacing:"-0.01em" }}>Search</div>
          </div>
        }
        right={<DarkToggle darkMode={darkMode} setDarkMode={setDarkMode} C={C}/>}
      />

      <div style={{
        margin:"10px 16px 8px",
        display:"flex", alignItems:"center", gap:10,
        background:C.card, borderRadius:18, padding:"12px 16px",
        border:`1px solid ${C.hair}`,
      }}>
        <span style={{ color:C.ink3, display:"flex" }}><Icon.Search/></span>
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Search verses, notes, or tags"
          autoFocus
          style={{ flex:1, border:0, background:"transparent", fontFamily:SANS, fontSize:15, color:C.ink, outline:"none" }}
        />
        {searchQ && (
          <span onClick={() => setSearchQ("")} style={{ color:C.ink4, cursor:"pointer", display:"flex" }}>
            <Icon.Close size={16}/>
          </span>
        )}
      </div>

      {verses.length === 0
        ? <EmptyState C={C} title="Nothing to search yet." body="Save a verse first, then it'll be findable here." />
        : searchQ === ""
        ? <EmptyState C={C} title="Search your collection." body="Try a book name, a word from the verse, or a tag like Comfort or Hope." />
        : filteredVerses.length === 0
        ? <EmptyState C={C} title={`No matches for "${searchQ}".`} body="Try a different word or tag." />
        : (
          <>
            <div style={{ padding:"6px 22px 8px", fontFamily:SANS, fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:C.ink3, fontWeight:500 }}>
              {filteredVerses.length} {filteredVerses.length===1?"match":"matches"} for "{searchQ}"
            </div>
            {filteredVerses.map(v => (
              <VerseCard key={v.id} verse={v} onFav={toggleFavorite} onDelete={deleteVerse} formatDate={formatDate} C={C} highlight={highlight} />
            ))}
          </>
        )
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Verse card (used in Saved + Search)
// ─────────────────────────────────────────────────────────────
function VerseCard({ verse, onFav, onDelete, formatDate, C, highlight }) {
  return (
    <div style={{
      background:C.card, borderRadius:24, margin:"0 16px 12px", padding:"18px 20px 16px",
      boxShadow:"0 1px 0 rgba(80,60,40,0.025), 0 2px 8px rgba(80,60,40,0.03)",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <span style={{ fontFamily:SERIF, fontStyle:"italic", fontSize:14, color:C.accent, letterSpacing:"0.01em" }}>
          {verse.book} {verse.chapter}:{verse.verse}
        </span>
        <button onClick={() => onFav(verse.id)} style={{
          background:"none", border:0, cursor:"pointer", padding:0,
          color: verse.isFavorite ? C.amber : C.ink4,
          display:"flex",
        }}>
          <Icon.Heart filled={verse.isFavorite} size={18}/>
        </button>
      </div>

      {verse.verseText && (
        <div style={{ fontFamily:SERIF, fontSize:17, lineHeight:1.55, color:C.ink, letterSpacing:"-0.005em" }}>
          "{highlight ? highlight(verse.verseText) : verse.verseText}"
        </div>
      )}

      {verse.note && (
        <div style={{
          marginTop:12, padding:"10px 14px", borderRadius:14,
          background:C.cardTint, fontFamily:SERIF, fontStyle:"italic",
          fontSize:14, color:C.ink2, lineHeight:1.55, letterSpacing:"-0.005em",
        }}>
          {highlight ? highlight(verse.note) : verse.note}
        </div>
      )}

      {verse.tags.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
          {verse.tags.map(t => (
            <span key={t} style={{ fontSize:11, padding:"4px 10px", borderRadius:99, background:C.accentSoft, color:C.accentDeep, fontFamily:SANS, fontWeight:500, letterSpacing:"0.005em" }}>{t}</span>
          ))}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, paddingTop:12, borderTop:`0.5px solid ${C.hair}` }}>
        <span style={{ fontSize:11, color:C.ink3, fontFamily:SANS, letterSpacing:0 }}>
          {formatDate(verse.createdAt)}
        </span>
        <button onClick={() => onDelete(verse.id)} style={{
          background:"none", border:0, cursor:"pointer", padding:"4px 8px",
          fontSize:12, color:C.ink3, fontFamily:SANS, fontWeight:500,
          display:"flex", alignItems:"center", gap:5,
        }}>
          <Icon.Trash size={13}/> Remove
        </button>
      </div>
    </div>
  );
}

function EmptyState({ C, title, body, cta, onCta }) {
  return (
    <div style={{ textAlign:"center", padding:"50px 28px 40px" }}>
      <div style={{ fontFamily:SERIF, fontSize:18, fontWeight:500, color:C.ink, marginBottom:8, lineHeight:1.45, letterSpacing:"-0.01em" }}>{title}</div>
      <div style={{ fontFamily:SANS, fontSize:14, color:C.ink3, lineHeight:1.6, marginBottom:cta?22:0 }}>{body}</div>
      {cta && (
        <button onClick={onCta} style={{
          padding:"12px 24px", borderRadius:999, border:0,
          background:C.ink, color:C.bg, fontFamily:SANS, fontSize:14, fontWeight:500, cursor:"pointer",
        }}>{cta}</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FAB
// ─────────────────────────────────────────────────────────────
function FAB({ C, onClick }) {
  return (
    <button onClick={onClick} style={{
      position:"fixed", right:"max(22px, calc(50% - 215px + 22px))", bottom:108,
      width:60, height:60, borderRadius:999, border:0,
      background:C.ink, color:C.bg, cursor:"pointer",
      boxShadow:"0 12px 24px rgba(40,25,15,0.22), 0 2px 6px rgba(40,25,15,0.12)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:90,
      transition:"transform 0.15s ease",
    }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.92)"} onMouseUp={e=>e.currentTarget.style.transform=""} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <Icon.Plus size={24}/>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar (floating pill)
// ─────────────────────────────────────────────────────────────
function TabBar({ screen, setScreen, C }) {
  const tabs = [
    { id:"home",   icon:<Icon.Home/> },
    { id:"saved",  icon:<Icon.Book/> },
    { id:"save",   icon:<Icon.Plus/>, primary:true },
    { id:"search", icon:<Icon.Search/> },
  ];
  return (
    <div style={{
      position:"fixed", bottom:18, left:"50%", transform:"translateX(-50%)",
      width:"calc(100% - 32px)", maxWidth:398, height:64, zIndex:100,
      background: C.card + " linear-gradient(0deg, transparent, transparent)",
      backgroundColor: typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)") ? C.card : "rgba(255, 251, 244, 0.88)",
      backdropFilter:"blur(20px) saturate(180%)", WebkitBackdropFilter:"blur(20px) saturate(180%)",
      borderRadius:999, display:"flex", alignItems:"center", justifyContent:"space-around",
      padding:"0 14px",
      boxShadow:"0 6px 20px rgba(60,40,20,0.06), 0 1px 0 rgba(60,40,20,0.04)",
      border:`0.5px solid ${C.hair}`,
    }}>
      {tabs.map(t => {
        const on = screen === t.id;
        if (t.primary) {
          return (
            <button key={t.id} onClick={() => setScreen(t.id)} style={{
              width:48, height:48, borderRadius:999, border:0,
              background: C.ink, color: C.bg, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 4px 10px rgba(40,25,15,0.18)",
            }}>{t.icon}</button>
          );
        }
        return (
          <button key={t.id} onClick={() => setScreen(t.id)} style={{
            flex:1, height:48, border:0, background: on ? C.cardTint : "transparent",
            borderRadius:999, color: on ? C.ink : C.ink3, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"background 0.15s ease, color 0.15s ease",
          }}>{t.icon}</button>
        );
      })}
    </div>
  );
}
