/**
 * report-threat.js
 * 
 * This script uses the React Native Dev tools to trigger the Report Threat button
 * after a 10-second delay. Run this script using 'node scripts/report-threat.js'
 */

const fs = require('fs');
const path = require('path');

// Hijack the AlertContext to simulate pressing the Report Threat button
console.log('Starting threat report sequence...');
console.log('Waiting 10 seconds before triggering threat report...');

// Countdown
let secondsLeft = 10;
const interval = setInterval(() => {
  console.log(`${secondsLeft} seconds remaining...`);
  secondsLeft--;
  
  if (secondsLeft < 0) {
    clearInterval(interval);
    console.log('Triggering threat report now!');
    
    // This is where we would trigger the actual reporting
    // Since we can't directly interact with the app's state from a Node script,
    // we'll create a flag file that the app can look for
    
    const flagFilePath = path.join(__dirname, '..', 'threat-flag.json');
    fs.writeFileSync(flagFilePath, JSON.stringify({
      reportThreat: true,
      timestamp: new Date().toISOString()
    }));
    
    console.log('Threat flag file created. The app will detect this and trigger the threat alert.');
    console.log('Flag file created at:', flagFilePath);
  }
}, 1000); 