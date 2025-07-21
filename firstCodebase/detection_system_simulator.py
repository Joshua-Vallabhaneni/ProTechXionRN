"""
detection_system_simulator.py
Python version of the shooter detection system simulator
"""

import os
import time
import random
import base64
from PIL import Image
import io
import threading
from firebase_config import COLLECTIONS, add_document, get_latest_document

# Path to sample image - we'll use a placeholder image for testing
SAMPLE_IMAGE_PATH = os.path.join(os.path.dirname(__file__), 'sample-shooter.png')

def generate_random_coordinates():
    """Generate random coordinates within a reasonable range"""
    return {
        'x': random.randint(0, 1000),  # Random X between 0-1000
        'y': random.randint(0, 1000),  # Random Y between 0-1000
        'timestamp': int(time.time() * 1000)  # Current time in milliseconds
    }

def create_placeholder_image():
    """Create a simple red square image if the sample image doesn't exist"""
    print("Creating a valid placeholder image...")
    
    # Create a 100x100 red square image
    img = Image.new('RGB', (100, 100), color='red')
    
    # Save the image
    img.save(SAMPLE_IMAGE_PATH)
    print("Valid PNG image created")

def send_shooter_image():
    """Send a shooter image to the database"""
    try:
        # Check if the sample image exists
        if not os.path.exists(SAMPLE_IMAGE_PATH):
            create_placeholder_image()
        
        # Read the sample image file
        with open(SAMPLE_IMAGE_PATH, 'rb') as image_file:
            image_bytes = image_file.read()
            base64_data = base64.b64encode(image_bytes).decode('utf-8')
        
        print(f"[DEBUG] Image data size: {len(base64_data)} characters")
        print(f"[DEBUG] First 50 chars of base64: {base64_data[:50]}...")
        
        # Create a data URI format that the app expects
        # The app is expecting a data URI format like 'data:image/png;base64,...'
        # but we're just sending the raw base64 data
        
        # Save to database using Firebase
        image_doc = add_document(COLLECTIONS.SHOOTER_IMAGE, {
            'base64Data': base64_data,
            'timestamp': int(time.time() * 1000)
        })
        
        print(f"Shooter image sent to database. ID: {image_doc['id']}")
        return image_doc['id']
    
    except Exception as error:
        print(f"Error sending shooter image: {error}")
        return None

def check_verification_status():
    """Check for verification status"""
    try:
        # Get the latest verification document
        latest_verification = get_latest_document(COLLECTIONS.SHOOTER_VERIFICATION)
        
        if latest_verification and latest_verification.get('isDetected'):
            print("SHOOTER VERIFIED! isDetected = true")
            print("Proceeding with shooter classification...")
            return True
        else:
            status = f"rejected (isDetected = {latest_verification.get('isDetected')})" if latest_verification else "not verified yet (no status)"
            print(f"Shooter detection {status}")
            return False
    
    except Exception as error:
        print(f"Error checking verification status: {error}")
        return False

def send_shooter_coordinates():
    """Send shooter coordinates"""
    try:
        # Generate random coordinates
        coordinates = generate_random_coordinates()
        
        # Save to database using Firebase
        add_document(COLLECTIONS.SHOOTER_COORDINATES, coordinates)
        
        print(f"Coordinates sent: X={coordinates['x']}, Y={coordinates['y']}")
        return coordinates
    
    except Exception as error:
        print(f"Error sending coordinates: {error}")
        return None

def run_simulation():
    """Run the detection system simulation"""
    print("Starting detection system simulation...")
    
    # First, send an initial image immediately
    print("\n--- IMMEDIATELY SENDING SHOOTER IMAGE ---")
    image_id = send_shooter_image()
    
    if image_id:
        print(f"Image with ID {image_id} sent to database")
        print("The React Native app should now display this image")
    else:
        print("Failed to send initial image")
    
    # Send initial coordinates
    print("\n--- SENDING INITIAL COORDINATES ---")
    initial_coords = send_shooter_coordinates()
    if initial_coords:
        print(f"Initial coordinates sent: X={initial_coords['x']}, Y={initial_coords['y']}")
    else:
        print('Failed to send initial coordinates')
    
    # Check verification status initially
    print("\n--- CHECKING INITIAL VERIFICATION STATUS ---")
    check_verification_status()
    
    # Set up recurring tasks
    print("\n--- STARTING CONTINUOUS MONITORING ---")
    
    # Flag to control the threads
    running = True
    
    # Function to check verification status periodically
    def verification_checker():
        while running:
            is_verified = check_verification_status()
            
            # If verified, we can stop checking
            if is_verified:
                print("Shooter has been verified, stopping verification checks.")
                break
            
            time.sleep(3)  # Check every 3 seconds
    
    # Function to send coordinates periodically
    def coordinates_sender():
        while running:
            send_shooter_coordinates()
            time.sleep(2)  # Send every 2 seconds
    
    # Start the threads
    verification_thread = threading.Thread(target=verification_checker)
    coordinates_thread = threading.Thread(target=coordinates_sender)
    
    verification_thread.daemon = True
    coordinates_thread.daemon = True
    
    verification_thread.start()
    coordinates_thread.start()
    
    try:
        # Run for 60 seconds or until Ctrl+C
        time.sleep(60)
        print("\n--- SIMULATION COMPLETE ---")
        print("In a real scenario, the detection system would continue running.")
        print("Press Ctrl+C to exit.")
        
        # Keep the main thread running to allow for Ctrl+C
        while True:
            time.sleep(1)
    
    except KeyboardInterrupt:
        # Set the flag to stop the threads
        running = False
        print("\nSimulation stopped by user.")

if __name__ == "__main__":
    # Print banner
    print("=" * 50)
    print("SHOOTER DETECTION SYSTEM SIMULATOR (PYTHON)")
    print("This simulator immediately sends a shooter image and coordinates")
    print("=" * 50)
    
    # Start the simulation
    run_simulation()
