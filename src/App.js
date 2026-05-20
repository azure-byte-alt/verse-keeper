import { useState, useEffect, useCallback, useRef } from "react";

const LIGHT = {
  bg: "#FAF8F3", warm: "#F2EDE3", sand: "#E8DFD0", stone: "#C9BAA5",
  muted: "#9C8E7E", text: "#3A3128", dark: "#1E1812", accent: "#7B5EA7",
  accentLight: "#EDE8F5", accentMid: "#B09CD0", gold: "#C8963E",
  goldLight: "#FDF3E3", success: "#4A7C59", danger: "#B04A3E",
  dangerLight: "#F9ECEA", cardBg: "#FFFFFF", navBg: "#FAF8F3",
  border: "#E8DFD0", tagBg: "#EDE8F5", tagText: "#7B5EA7",
};

const DARK = {
  bg: "#1A1612", warm: "#242018", sand: "#2E2820", stone: "#4A4035",
  muted: "#8C7E6E", text: "#D4C4B0", dark: "#F0E6D8", accent: "#A080D0",
  accentLight: "#2A2035", accentMid: "#6B559E", gold: "#D4A84B",
  goldLight: "#2A2210", success: "#3A6B47", danger: "#8B3A30",
  dangerLight: "#2A1510", cardBg: "#231F1A", navBg: "#1A1612",
  border: "#2E2820", tagBg: "#2A2035", tagText: "#A080D0",
};

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
  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });

  const wrap = { minHeight:"100vh", background:C.bg, fontFamily:"'Georgia', serif", display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto", position:"relative", transition:"background 0.3s" };

  return (
    <div style={wrap}>

      {toast && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background: toast.type === "error" ? C.danger : C.success, color:"#fff", padding:"10px 20px", borderRadius:99, fontSize:13, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.3)", fontFamily:"'Helvetica Neue', sans-serif" }}>
          {toast.msg}
        </div>
      )}

      {/* HOME */}
      {screen === "home" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"48px 28px 24px", textAlign:"center", borderBottom:`1px solid ${C.border}`, position:"relative" }}>
            {/* Dark mode toggle */}
            <button onClick={() => setDarkMode(d => !d)} style={{ position:"absolute", top:16, right:20, background:C.warm, border:`1px solid ${C.border}`, borderRadius:99, padding:"6px 12px", cursor:"pointer", fontSize:16, color:C.text }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div style={{ fontSize:36, marginBottom:6 }}>📖</div>
            <h1 style={{ fontFamily:"'Georgia', serif", fontSize:30, fontWeight:700, color:C.dark, margin:"0 0 8px" }}>Verse Keeper</h1>
            <p style={{ fontSize:14, color:C.muted, margin:0, lineHeight:1.6 }}>Your personal scripture vault</p>
          </div>

          {dailyVerse && (
            <div style={{ margin:"20px 20px 0", background:C.goldLight, border:`1px solid ${darkMode ? "#4A3A1A" : "#E8C98A"}`, borderRadius:14, padding:"16px 18px" }}>
              <div style={{ fontSize:11, fontFamily:"'Helvetica Neue', sans-serif", fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:C.gold, marginBottom:8 }}>From your collection</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.dark, marginBottom:6 }}>{dailyVerse.book} {dailyVerse.chapter}:{dailyVerse.verse}</div>
              {dailyVerse.verseText && <div style={{ fontSize:14, color:C.text, lineHeight:1.6, marginBottom:6, fontStyle:"italic" }}>"{dailyVerse.verseText}"</div>}
              {dailyVerse.note && <div style={{ fontSize:13, color:C.muted, lineHeight:1.5, marginBottom:6 }}>Your note: {dailyVerse.note}</div>}
              <div style={{ fontSize:11, color:C.muted, fontFamily:"'Helvetica Neue', sans-serif" }}>Saved on {formatDate(dailyVerse.createdAt)}</div>
            </div>
          )}

          <div style={{ display:"flex", gap:12, padding:"20px 20px 0" }}>
            {[{ label:"Saved", value:verses.length },{ label:"Favorites", value:verses.filter(v=>v.isFavorite).length },{ label:"Tags used", value:[...new Set(verses.flatMap(v=>v.tags))].length }].map(s => (
              <div key={s.label} style={{ flex:1, background:C.warm, borderRadius:12, padding:"12px 8px", textAlign:"center", border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:22, fontWeight:700, color:C.accent }}>{s.value}</div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:"'Helvetica Neue', sans-serif", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding:"24px 20px 0" }}>
            <button onClick={() => setScreen("save")} style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:C.accent, color:"#fff", fontFamily:"'Georgia', serif", fontSize:16, fontWeight:700, cursor:"pointer" }}>
              + Save a verse
            </button>
          </div>
          <div style={{ display:"flex", gap:10, padding:"12px 20px 0" }}>
            <button onClick={() => setScreen("saved")} style={quickBtn(C)}>My Verses</button>
            <button onClick={() => setScreen("search")} style={quickBtn(C)}>Search</button>
          </div>
        </div>
      )}

      {/* SAVE */}
      {screen === "save" && (
        <div style={{ flex:1, padding:"0 0 100px" }}>
          <ScreenHeader title="Save a verse" onBack={() => { setScreen("home"); setVoiceTranscript(""); }} C={C} darkMode={darkMode} setDarkMode={setDarkMode} />
          <div style={{ padding:"0 20px" }}>

            <div style={{ marginBottom:20, textAlign:"center" }}>
              <button onClick={listening ? stopVoice : startVoice} style={{ width:"100%", padding:"14px 20px", borderRadius:14, border:"none", background: listening ? C.danger : C.accentLight, color: listening ? "#fff" : C.accent, fontFamily:"'Helvetica Neue', sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>{listening ? "⏹" : "🎙️"}</span>
                {listening ? "Tap to stop listening..." : "Tap to speak a verse reference"}
              </button>
              {listening && <div style={{ marginTop:8, fontSize:13, color:C.accent, fontFamily:"'Helvetica Neue', sans-serif", fontStyle:"italic" }}>Listening... say "Romans 8 28" or "Psalms 23 verse 4"</div>}
              {voiceTranscript && !listening && <div style={{ marginTop:8, fontSize:12, color:C.muted, fontFamily:"'Helvetica Neue', sans-serif" }}>You said: "<em>{voiceTranscript}</em>"</div>}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:C.border }} />
              <span style={{ fontSize:11, color:C.muted, fontFamily:"'Helvetica Neue', sans-serif", fontWeight:600, letterSpacing:".06em" }}>OR TYPE IT</span>
              <div style={{ flex:1, height:1, background:C.border }} />
            </div>

            {formError && <div style={{ background:C.dangerLight, border:`1px solid ${darkMode?"#5A2820":"#E8B0AB"}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:C.danger, marginBottom:16, fontFamily:"'Helvetica Neue', sans-serif" }}>{formError}</div>}

            <Label C={C}>Book</Label>
            <select value={form.book} onChange={e => setForm(f => ({ ...f, book:e.target.value, verseText:"" }))} style={inputStyle(C)}>
              <option value="">Select a book...</option>
              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}>
                <Label C={C}>Chapter</Label>
                <input type="number" min="1" placeholder="1" value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter:e.target.value, verseText:"" }))} style={inputStyle(C)} />
              </div>
              <div style={{ flex:1 }}>
                <Label C={C}>Verse</Label>
                <input type="number" min="1" placeholder="1" value={form.verse} onChange={e => setForm(f => ({ ...f, verse:e.target.value, verseText:"" }))} style={inputStyle(C)} />
              </div>
            </div>

            {(fetchingText || form.verseText) && (
              <div style={{ marginTop:16, background:C.accentLight, border:`1px solid ${C.accentMid}`, borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:11, fontFamily:"'Helvetica Neue', sans-serif", fontWeight:600, letterSpacing:".07em", textTransform:"uppercase", color:C.accent, marginBottom:8 }}>
                  {fetchingText ? "Looking up verse..." : `${form.book} ${form.chapter}:${form.verse} · KJV`}
                </div>
                {fetchingText ? <div style={{ fontSize:14, color:C.accentMid, fontStyle:"italic" }}>Fetching...</div>
                  : <div style={{ fontSize:15, color:C.dark, lineHeight:1.7, fontStyle:"italic" }}>"{form.verseText}"</div>}
              </div>
            )}

            <Label C={C}>What does this verse mean to you right now?</Label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note:e.target.value }))} placeholder="Your personal note (optional but encouraged)..." rows={4} style={{ ...inputStyle(C), resize:"none", lineHeight:1.6 }} />

            <Label C={C}>What is this verse about? (pick one or more)</Label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
              {SUGGESTED_TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} style={{ padding:"7px 14px", borderRadius:99, fontSize:13, fontFamily:"'Helvetica Neue', sans-serif", border:`1.5px solid ${form.tags.includes(tag) ? C.accent : C.stone}`, background:form.tags.includes(tag) ? C.accentLight : "transparent", color:form.tags.includes(tag) ? C.accent : C.muted, cursor:"pointer", fontWeight:form.tags.includes(tag) ? 600 : 400 }}>{tag}</button>
              ))}
            </div>

            <button onClick={saveVerse} style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", background:C.accent, color:"#fff", fontFamily:"'Georgia', serif", fontSize:16, fontWeight:700, cursor:"pointer" }}>
              Save to my verses
            </button>
          </div>
        </div>
      )}

      {/* SAVED */}
      {screen === "saved" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          <ScreenHeader title="My Verses" onBack={() => setScreen("home")} C={C} darkMode={darkMode} setDarkMode={setDarkMode} />
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, padding:"0 20px" }}>
            {["all","favorites"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:"10px 16px", border:"none", background:"transparent", fontFamily:"'Helvetica Neue', sans-serif", fontSize:13, color:activeTab===tab?C.accent:C.muted, borderBottom:activeTab===tab?`2px solid ${C.accent}`:"2px solid transparent", cursor:"pointer", fontWeight:activeTab===tab?600:400, textTransform:"capitalize" }}>
                {tab === "all" ? `All (${verses.length})` : `Favorites (${verses.filter(v=>v.isFavorite).length})`}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 100px" }}>
            {verses.length === 0 ? <EmptyState icon="📜" title="No verses yet — but your collection starts with one." body="Hear something today that stayed with you? Save it here." cta="Save my first verse" onCta={() => setScreen("save")} C={C} />
            : activeTab==="favorites" && verses.filter(v=>v.isFavorite).length===0 ? <EmptyState icon="🤍" title="The verses you return to most will live here." body="Tap the heart on any saved verse to add it." C={C} />
            : filteredVerses.length===0 ? <EmptyState icon="🔍" title="Nothing matched." body="Try a book name, a word from your note, or a tag." C={C} />
            : filteredVerses.map(v => <VerseCard key={v.id} verse={v} onFav={toggleFavorite} onDelete={deleteVerse} formatDate={formatDate} C={C} />)}
          </div>
        </div>
      )}

      {/* SEARCH */}
      {screen === "search" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          <ScreenHeader title="Search" onBack={() => setScreen("home")} C={C} darkMode={darkMode} setDarkMode={setDarkMode} />
          <div style={{ padding:"0 20px 16px" }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Book name, note word, verse text, or tag..." autoFocus style={{ ...inputStyle(C), marginBottom:0 }} />
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"0 20px 100px" }}>
            {searchQ==="" ? <EmptyState icon="🔍" title="Search your scripture collection" body="Try a book name, a word from the verse text, your note, or a tag like Comfort or Faith." C={C} />
            : filteredVerses.length===0 ? <EmptyState icon="😔" title="Nothing matched that search." body="Try a book name, a word from your note, or a tag." C={C} />
            : filteredVerses.map(v => <VerseCard key={v.id} verse={v} onFav={toggleFavorite} onDelete={deleteVerse} formatDate={formatDate} C={C} />)}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:C.navBg, borderTop:`1px solid ${C.border}`, display:"flex", padding:"10px 0 20px", zIndex:100, transition:"background 0.3s" }}>
        {[{ id:"home", label:"Home", icon:"🏠" },{ id:"save", label:"Save", icon:"✚" },{ id:"saved", label:"My Verses", icon:"📚" },{ id:"search", label:"Search", icon:"🔍" }].map(tab => (
          <button key={tab.id} onClick={() => setScreen(tab.id)} style={{ flex:1, background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 0" }}>
            <span style={{ fontSize:18, filter:screen===tab.id?"none":"grayscale(60%) opacity(0.6)" }}>{tab.icon}</span>
            <span style={{ fontSize:10, fontFamily:"'Helvetica Neue', sans-serif", color:screen===tab.id?C.accent:C.muted, fontWeight:screen===tab.id?600:400 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack, C, darkMode, setDarkMode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}`, marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:C.accent, padding:"0 12px 0 0", lineHeight:1 }}>←</button>
        <h2 style={{ fontFamily:"'Georgia', serif", fontSize:20, fontWeight:700, color:C.dark, margin:0 }}>{title}</h2>
      </div>
      <button onClick={() => setDarkMode(d => !d)} style={{ background:C.warm, border:`1px solid ${C.border}`, borderRadius:99, padding:"5px 10px", cursor:"pointer", fontSize:15 }}>
        {darkMode ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

function Label({ children, C }) {
  return <div style={{ fontSize:12, fontFamily:"'Helvetica Neue', sans-serif", fontWeight:600, color:C.muted, letterSpacing:".05em", textTransform:"uppercase", marginBottom:6, marginTop:16 }}>{children}</div>;
}

function inputStyle(C) {
  return { width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:C.cardBg, fontFamily:"'Georgia', serif", fontSize:15, color:C.dark, outline:"none", boxSizing:"border-box", appearance:"none" };
}

function quickBtn(C) {
  return { flex:1, padding:"11px", borderRadius:10, border:`1px solid ${C.border}`, background:C.warm, fontFamily:"'Helvetica Neue', sans-serif", fontSize:13, color:C.text, cursor:"pointer", fontWeight:500 };
}

function EmptyState({ icon, title, body, cta, onCta, C }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 24px 40px" }}>
      <div style={{ fontSize:40, marginBottom:16 }}>{icon}</div>
      <div style={{ fontFamily:"'Georgia', serif", fontSize:16, fontWeight:700, color:C.dark, marginBottom:10, lineHeight:1.5 }}>{title}</div>
      <div style={{ fontFamily:"'Helvetica Neue', sans-serif", fontSize:14, color:C.muted, lineHeight:1.6, marginBottom:cta?24:0 }}>{body}</div>
      {cta && <button onClick={onCta} style={{ padding:"12px 28px", borderRadius:99, border:"none", background:C.accent, color:"#fff", fontFamily:"'Georgia', serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>{cta}</button>}
    </div>
  );
}

function VerseCard({ verse, onFav, onDelete, formatDate, C }) {
  return (
    <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 16px 14px", marginBottom:12, transition:"background 0.3s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontFamily:"'Georgia', serif", fontSize:17, fontWeight:700, color:C.dark }}>{verse.book} {verse.chapter}:{verse.verse}</div>
        <button onClick={() => onFav(verse.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, padding:0, lineHeight:1 }}>{verse.isFavorite?"❤️":"🤍"}</button>
      </div>
      {verse.verseText && <div style={{ fontSize:14, color:C.text, fontStyle:"italic", marginTop:8, lineHeight:1.7, borderLeft:`3px solid ${C.accentMid}`, paddingLeft:10 }}>"{verse.verseText}"</div>}
      {verse.note && <div style={{ fontSize:13, color:C.muted, marginTop:8, lineHeight:1.6, paddingLeft:13, borderLeft:`3px solid ${C.border}` }}>Your note: {verse.note}</div>}
      {verse.tags.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
          {verse.tags.map(t => <span key={t} style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:C.tagBg, color:C.tagText, fontFamily:"'Helvetica Neue', sans-serif", fontWeight:600 }}>{t}</span>)}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, paddingTop:10, borderTop:`1px solid ${C.warm}` }}>
        <span style={{ fontSize:11, color:C.muted, fontFamily:"'Helvetica Neue', sans-serif" }}>{formatDate(verse.createdAt)}</span>
        <button onClick={() => onDelete(verse.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:C.muted, fontFamily:"'Helvetica Neue', sans-serif", padding:0, textDecoration:"underline" }}>Remove</button>
      </div>
    </div>
  );
}
