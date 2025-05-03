# ProTechXionRN

This is a React Native implementation of the ProTechXion app, which provides emergency response and evacuation functionality for educational institutions during crisis situations.

## Features

- User roles (Faculty and Student)
- Threat detection and confirmation workflow
- Interactive evacuation maps
- Emergency notifications
- Automated emergency services alerts

## Google Authentication Setup

This application uses Google OAuth for authentication. Follow these steps to configure Google Auth properly:

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth client ID credentials:
   - Web application (for web and Expo Go testing)
   - Android (for Android app)
   - iOS (for iOS app)

5. Configure OAuth consent screen:
   - Add your app name and contact information
   - Add scopes for "email" and "profile"
   - Add test users (for development)

### 2. Configure Redirect URIs

For each OAuth client, configure the correct redirect URIs:

#### Web Client (for Expo Go testing):
- `https://auth.expo.io/@your-expo-username/ProTechXionRN`

#### Android Client:
- `com.protechxion.mobile:/oauth2redirect`

#### iOS Client:
- `com.protechxion.mobile:/oauth2redirect`

### 3. Update Configuration Files

1. Update `app/config/env.ts` with your OAuth client IDs
2. Verify that app.json has the correct configuration:
   - Correct bundle identifiers/package names
   - Proper scheme configuration

### 4. Testing Google Auth

1. Make sure you're using an actual device or simulator, not web browser
2. Use Expo Go for development testing
3. Check the logs for detailed error information

### 5. Troubleshooting

If you encounter the "Access blocked: Authorization Error":
- Verify you're using the correct client IDs
- Make sure redirect URIs are properly configured
- Check that your test user is added to the OAuth consent screen
- Verify that the Google Auth API is enabled in Google Cloud Console

## Running the App

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Project Structure

- `/app`: Main application code
  - `/components`: Reusable components
  - `/config`: Configuration files
  - `/context`: React context providers, including AuthContext for Google Auth
  - `/navigation`: Navigation components and routes
  - `/screens`: Application screens, organized by feature
  - `/theme`: Styling constants and themes
  - `/utils`: Utility functions

## Additional Resources

- [Expo Auth Session Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

## Project Structure

```
app/
├── assets/           # Images and static assets
├── components/       # Reusable UI components
├── context/          # React Context for state management
├── models/           # TypeScript types and data models
├── navigation/       # Navigation configuration
├── screens/          # App screens organized by user role
│   ├── Faculty/      # Faculty-specific screens
│   ├── Student/      # Student-specific screens
│   └── common/       # Shared screens like login
└── utils/            # Utility functions
```

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Run on iOS: `npm run ios` or Android: `npm run android`

## Usage

- Faculty can generate test threats, confirm or deny them
- Students can view confirmed threats and follow evacuation procedures
- Both roles can access the interactive evacuation map

## Technologies Used

- React Native with Expo
- TypeScript
- React Navigation for routing
- Context API for state management

## License

This project is licensed under the MIT License. # ProTechXionRN
