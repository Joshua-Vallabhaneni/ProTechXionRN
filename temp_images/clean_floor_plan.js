// A simple script to create a clean floor plan image
const fs = require('fs');
const path = require('path');

// Paths
const sourcePath = path.join(__dirname, '..', 'assets', 'images', 'FirstFloor.png');
const backupPath = path.join(__dirname, '..', 'assets', 'images', 'FirstFloor.png.backup');
const targetPath = path.join(__dirname, '..', 'assets', 'images', 'FirstFloor.png');

// Copy the backup version to replace the current one
try {
  // Make sure we have a backup
  if (fs.existsSync(backupPath)) {
    // Replace the current file with the backup
    fs.copyFileSync(backupPath, targetPath);
    console.log('Successfully replaced FirstFloor.png with the backup version');
  } else {
    console.error('Backup file not found');
  }
} catch (error) {
  console.error('Error replacing the floor plan image:', error);
}
