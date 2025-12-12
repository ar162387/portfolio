# Vibe Coderz Portfolio

A high-performance, immersive 3D portfolio website built for **Syed Shah Abdur Rehman**. This project showcases advanced web engineering capabilities, featuring a galactic 3D background, smooth scroll animations, and a responsive, data-driven architecture.

## 🚀 Tech Stack

### Core Framework
- **Next.js 15 (App Router)**: Utilizing server components for initial load performance and client components for interactive 3D elements.
- **TypeScript**: Ensuring type safety and code robustness across the application.

### Styling & Animation
- **Tailwind CSS**: Utility-first styling for rapid UI development and consistent design tokens.
- **Framer Motion**: Powering complex scroll-linked animations, page transitions, and UI micro-interactions.
- **Lucide React**: Modern, consistent icon set.

### 3D Graphics
- **Three.js**: The core 3D graphics library.
- **React Three Fiber (R3F)**: A React renderer for Three.js, enabling declarative 3D scene construction.
- **React Three Drei**: Useful helpers for R3F (Stars, Sparkles, Float).
- **Custom Shaders/Logic**:
    - **Galactic Background**: A dynamic starfield with scroll-driven color transitions tracking the user's journey through sections.
    - **Procedural Events**: A custom "Cosmic Event" system that probabilistically spawns shooting stars, meteoroids, and black holes based on frame deltas.

## 🏗 Architecture

### Directory Structure
```
src/
├── app/                # Next.js App Router pages
├── components/
│   ├── 3d/            # Three.js experiences (Background3D, Foreground3D)
│   ├── layout/        # Semantic layout components (Header, Footer)
│   ├── portfolio/     # Project showcase components (Modal, Cards)
│   └── sections/      # Page sections (Hero, Skills, Contact)
├── data/              # Centralized content store (content.ts)
└── lib/               # Utility functions (cn, etc.)
```

### Key Architectural Decisions

1.  **Separation of Concerns (3D Layers)**:
    -   `Background3D.tsx`: Handles the deep background (stars, nebulae, core artifact). It sits at `z-index: -1`.
    -   `Foreground3D.tsx`: Handles foreground overlays like the "Void Black Hole". It sits at `z-index: 100` but uses `pointer-events: none` to ensure it doesn't block UI interactions while visually occluding text.

2.  **Data-Driven Content**:
    -   All text content, project details, skills, and resume data are decoupled from UI components and stored in `src/data/content.ts`. This allows for easy updates without touching React code.

3.  **Performance Optimization**:
    -   **Canvas Separation**: Heavy 3D calculations are isolated in their own R3F Canvases.
    -   **Event Throttling**: The cosmic event system uses delta-time tracking and randomization with cooldowns to prevent update-loop interferences.
    -   **Lazy Loading**: Next.js automatically optimizes images and code-splits routes.

## 🌟 Features

-   **Interactive Galactic Scroll**: Background colors shift seamlessly from Deep Space Black to Cosmic Purple and Deep Indigo as the user scrolls.
-   **Rare Cosmic Events**: A probabilistic system interacting with the user's session time (Shooting stars, Black holes).
-   **Unified Project Modal**: A rich media modal for showcasing projects with image galleries and full-screen previews.
-   **Responsive Design**: Fully responsive layout adapting to mobile and desktop viewports.

## 📦 Installation

```bash
npm install
npm run dev
```

## 📄 License
All rights reserved. Syed Shah Abdur Rehman.
