# Testing the Communication Between Codebases

This guide will help you test the communication between the two codebases using Realm database as the communication layer.

## Prerequisites

1. Node.js for the firstCodebase simulator
2. React Native development environment set up

## Step 1: Set Up the First Codebase Simulator

Install dependencies for the simulator:

```bash
cd firstCodebase
npm install
```

Create the sample image:

```bash
npm run create-image
```

## Step 2: Start the React Native App

In a separate terminal, start your React Native app:

```bash
npm start
```

Select the appropriate platform (iOS or Android) to run the app.

## Step 3: Start the First Codebase Simulator

In a different terminal:

```bash
cd firstCodebase
npm start
```

This will:
1. Send a sample shooter image to the Realm database
2. Check for verification status (initially not verified)
3. Start sending random coordinates
4. Continuously poll for verification status changes

## Step 4: Testing the Integration

1. In the React Native app, navigate to the Test Communication screen:
   - You'll see a radio icon in the header (click this)
   - Or you can navigate to this screen programmatically

2. Observe that:
   - The sample shooter image should appear in the app
   - Coordinates should be updating in real-time
   - The verification status should show "Not Verified"

3. Click the "Confirm" button to verify the shooter detection

4. Observe the first codebase simulator terminal:
   - It should detect the verification status change
   - You should see a message: "SHOOTER VERIFIED! Proceeding with classification..."

## Test Scenarios

### Scenario 1: Image Transfer
- ✅ The first codebase sends an image
- ✅ The React Native app displays the image

### Scenario 2: Verification
- ✅ The React Native app allows verification (Confirm/Reject)
- ✅ The verification status is stored in the database
- ✅ The first codebase detects the verification status

### Scenario 3: Coordinates
- ✅ The first codebase sends random coordinates
- ✅ The React Native app displays the coordinates in real-time

## Troubleshooting

### Database Connection Issues
- If the app crashes, check that you have proper permissions for file access
- Make sure both apps are using the same Realm schema version
- For Android, make sure you grant file system permissions

### Image Not Appearing
- Check the simulator logs to ensure the image was properly saved to Realm
- Make sure the base64 encoding/decoding is working correctly
- Check app logs for file system errors

### Verification Not Working
- Check simulator logs to ensure verification documents are being read
- Verify that both apps can write to the Realm database
- Make sure timestamps are being properly set

### Coordinates Not Updating
- Check polling interval in both codebases
- Check simulator logs to ensure coordinates are being written
- Look for any errors in console logs

## Important Notes

- We're using Realm for local device storage, which is React Native compatible
- Both applications (simulator and React Native app) share the same Realm database file
- This method works well for testing and local development
- For production, you may want to consider a cloud-based solution like MongoDB Atlas with Realm Sync 