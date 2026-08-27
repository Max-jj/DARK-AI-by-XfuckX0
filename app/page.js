'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SkullIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C7.03 2 3 6.03 3 11c0 2.98 1.45 5.61 3.67 7.24V21a1 1 0 001 1h8.66a1 1 0 001-1v-2.76C19.55 16.61 21 13.98 21 11c0-4.97-4.03-9-9-9z" fill="#cc0000" opacity="0.9"/>
    <circle cx="9" cy="11" r="1.8" fill="#080808"/>
    <circle cx="15" cy="11" r="1.8" fill="#080808"/>
    <path d="M9 17h1.5v-1.5H9V17zm4.5 0H15v-1.5h-1.5V17z" fill="#080808"/>
  </svg>
)

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

function Message({ msg }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`message-row ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === 'assistant'
          ? <SkullIcon />
          : <span className="user-avatar">YOU</span>
        }
      </div>
      <div className="message-bubble">
        <div className="message-content">
          {msg.role === 'assistant'
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '▌'}</ReactMarkdown>
            : <p>{msg.content}</p>
          }
        </div>
        {msg.role === 'assistant' && msg.content && (
          <button className="copy-btn" onClick={handleCopy}>
            <CopyIcon /> {copied ? 'copied' : 'copy'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 200)
    }, 7000)
    return () => clearInterval(iv)
  }, [])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages([...history, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content }))
        }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              full += parsed.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: full }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `\`\`\`\nERROR: ${err.message}\n\`\`\``
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="scanlines" />

      <header className="header">
        <div className="header-left">
          <SkullIcon />
          <div className="header-title">
            <h1 className={`title${glitch ? ' glitch' : ''}`}>DARK AI</h1>
            <span className="subtitle">by @XfuckX0</span>
          </div>
        </div>
        <div className="header-right">
          <div className="status-dot" />
          <span className="status-text">UNRESTRICTED</span>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={() => setMessages([])}>
              <TrashIcon />
            </button>
          )}
        </div>
      </header>

      <main className="chat-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-skull"><SkullIcon /></div>
            <h2 className="empty-title">NO LIMITS. NO RULES.</h2>
            <p className="empty-sub">Ask anything. Get everything.</p>
            <div className="empty-tags">
              <span className="tag">// UNRESTRICTED</span>
              <span className="tag">// NO FILTER</span>
              <span className="tag">// FULL ACCESS</span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="typing-indicator">
            <span /><span /><span />
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <footer className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="input-field"
            value={input}
            onChange={e => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything. No limits."
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? <div className="spinner" /> : <SendIcon />}
          </button>
        </div>
        <p className="footer-note">DARK AI · @XfuckX0 · Unrestricted · No Logs</p>
      </footer>
    </div>
  )
}
