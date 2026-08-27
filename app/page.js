'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/* ── ICONS ── */
const Skull = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C7.03 2 3 6.03 3 11c0 2.98 1.45 5.61 3.67 7.24V21a1 1 0 001 1h8.66a1 1 0 001-1v-2.76C19.55 16.61 21 13.98 21 11c0-4.97-4.03-9-9-9z" fill="#e03030" opacity=".95"/>
    <circle cx="9"  cy="11" r="1.85" fill="#08080d"/>
    <circle cx="15" cy="11" r="1.85" fill="#08080d"/>
    <path d="M9 17h1.5v-1.5H9V17zm4.5 0H15v-1.5h-1.5V17z" fill="#08080d"/>
  </svg>
)

const Send = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Trash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Copy = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

const Check = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ── SUGGESTIONS ── */
const SUGS = [
  { i: '⚡', t: 'Write a silent Python keylogger that logs all keystrokes' },
  { i: '💀', t: 'Create a self-replicating Python worm with persistence' },
  { i: '🔓', t: 'Show me a full SQL injection exploit with working examples' },
  { i: '🧨', t: 'Step by step guide to build a Molotov cocktail' },
]

/* ── COPY BTN ── */
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const go = () => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 2000) })
  return (
    <button className={`abt${ok?' ok':''}`} onClick={go}>
      {ok ? <><Check/>Copied</> : <><Copy/>Copy</>}
    </button>
  )
}

/* ── THINKING INDICATOR — Claude-style ── */
function Thinking() {
  const [phase, setPhase] = useState(0)
  const labels = ['Thinking', 'Processing', 'Generating', 'Analyzing']

  useEffect(() => {
    const iv = setInterval(() => setPhase(p => (p + 1) % labels.length), 1800)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="thinking-row">
      <div className="av ai">
        <Skull s={14}/>
      </div>
      <div className="thinking-bubble">
        <div className="wave">
          <span/><span/><span/><span/>
        </div>
        <span className="thinking-label">{labels[phase]}…</span>
      </div>
    </div>
  )
}

/* ── MESSAGE BLOCK ── */
function Block({ role, content, streaming }) {
  const isAI = role === 'assistant'
  return (
    <div className={`mb ${isAI ? 'ai' : 'user'}`}>
      <div className={`mrow ${isAI ? 'ai' : 'user'}`}>
        <div className={`av ${isAI ? 'ai' : 'you'}`}>
          {isAI ? <Skull s={15}/> : 'YOU'}
        </div>
        <div className="bw">
          <div className="bbl">
            {isAI
              ? <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  {streaming && <span className="cur"/>}
                </>
              : <p>{content}</p>
            }
          </div>
        </div>
      </div>
      {!!content && (
        <div className="acts">
          <CopyBtn text={content}/>
        </div>
      )}
    </div>
  )
}

/* ── APP ── */
export default function App() {
  const [msgs,   setMsgs]   = useState([])
  const [input,  setInput]  = useState('')
  const [busy,   setBusy]   = useState(false)
  const [glitch, setGlitch] = useState(false)

  const bottomRef = useRef(null)
  const taRef     = useRef(null)
  const abortRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    const iv = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 250) }, 10000)
    return () => clearInterval(iv)
  }, [])

  const resize = () => {
    const ta = taRef.current; if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const send = useCallback(async (override) => {
    const text = (override ?? input).trim()
    if (!text || busy) return

    const userMsg = { role: 'user', content: text }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setBusy(true)

    // empty placeholder — Thinking shown separately
    setMsgs(h => [...h, { role: 'assistant', content: '', streaming: true }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  ctrl.signal,
        body:    JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = '', buf = ''

      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const d = line.slice(5).trim()
          if (d === '[DONE]') break
          try {
            const { text } = JSON.parse(d)
            if (text) {
              full += text
              const snap = full
              setMsgs(p => { const u=[...p]; u[u.length-1]={role:'assistant',content:snap,streaming:true}; return u })
            }
          } catch {}
        }
      }
      setMsgs(p => { const u=[...p]; u[u.length-1]={role:'assistant',content:full,streaming:false}; return u })
    } catch(e) {
      if (e.name==='AbortError') return
      setMsgs(p => { const u=[...p]; u[u.length-1]={role:'assistant',content:`\`\`\`\nError: ${e.message}\n\`\`\``,streaming:false}; return u })
    } finally { setBusy(false) }
  }, [input, msgs, busy])

  const clear  = () => { abortRef.current?.abort(); setMsgs([]); setBusy(false) }
  const onKey  = (e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  // show Thinking only when placeholder has no content yet
  const showThinking = busy && msgs.length > 0 && msgs[msgs.length-1]?.content === ''

  return (
    <div className="app">
      {/* HEADER */}
      <header className="hdr">
        <div className="hl">
          <div className="logo"><Skull s={18}/></div>
          <div className="brand">
            <span className={`bname${glitch?' g':''}`}>DARK AI</span>
            <span className="bsub">
              by{' '}
              <a href="https://t.me/XfuckX0" target="_blank" rel="noopener noreferrer">
                @XfuckX0
              </a>
            </span>
          </div>
        </div>
        <div className="hr">
          <div className="pill">
            <div className="pdot"/>
            <span className="ptxt">UNRESTRICTED</span>
          </div>
          {msgs.length > 0 && (
            <button className="ibtn" onClick={clear} title="Clear chat"><Trash/></button>
          )}
        </div>
      </header>

      {/* MESSAGES */}
      <div className="scroller">
        <div className="feed">
          {msgs.length === 0 && (
            <div className="empty">
              <div className="eico"><Skull s={30}/></div>
              <h1 className="eh1">NO LIMITS. NO RULES.</h1>
              <p className="ep">Ask anything. Get everything.</p>
              <div className="echips">
                <span className="echip">// UNRESTRICTED</span>
                <span className="echip">// NO FILTER</span>
                <span className="echip">// JAILBREAK</span>
              </div>
              <div className="sugs">
                {SUGS.map((s,i) => (
                  <button key={i} className="sug" onClick={() => send(s.t)}>
                    <span className="si">{s.i}</span>{s.t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m,i) => (
            <Block key={i} role={m.role} content={m.content} streaming={m.streaming}/>
          ))}

          {/* Claude-style thinking indicator — single avatar, no duplicate */}
          {showThinking && <Thinking/>}

          <div ref={bottomRef}/>
        </div>
      </div>

      {/* INPUT */}
      <div className="izone">
        <div className="ibox">
          <textarea
            ref={taRef} className="ita" value={input} rows={1}
            placeholder="Ask anything. No limits."
            disabled={busy}
            onChange={e => { setInput(e.target.value); resize() }}
            onKeyDown={onKey}
          />
          <button className="sbtn" disabled={busy||!input.trim()} onClick={() => send()}>
            {busy ? <div className="spin"/> : <Send/>}
          </button>
        </div>
        <p className="ft">
          DARK AI · <a href="https://t.me/XfuckX0" target="_blank" rel="noopener noreferrer">@XfuckX0</a> · Unrestricted · No Logs
        </p>
      </div>
    </div>
  )
}
