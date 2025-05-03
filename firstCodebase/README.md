# Shooter Detection System Simulator

This folder contains scripts that simulate the "first codebase" (detection system) functionality:

1. Sending shooter images to the Realm database
2. Checking for verification status updates
3. Sending shooter coordinates to the database

## Setup

1. Install dependencies:
   ```
   cd firstCodebase
   npm install
   ```

## Create Sample Image

First, create the sample image for testing:

```
npm run create-image
```

This will create a simple PNG image called `sample-shooter.png` in this directory.

## Run the Simulator

To run the detection system simulator:

```
npm start
```

The simulator will:
1. Send the initial shooter image
2. Check for verification status (initially not verified)
3. Start continuous monitoring:
   - Check verification status every 3 seconds
   - Send random coordinates every 2 seconds

The simulation will automatically stop after 1 minute, but you can exit at any time with Ctrl+C.

## Testing the Full System

To test the complete communication flow:

1. First start your React Native app in one terminal
2. Then start this simulator: `npm start`
3. In the React Native app, navigate to the Test Communication screen
4. Use the ShooterDetectionHandler component in your app to:
   - View the uploaded image
   - Verify the detection with the "Confirm" button
   - View the real-time coordinates

## Technical Details

This simulator uses Realm for local storage, which is compatible with React Native. The Realm database file is shared between the simulator and the React Native app, allowing them to communicate.

The simulator creates and reads from these Realm collections:
- `ShooterImage` - Stores images as base64 strings
- `ShooterCoordinates` - Stores x,y coordinates with timestamps
- `ShooterVerification` - Stores verification status (true/false) 