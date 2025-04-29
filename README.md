# EPUB Reader with AI Features

A React application for reading EPUB books with AI-powered chat features.

## Project Structure

- `client/` - React frontend application
- `server/` - Node.js Express backend
- `uploads/` - Directory for uploaded EPUB files
- `samples/` - Sample EPUB files for testing

## Setup Instructions

### Install Backend Dependencies

```bash
npm install
```

### Install Frontend Dependencies

```bash
npm run client-install
```

### Run the Application in Development Mode

This will start both the backend server and the React frontend concurrently:

```bash
npm run dev
```

The backend API will run on port 5000, and the React frontend will run on port 3000.

## API Endpoints

- `POST /api/upload` - Upload an EPUB file
- `GET /api/books` - Get all books in the library
- `GET /api/files/:filename` - Get metadata for a specific book
- `GET /api/epub/:filename/chapter/:chapterId` - Get chapter content
- `POST /api/chat` - Submit a chat query about the book

## Features

- Upload and manage EPUB books
- View book metadata
- Navigate through chapters
- Adjust font size
- Toggle dark/light theme
- AI-powered chat for asking questions about the book content