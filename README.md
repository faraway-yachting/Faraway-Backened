# Faraway Backend

A robust Node.js/TypeScript backend API for yacht rental and blog management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env.development

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
src/
├── api/                    # API endpoints (auth, yachts, blogs)
├── config/                 # Configuration files
├── core/                   # Core business logic
├── shared/                 # Shared resources
└── tests/                  # Test files
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run seed` - Seed database
- `npm run deploy` - Deploy to production

## 🐳 Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.yml up -d
```

## 📚 Documentation

- **Detailed README**: [docs/README.md](src/docs/README.md)
- **Architecture Guide**: [docs/architecture.md](src/docs/architecture.md)
- **API Documentation**: Swagger docs at `/api-docs`
- **Postman Collection**: [docs/postman/](src/docs/postman/)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test files
npm test -- auth.test.ts
```

