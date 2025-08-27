# Faraway Backend Architecture

## Overview
The Faraway backend follows a clean, layered architecture pattern designed for maintainability and scalability.

## 🏗️ Architecture Layers

### 1. API Layer (`/src/api/`)
- **Versioning**: API versioning with `/v1` prefix
- **Modules**: Organized by business domain (auth, yachts, blogs)
- **Structure**: Each module contains routes, controller, service, validation, types, and tests

### 2. Core Layer (`/src/core/`)
- **Middleware**: Authentication, validation, error handling, file uploads
- **Models**: Database models using Mongoose ODM
- **Utils**: Helper functions, services (email, cloudinary), and constants
- **Validators**: Joi schema validation for all API endpoints

### 3. Shared Layer (`/src/shared/`)
- **Templates**: HTML email templates for authentication flows
- **Types**: Global TypeScript type definitions
- **Interfaces**: Contract definitions for entities and authentication
- **Enums**: Role and permission enumerations

### 4. Configuration (`/src/config/`)
- **Database**: MongoDB connection and configuration
- **Cloudinary**: Image upload and storage configuration
- **Environment**: Environment variable management
- **Cache**: In-memory caching configuration
- **Rate Limiting**: API rate limiting with configurable limits

## 🔄 Data Flow

```
HTTP Request → Middleware → Controller → Service → Model → MongoDB
                ↓
            Response ← Controller ← Service ← Model ← MongoDB
```

**Middleware Chain:**
1. **Authentication** - JWT token validation
2. **Validation** - Request data validation using Joi
3. **File Upload** - Multer middleware for file handling
4. **Error Handling** - Global error handler for consistent responses

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based token authentication
- Role-based access control (Admin, User)
- Secure password hashing with bcrypt
- Token expiration management

### Input Validation & Sanitization
- Joi schema validation for all endpoints
- Request data sanitization
- File type and size restrictions
- SQL injection prevention

### API Protection
- CORS configuration
- Rate limiting per IP address
- Request size limits
- Secure file upload handling

## 📊 Database Design

### Models
- **User**: Authentication, roles, profile information
- **Yacht**: Yacht details, images, pricing, availability
- **Blog**: Blog posts, content, images, status
- **OTP**: One-time passwords for email verification

### Relationships
- Users can own multiple yachts
- Users can create multiple blog posts
- Yachts can have multiple images
- Blogs can have associated images

## 🚀 Performance Features

### Caching
- In-memory caching for frequently accessed data
- Redis integration ready for distributed caching
- Cache invalidation strategies

### File Management
- Cloudinary integration for image optimization
- CDN delivery for fast image loading
- Automatic image format optimization

### Database Optimization
- Indexed queries for common operations
- Connection pooling
- Query optimization and monitoring

## 📝 Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

### Error Types
- **ValidationError**: Input validation failures
- **AuthenticationError**: JWT and permission issues
- **DatabaseError**: Database operation failures
- **FileUploadError**: File processing issues

## 🧪 Testing Strategy

### Test Structure
- **Unit Tests**: Service and utility function testing
- **Integration Tests**: API endpoint and database testing
- **Test Coverage**: Minimum 80% coverage target

### Test Files
- Each module has corresponding test files
- Mock data and fixtures for consistent testing
- Jest configuration for TypeScript support

## 🐳 Deployment

### Docker Support
- Multi-stage Docker builds
- Environment-specific configurations
- Health checks and monitoring

### Environment Management
- Development, staging, and production configs
- Secure credential management
- Configuration validation on startup

## 📈 Monitoring & Logging

### Logging
- Winston logger with multiple transports
- Structured logging for better analysis
- Log rotation and archiving

### Health Checks
- Database connectivity monitoring
- Service availability checks
- Performance metrics collection

## 🔧 Development Workflow

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- TypeScript strict mode enabled

### Git Hooks
- Husky for pre-commit hooks
- Automated testing and linting
- Commit message validation

This architecture provides a solid foundation for building scalable, maintainable backend services while keeping the codebase organized and easy to understand.
