# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application for presenter lottery system with the following structure:
- Frontend: HTML/CSS/Vanilla JavaScript with hash-based routing
- Backend: AWS Amplify + Lambda + DynamoDB
- Local development uses demo mode with LocalStorage

## Development Commands

```bash
# Start local development server
npm start
# Alternative server start
python3 -m http.server 8080

# Deploy to AWS (requires Amplify CLI)
amplify push
```

## Architecture

### Frontend Structure
- `index.html` - Entry point with router
- `pages/` - Page components (apply/draw)
- `shared/` - Common utilities (api, utils, styles)

### Backend Structure
- Lambda function handles all API endpoints
- DynamoDB table stores participant data
- API Gateway provides REST endpoints

### Key Files
- `shared/api.js` - API communication with demo mode fallback
- `shared/utils.js` - Common utilities (validation, shuffle, etc.)
- `amplify/backend/function/participants/src/index.js` - Main Lambda handler

## Data Flow
1. Apply page: validates input → calls API → updates local cache
2. Draw page: Fisher-Yates shuffle → updates database → refreshes UI
3. Demo mode: simulates API calls using LocalStorage

## Development Notes
- Demo mode automatically activates on localhost
- API calls fall back to LocalStorage when backend unavailable
- All pages use the same utility functions for consistency
- CORS headers configured for cross-origin requests