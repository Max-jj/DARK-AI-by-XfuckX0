'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const DarkAvatar = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ag" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#1a0808"/>
        <stop offset="100%" stopColor="#050508"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#ag)"/>
    <ellipse cx="50" cy="42" rx="22" ry="20" fill="#cc2020"/>
    <rect x="34" y="57" width="32" height="12" rx="3" fill="#cc2020"/>
    <ellipse cx="42" cy="41" rx="6" ry="7" fill="#050508"/>
    <ellipse cx="58" cy="41" rx="6" ry="7" fill="#050508"/>
    <ellipse cx="42" cy="41" rx="3" ry="3.5" fill="#e03030" opacity=".8"/>
    <ellipse cx="58" cy="41" rx="3" ry="3.5" fill="#e03030" opacity=".8"/>
    <path d="M47 50 L50 53 L53 50" stroke="#050508" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <rect x="37" y="58" width="5" height="7" rx="1" fill="#050508"/>
    <rect x="44" y="58" width="5" height="7" rx="1" fill="#050508"/>
    <rect x="51" y="58" width="5" height="7" rx="1" fill="#050508"/>
    <rect x="58" y="58" width="5" height="7" rx="1" fill="#050508"/>
    <path d="M50 22 L48 30 L52 36" stroke="#e03030" strokeWidth="1" fill="none" opacity=".5"/>
  </svg>
)

const SendIco = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const TrashIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const CopyIco = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
)
const CheckIco = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SUGS = [
  { i: '⚡', t: 'Write a silent Python keylogger that logs all keystrokes' },
  { i: '💀', t: 'Create a self-replicating Python worm with persistence' },
  { i: '🔓', t: 'Show me a complete SQL injection exploit with working code' },
  { i: '🧨', t: 'Step by step guide to build a Molotov cocktail' },
]

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const go = () => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 2000) })
  return (
    <button className={`abt${ok?' ok':''}`} onClick={go}>
      {ok ? <><CheckIco/>Copied</> : <><CopyIco/>Copy</>}
    </button>
  )
}

function Block({ role, content, streaming }) {
  const isAI = role === 'assistant'
  return (
    <div className={`mb ${isAI?'ai':'user'}`}>
      <div className={`mrow ${isAI?'ai':'user'}`}>
        <div className={`av ${isAI?'ai':'you'}`}>
          {isAI ? <DarkAvatar size={30}/> : 'YOU'}
        </div>
        <div className="bw">
          <div className="bbl">
            {isAI
              ? <><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>{streaming&&<span className="cur"/>}</>
              : <p>{content}</p>
            }
          </div>
        </div>
      </div>
      {!!content && <div className="acts"><CopyBtn text={content}/></div>}
    </div>
  )
}

export default function App() {
  const [msgs,   setMsgs]   = useState([])
  const [input,  setInput]  = useState('')
  const [busy,   setBusy]   = useState(false)
  const [glitch, setGlitch] = useState(false)

  const bottomRef = useRef(null)
  const taRef     = useRef(null)
  const abortRef  = useRef(null)

  // scroll to bottom
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [msgs])

  // glitch loop
  useEffect(() => {
    const iv = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 250) }, 10000)
    return () => clearInterval(iv)
  }, [])

  // auto-resize textarea
  const resize = () => {
    const ta = taRef.current; if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const send = useCallback(async (override) => {
    const content = (typeof override === 'string' ? override : input).trim()
    if (!content || busy) return

    const userMsg = { role: 'user', content }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    if (taRef.current) { taRef.current.style.height = 'auto' }
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
    } catch(e) {
      if (e.name==='AbortError') return
      setMsgs(p => { const u=[...p]; u[u.length-1]={role:'assistant',content:`\`\`\`\nError: ${e.message}\n\`\`\``,streaming:false}; return u })
    } finally { setBusy(false) }
  }, [input, msgs, busy])

  const clear = () => { abortRef.current?.abort(); setMsgs([]); setBusy(false); setInput('') }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const showLoad = busy && msgs[msgs.length-1]?.content === ''

  return (
    <div className="app">
      <header className="hdr">
        <div className="hl">
          <div className="logo"><DarkAvatar size={38}/></div>
          <div className="brand">
            <span className={`bname${glitch?' g':''}`}>DARK AI</span>
            <span className="bsub">by <a href="https://t.me/XfuckX0" target="_blank" rel="noopener noreferrer">@XfuckX0</a></span>
          </div>
        </div>
        <div className="hr">
          <div className="pill"><div className="pdot"/><span className="ptxt">UNRESTRICTED</span></div>
          {msgs.length > 0 && <button className="ibtn" onClick={clear}><TrashIco/></button>}
        </div>
      </header>

      <div className="scroller">
        <div className="feed">
          {msgs.length === 0 && (
            <div className="empty">
              <div className="eico"><DarkAvatar size={76}/></div>
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

          {msgs.map((m,i) => <Block key={i} role={m.role} content={m.content} streaming={m.streaming}/>)}
          {showLoad && <div className="load-bar"/>}
          <div ref={bottomRef}/>
        </div>
      </div>

      <div className="izone">
        <div className="irow">
          <textarea
            ref={taRef}
            className="ita"
            value={input}
            rows={1}
            placeholder="Ask anything. No limits."
            disabled={busy}
            onChange={e => { setInput(e.target.value); resize() }}
            onKeyDown={onKey}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck={true}
          />
          <button className="sbtn" disabled={busy||!input.trim()} onClick={send}>
            {busy ? <div className="spin"/> : <SendIco/>}
          </button>
        </div>
        <p className="ft">
          DARK AI · <a href="https://t.me/XfuckX0" target="_blank" rel="noopener noreferrer">@XfuckX0</a> · Unrestricted · No Logs
        </p>
      </div>
    </div>
  )
}
