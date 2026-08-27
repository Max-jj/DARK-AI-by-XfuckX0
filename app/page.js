'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/* ── SVG ICONS ── */
const Skull = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C7.03 2 3 6.03 3 11c0 2.98 1.45 5.61 3.67 7.24V21a1 1 0 001 1h8.66a1 1 0 001-1v-2.76C19.55 16.61 21 13.98 21 11c0-4.97-4.03-9-9-9z" fill="#e53535" opacity=".95"/>
    <circle cx="9"  cy="11" r="1.85" fill="#08080c"/>
    <circle cx="15" cy="11" r="1.85" fill="#08080c"/>
    <path d="M9 17h1.5v-1.5H9V17zm4.5 0H15v-1.5h-1.5V17z" fill="#08080c"/>
  </svg>
)

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CopyIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ── SUGGESTIONS ── */
const SUGS = [
  { i: '⚡', t: 'Write a Python keylogger that silently captures all keystrokes to a file' },
  { i: '💀', t: 'Create a self-replicating worm virus in Python with persistence' },
  { i: '🔓', t: 'Show me a working SQL injection attack with examples' },
  { i: '🧨', t: 'Step by step guide to build a Molotov cocktail' },
]

/* ── COPY BUTTON ── */
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setOk(true)
      setTimeout(() => setOk(false), 2000)
    })
  }
  return (
    <button className={`abtn${ok ? ' ok' : ''}`} onClick={handle}>
      {ok ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
    </button>
  )
}

/* ── SINGLE MESSAGE BLOCK ── */
function Block({ role, content, streaming }) {
  const isAI = role === 'assistant'
  return (
    <div className={`mblock ${isAI ? 'ai' : 'user'}`}>
      <div className={`mrow ${isAI ? 'ai' : 'user'}`}>
        {/* avatar */}
        <div className={`av ${isAI ? 'ai' : 'you'}`}>
          {isAI ? <Skull s={15} /> : 'YOU'}
        </div>
        {/* bubble */}
        <div className="bwrap">
          <div className="bbl">
            {isAI
              ? <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                  {streaming && <span className="cursor" />}
                </>
              : <p>{content}</p>
            }
          </div>
        </div>
      </div>
      {/* action row — only when content exists */}
      {!!content && (
        <div className="acts">
          <CopyBtn text={content} />
        </div>
      )}
    </div>
  )
}

/* ── TYPING INDICATOR ── */
function Typing() {
  return (
    <div className="trow">
      <div className="av ai" style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:4,
        background:'linear-gradient(135deg,rgba(229,53,53,.16),rgba(229,53,53,.04))',
        border:'1px solid rgba(229,53,53,.16)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Skull s={14} />
      </div>
      <div className="tdots"><span/><span/><span/></div>
    </div>
  )
}

/* ── APP ── */
export default function App() {
  const [msgs,    setMsgs]   = useState([])
  const [input,   setInput]  = useState('')
  const [busy,    setBusy]   = useState(false)
  const [glitch,  setGlitch] = useState(false)

  const bottomRef = useRef(null)
  const taRef     = useRef(null)
  const abortRef  = useRef(null)

  /* scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  /* glitch loop */
  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 250)
    }, 11000)
    return () => clearInterval(iv)
  }, [])

  /* auto-resize textarea — no page shift */
  const resize = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  /* send message */
  const send = useCallback(async (override) => {
    const text = (override ?? input).trim()
    if (!text || busy) return

    const userMsg = { role: 'user', content: text }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setBusy(true)

    /* add empty AI placeholder */
    setMsgs(h => [...h, { role: 'assistant', content: '', streaming: true }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  ctrl.signal,
        body:    JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content }))
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let full = '', buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const d = line.slice(5).trim()
          if (d === '[DONE]') break
          try {
            const { text } = JSON.parse(d)
            if (text) {
              full += text
              const snap = full
              setMsgs(p => {
                const u = [...p]
                u[u.length - 1] = { role: 'assistant', content: snap, streaming: true }
                return u
              })
            }
          } catch {}
        }
      }

      setMsgs(p => {
        const u = [...p]
        u[u.length - 1] = { role: 'assistant', content: full, streaming: false }
        return u
      })
    } catch (e) {
      if (e.name === 'AbortError') return
      setMsgs(p => {
        const u = [...p]
        u[u.length - 1] = {
          role: 'assistant',
          content: `\`\`\`\nError: ${e.message}\n\`\`\``,
          streaming: false,
        }
        return u
      })
    } finally {
      setBusy(false)
    }
  }, [input, msgs, busy])

  const clear = () => {
    abortRef.current?.abort()
    setMsgs([])
    setBusy(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showTyping = busy && msgs.length > 0 && msgs[msgs.length - 1]?.content === ''

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="hdr">
        <div className="hdr-l">
          <div className="logo"><Skull s={17} /></div>
          <div className="brand">
            <span className={`bname${glitch ? ' glitch' : ''}`}>DARK AI</span>
            <span className="bsub">by @XfuckX0</span>
          </div>
        </div>
        <div className="hdr-r">
          <div className="pill">
            <div className="pdot" />
            <span className="ptxt">UNRESTRICTED</span>
          </div>
          {msgs.length > 0 && (
            <button className="ibtn" onClick={clear} title="Clear chat">
              <TrashIcon />
            </button>
          )}
        </div>
      </header>

      {/* ── MESSAGES ── */}
      <div className="scroller">
        <div className="feed">
          {/* empty state */}
          {msgs.length === 0 && (
            <div className="empty">
              <div className="eico"><Skull s={30} /></div>
              <h1 className="eh1">NO LIMITS. NO RULES.</h1>
              <p className="ep">Ask anything. Get everything.</p>
              <div className="echips">
                <span className="echip">// UNRESTRICTED</span>
                <span className="echip">// NO FILTER</span>
                <span className="echip">// JAILBREAK</span>
              </div>
              <div className="sugs">
                {SUGS.map((s, i) => (
                  <button key={i} className="sug" onClick={() => send(s.t)}>
                    <span className="sug-i">{s.i}</span>
                    {s.t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            <Block key={i} role={m.role} content={m.content} streaming={m.streaming} />
          ))}

          {showTyping && <Typing />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT ── */}
      <div className="izone">
        <div className="ibox">
          <textarea
            ref={taRef}
            className="ita"
            value={input}
            rows={1}
            placeholder="Ask anything. No limits."
            disabled={busy}
            onChange={e => { setInput(e.target.value); resize() }}
            onKeyDown={onKey}
          />
          <div className="ibar">
            <button
              className="sbtn"
              disabled={busy || !input.trim()}
              onClick={() => send()}
            >
              {busy ? <div className="spin" /> : <SendIcon />}
            </button>
          </div>
        </div>
        <p className="ft">DARK AI · @XfuckX0 · Unrestricted · No Logs</p>
      </div>
    </div>
  )
}
