<div align="center">

<img src="https://raw.githubusercontent.com/Yaser-123/SMS-READER/main/assets/logointro_fast.gif" width="70%" />

# 💳 FinPath: AI-Powered Behavioral Wealth Architect
### The Personal CFO for the AI Era

> 🏆 **Smart India Hackathon (SIH) 2026 Proposal**  
> 👥 **Team: CodeVizards** — *Lords Institute of Engineering and Technology*

[![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

[📲 Download APK](https://drive.google.com/file/d/1rd4QTPZqYWYhKsdaLC6bi3yuviojxxqi/view?usp=sharing) • [🔗 LinkedIn](https://www.linkedin.com/in/mohamedyaser08/) • [📧 Contact](mailto:1ammar.yaser@gmail.com)

</div>

---

## 1. About Team & Problem Statement

*   **Problem Statement Title**: FinPath: AI-Powered Behavioral Wealth Architect
*   **Vision**: An autonomous "Personal CFO" that manages the gap between "Daily Spending" and "Generational Wealth."
*   **Theme/SDG**: Fintech / Smart Automation (SDG 8: Decent Work and Economic Growth)
*   **Category**: Software
*   **Team Name**: CodeVizards
*   **College Name**: Lords Institute of Engineering and Technology
*   **Team Lead**: T Mohamed Yaser

---

## 2. Technical Approach

### Technologies Used
*   **Frontend**: Kotlin, Jetpack Compose, Vico Charts (Android)
*   **Backend**: Node.js, Express, Render (Cloud Deployment)
*   **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
*   **AI Engine**: Google Gemini 2.5 Flash-Lite (Behavioral Analysis)
*   **External Analysis**: Streamlit (Advanced Portfolio Modeling)

### Methodology & Process
1.  **Autonomous Ingestion**: App captures bank SMS via local background listeners.
2.  **Intelligence Layer**: Backend extracts merchant and amount data using Gemini LLM.
3.  **Behavioral Architecture**: The system categorizes transactions and maps them against "Generational Wealth" goals.
4.  **Portfolio Integration**: Direct links to specialized analysis engines for Stocks and Crypto.

### IDEA to Prototype Steps
*   **Phase 1**: Developed the SMS parsing regex and local database schema.
*   **Phase 2**: Integrated Gemini 2.5 for natural language transaction categorization.
*   **Phase 3**: Built the Jetpack Compose dashboard and portfolio analysis modules.

---

## 3. Feasibility and Viability

### Key Features
*   🚀 **Zero Manual Entry**: No need to type transactions; the app reads your bank notifications.
*   📈 **Stock & Crypto Portfolio Analysis**: Deep-dive modeling via integrated Streamlit engines.
    *   [Stock Predictastock](https://predictastock.streamlit.app/)
    *   [Crypto Hive](https://cryptohive.streamlit.app/)
*   🤖 **AI Advisor**: Real-time chat for financial planning and anomaly detection.
*   🛡️ **Privacy First**: No bank credentials or sensitive account numbers ever leave the phone.

### Challenges & Strategies
*   **Challenge**: Varied SMS formats from different banks.
*   **Strategy**: Using Gemini AI to generalize parsing instead of rigid regex patterns.
*   **Challenge**: Maintaining real-time sync on low-end devices.
*   **Strategy**: Lightweight Node.js backend hosted on Render for fast global response times.

---

## 4. Impact and Benefits

*   **Social Impact**: Democratizes financial advising, providing premium "Wealth Manager" features to the underserved.
*   **Economic Impact**: Reduces impulsive spending by visualizing the "Opportunity Cost" of daily expenses.
*   **Novelty**: Unlike competitors, FinPath requires **zero bank integrations** (API/Plaid), making it compatible with 100% of Indian banks.

---

## 🏗 System Architecture

```mermaid
graph TD
    A[Bank SMS] -->|Local Permission| B(Android App)
    B -->|POST /api/v1/sms/parse| C[Node.js Backend]
    C -->|Natural Language| D[Gemini AI Engine]
    D -->|Structured JSON| C
    C -->|Upsert Transaction| E[(Supabase DB)]
    B -->|Stock Analysis| F[Predictastock Engine]
    B -->|Crypto Analysis| G[Cryptohive Engine]
    B -->|Sync State| E
```

---

## 🖼 Screenshots

<div align="center">

| Dashboard | AI Chat | Data Sync | Finance Quiz |
|:---:|:---:|:---:|:---:|
| <img src="https://via.placeholder.com/300x600?text=Dashboard+UI" height="400"> | <img src="https://via.placeholder.com/300x600?text=AI+Advisor" height="400"> | <img src="https://via.placeholder.com/300x600?text=Sync+Engine" height="400"> | <img src="https://via.placeholder.com/300x600?text=Quiz+Results" height="400"> |

</div>

---

## 🚀 Research and References
*   [Google Gemini API Documentation](https://ai.google.dev/)
*   [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
*   [Jetpack Compose Design Patterns](https://developer.android.com/jetpack/compose)

Built with ❤️ by **CodeVizards** — *Architecting generational wealth.*
