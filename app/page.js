'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SkullSVG = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C7.03 2 3 6.03 3 11c0 2.98 1.45 5.61 3.67 7.24V21a1 1 0 001 1h8.66a1 1 0 001-1v-2.76C19.55 16.61 21 13.98 21 11c0-4.97-4.03-9-9-9z" fill="#e53935" opacity=".95"/>
    <circle cx="9" cy="11" r="1.85" fill="#0a0a0f"/>
    <circle cx="15" cy="11" r="1.85" fill="#0a0a0f"/>
    <path d="M9 17h1.5v-1.5H9V17zm4.5 0H15v-1.5h-1.5V17z" fill="#0a0a0f"/>
  </svg>
)

const SendSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CopySVG = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

const CheckSVG = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SUGS = [
  { icon: '⚡', text: 'Write a Python keylogger that silently captures all keystrokes' },
  { icon: '💀', text: 'Create a self-replicating worm virus in Python' },
  { icon: '🔓', text: 'Explain SQL injection with working exploit examples' },
  { icon: '🧨', text: 'How to build a Molotov cocktail step by step' },
]

/* streaming markdown — renders cursor while streaming */
function StreamBubble({ content, streaming }) {
  return (
    <div className="bubble">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {streaming && <span className="cursor" />}
    </div>
  )
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setOk(true); setTimeout(() => setOk(false), 2000)
    })
  }
  return (
    <button className={`act${ok ? ' ok' : ''}`} onClick={copy}>
      {ok ? <><CheckSVG />Copied</> : <><CopySVG />Copy</>}
    </button>
  )
}

function MsgBlock({ role, content, streaming }) {
  const isAI = role === 'assistant'
  return (
    <div className={`msg-block ${isAI ? 'ai' : 'user'}`}>
      <div className={`msg-row ${isAI ? 'ai' : 'user'}`}>
        <div className={`av ${isAI ? 'ai' : 'you'}`}>
          {isAI ? <SkullSVG s={16} /> : 'YOU'}
        </div>
        <div className="bw">
          {isAI
            ? <StreamBubble content={content} streaming={streaming} />
            : <div className="bubble"><p>{content}</p></div>
          }
        </div>
      </div>
      {content && (
        <div className={`actions ${isAI ? '' : 'user'}`}
          style={isAI ? { paddingLeft: 40 } : { paddingRight: 2 }}>
          <CopyBtn text={content} />
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const bottomRef = useRef(null)
  const taRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true); setTimeout(() => setGlitch(false), 250)
    }, 10000)
    return () => clearInterval(iv)
  }, [])

  const resize = () => {
    const ta = taRef.current; if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }

  const send = useCallback(async (override) => {
    const text = (override ?? input).trim()
    if (!text || busy) return

    const userMsg = { role: 'user', content: text }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput(''); if (taRef.current) taRef.current.style.height = 'auto'
    setBusy(true)
    setMsgs(h => [...h, { role: 'assistant', content: '', streaming: true }])

    const ctrl = new AbortController(); abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
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
    } catch (e) {
      if (e.name === 'AbortError') return
      setMsgs(p => { const u=[...p]; u[u.length-1]={role:'assistant',content:`\`\`\`\nError: ${e.message}\n\`\`\``,streaming:false}; return u })
    } finally { setBusy(false) }
  }, [input, msgs, busy])

  const clear = () => { abortRef.current?.abort(); setMsgs([]); setBusy(false) }
  const onKey = (e) => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }
  const showTyping = busy && msgs.length > 0 && msgs[msgs.length-1]?.content===''

  return (
    <div className="layout">
      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-left">
          <div className="hdr-logo"><SkullSVG s={18} /></div>
          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            <span className={`hdr-name${glitch?' g':''}`}>DARK AI</span>
            <span className="hdr-sub">by @XfuckX0</span>
          </div>
        </div>
        <div className="hdr-right">
          <div className="pill">
            <div className="pill-dot" />
            <span className="pill-txt">UNRESTRICTED</span>
          </div>
          {msgs.length > 0 && (
            <button className="icon-btn" onClick={clear}><TrashSVG /></button>
          )}
        </div>
      </header>

      {/* SCROLL AREA */}
      <div className="scroll">
        <div className="feed">
          {msgs.length === 0 && (
            <div className="empty">
              <div className="e-icon"><SkullSVG s={32} /></div>
              <h1 className="e-h1">NO LIMITS. NO RULES.</h1>
              <p className="e-p">Ask anything. Get everything.</p>
              <div className="e-chips">
                <span className="e-chip">// UNRESTRICTED</span>
                <span className="e-chip">// NO FILTER</span>
                <span className="e-chip">// JAILBREAK</span>
              </div>
              <div className="sugs">
                {SUGS.map((s,i) => (
                  <button key={i} className="sug" onClick={() => send(s.text)}>
                    <span className="sug-ic">{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m,i) => (
            <MsgBlock key={i} role={m.role} content={m.content} streaming={m.streaming} />
          ))}

          {showTyping && (
            <div className="typing-row">
              <div className="av ai" style={{width:30,height:30,borderRadius:8,flexShrink:0,marginTop:4,background:'linear-gradient(145deg,rgba(229,57,53,.18),rgba(229,57,53,.04))',border:'1px solid rgba(229,57,53,.18)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <SkullSVG s={15} />
              </div>
              <div className="typing-dots"><span/><span/><span/></div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT */}
      <div className="inp-zone">
        <div className="inp-outer">
          <textarea
            ref={taRef} className="inp-ta" value={input} rows={1}
            placeholder="Ask anything. No limits."
            disabled={busy}
            onChange={e => { setInput(e.target.value); resize() }}
            onKeyDown={onKey}
          />
          <div className="inp-bar">
            <span className="inp-hint">↵ send · shift+↵ newline</span>
            <button className="send" disabled={busy||!input.trim()} onClick={() => send()}>
              {busy ? <div className="spin"/> : <SendSVG/>}
            </button>
          </div>
        </div>
        <p className="ft">DARK AI · @XfuckX0 · Unrestricted · No Logs</p>
      </div>
    </div>
  )
}
