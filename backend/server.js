'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const DEFAULT_PORT = 4646;
const PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Tartışma yönetimi için global state
const activeDebates = new Map();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'PocketMind Backend', port: PORT });
});

// POST /api/chat
// Body: { ip, port, model, prompt }
app.post('/api/chat', async (req, res) => {
  try {
    const { ip, port, model, prompt } = req.body || {};
    if (!ip || !port || !model || !prompt) {
      return res.status(400).json({ error: 'Eksik alan: ip, port, model ve prompt gereklidir.' });
    }

    const url = `http://${ip}:${port}/api/generate`;
    const payload = { model, prompt, stream: false };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
    });

    const assistantText = response?.data?.response ?? '';
    return res.json({ response: assistantText });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message = error?.response?.data?.error || error.message || 'Bilinmeyen hata';
    return res.status(status).json({ error: `Ollama isteği başarısız: ${message}` });
  }
});

// POST /api/tags (opsiyonel)
// Body: { ip, port }
app.post('/api/tags', async (req, res) => {
  try {
    const { ip, port } = req.body || {};
    if (!ip || !port) {
      return res.status(400).json({ error: 'Eksik alan: ip ve port gereklidir.' });
    }

    const url = `http://${ip}:${port}/api/tags`;
    const response = await axios.get(url, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const models = response?.data?.models || [];
    const names = Array.isArray(models) ? models.map((m) => m?.name).filter(Boolean) : [];
    return res.json({ models: names, raw: response.data });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message = error?.response?.data?.error || error.message || 'Bilinmeyen hata';
    return res.status(status).json({ error: `Tag listesi alınamadı: ${message}` });
  }
});

// POST /api/speech
// Body: { audioBase64, mimeType, languageCode? }
// Not: Güvenlik için API anahtarını kod içinde veya .env ile tutabilirsiniz.
app.post('/api/speech', async (req, res) => {
  try {
    const { audioBase64, mimeType, languageCode } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'Eksik alan: audioBase64 gereklidir.' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'API-ANAHTARI-GİRİN';
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'API-ANAHTARI-GİRİN') {
      return res.status(500).json({ error: 'Google API anahtarı yapılandırılmamış. server.js içinde GOOGLE_API_KEY ayarlayın.' });
    }

    const encodingGuess = (() => {
      if (mimeType && mimeType.includes('webm')) return 'WEBM_OPUS';
      if (mimeType && mimeType.includes('ogg')) return 'OGG_OPUS';
      if (mimeType && mimeType.includes('wav')) return 'LINEAR16';
      return 'WEBM_OPUS';
    })();

    const requestBody = {
      config: {
        encoding: encodingGuess,
        languageCode: languageCode || 'tr-TR',
        enableAutomaticPunctuation: true,
        model: 'default',
      },
      audio: {
        content: audioBase64,
      },
    };

    const url = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`;
    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
    });

    const results = response?.data?.results || [];
    const transcript = results.map(r => r.alternatives?.[0]?.transcript || '').filter(Boolean).join(' ').trim();
    return res.json({ transcript, raw: response.data });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message = error?.response?.data?.error?.message || error.message || 'Bilinmeyen hata';
    return res.status(status).json({ error: `Konuşma tanıma başarısız: ${message}` });
  }
});

// POST /api/debate/start
// Body: { ip, port, ai1Model, ai2Model, topic, maxRounds, isInfinite }
app.post('/api/debate/start', async (req, res) => {
  try {
    console.log('🚀 Tartışma başlatma isteği:', req.body);
    const { ip, port, ai1Model, ai2Model, topic, maxRounds, isInfinite } = req.body || {};
    if (!ip || !port || !ai1Model || !ai2Model) {
      return res.status(400).json({ error: 'Eksik alan: ip, port, ai1Model ve ai2Model gereklidir.' });
    }

    const debateId = Date.now().toString();
    const debate = {
      id: debateId,
      ip,
      port,
      ai1Model,
      ai2Model,
      topic: topic || "Yapay zekanın geleceği hakkında tartışalım",
      maxRounds: isInfinite ? Infinity : (maxRounds || 10),
      isInfinite,
      currentRound: 0,
      nextSpeaker: 'ai1',
      history: [],
      isActive: true,
      lastMessage: topic || "Yapay zekanın geleceği hakkında tartışalım"
    };

    activeDebates.set(debateId, debate);
    console.log('✅ Tartışma oluşturuldu:', debateId);
    
    // İlk sistem mesajını ekle
    debate.history.push({
      role: 'system',
      content: `Tartışma Konusu: ${debate.topic}`,
      speaker: 'system',
      timestamp: new Date().toISOString()
    });

    return res.json({ 
      debateId, 
      message: 'Tartışma başlatıldı',
      topic: debate.topic
    });
  } catch (error) {
    console.error('❌ Tartışma başlatma hatası:', error);
    return res.status(500).json({ error: `Tartışma başlatılamadı: ${error.message}` });
  }
});

// POST /api/debate/next
// Body: { debateId }
app.post('/api/debate/next', async (req, res) => {
  try {
    console.log('💬 Sonraki mesaj isteği:', req.body);
    const { debateId } = req.body || {};
    if (!debateId) {
      return res.status(400).json({ error: 'debateId gereklidir.' });
    }

    const debate = activeDebates.get(debateId);
    if (!debate) {
      console.log('❌ Tartışma bulunamadı:', debateId);
      return res.status(404).json({ error: 'Tartışma bulunamadı.' });
    }

    if (!debate.isActive) {
      console.log('❌ Tartışma aktif değil:', debateId);
      return res.status(400).json({ error: 'Tartışma aktif değil.' });
    }

    // Round kontrolü
    if (debate.currentRound >= debate.maxRounds) {
      debate.isActive = false;
      console.log('✅ Tartışma tamamlandı:', debateId);
      return res.json({ 
        finished: true, 
        message: 'Tartışma tamamlandı',
        totalRounds: debate.currentRound
      });
    }

    const currentModel = debate.nextSpeaker === 'ai1' ? debate.ai1Model : debate.ai2Model;
    const speakerName = debate.nextSpeaker === 'ai1' ? 'AI-1' : 'AI-2';
    
    console.log(`🤖 ${speakerName} (${currentModel}) konuşacak...`);
    
    // Son 6 mesajı al (kontext için)
    const recentHistory = debate.history.slice(-6).map(msg => {
      if (msg.speaker === 'system') return `Konu: ${msg.content}`;
      return `${msg.speakerName || msg.speaker}: ${msg.content}`;
    }).join('\n');

    const contextPrompt = debate.nextSpeaker === 'ai1' 
      ? `Sen AI-1'sin. Karşındaki AI-2 ile tartışıyorsun. İşte şimdiye kadarki konuşma:

${recentHistory}

Son mesaj: ${debate.lastMessage}

Şimdi sen cevap ver. Karşındakinin dediğini dikkate alarak kısa ve net bir argüman sun (maksimum 2-3 cümle). Sadece kendi görüşünü belirt, başka açıklama yapma.`
      : `Sen AI-2'sin. Karşındaki AI-1 ile tartışıyorsun. İşte şimdiye kadarki konuşma:

${recentHistory}

Son mesaj: ${debate.lastMessage}

Şimdi sen cevap ver. Karşındakinin dediğini dikkate alarak görüşünü belirt (maksimum 2-3 cümle). Sadece kendi görüşünü belirt, başka açıklama yapma.`;

    console.log('📝 Prompt hazırlandı, Ollama\'ya gönderiliyor...');

    // Ollama'ya istek gönder
    const url = `http://${debate.ip}:${debate.port}/api/generate`;
    const payload = { model: currentModel, prompt: contextPrompt, stream: false };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
    });

    const assistantText = response?.data?.response ?? '';
    console.log(`✅ ${speakerName} cevap verdi:`, assistantText.substring(0, 100) + '...');
    
    // Mesajı kaydet
    const newMessage = {
      role: 'assistant',
      content: assistantText,
      speaker: debate.nextSpeaker,
      speakerName: speakerName,
      timestamp: new Date().toISOString()
    };
    
    debate.history.push(newMessage);
    debate.currentRound++;
    debate.lastMessage = assistantText;
    
    // Sıradaki konuşmacıyı değiştir
    debate.nextSpeaker = debate.nextSpeaker === 'ai1' ? 'ai2' : 'ai1';

    return res.json({
      message: newMessage,
      currentRound: debate.currentRound,
      maxRounds: debate.maxRounds,
      nextSpeaker: debate.nextSpeaker,
      isFinished: debate.currentRound >= debate.maxRounds && !debate.isInfinite
    });

  } catch (error) {
    console.error('❌ Tartışma hatası:', error);
    const status = error?.response?.status || 500;
    const message = error?.response?.data?.error || error.message || 'Bilinmeyen hata';
    return res.status(status).json({ error: `Tartışma hatası: ${message}` });
  }
});

