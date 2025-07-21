const fs = require('fs');
const path = require('path');
const { COLLECTIONS, addDocument, getLatestDocument, getDocumentsSorted } = require('./firebaseConfig');

// Path to sample image - we'll use a placeholder image for testing
const SAMPLE_IMAGE_PATH = path.join(__dirname, 'sample-shooter.png');

// Simulate coordinates within a reasonable range
function generateRandomCoordinates() {
  return {
    x: Math.floor(Math.random() * 1000),  // Random X between 0-1000
    y: Math.floor(Math.random() * 1000),  // Random Y between 0-1000
    timestamp: Date.now()
  };
}

// FUNCTION 1: Send a shooter image to the database
async function sendShooterImage() {
  try {
    // Check if the sample image exists
    if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
      console.error(`Sample image not found at: ${SAMPLE_IMAGE_PATH}`);
      console.log("Creating a valid placeholder image...");
      
      // Create a simple PNG image (1x1 pixel, red color)
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      fs.writeFileSync(SAMPLE_IMAGE_PATH, pngData);
      console.log("Valid PNG image created");
    }
    
    // Read the sample image file
    const imageBuffer = fs.readFileSync(SAMPLE_IMAGE_PATH);
    const base64Data = imageBuffer.toString('base64');
    
    console.log(`[DEBUG] Image data size: ${base64Data.length} characters`);
    console.log(`[DEBUG] First 50 chars of base64: ${base64Data.substring(0, 50)}...`);
    
    // Save to database using Firebase directly
    const imageDoc = await addDocument(COLLECTIONS.SHOOTER_IMAGE, {
      base64Data: base64Data,
      timestamp: Date.now()
    });
    
    console.log(`Shooter image sent to database. ID: ${imageDoc.id}`);
    return imageDoc.id;
  } catch (error) {
    console.error("Error sending shooter image:", error);
    return null;
  }
}

// FUNCTION 2: Check for verification status
async function checkVerificationStatus() {
  try {
    // Get the latest verification document
    const latestVerification = await getLatestDocument(COLLECTIONS.SHOOTER_VERIFICATION);
    
    if (latestVerification && latestVerification.isDetected) {
      console.log("SHOOTER VERIFIED! isDetected = true");
      console.log("Proceeding with shooter classification...");
      return true;
    } else {
      const status = latestVerification ? 
        `rejected (isDetected = ${latestVerification.isDetected})` : 
        "not verified yet (no status)";
      console.log(`Shooter detection ${status}`);
      return false;
    }
  } catch (error) {
    console.error("Error checking verification status:", error);
    return false;
  }
}

// FUNCTION 3: Send shooter coordinates
async function sendShooterCoordinates() {
  try {
    // Generate random coordinates
    const coordinates = generateRandomCoordinates();
    
    // Save to database using Firebase directly
    await addDocument(COLLECTIONS.SHOOTER_COORDINATES, coordinates);
    
    console.log(`Coordinates sent: X=${coordinates.x}, Y=${coordinates.y}`);
    return coordinates;
  } catch (error) {
    console.error("Error sending coordinates:", error);
    return null;
  }
}

// Run the simulation
async function runSimulation() {
  console.log("Starting detection system simulation...");
  
  // First, send an initial image immediately
  console.log("\n--- IMMEDIATELY SENDING SHOOTER IMAGE ---");
  const imageId = await sendShooterImage();
  
  if (imageId) {
    console.log(`Image with ID ${imageId} sent to database`);
    console.log("The React Native app should now display this image");
  } else {
    console.error("Failed to send initial image");
  }
  
  // Send initial coordinates
  console.log("\n--- SENDING INITIAL COORDINATES ---");
  const initialCoords = await sendShooterCoordinates();
  if (initialCoords) {
    console.log(`Initial coordinates sent: X=${initialCoords.x}, Y=${initialCoords.y}`);
  } else {
    console.log('Failed to send initial coordinates');
  }
  
  // Check verification status initially
  console.log("\n--- CHECKING INITIAL VERIFICATION STATUS ---");
  await checkVerificationStatus();
  
  // Set up recurring tasks
  console.log("\n--- STARTING CONTINUOUS MONITORING ---");
  
  // Check verification status every 3 seconds
  const verificationInterval = setInterval(async () => {
    const isVerified = await checkVerificationStatus();
    
    // If verified, we can stop checking
    if (isVerified) {
      console.log("Shooter has been verified, stopping verification checks.");
      clearInterval(verificationInterval);
    }
  }, 3000);
  
  // Send coordinates every 2 seconds
  const coordinatesInterval = setInterval(() => {
    sendShooterCoordinates();
  }, 2000);
  
  // After 1 minute, stop the simulation
  setTimeout(() => {
    clearInterval(coordinatesInterval);
    console.log("\n--- SIMULATION COMPLETE ---");
    console.log("In a real scenario, the detection system would continue running.");
    console.log("Press Ctrl+C to exit.");
    // Firebase connections are managed automatically
  }, 60000);
}

// Start the simulation immediately
console.log("=".repeat(50));
console.log("SHOOTER DETECTION SYSTEM SIMULATOR");
console.log("This simulator immediately sends a shooter image and coordinates");
console.log("=".repeat(50));
runSimulation(); 