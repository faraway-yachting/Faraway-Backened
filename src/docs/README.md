# Faraway Backend Documentation

> **📖 Main README**: For quick start and overview, see the [main README.md](../../README.md) in the project root.

This document provides detailed information about the Faraway Backend project structure and setup.

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
├── api/                    # API endpoints
│   └── v1/
│       ├── auth/          # Authentication
│       │   ├── auth.routes.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.types.ts
│       │   └── auth.test.ts
│       ├── yachts/        # Yacht management
│       │   ├── yacht.routes.ts
│       │   ├── yacht.controller.ts
│       │   ├── yacht.service.ts
│       │   ├── yacht.types.ts
│       │   └── yacht.test.ts
│       └── blogs/         # Blog management
│           ├── blog.routes.ts
│           ├── blog.controller.ts
│           ├── blog.service.ts
│           ├── blog.types.ts
│           └── blog.test.ts
├── config/                 # Configuration files
│   ├── database.ts
│   ├── cloudinary.ts
│   ├── environment.ts
│   ├── cache.ts
│   └── rate-limit.ts
├── core/                   # Core business logic
│   ├── middleware/         # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/            # Data models
│   │   ├── user.model.ts
│   │   ├── yacht.model.ts
│   │   ├── blog.model.ts
│   │   └── otp.model.ts
│   ├── utils/             # Utilities & services
│   │   ├── helpers/       # Helper functions
│   │   ├── services/      # External services
│   │   ├── constants/     # Constants
│   │   └── logger.ts
│   └── validators/        # Input validation
│       ├── auth.validation.ts
│       ├── yacht.validation.ts
│       └── blog.validation.ts
├── shared/                 # Shared resources
│   ├── enums/             # TypeScript enums
│   │   ├── roles.enum.ts
│   │   └── permissions.enum.ts
│   ├── interfaces/        # TypeScript interfaces
│   │   ├── IEntity.ts
│   │   └── IAuth.ts
│   ├── types/             # Global types
│   │   ├── express.d.ts
│   │   └── api-response.ts
│   └── templates/         # Email templates
│       └── auth/
│           ├── forgot-password.html
│           └── welcome.html
└── tests/                  # Test files
    ├── unit/
    ├── integration/
    ├── fixtures/
    └── setup/
```





## 🔍 Code Quality & Linting

### **TypeScript Compilation Check**
```bash
# Check TypeScript compilation without emitting files
npx tsc --noEmit

# Check with specific config
npx tsc --noEmit --project tsconfig.build.json
```

### **ESLint Code Quality Checks**
```bash
# Lint all source files
npx eslint src/

# Lint with max warnings allowed
npx eslint src/ --max-warnings 10

# Lint specific file
npx eslint src/app.ts

# Lint specific directory
npx eslint src/api/

# Lint with auto-fix for simple issues
npx eslint src/ --fix

# Lint only TypeScript files
npx eslint src/ --ext .ts

# Check for specific rule violations
npx eslint src/ --rule '@typescript-eslint/no-explicit-any: error'
```




## 🐳 Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.yml up -d
```

## 📚 API Documentation

- Swagger docs available at `/api-docs`
- Postman collection in `docs/postman/`
- Architecture overview in `docs/architecture.md`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test files
npm test -- auth.test.ts
```

## 📝 License

MIT License - see LICENSE file for details.
