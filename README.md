# Nest

A powerful property intelligence and social discovery platform. Nest aggregates market data, demand signals, and deep property insights into a unified, interactive map experience.

## 🌟 Features

### 🗺️ Interactive Intelligence Map
- **Dynamic Layers**: Switch between "Buzz" (Demand Heatmap) and "Supply" (Market Listings) views.
- **Shadow Market**: Visualize real-time market data imported from major portals (e.g., Rightmove).
- **Property Claims**: Users can "claim" properties to signal ownership or intent, driving the social verification layer.

### 🏠 Deep Property Insights
- **History & Analytics**: Access sold price history, EPC data, and listing archives for any property.
- **Smart Data Ingestion**: Automated pipelines to ingest and standardize property data from various sources.
- **Intent Flags**: Signal specific interests (e.g., "Buying", "Selling", "Just Looking") to other users.

### ⚡ Activity & Social
- **Live Activity Feed**: Real-time stream of property claims, new listings, and high-signal market movements.
- **Messaging**: Direct communication channels for users.
- **Stories**: Share verified "Home Stories" attached to specific locations.

## �️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Maps**: [Leaflet.js](https://leafletjs.com/) with `react-leaflet` & `react-leaflet-heatmap-layer-v3`
- **Deployment**: Railway / Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10+
- Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd nestpremvp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env.local` and configure your keys:
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for admin scripts)
   - `HERE_API_KEY` (Geocoding)

4. **Run Development Server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## �️ Data Pipelines

Nest features robust data ingestion scripts located in `scripts/`:

- `import_shadow_market.ts`: Ingests active listings from CSV data, matching them against the Master Address Database.
- `import_osm_properties.ts`: Imports base property data from OpenStreetMap.

## � Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design decisions
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete database schema
- [Data Ingestion SOP](docs/DATA_INGESTION_SOP.md) - Standard Operating Procedures for data pipelines
- [User Flows](docs/USER_FLOWS.md) - User journey diagrams
- [Admin Setup](docs/ADMIN_SETUP.md) - Guide for setting up admin capabilities

## �📄 License

Proprietary / Private (See LICENSE if applicable)
