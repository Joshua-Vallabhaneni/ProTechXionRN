/**
 * env.ts
 * Environment configuration for authentication and API keys
 * These are placeholder values for mock authentication and API services
 */

// Google Auth client IDs
export const WEB_CLIENT_ID = 'mock-web-client-id';
export const ANDROID_CLIENT_ID = 'mock-android-client-id';
export const IOS_CLIENT_ID = 'mock-ios-client-id';
export const EXPO_CLIENT_ID = 'mock-expo-client-id';

// Twilio API credentials - Replace with actual values in production
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'your_twilio_account_sid_here';
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token_here';
export const TWILIO_PHONE_NUMBER = '+18779347536';
export const EMERGENCY_PHONE_NUMBER = '+16102031757';
export const TWILIO_TWIML_URL = 'https://handler.twilio.com/twiml/EH297c30ea8d315b2fdf0b4ac786f19b3c';