# Country Memory Game

An interactive political map game where users test their geography knowledge by clicking on countries. **Totally vibe coded except for styles.**

## Tech Stack

- **Runtime**: Bun
- **Backend**: Express + TypeScript
- **Frontend**: Vue 3 + TypeScript

## Getting Started

### Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

The server will start on `http://localhost:3000`

### Build

```bash
bun run build
```

### Production

```bash
bun run start
```

## Features

- Interactive world map
- Score tracking
- Country selection quiz
- Click-to-select gameplay

## TODO

- [✔︎] Integrate actual world map SVG with clickable countries
- [✔︎] Implement proper country detection from SVG paths
- [ ] Add difficulty levels (continents, regions, etc.)
- [ ] Add timer mode
- [ ] Persist high scores
- [ ] Add sound effects and animations
