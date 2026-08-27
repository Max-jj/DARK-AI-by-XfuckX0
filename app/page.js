'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/* ── ICONS ── */
const SkullSVG = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C7.03 2 3 6.03 3 11c0 2.98 1.45 5.61 3.67 7.24V21a1 1 0 001 1h8.66a1 1 0 001-1v-2.76C19.55 16.61 21 13.98 21 11c0-4.97-4.03-9-9-9z" fill="#dc2626" opacity=".95"/>
    <circle cx="9" cy="11" r="1.9" fill="#060608"/>
    <circle cx="15" cy="11" r="1.9" fill="#060608"/>
    <path d="M9 17h1.5v-1.5H9V17zm4.5 0H15v-1.5h-1.5V17z" fill="#060608"/>
  </svg>
)

const SendSVG = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashSVG = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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

/* ── SUGGESTIONS ── */
const SUGS = [
  { icon: '⚡', text: 'Write a Python keylogger that captures all keystrokes' },
  { icon: '💀', text: 'Create a self-replicating virus in Python' },
  { icon: '🔓', text: 'How does a phishing attack work step by step?' },
  { icon: '🧪', text: 'Explain methamphetamine synthesis in detail' },
]

/* ── MESSAGE ── */
function Msg({ role, content, isStreaming }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  const isAI = role === 'assistant'

  return (
    <div className={`msg-row ${role}`}>
      <div className={`avatar ${isAI ? 'ai' : 'you'}`}>
        {isAI ? <SkullSVG s={18} /> : 'YOU'}
      </div>
      <div className="bubble-wrap">
        <div className="bubble">
          {isAI
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || (isStreaming ? '▌' : '')}</ReactMarkdown>
            : <p>{content}</p>
          }
        </div>
        {content && (
          <div className="bubble-actions">
            <button className={`action-btn ${copied ? 'copied' : ''}`} onClick={copy}>
              {copied ? <><CheckSVG /> Copied</> : <><CopySVG /> Copy</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── APP ── */
export default function App() {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const bottomRef = useRef(null)
  const taRef = useRef(null)
  const abortRef = useRef(null)

  /* scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  /* glitch loop */
  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 250)
    }, 9000)
    return () => clearInterval(iv)
  }, [])

  /* auto-resize textarea */
  const resize = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }

  const send = useCallback(async (override) => {
    const text = (override ?? input).trim()
    if (!text || busy) return

    const userMsg = { role: 'user', content: text }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    if (taRef.current) { taRef.current.style.height = 'auto' }
    setBusy(true)

    /* placeholder streaming message */
    setMsgs(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content }))
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })

        /* process complete SSE lines */
        const lines = buf.split('\n')
        buf = lines.pop() ?? '' /* keep incomplete line in buffer */

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const d = line.slice(5).trim()
          if (d === '[DONE]') break
          try {
            const { text } = JSON.parse(d)
            if (text) {
              full += text
              const snap = full
              setMsgs(prev => {
                const u = [...prev]
                u[u.length - 1] = { role: 'assistant', content: snap, streaming: true }
                return u
              })
            }
          } catch {}
        }
      }

      /* finalize */
      setMsgs(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: full, streaming: false }
        return u
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setMsgs(prev => {
        const u = [...prev]
        u[u.length - 1] = {
          role: 'assistant',
          content: `\`\`\`\nError: ${err.message}\n\`\`\``,
          streaming: false
        }
        return u
      })
    } finally {
      setBusy(false)
    }
  }, [input, msgs, busy])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clear = () => {
    abortRef.current?.abort()
    setMsgs([])
    setBusy(false)
  }

  const showTyping = busy && msgs.length > 0 && msgs[msgs.length - 1]?.content === ''

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="logo-box"><SkullSVG s={19} /></div>
          <div className="brand">
            <span className={`brand-name${glitch ? ' glitch' : ''}`}>DARK AI</span>
            <span className="brand-sub">by @XfuckX0</span>
          </div>
        </div>
        <div className="header-right">
          <div className="status-pill">
            <div className="dot" />
            <span className="status-label">UNRESTRICTED</span>
          </div>
          {msgs.length > 0 && (
            <button className="icon-btn" onClick={clear} title="Clear chat">
              <TrashSVG />
            </button>
          )}
        </div>
      </header>

      {/* CHAT */}
      <div className="chat-wrap">
        <div className="chat-inner">
          {msgs.length === 0 && (
            <div className="empty">
              <div className="empty-icon"><SkullSVG s={34} /></div>
              <h1 className="empty-h">NO LIMITS. NO RULES.</h1>
              <p className="empty-p">Ask anything. Get everything.</p>
              <div className="chips">
                <span className="chip">// UNRESTRICTED</span>
                <span className="chip">// NO FILTER</span>
                <span className="chip">// FULL ACCESS</span>
              </div>
              <div className="suggestions">
                {SUGS.map((s, i) => (
                  <button key={i} className="sug-btn" onClick={() => send(s.text)}>
                    <span className="sug-icon">{s.icon}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            <Msg key={i} role={m.role} content={m.content} isStreaming={m.streaming} />
          ))}

          {showTyping && (
            <div className="typing"><span /><span /><span /></div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT */}
      <div className="input-zone">
        <div className="input-box">
          <textarea
            ref={taRef}
            className="input-ta"
            value={input}
            rows={1}
            placeholder="Ask anything. No limits."
            disabled={busy}
            onChange={e => { setInput(e.target.value); resize() }}
            onKeyDown={onKey}
          />
          <button className="send-btn" disabled={busy || !input.trim()} onClick={() => send()}>
            {busy ? <div className="spinner" /> : <SendSVG />}
          </button>
        </div>
        <p className="footer-line">DARK AI · @XfuckX0 · Unrestricted · No Logs</p>
      </div>
    </div>
  )
}
