#!/bin/bash
# Get auth token from Firebase Auth emulator
TOKEN=$(curl -s -X POST http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin@12345",
    "returnSecureToken": true
  }' | jq -r '.idToken')

echo "Got auth token: ${TOKEN:0:30}..."

# Update roles array via Firestore REST API
echo "Updating roles array..."

curl -X PATCH "http://127.0.0.1:8080/v1/projects/demo-tati/databases/(default)/documents/users/gubN3Ry88IsIOsKy4IFzE7A0bAGl?updateMask.fieldPaths=roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fields": {
      "roles": {
        "arrayValue": {
          "values": [{"stringValue": "admin"}]
        }
      }
    }
  }' | jq '.'
