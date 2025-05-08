# Technical Interview Preparation App

This application is designed to help users prepare for technical interviews by providing AI-powered responses to technical questions. The app uses speech recognition to capture user questions and generates detailed answers using advanced language models.

## Features

- **Voice-to-Text Conversion**: Ask questions using your voice, which are automatically converted to text
- **AI-Powered Answers**: Get detailed, context-aware answers to technical questions across various domains
- **Multiple Answer Types**: Choose between detailed explanations, brief summaries, or code-only responses
- **Question History**: Save and revisit previous questions and answers
- **Bookmarking**: Save important questions for future reference
- **Markdown Rendering**: Answers are formatted with proper syntax highlighting for code blocks

## Technology Stack

- **Framework**: Next.js with App Router
- **Styling**: TailwindCSS
- **Language**: TypeScript
- **AI Integration**: Azure GPT-4o via proxy API
- **Speech Recognition**: Web Speech API
- **Markdown Rendering**: React Markdown with syntax highlighting

## Application Flow

1. **User Input**:
   - Users can input questions either by typing or using voice recognition
   - The voice recognition feature captures the entire speech and converts it to text
   - Users can test their microphone to ensure it's working properly

2. **Question Processing**:
   - When a question is submitted (either manually or via voice), it's sent to the AI model
   - The app shows a loading indicator while the answer is being generated
   - The AI automatically detects the technical domain of the question

3. **Answer Generation**:
   - The AI generates a comprehensive answer based on the question
   - Answers include proper formatting with markdown, code syntax highlighting, and structured sections
   - Users can choose between different answer types (detailed, brief, or code-only)

4. **History Management**:
   - All questions and answers are saved to the browser's localStorage
   - Users can view their question history, reload previous questions, and bookmark important ones
   - The history panel shows the detected technical domain for each question

5. **User Interface**:
   - The UI is designed to be clean, modern, and easy to navigate
   - Visual indicators show when voice recording is active
   - Answers are displayed in a well-formatted markdown view with proper code highlighting

## Key Components

- **TechInterviewPrep**: The main component that orchestrates the application
- **Speech Recognition**: Handles voice input and conversion to text
- **Answer Generation**: Manages the API calls to generate answers
- **History Management**: Handles saving and retrieving question history
- **UI Components**: Various UI elements for a smooth user experience

## Usage

1. Type a technical question or click "Ask Question with Voice" to use speech recognition
2. Select the desired answer type (detailed, brief, or code-only)
3. View the generated answer with proper formatting and code highlighting
4. Browse your question history or bookmark important questions for future reference

## Technical Implementation Details

The application uses a proxy-based approach to communicate with AI models, ensuring all requests go through the `/lib/api/util.ts` file. This provides a consistent interface for working with different AI models while maintaining security and flexibility.

Speech recognition is implemented using the Web Speech API, with careful handling to ensure the entire speech is captured correctly. The application includes fallback mechanisms for browsers that don't support speech recognition.

All data is stored locally in the browser's localStorage, making it easy to access previous questions without requiring server-side storage or authentication.
