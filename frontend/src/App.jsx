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
  const [showAnimation, setShowAnimation] = useState(true)
  
  // Tartışma Modu State'leri
  const [isDebateMode, setIsDebateMode] = useState(false)
  const [ai1Model, setAi1Model] = useState('')
  const [ai2Model, setAi2Model] = useState('')
  const [debateHistory, setDebateHistory] = useState([])
  const [isDebateRunning, setIsDebateRunning] = useState(false)
  const [debateRounds, setDebateRounds] = useState(0)
  const [maxDebateRounds, setMaxDebateRounds] = useState(10)
  const [isInfiniteMode, setIsInfiniteMode] = useState(false)
  const [debateTimeoutId, setDebateTimeoutId] = useState(null)
  const [currentDebateId, setCurrentDebateId] = useState(null)
  
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

  // Yeni Backend API ile Tartışma Fonksiyonları
  const continueDebate = useCallback(async (debateId) => {
    console.log('💬 continueDebate çağrıldı, debateId:', debateId);
    
    if (!debateId) {
      console.log('❌ debateId yok!');
      return;
    }
    
    try {
      console.log('📡 Backend\'e next isteği gönderiliyor...');
      const res = await axios.post(`${BACKEND_BASE_URL}/api/debate/next`, {
        debateId: debateId
      })
      
      console.log('✅ Backend yanıtı:', res.data);
      
      if (res.data.finished || res.data.isFinished) {
        setIsDebateRunning(false)
        setDebateTimeoutId(null)
        setCurrentDebateId(null)
        return
      }
      
      const newMessage = res.data.message
      setDebateHistory(prev => [...prev, newMessage])
      setDebateRounds(res.data.currentRound)
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100)
      
      // Devam et
      console.log('⏰ Sonraki mesaj için timeout başlatılıyor...');
      const timeoutId = setTimeout(() => {
        continueDebate(debateId)
      }, 3000) // 3 saniye bekle
      setDebateTimeoutId(timeoutId)
      
    } catch (error) {
      console.error('❌ Tartışma hatası:', error)
      setIsDebateRunning(false)
      setDebateTimeoutId(null)
      setCurrentDebateId(null)
    }
  }, [scrollToBottom])

  // stopDebate fonksiyonunu önce tanımla
  const stopDebate = useCallback(async () => {
    setIsDebateRunning(false)
    if (debateTimeoutId) {
      clearTimeout(debateTimeoutId)
      setDebateTimeoutId(null)
    }
    
    if (currentDebateId) {
      try {
        await axios.post(`${BACKEND_BASE_URL}/api/debate/stop`, {
          debateId: currentDebateId
        })
      } catch (error) {
        console.error('Tartışma durdurma hatası:', error)
      }
      setCurrentDebateId(null)
    }
  }, [debateTimeoutId, currentDebateId])

  const startDebate = useCallback(async (initialTopic) => {
    console.log('🚀 Tartışma başlatılıyor...', { ai1Model, ai2Model, serverIp, serverPort });
    
    if (!ai1Model || !ai2Model) {
      alert('Lütfen her iki AI için de model seçin!')
      return
    }
    
    // Önceki tartışmayı durdur
    if (currentDebateId) {
      await stopDebate()
    }
    
    try {
      setIsDebateRunning(true)
      setDebateRounds(0)
      setDebateHistory([])
      
      const topic = initialTopic || "Yapay zekanın geleceği hakkında tartışalım"
      console.log('📋 Konu:', topic);
      
      // Backend'de tartışma başlat
      const res = await axios.post(`${BACKEND_BASE_URL}/api/debate/start`, {
        ip: serverIp,
        port: serverPort,
        ai1Model,
        ai2Model,
        topic,
        maxRounds: maxDebateRounds,
        isInfinite: isInfiniteMode
      })
      
      console.log('✅ Backend yanıtı:', res.data);
      const debateId = res.data.debateId
      setCurrentDebateId(debateId)
      
      // İlk sistem mesajını ekle
      const initialMessage = { 
        role: 'system', 
        content: `Tartışma Konusu: ${topic}`,
        speaker: 'system'
      }
      setDebateHistory([initialMessage])
      
      // İlk mesajı başlat
      console.log('⏰ İlk mesaj için timeout başlatılıyor...');
      const timeoutId = setTimeout(() => {
        console.log('🎯 İlk mesaj gönderiliyor...');
        continueDebate(debateId)
      }, 1000)
      setDebateTimeoutId(timeoutId)
      
    } catch (error) {
      console.error('❌ Tartışma başlatma hatası:', error)
      setIsDebateRunning(false)
      alert(`Tartışma başlatılamadı: ${error.response?.data?.error || error.message}`)
    }
  }, [ai1Model, ai2Model, serverIp, serverPort, maxDebateRounds, isInfiniteMode, currentDebateId, stopDebate, continueDebate])



  // Rastgele konular
  const randomTopics = [
    "Yapay zekanın geleceği hakkında",
    "İklim değişikliği ve çözümleri",
    "Uzay keşiflerinin önemi",
    "Eğitim sisteminin geleceği",
    "Teknolojinin insan ilişkilerine etkisi",
    "Sanal gerçeklik vs gerçek dünya",
    "Kripto paraların geleceği",
    "Robotların iş hayatındaki yeri",
    "Sosyal medyanın topluma etkisi",
    "Genetik mühendisliğinin etik boyutu",
    "Otonom araçların güvenliği",
    "Dijital para vs fiziksel para",
    "Metaverse'ün potansiyeli",
    "Yapay zeka sanatının değeri",
    "Kuantum bilgisayarların etkisi",
    "Biyoteknolojinin sınırları",
    "Nesnelerin interneti ve mahremiyet",
    "Blockchain teknolojisinin kullanım alanları",
    "Yapay zeka ve yaratıcılık",
    "Gelecekteki enerji kaynakları",
    "Dijital detoks'un gerekliliği",
    "Yapay zeka ve etik karar verme",
    "Sanal asistanların gelişimi",
    "3D yazıcıların geleceği",
    "Yapay zeka ve tıp alanındaki uygulamaları",
    "Drone teknolojisinin kullanım alanları",
    "Yapay zeka ve eğitim",
    "Siber güvenliğin önemi",
    "Yapay zeka ve hukuk sistemi",
    "Gelecekteki ulaşım sistemleri",
    "Yapay zeka ve müzik üretimi",
    "Dijital kimlik ve güvenlik",
    "Yapay zeka ve spor analizi",
    "Hologram teknolojisinin geleceği",
    "Yapay zeka ve çevre koruma",
    "Beyin-bilgisayar arayüzleri",
    "Yapay zeka ve finans sektörü",
    "Gelecekteki iletişim teknolojileri",
    "Yapay zeka ve tarım",
    "Dijital ölümsüzlük kavramı",
    "Yapay zeka ve oyun geliştirme",
    "Nano teknolojinin potansiyeli",
    "Yapay zeka ve psikoloji",
    "Gelecekteki şehir planlaması",
    "Yapay zeka ve gazetecilik",
    "Biyometrik güvenlik sistemleri",
    "Yapay zeka ve turizm sektörü",
    "Gelecekteki çalışma modelleri",
    "Yapay zeka ve sanat eleştirisi",
    "Dijital minimalizm felsefesi"
  ]

  const getRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * randomTopics.length)
    return randomTopics[randomIndex]
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center" style={{ backgroundColor: showAnimation ? 'transparent' : '#000000' }}>
      {/* Siyah tema arka plan animasyon */}
      {showAnimation && (
        <div className="absolute inset-0 -z-10">
          <DemoOne />
        </div>
      )}
      <motion.div
        className="window mx-auto bg-black/40 backdrop-blur border-neutral-700 text-neutral-200"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          maxWidth: isDebateMode ? '1280px' : '1024px',
          width: '100%'
        }}
        transition={{ 
          duration: 0.8, 
          ease: [0.25, 0.46, 0.45, 0.94],
          maxWidth: { duration: 0.6, ease: 'easeInOut' }
        }}
      >
        <div className="window-titlebar flex items-center justify-between bg-black/60 text-neutral-100 border-neutral-800">
          <span><TypewriterTitle /></span>
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span>Backend: http://localhost:4646</span>
            <button 
              onClick={() => setShowAnimation(!showAnimation)}
              className="px-2 py-1 text-xs bg-black/40 hover:bg-black/60 border border-neutral-700 rounded transition-colors"
              title={showAnimation ? 'Animasyonu Kapat' : 'Animasyonu Aç'}
            >
              {showAnimation ? '🎭 Anim Kapat' : '🎭 Anim Aç'}
            </button>
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

            <div className="border-t border-neutral-700 pt-3">
              <motion.button 
                className={`btn w-full ${isDebateMode ? 'bg-red-600/40 border-red-500 hover:bg-red-600/60' : 'bg-purple-600/40 border-purple-500 hover:bg-purple-600/60'} text-white`}
                onClick={() => setIsDebateMode(!isDebateMode)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {isDebateMode ? '🔙 Normal Mod' : '⚔️ Tartışma Modu'}
              </motion.button>
            </div>

            {isDebateMode && (
              <motion.div 
                className="space-y-3 border-t border-neutral-700 pt-3"
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  height: { duration: 0.4 },
                  opacity: { duration: 0.3, delay: 0.1 }
                }}
              >
                <div>
                  <label className="block text-xs mb-1">AI-1 Model</label>
                  {availableModels.length > 0 ? (
                    <select className="input w-full bg-black/30 border-neutral-700 text-neutral-100" value={ai1Model} onChange={(e) => setAi1Model(e.target.value)}>
                      <option value="">Model seçin...</option>
                      {availableModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input w-full bg-black/30 border-neutral-700 text-neutral-100 placeholder-neutral-500" value={ai1Model} onChange={(e) => setAi1Model(e.target.value)} placeholder="ör: mistral:latest" />
                  )}
                </div>
                
                <div>
                  <label className="block text-xs mb-1">AI-2 Model</label>
                  {availableModels.length > 0 ? (
                    <select className="input w-full bg-black/30 border-neutral-700 text-neutral-100" value={ai2Model} onChange={(e) => setAi2Model(e.target.value)}>
                      <option value="">Model seçin...</option>
                      {availableModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input w-full bg-black/30 border-neutral-700 text-neutral-100 placeholder-neutral-500" value={ai2Model} onChange={(e) => setAi2Model(e.target.value)} placeholder="ör: llama2:latest" />
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs mb-1">Maksimum Tur</label>
                    <input 
                      type="number" 
                      className={`input w-full bg-black/30 border-neutral-700 text-neutral-100 ${isInfiniteMode ? 'opacity-50' : ''}`}
                      value={maxDebateRounds} 
                      onChange={(e) => setMaxDebateRounds(parseInt(e.target.value) || 10)}
                      min="1"
                      max="50"
                      disabled={isInfiniteMode}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isInfiniteMode}
                        onChange={(e) => setIsInfiniteMode(e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-black/30 border-neutral-700 rounded focus:ring-purple-500"
                      />
                      ♾️ Sonsuz
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <button 
                    className="btn flex-1 bg-green-600/40 border-green-500 hover:bg-green-600/60 text-white"
                    onClick={() => startDebate()}
                    disabled={isDebateRunning || !ai1Model || !ai2Model}
                  >
                    🚀 Tartışmayı Başlat
                  </button>
                  <button 
                    className="btn bg-red-600/40 border-red-500 hover:bg-red-600/60 text-white"
                    onClick={stopDebate}
                    disabled={!isDebateRunning}
                  >
                    ⏹️ Force Stop
                  </button>
                </div>

                <div className="flex gap-2">
                  <button 
                    className="btn flex-1 bg-yellow-600/40 border-yellow-500 hover:bg-yellow-600/60 text-white"
                    onClick={() => {
                      const randomTopic = getRandomTopic()
                      const input = document.querySelector('input[placeholder*="Tartışma konusu"]')
                      if (input) input.value = randomTopic
                    }}
                    disabled={isDebateRunning}
                  >
                    🎲 Rastgele Konu
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sağ: Sohbet / Tartışma */}
          <div className="lg:col-span-2 flex flex-col h-[70vh]">
            {isDebateMode ? (
              // Tartışma Modu Arayüzü
              <motion.div 
                className="flex-1 overflow-auto space-y-3 p-2 border border-neutral-700 rounded-md bg-black/30"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {debateHistory.length === 0 && (
                  <div className="text-sm text-neutral-400 text-center">
                    <div className="mb-2">⚔️ Tartışma Modu Aktif</div>
                    <div>AI modelleri seçip tartışmayı başlatın</div>
                  </div>
                )}
                
                {debateHistory.map((m, idx) => (
                  <div key={idx} className="space-y-2">
                    {m.speaker === 'system' ? (
                      <div className="text-center">
                        <div className="inline-block bg-purple-600/20 border border-purple-500/30 rounded-lg px-4 py-2">
                          <div className="text-purple-300 text-sm font-semibold">📋 {m.content}</div>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex ${m.speaker === 'ai1' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          m.speaker === 'ai1' 
                            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' 
                            : 'bg-red-600/20 border border-red-500/30 text-red-100'
                        }`}>
                          <div className="text-xs font-semibold mb-1 opacity-70">
                            {m.speakerName} ({m.speaker === 'ai1' ? ai1Model : ai2Model})
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isDebateRunning && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg px-4 py-2">
                      <span className="h-4 w-4 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin"></span>
                      <span className="text-yellow-300 text-sm">
                        Tartışma devam ediyor... ({debateRounds}{isInfiniteMode ? ' - Sonsuz mod' : `/${maxDebateRounds}`})
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={endRef} />
              </motion.div>
            ) : (
              // Normal Sohbet Modu
              <motion.div 
                className="flex-1 overflow-auto space-y-3 p-2 border border-neutral-700 rounded-md bg-black/30"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
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
              </motion.div>
            )}

            {!isDebateMode && (
              <>
                <div className="mt-3">
                  <PromptBox onSubmitMessage={(text) => {
                    if (text && text.trim()) {
                      const userMessage = { role: 'user', content: text.trim() }
                      setChatHistory((prev) => [...prev, userMessage])
                      setIsLoading(true)

                      // Direkt mesajı gönder
                      const activeModel = model || availableModels[0] || ''
                      axios.post(`${BACKEND_BASE_URL}/api/chat`, {
                        ip: serverIp,
                        port: serverPort,
                        model: activeModel,
                        prompt: text.trim(),
                      }).then(res => {
                        const assistantText = res?.data?.response || ''
                        setChatHistory((prev) => [...prev, { role: 'assistant', content: assistantText }])
                        setTimeout(scrollToBottom, 50)
                      }).catch(error => {
                        const err = error?.response?.data?.error || error.message
                        setChatHistory((prev) => [...prev, { role: 'assistant', content: `Hata: ${err}` }])
                        setTimeout(scrollToBottom, 50)
                      }).finally(() => {
                        setIsLoading(false)
                      })
                    }
                  }} />
                </div>
                <div className="mt-2 text-xs text-neutral-400">Sohbet geçmişi yalnızca bu oturumda tutulur.</div>
              </>
            )}

            {isDebateMode && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <input 
                    className="input flex-1 bg-black/30 border-neutral-700 text-neutral-100 placeholder-neutral-500"
                    placeholder="Tartışma konusu girin (opsiyonel)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        startDebate(e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                  <button 
                    className="btn bg-green-600/40 border-green-500 hover:bg-green-600/60 text-white"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="Tartışma konusu"]')
                      const topic = input?.value?.trim()
                      startDebate(topic)
                      if (input) input.value = ''
                    }}
                    disabled={isDebateRunning || !ai1Model || !ai2Model}
                  >
                    Başlat
                  </button>
                </div>
                <div className="mt-2 text-xs text-neutral-400">
                  {isDebateRunning ? 
                    `Tartışma aktif: ${debateRounds}${isInfiniteMode ? ' (Sonsuz mod)' : `/${maxDebateRounds}`} tur` : 
                    'Konu girmezseniz varsayılan konu kullanılır'
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}


