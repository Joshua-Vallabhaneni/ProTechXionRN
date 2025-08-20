"""
firebase_config.py
Firebase configuration for the Python simulator
"""

import requests
import json
import time
from datetime import datetime
import os

# Firebase collections (paths)
class COLLECTIONS:
    SHOOTER_IMAGE = 'ShooterImage'
    SHOOTER_VERIFICATION = 'ShooterVerification'
    SHOOTER_COORDINATES = 'ShooterCoordinates'
    LOST_SHOOTER_COORDINATES = 'LostShooterCoordinates'

# Firebase configuration
firebase_config = {
    "apiKey": "AIzaSyAtvS-jJZNzn_5T8_y-zkKQazNfONo33SU",
    "authDomain": "protechxion-app.firebaseapp.com",
    "databaseURL": "https://protechxion-app-default-rtdb.firebaseio.com",
    "projectId": "protechxion-app",
    "storageBucket": "protechxion-app.firestorage.app",
    "messagingSenderId": "1025772388829",
    "appId": "1:1025772388829:web:eab2947e46299980d83634",
    "measurementId": "G-161S6JPJ38"
}

# Firebase REST API base URL
FIREBASE_DB_URL = firebase_config["databaseURL"]

def add_document(collection, document):
    """
    Add a document to a collection
    
    Args:
        collection (str): The collection to add to
        document (dict): The document to add
        
    Returns:
        dict: The document with its ID
    """
    try:
        # Add timestamp if not present
        if 'timestamp' not in document:
            document['timestamp'] = int(datetime.now().timestamp() * 1000)  # Milliseconds
        
        # Use Firebase REST API to push a new document
        url = f"{FIREBASE_DB_URL}/{collection}.json"
        response = requests.post(url, data=json.dumps(document))
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Get the ID from the response
        result = response.json()
        doc_id = result.get('name')  # Firebase returns the key as 'name'
                
        # Return the document with its ID
        document['id'] = doc_id
        return document
    
    except Exception as error:
        print(f"Error adding document to {collection}: {error}")
        raise error

