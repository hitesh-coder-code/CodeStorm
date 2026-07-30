# MindVault Journal

Build a production-ready, modern, calming, privacy-first Progressive Web App (PWA) called "MindVault".

IMPORTANT: THIS FRONTEND MUST INTEGRATE WITH AN EXISTING LOCAL GEMMA AI BACKEND.

Do NOT create a new AI model.

Do NOT use OpenAI.

Do NOT use Gemini API.

Do NOT use Claude.

Do NOT use any external cloud AI API.

Do NOT create fake/mock AI responses for the actual AI features.

The AI model already exists and is running locally:

Model:

Gemma 3 4B-IT Q4_K_M

Runtime:

llama.cpp

The frontend must communicate with the existing FastAPI backend. FastAPI communicates with the local Gemma model.

Architecture:

React + Vite + Tailwind CSS

        |

        | HTTP REST API

        v

FastAPI backend

http://127.0.0.1:8000

        |

        | HTTP

        v

llama.cpp

http://127.0.0.1:8080

        |

        v

Gemma 3 4B-IT Q4_K_M

        |

        v

Local GPU inference

The React frontend should ONLY communicate with FastAPI.

The React frontend must NOT communicate directly with llama.cpp.

==================================================

1. TECH STACK

==================================================

Use:

- React

- Vite

- Tailwind CSS

- JavaScript or TypeScript

- PWA support

- Responsive mobile-first design

- LocalStorage or IndexedDB for local journal storage

Create a clean modular component architecture.

Suggested structure:

src/

  components/

  pages/

  services/

    api.js

  hooks/

  utils/

  store/

  App.jsx

==================================================

2. BACKEND API INTEGRATION

==================================================

Create a centralized API service:

src/services/api.js

Use:

const API_URL =

  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

All backend API requests must go through this file.

Do NOT put fetch() calls directly inside multiple UI components.

Create these API functions:

- checkHealth()

- generateReflection()

- generateSummary()

Implementation requirements:

GET /health

Endpoint:

${API_URL}/health

Expected response:

{

  "status": "ok",

  "model": "Gemma 3 4B-IT",

  "runtime": "llama.cpp",

  "privacy": "local inference"

}

POST /reflect

Endpoint:

${API_URL}/reflect

Request body:

{

  "entry": "string",

  "memory_summary": "string",

  "recent_entries": ["string"]

}

Example:

{

  "entry": "I felt overwhelmed today but talking to my friend helped me.",

  "memory_summary": "The user has recently been stressed about work.",

  "recent_entries": [

    "I had many assignments.",

    "I felt tired yesterday."

  ]

}

Expected response:

{

  "reflection": "AI generated reflection from Gemma"

}

POST /summarize

Endpoint:

${API_URL}/summarize

Request body:

{

  "entries": [

    "Journal entry 1",

    "Journal entry 2"

  ]

}

Expected response:

{

  "summary": "AI generated summary from Gemma"

}

The frontend must display the actual response returned from the backend.

Do not replace the response with hardcoded text.

==================================================

3. ENVIRONMENT CONFIGURATION

==================================================

Create:

.env.example

with:

VITE_API_URL=http://127.0.0.1:8000

Use:

import.meta.env.VITE_API_URL

Do not hardcode the backend URL throughout the application.

The fallback may remain:

http://127.0.0.1:8000

==================================================

4. ERROR HANDLING

==================================================

The frontend must gracefully handle:

- FastAPI backend unavailable

- Gemma/llama.cpp unavailable

- Network errors

- Request timeout

- HTTP 500 errors

- Empty responses

- Offline mode

If AI generation fails, NEVER delete the journal entry.

Always save the journal entry locally first.

Show a friendly message:

"Your journal entry is safely saved on this device. Your local AI companion is temporarily unavailable."

Provide a Retry button.

Show an AI loading state:

"Your local AI companion is reflecting..."

==================================================

5. JOURNAL DATA PRIVACY

==================================================

Journal entries must be stored locally using IndexedDB or localStorage.

Do not use a cloud database.

Do not use external analytics.

Do not send journal content to third-party services.

The frontend must never call external AI services.

The only AI request is:

React

→ Local FastAPI

→ Local llama.cpp

→ Local Gemma

The privacy message must accurately state:

"Your journal data stays on your device and AI processing is performed locally."

Avoid unsupported claims such as "100% on-device" if the implementation does not guarantee it.

==================================================

6. CORE USER FLOW

==================================================

Implement this complete flow:

User opens MindVault

        ↓

User creates journal entry

        ↓

User selects mood

        ↓

User clicks Save

        ↓

Entry is saved locally FIRST

        ↓

User clicks Generate Reflection

        ↓

Frontend calls POST /reflect

        ↓

FastAPI sends request to local Gemma

        ↓

Gemma generates reflection

        ↓

FastAPI returns response

        ↓

Frontend displays AI reflection

        ↓

Reflection is saved locally

The user must be able to use the journal even when the AI backend is unavailable.

==================================================

7. MEMORY AND CONTEXT

==================================================

When calling /reflect:

Use the current journal entry as:

entry

Use a locally calculated memory summary as:

memory_summary

Use the most recent 2-3 journal entries as:

recent_entries

Example request:

{

  "entry": "I felt much better today after talking with my friend.",

  "memory_summary": "The user has recently been feeling overwhelmed with work.",

  "recent_entries": [

    "I had too many assignments and felt stressed.",

    "I was tired but managed to finish some of my work.",

    "I was worried about tomorrow."

  ]

}

Do not send the entire journal history every time.

Only send the current entry, a concise local memory summary, and the most recent entries.

==================================================

8. LANDING PAGE

