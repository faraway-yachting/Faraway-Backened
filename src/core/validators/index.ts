import {
    adminLoginSchema,
    adminForgotPasswordSchema,
    adminVerifyOtpSchema,
    adminResetPasswordSchema,
    adminResendOtpSchema,
  } from './auth.validation.js';
  
  const validationSchemas = {
    // Admin Authentication Routes
    'admin/auth/login': { POST: adminLoginSchema },
    'admin/auth/forgot-password': { POST: adminForgotPasswordSchema },
    'admin/auth/verify-otp': { POST: adminVerifyOtpSchema },
    'admin/auth/reset-password': { POST: adminResetPasswordSchema },
    'admin/auth/resend-otp': { POST: adminResendOtpSchema },
    
    // Yacht Routes
    'v1/yachts': { 
      POST: null, // Validation handled by middleware
      PUT: null   // Validation handled by middleware
    },
    
    // Blog Routes
    'v1/blogs': { 
      POST: null, // Validation handled by middleware
      PUT: null   // Validation handled by middleware
    }
  };
  
  export { validationSchemas };
  