'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const DEFAULT_PORT = 4646;
const PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PocketMind backend http://localhost:${PORT} üzerinde çalışıyor`);
});


