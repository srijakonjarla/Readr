# React Conversion Details

This document outlines the process of converting the original vanilla JavaScript EPUB reader application to a React application.

## Changes Made

### Project Structure

- Created a new `client` directory for the React application
- Set up the proper folder structure with components, hooks, services, and utils
- Updated package.json files for both server and client
- Added scripts to run both the server and client concurrently

### Component Architecture

The application was divided into the following React components:

1. **App.js** - Main component that manages the overall state and renders the appropriate sections
2. **UploadSection.js** - Handles EPUB file uploads
3. **LibrarySection.js** - Displays the list of available books and provides upload functionality
4. **MetadataPreview.js** - Shows book metadata before opening it
5. **ReaderSection.js** - The main reading interface with chapter navigation, font controls, and theme toggle
6. **ChatInterface.js** - Handles AI chat functionality for asking questions about the book

### State Management

- Used React's useState and useEffect hooks for state management
- Implemented proper state lifting to share data between components
- Used refs for DOM manipulation (like scrolling and text selection)

### API Integration

- Created an API service file for handling all backend requests
- Implemented proper error handling and loading states
- Used fetch API for making HTTP requests to the backend
- Added proxy configuration for the React development server

### Server Updates

- Updated CORS configuration to allow requests from the React development server
- Modified the server to serve the React build files in production
- Added production build scripts

## Features Preserved

- Upload and manage EPUB books
- View book metadata
- Navigate through chapters
- Adjust font size
- Toggle dark/light theme
- AI-powered chat for asking questions about the book content

## Deployment Configuration

- Added Heroku deployment configuration
- Added proper .gitignore file
- Set up environment variables handling

## How to Run

1. Install all dependencies:

   ```
   npm install && npm run client-install
   ```

2. Run in development mode:

   ```
   npm run dev
   ```

3. Build for production:

   ```
   npm run client-build
   ```

4. Run in production mode:
   ```
   npm start
   ```
