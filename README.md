# BitcoinLatte ☕️₿

> Discover coffee shops that accept Bitcoin and cryptocurrency payments

A location-based Progressive Web App (PWA) for finding and sharing coffee shops that accept Bitcoin and other cryptocurrencies. Built with Next.js, Tailwind CSS, and Supabase.

## 🌟 Features

- 🗺️ **Interactive Map** - Browse coffee shops on an interactive Leaflet.js map
- 📍 **Location-Based Discovery** - Find nearby Bitcoin-accepting coffee shops
- 🔐 **Magic Link Authentication** - Passwordless login via email
- 📝 **Anonymous Submissions** - Submit shops without creating an account
- 👍 **Voting System** - Vote on shop quality and Bitcoin acceptance
- 💬 **Comments & Reviews** - Share experiences and tips
- 👨‍💼 **Admin Dashboard** - Review and approve submissions
- 📱 **Progressive Web App** - Install on mobile devices for offline access
- 🎨 **Responsive Design** - Mobile-first design with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer
- Supabase account
- HERE.com API key (for geocoding)
- ValueSERP API key (optional, for Google venue data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bitcoinlatte.git
   cd bitcoinlatte
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   HERE_API_KEY=your_here_api_key
   VALUESERP_API_KEY=your_valueserp_api_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up Supabase**
   
   Run the migrations in your Supabase project:
   ```bash
   # Option 1: Using Supabase CLI (recommended)
   pnpx supabase db push
   
   # Option 2: Manually in Supabase SQL Editor
   # Copy and paste the contents of:
   # - supabase/migrations/001_initial_schema.sql
   # - supabase/migrations/002_rls_policies.sql
   ```

5. **Create Storage Bucket**
   
   In your Supabase project dashboard:
   - Go to Storage
   - Create a new bucket named `shop-images`
   - Set it to public
   - Configure policies (see `docs/DATABASE_SCHEMA.md`)

6. **Run the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design decisions
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete database schema with SQL
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) - Step-by-step implementation guide
- [User Flows](docs/USER_FLOWS.md) - User journey diagrams

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16+ (App Router)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet.js
- **PWA**: next-pwa

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link)
- **Storage**: Supabase Storage
- **API**: Next.js API Routes (Server-side only)

### External APIs
- **Geocoding**: HERE.com API
- **Venue Data**: ValueSERP (Google venue data)

## 🚢 Deployment

### Railway

This project is configured for Railway deployment:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

The `railway.toml` file contains all necessary configuration.

### Vercel (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 📝 Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Supabase
pnpx supabase start      # Start local Supabase
pnpx supabase stop       # Stop local Supabase
pnpx supabase db push    # Push migrations to remote
pnpx supabase db pull    # Pull schema from remote
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Next.js](https://nextjs.org) - React framework
- [Leaflet](https://leafletjs.com) - Interactive maps
- [HERE.com](https://developer.here.com) - Geocoding services
- [Tailwind CSS](https://tailwindcss.com) - Styling

## 📧 Contact

- Website: [bitcoinlatte.com](https://bitcoinlatte.com)
- GitHub: [@yourusername](https://github.com/yourusername)

---

Made with ☕️ and ₿ by the BitcoinLatte team
