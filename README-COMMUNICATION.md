# Application Communication Setup

This document explains how to set up communication between the shooter detection system and the application using Realm database.

## Overview

The two codebases communicate through a shared Realm database. This approach offers:
- Fast, real-time data exchange
- Simple implementation (no need for complex API servers)
- Works natively with React Native (no compatibility issues)
- Reliability and data persistence

## Realm Database Overview

Realm is a mobile database that works natively with React Native, providing:
- Fast local storage
- Real-time updates
- Works offline
- Easy object mapping

## Database Structure

The database uses the following structure:

- **Collections**:
  - `ShooterImage`: Stores images of detected shooters as base64 strings
  - `ShooterCoordinates`: Stores shooter location coordinates
  - `ShooterVerification`: Stores verification status

## Integration into First Codebase (Detection System)

In your detection system, you need to:

1. **Send shooter images**:
   - Save the detected shooter image to the database as base64

   ```javascript
   // Example code (Node.js with Realm)
   const Realm = require('realm');
   const fs = require('fs');
   const { getRealm } = require('./realm-config'); // Your Realm configuration

   async function saveShooterImage(imagePath) {
     const realm = await getRealm();
     
     // Read image file as Base64
     const imageBuffer = fs.readFileSync(imagePath);
     const base64Data = imageBuffer.toString('base64');
     
     // Save to database
     realm.write(() => {
       realm.create('ShooterImage', {
         _id: new Realm.BSON.ObjectId(),
         base64Data: base64Data,
         timestamp: Date.now()
       });
     });
   }
   ```

2. **Check for verification status**:
   - Continuously poll for the latest verification status
   - If `isDetected` is `true`, proceed with shooter classification

   ```javascript
   // Example code (Node.js with Realm)
   async function checkVerificationStatus() {
     const realm = await getRealm();
     
     // Get the latest verification document
     const verifications = realm.objects('ShooterVerification').sorted('timestamp', true);
     const latestVerification = verifications.length > 0 ? verifications[0] : null;
     
     if (latestVerification && latestVerification.isDetected) {
       // Shooter is verified, proceed with classification
       return true;
     }
     
     return false;
   }
   ```

3. **Send coordinates**:
   - Continuously update the shooter's location in the database

   ```javascript
   // Example code (Node.js with Realm)
   async function updateShooterCoordinates(x, y) {
     const realm = await getRealm();
     
     // Save coordinates
     realm.write(() => {
       realm.create('ShooterCoordinates', {
         _id: new Realm.BSON.ObjectId(),
         x: x,
         y: y,
         timestamp: Date.now()
       });
     });
   }
   ```

## Integration into This React Native App

This codebase is already set up to:
- Fetch shooter images
- Send verification status
- Receive shooter coordinates

To use the communication features in a screen, just import the `ShooterDetectionHandler` component:

```jsx
import ShooterDetectionHandler from '../components/ShooterDetectionHandler';

function YourScreen() {
  return (
    <View>
      <Text>Your screen content</Text>
      <ShooterDetectionHandler 
        onVerification={(isVerified) => {
          console.log('User verified shooter:', isVerified);
        }}
      />
    </View>
  );
}
```

## Testing

For testing, we've created a simulator in the `firstCodebase` directory that simulates the detection system. See the `TEST-COMMUNICATION.md` file for detailed testing instructions.

## Production Considerations

For production:

1. You may want to consider using MongoDB Realm Sync for a cloud-backed solution:
   - Create a MongoDB Atlas cluster
   - Set up Realm Sync
   - Update the Realm configuration to use Sync

2. Or implement a more robust API solution:
   - Create a backend server
   - Implement REST or GraphQL APIs
   - Use Firebase, MongoDB Atlas, or another cloud database

## Troubleshooting

1. **Connection issues**: 
   - Check file permissions
   - Make sure both apps can access the same Realm file
   - Check for schema version mismatches

2. **Missing data**:
   - Verify that data is being written to the correct collections
   - Check for errors in the console logs
   - Verify timestamps are being set correctly

3. **React Native specific issues**:
   - Check that you're using the latest version of Realm
   - For Android, ensure file system permissions are granted
   - For iOS, check privacy settings 