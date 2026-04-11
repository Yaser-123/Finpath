# BizCredit 🚀
### Smart Financial Opportunity Engine for Small Merchants

[![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Project-orange?style=for-the-badge)](https://github.com/Yaser-123/SMS-READER)

---

<p align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212239329-8488e02c-474c-42e1-95f2-9844c680cf89.gif" width="100%" alt="BizCredit Banner">
</p>

## 🚀 The Hook
**Empowering the backbone of India's economy.**  
BizCredit transforms raw transaction SMS into a powerful credit engine, helping millions of small merchants unlock loans and government schemes they never knew they were eligible for. We bridge the gap between daily UPI activity and formal financial support.

---

## 💡 Problem Statement
Small merchants (Chai-walas, Kirana stores, street vendors) handle hundreds of UPI transactions daily. However:
- **Invisible Data**: Traditional banks ignore this digital footprint because it’s not in a "formal" statement.
- **Credit Gap**: No formal records mean No Credit Score, which means **No Loans**.
- **Missed Opportunities**: Merchants are often eligible for government subsidies (MSME, Mudra) but have zero awareness of them.

---

## 🧠 Our Solution
BizCredit is a decentralized financial intelligence layer that lives on the merchant's phone:
1. **SMS Triage**: Automatically parses UPI transaction SMS to build a local financial profile.
2. **AI Credit Scoring**: Generates a behavioral "BizCredit Score" based on consistency, income, and cash flow.
3. **Discovery Engine**: Uses real-time web search (Serper) and AI (Gemini) to recommend specific loans and government schemes.
4. **Actionable Insights**: Provides nudges for MSME registration and repayment affordability checks.

---

## ✨ Features
- **📊 Real-time Credit Scoring**: A dynamic score updated with every transaction message.
- **💰 Smart Loan Marketplace**: Shows eligible loan products ranked by your score.
- **🏛 Gov-Scheme Discovery**: Personalized recommendations for MSME subsidies and Mudra loans.
- **📈 Analytics Dashboard**: Deep dive into cash inflow, outflow, and net stability.
- **📄 Shareable Income Statement**: Generate a professional financial summary to share with lenders in one tap.
- **🔔 Smart Notifications**: Real-time alerts for score changes and new eligibility peaks.

---

## 🖼 Demo Screenshots
*(Screenshots coming soon!)*

| Dashboard | Analytics |
|:---:|:---:|
| ![Dashboard Placeholder](./assets/dashboard.png) | ![Analytics Placeholder](./assets/analytics.png) |

| Loans | Schemes |
|:---:|:---:|
| ![Loans Placeholder](./assets/loans.png) | ![Schemes Placeholder](./assets/schemes.png) |

---

## ⚙️ Tech Stack
- **Frontend**: Android (Kotlin, Jetpack Compose, Material 3)
- **Backend**: Node.js, Express (REST API)
- **Database**: Supabase (Transaction history & User profiles)
- **Discovery**: Serper.dev API (Google Search integration)
- **Intelligence**: Gemini 2.5 Flash-Lite (Personalization & Data extraction)

---

## 🛠 How It Works
1. **Read**: The app securely reads incoming transaction SMS (filtered for bank headers).
2. **Parse**: The Node.js backend extracts merchant names, amounts, and types (credit/debit).
3. **Score**: An additive behavioral logic calculates a score out of 900.
4. **Discover**: Backend queries Serper for live schemes and filters them via Gemini based on the score.
5. **Nudge**: Local notifications alert the user when their eligibility increases.

---

## 🧪 How to Run Locally

### 1️⃣ Backend Setup
```bash
cd backend
npm install
# Create .env with SERPER_API_KEY and GEMINI_API_KEY
npm start
```

### 2️⃣ Android Setup
- Open the project in **Android Studio (Hedgehog or later)**.
- Connect a physical device or emulator.
- Update `BASE_URL` in `SmsRepository.kt` to point to your local machine IP.
- Click **Run**.

---

## 📲 Download APK
Get the latest build here and try it out!  
👉 **[Download BizCredit APK](https://drive.google.com/file/d/1L4lLhZKU3NqedtYD7APfCSHhu8IrGuB_/view?usp=sharing)**

---

## 🏆 Why BizCredit?
- **Zero Friction**: Works with existing data (SMS). No need for bank login or PDF uploads.
- **Financial Inclusion**: Specifically designed for the "underserved" Bharat.
- **Proactive**: Doesn't just show data; it *discovers* money (schemes & loans) for the user.

---

## 🔮 Future Improvements
- **Direct Bank API**: Adding Account Aggregator (AA) support for deeper verification.
- **Multi-Lingual UI**: Support for Hindi, Tamil, and other regional languages.
- **Offline Scoring**: Moving ML models on-device for 100% privacy-first scoring.

---

## 🙌 About CodeVizards
**T Mohamed Yaser**  
Passionate about building AI-driven fintech that solves real problems for real people.

🔗 [LinkedIn Profile](https://www.linkedin.com/in/mohamedyaser08/)  
📧 [1ammar.yaser@gmail.com](mailto:1ammar.yaser@gmail.com)

---
*Created for the Fintech Hackathon 2026*
