"""
clear_database.py
Utility script to clear all entries in the Firebase database (Python version)
"""

import requests
from firebase_config import COLLECTIONS, FIREBASE_DB_URL

def clear_collection(collection):
    """Clear all entries in a specific collection"""
    try:
        print(f"Clearing all entries in {collection}...")
        url = f"{FIREBASE_DB_URL}/{collection}.json"
        response = requests.delete(url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        print(f"✅ Successfully cleared all entries in {collection}")
    except Exception as error:
        print(f"❌ Error clearing entries in {collection}: {error}")

def clear_all_collections():
    """Clear all entries in all collections"""
    print("🔄 Starting database cleanup...")
    
    # Clear each collection
    clear_collection(COLLECTIONS.SHOOTER_IMAGE)
    clear_collection(COLLECTIONS.SHOOTER_VERIFICATION)
    clear_collection(COLLECTIONS.SHOOTER_COORDINATES)
    
    print("✅ Database cleanup complete! All collections have been cleared.")
    print("You can now start testing with a fresh database.")

if __name__ == "__main__":
    # Run the cleanup
    try:
        clear_all_collections()
    except Exception as error:
        print(f"❌ Error during database cleanup: {error}")
