# StoryWeaver AI Academy

An adaptive, multimodal education platform built for the Vibe Coding Hackathon using **Gemini 3 Pro**.

## Features

- **Agentic Story Generation**: Creates full multi-scene stories with customized quizzes using `gemini-3-pro-preview`.
- **Multimodal Learning**:
  - **Visuals**: Generates high-fidelity images (`gemini-3-pro-image-preview`) and videos (`veo-3.1`).
  - **Audio**: Neural Text-to-Speech using `gemini-2.5-flash-preview-tts`.
  - **Voice Input**: Speech-to-text for accessible prompting.
- **Emotion-Aware Adaptation**: Uses webcam input and `gemini-2.5-flash` to detect confusion and automatically simplify content.
- **Offline First**: PWA support with local caching of stories.
- **Analytics Dashboard**: Tracks engagement, literacy scores, and badge progress.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI**: Google GenAI SDK (Gemini 3 Pro, Veo, Vision, TTS)
- **Charts**: Recharts
- **PWA**: Manifest & Service Worker ready

## Deployment

1. Set `API_KEY` in your environment.
2. Build and deploy to Vercel or Google Cloud Run.
