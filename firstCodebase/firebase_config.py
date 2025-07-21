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
    LAST_DETECTED_LOCATION = 'LastDetectedLocation' 

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
    Add a document to a collection and clean up old entries
    
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
        
        # Clean up old entries based on collection type
        cleanup_old_entries(collection)
        
        # Return the document with its ID
        document['id'] = doc_id
        return document
    
    except Exception as error:
        print(f"Error adding document to {collection}: {error}")
        raise error

def get_latest_document(collection):
    """
    Get the most recent document from a collection
    
    Args:
        collection (str): The collection to query
        
    Returns:
        dict: The most recent document or None
    """
    try:
        # Use Firebase REST API to query the collection
        # orderBy and limitToLast are query parameters
        url = f"{FIREBASE_DB_URL}/{collection}.json"
        params = {
            'orderBy': '"timestamp"',
            'limitToLast': 1
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        data = response.json()
        
        if data and isinstance(data, dict):
            # Convert to object (there should be only one)
            for key, value in data.items():
                return {
                    'id': key,
                    **value
                }
        
        return None
    
    except Exception as error:
        print(f"Error getting latest document from {collection}: {error}")
        return None

def get_documents_sorted(collection, field, ascending=False):
    """
    Get documents from a collection sorted by a field
    
    Args:
        collection (str): The collection to query
        field (str): The field to sort by
        ascending (bool): Whether to sort in ascending order
        
    Returns:
        list: The sorted documents
    """
    try:
        # Use Firebase REST API to query the collection
        url = f"{FIREBASE_DB_URL}/{collection}.json"
        params = {
            'orderBy': f'"{field}"'
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        data = response.json()
        
        if not data or not isinstance(data, dict):
            return []
        
        # Convert to array
        array = []
        for key, value in data.items():
            array.append({
                'id': key,
                **value
            })
        
        # Sort as needed (Firebase sometimes returns in wrong order)
        array.sort(key=lambda x: x.get(field, 0), reverse=not ascending)
        
        return array
    
    except Exception as error:
        print(f"Error getting sorted documents from {collection}: {error}")
        return []

def cleanup_old_entries(collection):
    """
    Clean up old entries in a collection based on collection type
    
    Args:
        collection (str): The collection to clean up
    """
    try:
        retain_count = 10  # Default number of entries to keep
        
        # Set specific retention counts based on collection
        if collection == COLLECTIONS.SHOOTER_COORDINATES:
            retain_count = 10  # Keep the latest 10 coordinates
        elif collection == COLLECTIONS.SHOOTER_VERIFICATION:
            retain_count = 5   # Keep the latest 5 verification entries
        elif collection == COLLECTIONS.SHOOTER_IMAGE:
            retain_count = 3   # Keep the latest 3 images
        elif collection == COLLECTIONS.LAST_DETECTED_LOCATION:  
            retain_count = 20  # Keep the latest 20 last detected locations
        
        # Get all documents sorted by timestamp (newest first)
        items = get_documents_sorted(collection, 'timestamp', ascending=False)
        
        # If we have more items than we want to retain, delete the oldest ones
        if len(items) > retain_count:
            print(f"Cleaning up {collection}: {len(items)} items, keeping {retain_count}")
            
            # Get the items to delete (oldest ones)
            items_to_delete = items[retain_count:]
            
            # Delete each item using REST API
            for item in items_to_delete:
                item_id = item['id']
                delete_url = f"{FIREBASE_DB_URL}/{collection}/{item_id}.json"
                response = requests.delete(delete_url)
                response.raise_for_status()  # Raise an exception for HTTP errors
            
            print(f"Deleted {len(items_to_delete)} old entries from {collection}")
    
    except Exception as error:
        print(f"Error cleaning up old entries in {collection}: {error}")
