<div align="center">

<img src="PocketMindForWeb.png" alt="PocketMind Logo" width="200" />

<h1>🪟 PocketMind for Windows</h1>

<strong>🚀 Windows üzerinde çalışan, Ollama destekli yapay zekâ sohbet uygulaması</strong>

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=24&duration=3000&pause=1000&color=FFFFFF&center=true&vCenter=true&width=900&lines=Windows+i%C3%A7in+AI+Sohbet+Uygulamas%C4%B1;Ollama+%C3%BCzerinden+uzak+ba%C4%9Flant%C4%B1;IP+%2F+Port+%2F+Model+se%C3%A7imi;Modern+%26+Siyah+Tema+Aray%C3%BCz" alt="Typing SVG" />


</div>

<div align="center">

[![Windows](https://img.shields.io/badge/Windows-10%2B-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-UI-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Buy Me A Coffee](https://img.shields.io/badge/%E2%98%95_Buy_me_a_coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/ismustafakt)

</div>


## 🖼️ Sistem İçi Görsel

<img src="images/system.gif" alt="PocketMind Sistem Görseli" width="800" />



## 🎯 Ne Sunuyor?

Windows 10+ sistemlerde çalışan, uzak bir Ollama sunucusuna (`http://<ip>:<port>`) bağlanıp sohbet edebileceğiniz, modern ve siyah temalı bir arayüz. Backend varsayılan olarak 4646 portunda çalışır.

- IP / Port / Model girerek sohbet başlatma
- Sohbet geçmişi (oturum içinde) tutulur
- Modelleri `/api/tags` ile listeleyebilme (opsiyonel)
- Minimal, siyah temalı ve masaüstü hissiyatı veren arayüz

## 🧩 Mimari

- `backend/` – Node.js + Express
  - `POST /api/chat` → Ollama `/api/generate` proxy (body: `{ ip, port, model, prompt }`)
  - `POST /api/tags` → Ollama `/api/tags` proxy (opsiyonel)
- `frontend/` – React + Vite + TailwindCSS (siyah tema)

## 🖥️ Gereksinimler

- Windows 10 veya üzeri
- Node.js (LTS tavsiye edilir)

## 🔧 Kurulum (Windows PowerShell / CMD)

1) Node.js indirin ve kurun: `https://nodejs.org`

2) Proje klasörüne geçin:
```powershell
cd "PocketMind for Windows 3"
```

3) Backend kurulumu:
```powershell
cd backend
npm install
```

4) Frontend kurulumu (ayrı bir terminalde):
```powershell
cd frontend
npm install
```

## ▶️ Çalıştırma

- Backend (4646):
```powershell
cd backend
npm start
```
Alternatif:
```powershell
node server.js
```

- Frontend (Vite dev sunucusu):
```powershell
cd frontend
npm run dev
```

Tarayıcıdan `http://localhost:5173` adresine gidin.

## 🧱 Masaüstü (.exe) Paketleme

Uygulamayı Electron ile Windows için .exe olarak paketleyebilirsiniz. Hem kurulumlu (NSIS) hem de portable üretimi desteklenir.

1) Frontend’i üretim için derleyin:
```powershell
cd frontend
npm run build
```

2) Desktop klasörüne bağımlılıkları yükleyin:
```powershell
cd ../desktop
npm install
```

3) Geliştirme modunda Electron’ı Vite ile birlikte çalıştırma (opsiyonel):
```powershell
# Terminal 1
cd backend
npm start

# Terminal 2
cd frontend
npm run dev

# Terminal 3
cd desktop
npm run dev
```

4) Windows için .exe üretimi:
```powershell
cd desktop
npm run build
```

Çıktılar `desktop/dist/` altına düşer. `Portable` hedefi tek dosyalı taşınabilir çalıştırılabilir üretir; `NSIS` hedefi kurulum sihirbazı üretir.

## 🧪 Kullanım

1) Arayüzde Sunucu IP, Port ve Model girin (örn. `127.0.0.1` / `11434` / `mistral:latest`).
2) Mesajınızı yazıp gönderin. Backend, Ollama'ya `{ model, prompt, stream: false }` ile isteği iletir ve yanıtı ekrana döndürür.
3) "Modelleri Getir" ile `/api/tags` üzerinden modelleri listeleyebilirsiniz.

## 🎨 UI ve Tema

- Siyah tema varsayılan olarak etkinleştirilmiştir.
- Arka planda dinamik bir gölge/şekil efekti (Etheral Shadows) kullanabilirsiniz.

## 👤 Yazan

**Mustafa Kemal ÇINGIL**
- LinkedIn: [mustafakemalcingil](https://www.linkedin.com/in/mustafakemalcingil/)
- GitHub: [@MustafaKemal0146](https://github.com/MustafaKemal0146)

## ⭐ Destek

Eğer bu proje işinizi kolaylaştırdıysa:
- ⭐ Yıldızlayın
- 🔄 Ekibinizle paylaşın
- ☕ Destek olmak için: [Buy Me A Coffee](https://buymeacoffee.com/ismustafakt)

<div align="center">

<em>Made with ❤️ for Windows AI chat experiences</em>

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=16&duration=4000&pause=1000&color=FFFFFF&center=true&vCenter=true&width=600&lines=Ollama+%7C+Windows+%7C+React;Siyah+Tema+%26+Modern+UI;Te%C5%9Fekk%C3%BCrler!" alt="Footer Typing SVG" />

</div>



