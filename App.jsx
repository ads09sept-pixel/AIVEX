import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Search, MessageSquare, PanelLeftClose, PanelLeftOpen, Sun, Moon, Paperclip,
  Image as ImageIcon, Globe, Mic, Send, Sparkles, MoreHorizontal, Trash2, FolderPlus,
  Settings2, X, Copy, Volume2, StopCircle, Menu, Brain, ExternalLink, FileText, ChevronDown
} from "lucide-react";

const STORAGE_KEY = "aivex_chats_v1";
const PREF_KEY = "aivex_prefs_v1";
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const starterPrompts = [
  ["Understand anything", "Explain a difficult topic in simple words with an example."],
  ["Write something", "Help me write a clear and engaging piece of writing."],
  ["Solve a problem", "Help me solve this problem step by step."],
  ["Explore an idea", "Help me evaluate an idea and turn it into a practical plan."]
];

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function AdSlot({ slot = "REPLACE_WITH_AD_SLOT_ID" }) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT;
  const configured = Boolean(client && slot && !slot.startsWith("REPLACE"));
  useEffect(() => {
    if (!configured) return;
    if (!document.querySelector(`script[data-aivex-ads="${client}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.dataset.aivexAds = client;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, [configured, client]);
  if (!configured) return <div className="ad-placeholder"><span>ADVERTISEMENT SPACE</span><small>Configure an approved ad network to display ads here.</small></div>;
  return <ins className="adsbygoogle ad-live" style={{display:"block"}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />;
}

export default function App() {
  const savedPrefs = readJSON(PREF_KEY, { theme: "dark", memory: false });
  const [theme, setTheme] = useState(savedPrefs.theme);
  const [memory, setMemory] = useState(savedPrefs.memory);
  const [chats, setChats] = useState(() => readJSON(STORAGE_KEY, []));
  const [activeId, setActiveId] = useState(() => readJSON(STORAGE_KEY, [])[0]?.id || null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [notice, setNotice] = useState("");
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeId) || null;
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }, [chats]);
  useEffect(() => { localStorage.setItem(PREF_KEY, JSON.stringify({theme, memory})); document.documentElement.dataset.theme = theme; }, [theme, memory]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages, busy]);

  const filteredChats = useMemo(() => chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase())), [chats, search]);

  function newChat() {
    const chat = { id: makeId(), title: "New conversation", createdAt: Date.now(), messages: [] };
    setChats(prev => [chat, ...prev]); setActiveId(chat.id); setInput(""); setAttachments([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  function updateChat(id, updater) { setChats(prev => prev.map(c => c.id === id ? updater(c) : c)); }
  function deleteChat(id) {
    const next = chats.filter(c => c.id !== id); setChats(next);
    if (activeId === id) setActiveId(next[0]?.id || null);
  }
  async function addFiles(files) {
    const list = Array.from(files || []);
    const next = [];
    for (const file of list.slice(0, 4)) {
      if (file.size > 8 * 1024 * 1024) { setNotice(`${file.name} is over 8 MB and was skipped.`); continue; }
      if (file.type.startsWith("image/")) {
        const data = await new Promise((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1]); r.onerror = reject; r.readAsDataURL(file);
        });
        next.push({ name: file.name, mimeType: file.type, data, preview: URL.createObjectURL(file), kind: "image" });
      } else if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
        const text = await file.text();
        next.push({ name: file.name, text: text.slice(0, 18000), kind: "text" });
      } else {
        setNotice("This starter version reads images, TXT, Markdown and CSV. PDF/DOCX parsing is not included yet.");
      }
    }
    setAttachments(prev => [...prev, ...next].slice(0, 4));
  }

  async function sendMessage(textOverride) {
    const text = (textOverride ?? input).trim();
    if ((!text && !attachments.length) || busy) return;
    let chat = activeChat;
    if (!chat) {
      chat = { id: makeId(), title: "New conversation", createdAt: Date.now(), messages: [] };
      setChats(prev => [chat, ...prev]); setActiveId(chat.id);
    }
    const userText = [text, ...attachments.filter(a => a.kind === "text").map(a => `\n\n[File: ${a.name}]\n${a.text}`)].filter(Boolean).join("\n");
    const images = attachments.filter(a => a.kind === "image").map(a => ({ name:a.name, mimeType:a.mimeType, data:a.data }));
    const userMsg = { id: makeId(), role: "user", text: userText, images: images.map(i => ({name:i.name, preview:attachments.find(a=>a.name===i.name)?.preview})) };
    const history = [...chat.messages, userMsg];
    const title = chat.messages.length === 0 ? (text || attachments[0]?.name || "New conversation").slice(0, 42) : chat.title;
    updateChat(chat.id, c => ({ ...c, title, messages: history }));
    setInput(""); setAttachments([]); setBusy(true); setNotice("");
    try {
      const payloadMessages = history.slice(-16).map(m => ({
        role: m.role, text: m.text,
        images: m.role === "user" && m.id === userMsg.id ? images : []
      }));
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, webSearch })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not contact AIVEX.");
      const assistantMsg = { id: makeId(), role: "assistant", text: data.answer, sources: data.sources || [] };
      updateChat(chat.id, c => ({ ...c, messages: [...c.messages, assistantMsg] }));
    } catch (err) {
      updateChat(chat.id, c => ({ ...c, messages: [...c.messages, { id:makeId(), role:"assistant", text:`I couldn't complete that request. ${err.message}\n\nCheck that your Netlify AI key is configured and the site has been redeployed.`, error:true }] }));
    } finally { setBusy(false); }
  }

  function copyText(text) { navigator.clipboard?.writeText(text); setNotice("Copied to clipboard."); }
  function speak(text) {
    if (!("speechSynthesis" in window)) { setNotice("Speech playback is not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 1; window.speechSynthesis.speak(utterance);
  }
  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setNotice("Voice input is not supported in this browser. Try Chrome."); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "en-IN"; recognition.interimResults = false;
    recognition.onresult = e => setInput(prev => `${prev}${prev ? " " : ""}${e.results[0][0].transcript}`);
    recognition.onerror = () => setNotice("Voice input did not work. Please try again.");
    recognition.start();
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <aside className="sidebar">
        <div className="brand-row"><div className="brand-mark"><Sparkles size={19}/></div><div><b>AIVEX</b><small>One AI. Endless Possibilities.</small></div><button className="icon-btn mobile-close" onClick={()=>setSidebarOpen(false)}><X size={17}/></button></div>
        <button className="new-chat" onClick={newChat}><Plus size={17}/> New chat</button>
        <div className="side-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations"/></div>
        <div className="side-label">RECENT</div>
        <div className="chat-list">{filteredChats.map(c=><div className={`chat-entry ${c.id===activeId?"selected":""}`} key={c.id}>
          <button className="chat-select" onClick={()=>setActiveId(c.id)}><MessageSquare size={15}/><span>{c.title}</span></button>
          <button className="tiny-action" title="Delete conversation" onClick={()=>deleteChat(c.id)}><Trash2 size={14}/></button>
        </div>)}
        {filteredChats.length===0 && <div className="empty-side">Your conversations will appear here.</div>}</div>
        <div className="sidebar-bottom">
          <AdSlot />
          <button className="side-setting" onClick={()=>setSettingsOpen(true)}><Settings2 size={17}/> Settings & privacy</button>
          <div className="profile"><div className="avatar">A</div><div><b>AIVEX Guest</b><small>Saved on this device</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>}
      <main className="main-area">
        <header className="topbar">
          <div className="top-left"><button className="icon-btn" onClick={()=>setSidebarOpen(!sidebarOpen)}>{sidebarOpen?<PanelLeftClose size={19}/>:<PanelLeftOpen size={19}/>}</button><span className="top-brand">AIVEX <ChevronDown size={14}/></span><span className="model-pill"><span/> AI assistant</span></div>
          <div className="top-right"><button className="icon-btn" title="Toggle theme" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-btn" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/></button></div>
        </header>
        <section className={`conversation ${activeChat?.messages?.length ? "has-messages":""}`}>
          {!activeChat?.messages?.length ? <div className="welcome">
            <div className="welcome-orb"><Sparkles size={30}/></div>
            <div className="eyebrow">YOUR PERSONAL AI ASSISTANT</div>
            <h1>What can I help<br/><span>you with today?</span></h1>
            <p>Ask anything. Explore ideas. Get things done.</p>
            <div className="prompt-grid">{starterPrompts.map(([title, prompt],i)=><button className="prompt-card" key={title} onClick={()=>sendMessage(prompt)}><span className={`prompt-icon p${i}`}><Sparkles size={16}/></span><b>{title}</b><small>{prompt}</small></button>)}</div>
            <div className="welcome-ad"><AdSlot /></div>
          </div> : <div className="messages">
            {activeChat.messages.map(m=><article className={`message ${m.role}`} key={m.id}>
              <div className="message-avatar">{m.role==="assistant"?<Sparkles size={16}/>:<span>Y</span>}</div>
              <div className="message-body">
                <div className="message-author">{m.role==="assistant"?"AIVEX":"You"}</div>
                {m.images?.length>0 && <div className="attached-images">{m.images.map((im,i)=><img key={i} src={im.preview} alt={im.name}/>)}</div>}
                <div className="message-text">{m.text}</div>
                {m.sources?.length>0 && <div className="sources"><b><Globe size={13}/> Sources</b>{m.sources.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noreferrer">{s.title}<ExternalLink size={12}/></a>)}</div>}
                {m.role==="assistant" && <div className="message-tools"><button onClick={()=>copyText(m.text)}><Copy size={14}/> Copy</button><button onClick={()=>speak(m.text)}><Volume2 size={14}/> Read aloud</button></div>}
              </div>
            </article>)}
            {busy && <div className="typing"><div className="message-avatar"><Sparkles size={16}/></div><span className="dots"><i/><i/><i/></span><small>AIVEX is thinking</small></div>}
            <div ref={bottomRef}/>
          </div>}
        </section>
        <div className="composer-wrap">
          {attachments.length>0 && <div className="attachment-strip">{attachments.map((a,i)=><div className="attachment-chip" key={i}>{a.kind==="image"?<ImageIcon size={14}/>:<FileText size={14}/>}<span>{a.name}</span><button onClick={()=>setAttachments(prev=>prev.filter((_,j)=>j!==i))}><X size={13}/></button></div>)}</div>}
          <div className="composer">
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Message AIVEX..." rows={1}/>
            <div className="composer-actions">
              <div className="composer-left"><button className="tool-btn" onClick={()=>fileRef.current?.click()}><Paperclip size={17}/><span>Attach</span></button><input ref={fileRef} type="file" multiple accept="image/*,.txt,.md,.csv" hidden onChange={e=>addFiles(e.target.files)}/><button className={`tool-btn ${webSearch?"active":""}`} onClick={()=>setWebSearch(!webSearch)}><Globe size={16}/><span>Web search</span></button><button className="tool-btn voice-btn" onClick={startVoice}><Mic size={16}/></button></div>
              <button className="send-btn" disabled={busy || (!input.trim()&&!attachments.length)} onClick={()=>sendMessage()}>{busy?<StopCircle size={17}/>:<Send size={17}/>}</button>
            </div>
          </div>
          <div className="composer-foot"><span>AI can make mistakes. Verify important information.</span><span>Enter to send · Shift + Enter for a new line</span></div>
          {notice && <button className="notice" onClick={()=>setNotice("")}>{notice} <X size={13}/></button>}
        </div>
      </main>
      {settingsOpen && <div className="modal-backdrop" onClick={()=>setSettingsOpen(false)}><div className="settings-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div><b>Settings</b><small>Personalize your AIVEX experience</small></div><button className="icon-btn" onClick={()=>setSettingsOpen(false)}><X size={18}/></button></div>
        <div className="setting-row"><div><b>Appearance</b><small>Choose your preferred theme</small></div><button className="setting-choice" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?"Dark":"Light"} <Sun size={15}/></button></div>
        <div className="setting-row"><div><b>Personal memory</b><small>In this starter, chat history stays on this device. Memory toggle is a preference only; persistent AI memory is not yet implemented.</small></div><button className={`switch ${memory?"on":""}`} onClick={()=>setMemory(!memory)}><i/></button></div>
        <div className="privacy-note"><Brain size={17}/><span>Guest mode is active. Your chat history is stored in this browser's local storage. Clearing browser data removes it.</span></div>
        <button className="clear-btn" onClick={()=>{if(confirm("Delete all conversations stored in this browser?")){setChats([]);setActiveId(null);}}}><Trash2 size={15}/> Delete all local conversations</button>
      </div></div>}
    </div>
  );
}
