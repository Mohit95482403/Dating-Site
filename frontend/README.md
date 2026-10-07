# Connectly Frontend

Modern, high-performance dating and social discovery platform frontend built with React, TypeScript, Vite, React Router, Axios, and Socket.IO.

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Real-Time Client**: Socket.IO Client
- **Styling**: Vanilla CSS with comprehensive design token architecture & micro-animations

## Project Structure

```text
frontend/
├── public/               # Static assets & brand media
├── src/
│   ├── assets/           # Icons and logos
│   ├── components/       # Reusable UI components
│   │   ├── common/       # Button, Container, FeatureCard, ProfilePreviewCard, etc.
│   │   └── layout/       # Navbar, Footer
│   ├── layouts/          # MainLayout
│   ├── pages/            # LandingPage, LoginPage, RegisterPage, etc.
│   ├── routes/           # React Router route configuration
│   ├── services/         # Axios api.ts and Socket.IO socket.ts
│   ├── hooks/            # Custom hooks (useSystemHealth, etc.)
│   ├── context/          # React Context providers (AuthContext)
│   ├── types/            # Shared TypeScript interfaces
│   ├── utils/            # Helper utilities
│   ├── styles/           # Design system tokens (variables.css, global.css)
│   ├── App.tsx           # Root component with ErrorBoundary & AuthProvider
│   └── main.tsx          # Application entrypoint
├── .env                  # Local environment configuration
├── .env.example          # Environment variable template
├── index.html            # Main HTML with SEO metadata & typography
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Setup & Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```