// POST /api/debate/stop
// Body: { debateId }
app.post('/api/debate/stop', async (req, res) => {
  try {
    const { debateId } = req.body || {};
    if (!debateId) {
      return res.status(400).json({ error: 'debateId gereklidir.' });
    }

    const debate = activeDebates.get(debateId);
    if (!debate) {
      return res.status(404).json({ error: 'Tartışma bulunamadı.' });
    }

    debate.isActive = false;
    return res.json({ 
      message: 'Tartışma durduruldu',
      totalRounds: debate.currentRound
    });
  } catch (error) {
    return res.status(500).json({ error: `Tartışma durdurulamadı: ${error.message}` });
  }
});

// GET /api/debate/history/:debateId
app.get('/api/debate/history/:debateId', (req, res) => {
  try {
    const { debateId } = req.params;
    const debate = activeDebates.get(debateId);
    
    if (!debate) {
      return res.status(404).json({ error: 'Tartışma bulunamadı.' });
    }

    return res.json({
      history: debate.history,
      currentRound: debate.currentRound,
      maxRounds: debate.maxRounds,
      isActive: debate.isActive,
      nextSpeaker: debate.nextSpeaker
    });
  } catch (error) {
    return res.status(500).json({ error: `Geçmiş alınamadı: ${error.message}` });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PocketMind backend http://localhost:${PORT} üzerinde çalışıyor`);
});


