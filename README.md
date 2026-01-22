# IvyVoice: AI-Powered Career Discovery Guide

## 1. Project Overview

IvyVoice is a sophisticated, AI-powered web application designed to guide students through a personal career discovery journey. It simulates a conversation with a warm and insightful career counselor named Ivy. Through a structured, voice-driven dialogue, Ivy helps students explore their interests, identify their strengths, and understand their preferences to recommend suitable career paths.

The application leverages cutting-edge AI for natural language understanding, generation, and voice synthesis to create an immersive and responsive user experience.

---

## 2. Core Features

### a. Dual Onboarding Experience
To cater to user preference, the application offers two ways to begin:

*   **Text-based Entry:** Users can fill out a simple form with their initial details (Name, Grade, Curriculum, Stream, Country). The conversation then begins with the AI already having this context.
*   **Talk to Voice Agent:** For a fully immersive experience, users can speak directly to Ivy from the start. Ivy will conversationally ask for each piece of information one by one.

### b. AI-Driven Conversational Agent (Ivy)
Ivy is the core of the application. The AI is designed to be warm, encouraging, and empathetic. The conversation follows a structured flow:

1.  **Welcome & Details:** Greets the student and gathers basic details if not already provided.
2.  **Explore Interests & Motivations:** Asks about favorite subjects, hobbies, and what they enjoy about learning.
3.  **Uncover Strengths & Personality:** Probes how the student approaches problems, creativity, and structure.
4.  **Understand Constraints & Preferences:** Inquires about work style preferences (e.g., working with people vs. data).
5.  **Hypothesize & Test:** Based on the dialogue, Ivy proposes 3-5 broad career clusters and asks scenario-based questions to gauge the student's interest.
6.  **Refine & Conclude:** Narrows down the options to 2-3 prioritized paths and checks for student satisfaction before concluding.

### c. Real-time Voice Interaction
*   **Text-to-Speech (TTS):** Ivy's responses are converted into a natural, human-like voice and streamed to the user.
*   **Speech-to-Text (STT):** The application uses the browser's built-in `SpeechRecognition` API to capture the student's voice.
*   **Live Transcription:** As the student speaks, their words are transcribed and displayed on the screen in real-time, providing immediate feedback.

### d. Continuous Listening & Barge-In
The microphone remains active throughout the conversation. If the student starts speaking while Ivy is talking, Ivy will immediately and gracefully stop, allowing the student to "barge in" and take their turn. This creates a more natural and fluid conversational dynamic.

### e. Live-Synced Transcript View
The user interface displays the dialogue in a classic chat format (`Ivy: ...`, `Me: ...`). Ivy's spoken responses are animated with a "typing" effect that is synchronized with the audio playback, enhancing the sense of a live conversation.

### f. Real-time Insight Panel ("Ivy Notes")
A side panel is always visible on the screen, which acts as Ivy's notepad. As the conversation progresses, this panel is updated in real-time with key insights extracted by the AI, including:
*   Student Snapshot (Name, Grade, etc.)
*   Emerging Interests
*   Strength Signals
*   Constraints & Preferences
*   Shortlisted Career Clusters

### g. Timed Session & Automatic Reporting
*   The core discovery session is set for **15 minutes**. A countdown timer is visible on screen.
*   When the timer ends, or when the AI determines the conversation has reached a natural conclusion, the session automatically transitions to the reporting phase.
*   An "Evaluating..." screen is briefly shown while the final report is generated.

### h. Structured Career Discovery Report
The final output is a comprehensive, multi-section report that synthesizes the entire conversation. It includes:
*   **Student Snapshot:** Name and Grade.
*   **Top Interests & Key Strengths:** Bulleted lists of the most prominent insights.
*   **Recommended Career Paths:** 2-3 detailed recommendations, each including:
    *   **Why this fits you:** Bullet points directly linking the career path to the student's unique interests and strengths.
    *   **Application Readiness Hints:** Actionable advice on how to use these discoveries in college essays, SOPs, and applications.

### i. Downloadable Assets
From the report screen, the user has the option to:
*   **Download PDF Report:** Generate a clean, printable PDF of the Career Discovery Report.
*   **Download Transcript:** Save the entire conversation transcript as a `.txt` file for future reference.

---

## 3. Technical Workflow

The application is a Next.js (React) web application that uses Genkit to interface with Google's Gemini family of AI models.

### a. Onboarding Flow
1.  The user lands on the welcome screen and chooses an entry method.
2.  **For Text-based Entry:**
    *   The user fills out the context form in `ivy-voice-guide.tsx`.
    *   On submission, the state is passed to the main `ChatView`, and the `aiDrivenConversation` flow is called *without* the initial onboarding questions.
3.  **For Voice Agent Entry:**
    *   `ivy-voice-guide.tsx` activates the voice recognition and calls the `aiDrivenConversation` flow.
    *   The flow starts with the first onboarding question ("What's your name?").
    *   As the user answers each question, the state (`studentProfile`) is updated, and the flow proceeds to the next question until all details are gathered.

### b. Main Conversation Loop
1.  **User Input:** The student's response is captured.
    *   **Voice:** `SpeechRecognition` API transcribes the audio. A timeout (`UTTERANCE_PAUSE_DURATION`) determines when the user has finished speaking.
    *   **Text:** The user types and submits via the input field.
2.  **AI Processing:** The `handleSendMessage` function in `ivy-voice-guide.tsx` is triggered.
    *   It sends the entire conversation history, along with the student's profile and existing insights, to the `aiDrivenConversation` Genkit flow (`src/ai/flows/ai-driven-conversation.ts`).
3.  **AI Response Generation:**
    *   The Genkit flow, powered by a detailed system prompt and the Gemini model, processes the input.
    *   It returns a JSON object containing `nextPrompt` (Ivy's response), `updatedInsights` (for the side panel), and an optional `isConcluding` flag.
4.  **Audio Output & UI Sync:**
    *   Ivy's `nextPrompt` is sent to the `textToSpeech` Genkit flow (`src/ai/flows/text-to-speech.ts`).
    *   This flow uses a TTS model to generate a base64-encoded WAV audio stream.
    *   The audio is played via an `<audio>` element. The duration of the audio clip is used to calculate the speed of the on-screen typing animation for perfect synchronization.
    *   The `IvyNotes` component re-renders with the `updatedInsights`.

### c. Session Conclusion & Report Generation
1.  The session ends when the 15-minute timer hits zero or when the `aiDrivenConversation` flow returns `isConcluding: true`.
2.  The `handleSessionEnd` function is called, changing the app state to `evaluating`.
3.  The `generateCareerReport` Genkit flow (`src/ai/flows/generate-career-report.ts`) is invoked. It receives the final `studentProfile` and `insights` as input.
4.  This flow uses a powerful prompt to synthesize all the information into the structured report format (including "Why it fits" and "Application Readiness").
5.  The flow returns a structured JSON object conforming to the `FinalReport` type.

### d. Report Display
1.  The app state changes to `report`, and the `ReportView` component is rendered with the data from the previous step.
2.  The report is displayed in a clean, hierarchical layout.
3.  **PDF Download:** Uses the browser's `window.print()` functionality, styled with a special print stylesheet in `globals.css` to format only the `.printable-area`.
4.  **Transcript Download:** Dynamically creates a text string from the `messages` state, converts it to a Blob, and triggers a browser download.
