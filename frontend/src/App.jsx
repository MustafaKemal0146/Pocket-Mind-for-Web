import React, { useCallback, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { DemoOne } from '@/components/ui/demo'
import { TypewriterTitle } from '@/components/ui/typewriter-demo'
import { motion } from 'framer-motion'
import { PromptBox } from '@/components/ui/chatgpt-prompt-input'

const BACKEND_BASE_URL = 'http://localhost:4646'

export default function App() {
  const [serverIp, setServerIp] = useState('127.0.0.1')
  const [serverPort, setServerPort] = useState('11434')
  const [model, setModel] = useState('')
  const [availableModels, setAvailableModels] = useState([])

  const [prompt, setPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const endRef = useRef(null)
  const connectingTimeoutRef = useRef(null)

  const triggerConnecting = useCallback(() => {
    setIsConnecting(true)
    if (connectingTimeoutRef.current) clearTimeout(connectingTimeoutRef.current)
    connectingTimeoutRef.current = setTimeout(() => setIsConnecting(false), 900)
  }, [])

  const canSend = useMemo(() => {
    return Boolean(serverIp && serverPort && (model || availableModels.length > 0) && prompt.trim() && !isLoading)
  }, [serverIp, serverPort, model, availableModels, prompt, isLoading])

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' })

  const handleFetchModels = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await axios.post(`${BACKEND_BASE_URL}/api/tags`, {
        ip: serverIp,
        port: serverPort,
      })
      const names = res?.data?.models || []
      setAvailableModels(names)
      if (!model && names.length > 0) setModel(names[0])
    } catch (error) {
      alert(`Modeller alınamadı: ${error?.response?.data?.error || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [serverIp, serverPort, model])

  const handleSend = useCallback(async () => {
    if (!canSend) return
    const activeModel = model || availableModels[0] || ''
    const userMessage = { role: 'user', content: prompt }
    setChatHistory((prev) => [...prev, userMessage])
    setPrompt('')
    setIsLoading(true)

    try {
      const res = await axios.post(`${BACKEND_BASE_URL}/api/chat`, {
        ip: serverIp,
        port: serverPort,
        model: activeModel,
        prompt: userMessage.content,
      })
      const assistantText = res?.data?.response || ''
      setChatHistory((prev) => [...prev, { role: 'assistant', content: assistantText }])
      setTimeout(scrollToBottom, 50)
    } catch (error) {
      const err = error?.response?.data?.error || error.message
      setChatHistory((prev) => [...prev, { role: 'assistant', content: `Hata: ${err}` }])
      setTimeout(scrollToBottom, 50)
    } finally {
      setIsLoading(false)
    }
  }, [serverIp, serverPort, model, availableModels, prompt, canSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend()
    }
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center">
      {/* Siyah tema arka plan animasyon */}
      <div className="absolute inset-0 -z-10">
        <DemoOne />
      </div>
      <motion.div
        className="window w-full max-w-5xl mx-auto bg-black/40 backdrop-blur border-neutral-700 text-neutral-200"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="window-titlebar flex items-center justify-between bg-black/60 text-neutral-100 border-neutral-800">
          <span><TypewriterTitle /></span>
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span>Backend: http://localhost:4646</span>
            {(isLoading || isConnecting) && (
              <span className="inline-flex items-center justify-center">
                <span className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </span>
            )}
          </div>
        </div>
        <div className="window-body grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sol: Ayarlar */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Sunucu IP</label>
              <input className="input w-full bg-black/30 border-neutral-700 text-neutral-100 placeholder-neutral-500" value={serverIp} onChange={(e) => { setServerIp(e.target.value); triggerConnecting(); }} placeholder="127.0.0.1" />
            </div>
            <div>
              <label className="block text-xs mb-1">Port</label>
              <input className="input w-full bg-black/30 border-neutral-700 text-neutral-100 placeholder-neutral-500" value={serverPort} onChange={(e) => { setServerPort(e.target.value); triggerConnecting(); }} placeholder="11434" />
            </div>

            {availableModels.length > 0 ? (
              <div>
                <label className="block text-xs mb-1">Model</label>
                <select className="input w-full bg-black/30 border-neutral-700 text-neutral-100" value={model} onChange={(e) => { setModel(e.target.value); }}>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs mb-1">Model</label>
                <input className="input w-full bg-black/30 border-neutral-700 text-neutral-100 placeholder-neutral-500" value={model} onChange={(e) => { setModel(e.target.value); }} placeholder="ör: mistral:latest" />
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn border-neutral-700 text-neutral-100 bg-black/40 hover:bg-black/60" onClick={handleFetchModels} disabled={isLoading}>Modelleri Getir</button>
              <button className="btn border-neutral-700 text-neutral-100 bg-black/40 hover:bg-black/60" onClick={() => setAvailableModels([])} disabled={isLoading}>Listeyi Temizle</button>
            </div>
          </div>

          {/* Sağ: Sohbet */}
          <div className="lg:col-span-2 flex flex-col h-[70vh]">
            <div className="flex-1 overflow-auto space-y-3 p-2 border border-neutral-700 rounded-md bg-black/30">
              {chatHistory.length === 0 && (
                <div className="text-sm text-neutral-400">Sohbeti başlatmak için bir mesaj yazın.</div>
              )}
              {chatHistory.map((m, idx) => (
                <div key={idx} className={m.role === 'user' ? 'self-end bg-white/10 text-white rounded-2xl px-4 py-2 max-w-[80%]' : 'self-start bg-white/5 text-neutral-100 rounded-2xl px-4 py-2 max-w-[80%]'}>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="self-start bg-white/5 text-neutral-100 rounded-2xl px-4 py-2 max-w-[80%] inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Yazıyor...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="mt-3">
              <PromptBox onSubmitMessage={(text) => {
                setPrompt(text)
                handleSend()
              }} />
            </div>

            <div className="mt-2 text-xs text-neutral-400">Sohbet geçmişi yalnızca bu oturumda tutulur.</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}