==================================================

Create a beautiful landing page.

Title:

MindVault

Subtitle:

"Your private AI journal designed to keep your thoughts close."

Primary CTA:

Start Journaling

Secondary CTA:

How Privacy Works

Show a calming illustration of a person journaling with subtle AI-inspired elements.

Feature cards:

- Private AI Reflection

- Voice Journaling

- Daily Insights

- Mood Tracking

- Offline-first Journaling

- Local AI Processing

==================================================

9. PRIVACY BANNER

==================================================

Display a prominent privacy banner:

"Your thoughts stay on your device."

Supporting text:

"MindVault stores your journal locally and connects to your local AI companion for private AI processing."

Privacy badges:

🔒 Local AI Processing

📱 Offline-first

🛡 No Cloud Storage

⚡ Private Processing

==================================================

10. MAIN DASHBOARD

==================================================

Create a modern dashboard.

Desktop sidebar:

Home

Journal History

Voice Notes

Mood Trends

AI Reflections

Settings

Mobile:

Use bottom navigation.

Add floating:

+ New Journal

Top navigation:

- Greeting

- Search

- Profile avatar

- Dark/light mode toggle

Dashboard cards:

Today's Mood

Journal Streak

Entries This Week

Privacy Status

Privacy status:

"Local Mode Active"

==================================================

11. JOURNAL EDITOR

==================================================

Create a beautiful journal editor.

Fields:

- Entry title

- Journal text

- Mood

- Emotion tags

- Date/time

Buttons:

Save Entry

Generate Reflection

Summarize

IMPORTANT:

Save the journal entry locally BEFORE calling the AI backend.

When Generate Reflection is clicked:

Call:

POST /reflect

Use:

{

  "entry": currentEntry,

  "memory_summary": localMemorySummary,

  "recent_entries": lastThreeEntries

}

Show a loading animation while waiting.

When response arrives:

Display:

response.reflection

in a polished AI reflection card.

==================================================

12. AI REFLECTION UI

==================================================

Create a modern ChatGPT-inspired interface.

Include:

- User journal entry

- AI reflection

- Typing animation

- Timestamp

- Loading state

- Suggested prompts

Suggested prompts:

"How are you feeling today?"

"What made you smile today?"

"What's stressing you lately?"

"What's something you're grateful for?"

AI responses should be presented as supportive reflections.

Do not call the AI a therapist.

Do not present the AI as a medical professional.

==================================================

13. SUMMARY FEATURE

==================================================

Create a "Summarize Journal" feature.

When clicked:

Collect locally stored journal entries.

Call:

POST /summarize

Request:

{

  "entries": [

    "Entry 1",

    "Entry 2",

    "Entry 3"

  ]

}

Display:

response.summary

in a clean summary card.

Show loading state:

"Your local AI is summarizing your journal..."

==================================================

14. VOICE JOURNALING

==================================================

Create a voice recording screen.

Show:

- Large animated microphone

- Recording waveform

- Recording timer

- Pause

- Stop

- Cancel

After recording:

Show an editable transcription card.

Buttons:

Save Entry

Generate Reflection

Summarize

Use browser speech recognition APIs where supported.

If speech recognition is unavailable:

Show a graceful fallback to text journaling.

==================================================

15. JOURNAL DETAIL

==================================================

Show:

Entry title

Date

Mood

Full journal content

AI Summary

AI Reflection

Key emotions

Personal insights

Actions:

Edit

Favorite

Delete

Export

All data should remain local.

==================================================

16. MOOD ANALYTICS

==================================================

Create:

Weekly mood chart

Monthly mood trend

Most common emotions

Reflection frequency

Journal streak calendar

Calculate analytics from local journal data.

Do not send analytics data to external services.

==================================================

17. SETTINGS

==================================================

Sections:

Privacy

Appearance

Notifications

Export Data

Delete Local Data

Offline Status

Add:

Export My Data

Delete All Local Data

Clear AI Memory

Show confirmation dialogs before destructive actions.

==================================================

18. PWA

==================================================

Configure the application as a PWA.

Add:

- Web app manifest

- Service worker

- Offline caching

- Installable PWA

The application shell and locally stored journal entries should remain available offline.

If the local FastAPI/Gemma backend is unavailable:

- Journal creation still works

- Local storage still works

- Mood tracking still works

- Analytics still works

- AI reflection shows a clear unavailable state

==================================================

19. DESIGN

==================================================

Style:

- Dark mode default

- Optional light mode

- Lavender

- Blue

- Teal

- White

- Soft gradients

- Rounded XL cards

- Subtle glassmorphism

- Smooth animations

- Micro-interactions

- Accessible typography

- Plenty of whitespace

The application should feel:

Calm

Safe

Private

Trustworthy

Friendly

Non-clinical

Do not make it look like a hospital or medical application.

==================================================

20. IMPORTANT FINAL REQUIREMENTS

==================================================

The application must be fully functional.

Do not create fake AI responses.

Do not create a fake Gemma model inside the frontend.

Do not download or load a second AI model.

Do not use cloud AI APIs.

Use the existing FastAPI backend.

Use the existing Gemma 3 4B-IT model through the backend.

The final AI flow must be:

Frontend

→ POST /reflect

→ FastAPI

→ llama.cpp

→ Gemma 3 4B-IT

→ FastAPI

→ Frontend

And:

Frontend

→ POST /summarize

→ FastAPI

→ llama.cpp

→ Gemma 3 4B-IT

→ FastAPI

→ Frontend

Build the frontend so that the AI integration is real and uses the API responses from the existing Gemma backend.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/34b12e41-e31b-47dc-abbc-d858676ff290).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
