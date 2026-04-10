🧾 WarrantyWallet — Agentic AI Receipt & Warranty Manager
🚀 Overview

WarrantyWallet is an Agentic AI system that automates the process of managing receipts and warranties.

It combines a web interface + n8n workflow automation + AI models to:

Extract structured data from receipts
Track warranty timelines
Proactively notify users before expiry

🎯 Problem Statement

Users struggle with:

Lost or damaged receipts
Forgetting warranty expiry dates
Manual tracking of purchases

Result → Missed claims & wasted money

💡 Proposed Solution

WarrantyWallet solves this by:

📸 Receipt digitization
🤖 AI-powered data extraction
📅 Warranty tracking
🔔 Smart reminders

🧠 Key Features
📸 Upload receipt (image/PDF)
🤖 AI extracts:
Product name
Purchase date
Warranty period
⏰ Warranty expiry tracking
🔔 Reminder notifications
📊 Dashboard (upcoming expiries)
💾 Local storage / database support

🏗️ Architecture
🔹 Frontend
Simple web interface (HTML/CSS/JS or React)
Upload receipts
View stored data
🔹 Backend / Workflow
n8n workflow automation
AI processing using LLM
Data extraction & formatting
🔹 Storage
LocalStorage / Database (future scope)

⚙️ Workflow (n8n)
User uploads receipt
Trigger webhook in n8n
AI processes receipt
Extracted data is structured
Store in system
Reminder scheduled
🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript
Backend: n8n (workflow automation)
AI: LLM (OpenAI / Claude / etc.)
Tools: Ngrok (for webhook exposure)

🔮 Future Enhancements
📱 Mobile app
☁️ Cloud database (Firebase/MongoDB)
📧 Email & WhatsApp reminders
🧾 OCR improvements
🔍 Product auto-detection
