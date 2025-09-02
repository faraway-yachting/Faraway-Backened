export const errorConstants = {
  // 🔹 General Errors
  GENERAL: {
    INTERNAL_SERVER_ERROR: "An unexpected error occurred. Please try again later.",
    UNAUTHORIZED: "Access denied. Valid authentication is required.",
    INVALID_TOKEN: "Invalid or expired token. Please log in again.",
    VALIDATION_ERROR: "Invalid input data. Please check your request and try again.",
    SOMETHING_WENT_WRONG: "Something went wrong, please try again later",
    // Common validation errors
    ID_REQUIRED: "ID is required.",
    ID_MUST_BE_STRING: "ID must be a valid string.",
    ID_INVALID_FORMAT: "ID must be a valid MongoDB ObjectId.",
    PAGE_MUST_BE_NUMBER: "Page must be a valid number.",
    PAGE_MIN_VALUE: "Page must be at least 1.",
    LIMIT_MUST_BE_NUMBER: "Limit must be a valid number.",
    LIMIT_MIN_VALUE: "Limit must be at least 1.",
    LIMIT_MAX_VALUE: "Limit must not exceed 100.",
    SEARCH_MUST_BE_STRING: "Search query must be a valid string.",
    SEARCH_MAX_LENGTH: "Search query must not exceed 100 characters.",
    SORT_BY_MUST_BE_STRING: "SortBy must be a string.",
    SORT_ORDER_MUST_BE_STRING: "SortOrder must be a string.",
  },

  // 🔹 Route & Method Errors
  ROUTE_ERRORS: {
    INVALID_ROUTE: "The requested route does not exist.",
    INVALID_METHOD: "The requested method is not allowed for this route.",
  },

  // 🔹 Auth Errors
  AUTHENTICATION: {
    EMAIL_MUST_BE_STRING: "The email must be a string.",
    EMAIL_INVALID: "The email format is invalid.",
    EMAIL_REQUIRED: "The email is required.",
    PASSWORD_MUST_BE_STRING: "The password must be a string.",
    PASSWORD_REQUIRED: "The password is required.",
    PASSWORD_MIN_LENGTH: "The password must have a minimum length.",
    PASSWORD_MAX_LENGTH: "The password must not exceed the maximum length.",
    PASSWORD_CREATE_MUST_BE_STRING: "The new password must be a string.",
    PASSWORD_CREATE_REQUIRED: "The new password is required.",
    PASSWORD_CREATE_MIN_LENGTH: "The new password must have a minimum length of 8 characters.",
    PASSWORD_CREATE_MAX_LENGTH: "The new password must not exceed 50 characters.",
    PASSWORD_CREATE_INVALID: "The new password must include at least one uppercase letter, one lowercase letter, one digit, and one special character.",
    PASSWORD_RESET_TOKEN_MUST_BE_STRING: "The password reset token must be a string.",
    PASSWORD_RESET_TOKEN_REQUIRED: "The password reset token is required.",
    ORGANIZATION_ID_MUST_BE_STRING: "The organization ID must be a string.",
    ORGANIZATION_ID_REQUIRED: "The organization ID is required.",
    INVALID_CREDENTIALS: "Invalid admin credentials",
    ADMIN_NOT_FOUND: "Admin not found",
    OTP_NOT_VERIFIED: "OTP not verified",
    PASSWORD_TOO_SHORT: "Password must be at least 6 characters",
    ADMIN_EMAIL_NOT_CONFIGURED: "Admin email not configured",
    OTP_EXPIRED_OR_NOT_FOUND: "OTP expired or not found. Please request a new OTP.",
    OTP_EXPIRED: "OTP has expired. Please request a new OTP.",
    INVALID_OTP: "Invalid OTP. Please check and try again.",
    OTP_MUST_BE_STRING: "OTP must be a string.",
    OTP_INVALID_LENGTH: "OTP must be 4 digits.",
    OTP_INVALID_FORMAT: "OTP must contain only digits.",
    OTP_REQUIRED: "OTP is required.",
  },

  // 🔹 Success Messages
  SUCCESS: {
    ADMIN_LOGIN_SUCCESS: "Admin login successful",
    PASSWORD_RESET_OTP_SENT: "Password reset OTP sent to admin email",
    OTP_VERIFIED: "OTP verified successfully",
    PASSWORD_RESET_SUCCESS: "Admin password reset successfully",
    OTP_RESENT: "OTP resent to admin email",
    ADMIN_LOGOUT_SUCCESS: "Admin logged out successfully",
  },

  // 🔹 Blog Errors
  BLOG: {
    TITLE_REQUIRED: "Blog title is required.",
    TITLE_MUST_BE_STRING: "Blog title must be a valid string.",
    TITLE_MIN_LENGTH: "Blog title must be at least 2 characters long.",
    TITLE_MAX_LENGTH: "Blog title must not exceed 100 characters.",
    CONTENT_REQUIRED: "Blog content is required.",
    CONTENT_MUST_BE_STRING: "Blog content must be a valid string.",
    CONTENT_MIN_LENGTH: "Blog content must be at least 10 characters long.",
    CONTENT_MAX_LENGTH: "Blog content must not exceed 10000 characters.",
    AUTHOR_REQUIRED: "Blog author is required.",
    AUTHOR_MUST_BE_STRING: "Blog author must be a valid string.",
    BLOG_NOT_FOUND: "Blog not found.",
    BLOG_CREATED: "Blog created successfully.",
    BLOG_UPDATED: "Blog updated successfully.",
    BLOG_DELETED: "Blog deleted successfully.",
  },

  // 🔹 Yacht Errors
  YACHT: {
    NAME_REQUIRED: "Yacht name is required.",
    NAME_MUST_BE_STRING: "Yacht name must be a valid string.",
    NAME_MIN_LENGTH: "Yacht name must be at least 2 characters long.",
    NAME_MAX_LENGTH: "Yacht name must not exceed 100 characters.",
    DESCRIPTION_REQUIRED: "Yacht description is required.",
    DESCRIPTION_MUST_BE_STRING: "Yacht description must be a valid string.",
    DESCRIPTION_MIN_LENGTH: "Yacht description must be at least 10 characters long.",
    DESCRIPTION_MAX_LENGTH: "Yacht description must not exceed 1000 characters.",
    PRICE_REQUIRED: "Yacht price is required.",
    PRICE_MUST_BE_NUMBER: "Yacht price must be a valid number.",
    PRICE_MIN_VALUE: "Yacht price must be greater than 0.",
    YACHT_NOT_FOUND: "Yacht not found.",
    YACHT_CREATED: "Yacht created successfully.",
    YACHT_UPDATED: "Yacht updated successfully.",
    YACHT_DELETED: "Yacht deleted successfully.",
  },

  // 🔹 Tag Errors
  TAG: {
    NAME_REQUIRED: "Tag name is required.",
    NAME_MUST_BE_STRING: "Tag name must be a valid string.",
    NAME_MIN_LENGTH: "Tag name must be at least 2 characters long.",
    NAME_MAX_LENGTH: "Tag name must not exceed 100 characters.",
    SLUG_REQUIRED: "Tag slug is required.",
    SLUG_MUST_BE_STRING: "Tag slug must be a valid string.",
    SLUG_MIN_LENGTH: "Tag slug must be at least 2 characters long.",
    SLUG_MAX_LENGTH: "Tag slug must not exceed 100 characters.",
    SLUG_INVALID_FORMAT: "Tag slug must contain only lowercase letters, numbers, and hyphens.",
    SLUG_ALREADY_EXISTS: "Tag with this slug already exists.",
    DESCRIPTION_MUST_BE_STRING: "Tag description must be a valid string.",
    DESCRIPTION_MAX_LENGTH: "Tag description must not exceed 500 characters.",
    UPDATE_FIELDS_REQUIRED: "ID and at least one field must be provided for update.",
    SORT_BY_INVALID: "SortBy must be one of: name, createdAt, updatedAt.",
    SORT_ORDER_INVALID: "SortOrder must be either asc or desc.",
    TAG_NOT_FOUND: "Tag not found.",
    TAG_CREATED: "Tag created successfully.",
    TAG_UPDATED: "Tag updated successfully.",
    TAG_DELETED: "Tag deleted successfully.",
    TAGS_FETCHED: "Tags fetched successfully.",
  },

  // 🔹 File Upload Errors
  FILE_UPLOAD: {
    FILE_REQUIRED: "File is required.",
    FILE_SIZE_EXCEEDED: "File size exceeds the maximum allowed limit.",
    INVALID_FILE_TYPE: "Invalid file type. Please upload a supported file format.",
    UPLOAD_FAILED: "File upload failed. Please try again.",
    FILE_NOT_FOUND: "File not found.",
    FILE_DELETED: "File deleted successfully.",
  },

  // 🔹 Database Errors
  DATABASE: {
    CONNECTION_FAILED: "Database connection failed.",
    QUERY_FAILED: "Database query failed.",
    RECORD_NOT_FOUND: "Record not found.",
    DUPLICATE_ENTRY: "A record with this information already exists.",
    CONSTRAINT_VIOLATION: "Database constraint violation.",
    TRANSACTION_FAILED: "Database transaction failed.",
  },

  // 🔹 External Service Errors
  EXTERNAL_SERVICE: {
    SERVICE_UNAVAILABLE: "External service is currently unavailable.",
    API_LIMIT_EXCEEDED: "API rate limit exceeded. Please try again later.",
    INVALID_RESPONSE: "Invalid response from external service.",
    TIMEOUT: "External service request timed out.",
    EMAIL_SEND_FAILED: "Failed to send email. Please try again later.",
  },
} as const;

// Type for accessing error constants
export type ErrorConstants = typeof errorConstants;

// Helper function to get nested error messages
export const getErrorMessage = (
  category: keyof ErrorConstants,
  errorKey: string
): string => {
  const categoryErrors = errorConstants[category] as Record<string, string>;
  return categoryErrors[errorKey] || "Unknown error occurred.";
};

// Export default for CommonJS compatibility
export default errorConstants;
