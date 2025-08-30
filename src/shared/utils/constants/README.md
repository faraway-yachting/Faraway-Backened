# Error Constants Usage Guide

This file contains centralized error messages for the Faraway Backend project. All error messages are organized by category and can be easily imported and used throughout the application.

## ✅ **Implementation Status**

The error constants have been successfully implemented in:
- ✅ **Auth Controller** - All success messages now use constants
- ✅ **Auth Service** - All error messages now use constants  
- ✅ **Error Middleware** - Uses constants for consistent error handling
- ✅ **API Error Helper** - Default error messages use constants
- ✅ **Success Handler** - Enhanced with error constants and validation
- ✅ **Validation Middleware** - New middleware using error constants

## Importing Error Constants

```typescript
// Import specific error categories
import { errorConstants } from '@/shared/utils/constants';

// Import the helper function
import { getErrorMessage } from '@/shared/utils/constants';

// Import specific error categories
import { errorConstants } from '@/shared/utils/constants';
```

## Usage Examples

### 1. Direct Access

```typescript
// Access error messages directly
const errorMessage = errorConstants.AUTHENTICATION.EMAIL_REQUIRED;
// Returns: "The email is required."

const validationError = errorConstants.GENERAL.VALIDATION_ERROR;
// Returns: "Invalid input data. Please check your request and try again."
```

### 2. Using the Helper Function

```typescript
// Get error messages using the helper function
const emailError = getErrorMessage('AUTHENTICATION', 'EMAIL_REQUIRED');
// Returns: "The email is required."

const notFoundError = getErrorMessage('BLOG', 'BLOG_NOT_FOUND');
// Returns: "Blog not found."
```

### 3. In Validation Functions

```typescript
import { errorConstants } from '@/shared/utils/constants';

export const validateUser = (userData: any) => {
  const errors: string[] = [];
  
  if (!userData.email) {
    errors.push(errorConstants.AUTHENTICATION.EMAIL_REQUIRED);
  }
  
  if (!userData.name) {
    errors.push(errorConstants.AUTHENTICATION.NAME_REQUIRED);
  }
  
  if (userData.name && userData.name.length < 2) {
    errors.push(errorConstants.AUTHENTICATION.NAME_MIN_LENGTH);
  }
  
  return errors;
};
```

### 4. In API Responses

```typescript
import { errorConstants } from '@/shared/utils/constants';

export const createBlog = async (req: Request, res: Response) => {
  try {
    const { title, content, author } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: errorConstants.BLOG.TITLE_REQUIRED
      });
    }
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: errorConstants.BLOG.CONTENT_REQUIRED
      });
    }
    
    // ... rest of the logic
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: errorConstants.GENERAL.INTERNAL_SERVER_ERROR
    });
  }
};
```

### 5. In Error Middleware

```typescript
import { errorConstants } from '@/shared/utils/constants';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: errorConstants.GENERAL.VALIDATION_ERROR,
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: errorConstants.GENERAL.UNAUTHORIZED
    });
  }
  
  // Default error
  return res.status(500).json({
    success: false,
    message: errorConstants.GENERAL.INTERNAL_SERVER_ERROR
  });
};
```

### 6. In Auth Controllers (Implemented)

```typescript
// ✅ Now using constants in auth controller
successHandler(res, result, errorConstants.SUCCESS.ADMIN_LOGIN_SUCCESS, 200);

// ✅ Now using constants in auth service
throw ApiError.wrongCredentials(errorConstants.AUTHENTICATION.INVALID_CREDENTIALS);
```

## Error Categories

The error constants are organized into the following categories:

- **GENERAL**: Common application errors
- **ROUTE_ERRORS**: Routing and method errors
- **AUTHENTICATION**: Authentication and authorization errors
- **SUCCESS**: Success messages for consistent responses
- **BLOG**: Blog specific errors
- **YACHT**: Yacht specific errors
- **FILE_UPLOAD**: File upload specific errors
- **DATABASE**: Database related errors
- **EXTERNAL_SERVICE**: External service integration errors

## Benefits

1. **Consistency**: All error messages are centralized and consistent
2. **Maintainability**: Easy to update error messages in one place
3. **Type Safety**: TypeScript support with proper typing
4. **Internationalization Ready**: Easy to extend for multiple languages
5. **Developer Experience**: Clear error messages for better debugging
6. **Code Quality**: Eliminates hardcoded strings throughout the codebase

## Adding New Error Constants

To add new error constants:

1. Add them to the appropriate category in `error.codes.ts`
2. Follow the naming convention: `DESCRIPTION_IN_UPPERCASE`
3. Use clear, user-friendly error messages
4. Keep messages concise but informative

## Best Practices

1. **Use descriptive names**: Make error constant names self-explanatory
2. **Keep messages user-friendly**: Write messages that end users can understand
3. **Be consistent**: Use similar language patterns across similar error types
4. **Include context**: When possible, include what the user should do to fix the error
5. **Avoid technical jargon**: Use simple language that non-technical users can understand
6. **Always use constants**: Never hardcode error messages in controllers, services, or middleware

## Migration Guide

If you have existing hardcoded error messages:

1. **Find hardcoded strings**: Search for error messages in quotes
2. **Add to constants**: Add appropriate constants to `error.codes.ts`
3. **Replace in code**: Update the code to use the constants
4. **Test thoroughly**: Ensure all error handling works correctly

## Example Migration

```typescript
// ❌ Before (hardcoded)
throw ApiError.badRequest('Email is required');

// ✅ After (using constants)
throw ApiError.badRequest(errorConstants.AUTHENTICATION.EMAIL_REQUIRED);
```
