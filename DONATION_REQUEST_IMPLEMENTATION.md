# Donation Request System - Backend Implementation

## Overview
This implementation creates a complete donation request system where receivers can submit donation requests and admins can approve or reject them.

## Architecture

### 1. **Model** (`models/DonationRequest.js`)
- Stores donation requests with user reference
- Fields:
  - `userId` - Reference to User model (tracked from JWT token)
  - `patientname` - Patient's name
  - `age` - Patient's age (1-100)
  - `gender` - male/female/other
  - `medicalproblem` - Description of medical issue
  - `medicalreport` - File path for medical reports (required)
  - `identificationproof` - File path for ID proof (required)
  - `number` - 10-digit phone number
  - `donationamount` - Requested amount
  - `otherproof` - Optional additional file
  - `overview` - Additional message/details
  - `status` - pending/approved/rejected (default: pending)
- Includes timestamps (createdAt, updatedAt)
- Indexed for performance

### 2. **Middleware** (`middleware/authMiddleware.js`)
- `protect` - Verifies JWT token and attaches user to request
- `isAdmin` - Checks if authenticated user is an admin
- `isReceiver` - Checks if authenticated user is a receiver

### 3. **Controller** (`controllers/donationRequestController.js`)

#### Receiver Functions:
- **submitDonationRequest**
  - Extracts user ID from JWT token (req.user._id)
  - Handles file uploads (medical reports, ID proof, optional photo)
  - Creates donation request with status "pending"
  - Validates required fields

- **getMyDonationRequests**
  - Returns all donation requests for the logged-in receiver

#### Admin Functions:
- **getAllDonationRequests**
  - Returns all donation requests with pagination
  - Optional filtering by status
  - Populates user details

- **getSingleDonationRequest**
  - Returns single request by ID
  - Populates user details

- **getDonationsByRecipientId**
  - Returns all requests from a specific recipient

- **updateRequestStatus**
  - Updates request status (pending/approved/rejected)
  - Only accessible by admin

### 4. **Routes**

#### Receiver Routes (`routes/receiverRoutes.js`)
```
POST   /receiver/RequestDonation    - Submit new donation request (with file uploads)
GET    /receiver/MyRequests         - Get own donation requests
```

#### Admin Routes (`routes/adminRoutes.js`)
```
GET    /admin/GetAllDonationRequest              - Get all requests (with pagination)
GET    /admin/GetSingleDonationRequest/:id       - Get single request by ID
GET    /admin/GetSingleDonation/:recipientId     - Get requests by recipient ID
PUT    /admin/UpdateRequestStatus/:id/:status    - Update request status
```

## File Upload Configuration

### Multer Setup
- **Storage**: `uploads/donation-requests/`
- **File Size Limit**: 2MB per file
- **Allowed Types**: .jpg, .jpeg, .png, .pdf
- **File Fields**:
  - `medicalreport` (required)
  - `identificationproof` (required)
  - `otherproof` (optional)

### File Naming
Files are saved with unique names: `fieldname-timestamp-randomnumber.extension`

## Authentication Flow

1. **User Login** → Receives JWT token with user ID and role
2. **Token Verification** → Middleware extracts user from token
3. **Role Check** → Ensures user has correct role (RECEIVER/ADMIN)
4. **Request Processing** → User ID automatically attached from token

## API Request Examples

### 1. Submit Donation Request (Receiver)
```javascript
POST /receiver/RequestDonation
Headers: {
  Authorization: Bearer <token>
  Content-Type: multipart/form-data
}
Body (FormData): {
  patientname: "John Doe",
  age: 45,
  gender: "male",
  medicalproblem: "Heart surgery required",
  number: "9876543210",
  donationamount: "500000",
  overview: "Urgent medical assistance needed",
  medicalreport: <file>,
  identificationproof: <file>,
  otherproof: <file> (optional)
}
```

### 2. Get All Donation Requests (Admin)
```javascript
GET /admin/GetAllDonationRequest?status=pending&page=1&limit=10
Headers: {
  Authorization: Bearer <admin_token>
}
```

### 3. Update Request Status (Admin)
```javascript
PUT /admin/UpdateRequestStatus/64abc123def456/approved
Headers: {
  Authorization: Bearer <admin_token>
}
```

## Frontend Integration

### Current Frontend Code
The frontend already sends the correct data structure. The backend now:
1. ✅ Extracts user ID from JWT token (no need to send Receiverid)
2. ✅ Handles file uploads with multer
3. ✅ Sets status to "pending" by default
4. ✅ Provides admin endpoints for approval/rejection

### Frontend API Calls Match
- ✅ `/receiver/RequestDonation` - Matches frontend submission
- ✅ `/admin/GetAllDonationRequest` - Matches admin API
- ✅ `/admin/GetSingleDonationRequest/:id` - Matches admin API
- ✅ `/admin/GetSingleDonation/:recipientId` - Matches admin API
- ✅ `/admin/UpdateRequestStatus/:id/:status` - Matches admin API

## Donation Tracking System

A complete system has been added to track contributions from donors.

### 1. **Model** (`models/Donation.js`)
- `donorId`: Reference to User (DONOR)
- `requestId`: Reference to DonationRequest
- `amount`: Number (the contributed amount)
- `transactionId`: Unique ID for tracking the payment
- `status`: pending/success/failed
- `paymentMethod`: e.g., "Direct", "Card"
- `message`: Optional message from donor

### 2. **Endpoints**

#### Public Endpoints (`routes/homeRoutes.js`)
- `GET /Home/GetAcceptedRequest`: Lists all approved requests for the homepage.
- `GET /Home/GetdonationStatus/:id`: Calculates and returns the total amount raised for a specific request.

#### Donor Endpoints (`routes/donorRoutes.js`)
- `POST /donor/donate`: Submits a new donation.
- `GET /donor/MyDonations`: Returns the logged-in donor's history.

#### Admin Endpoints (`routes/adminRoutes.js`)
- `GET /admin/GetRequestDonations/:id`: Lists all donors and amounts for a specific case.

### 3. **How Donors Donate**
1. Donor logs in via the frontend.
2. Clicks on a "Donate" button (or the case card).
3. Sends a POST request to `/donor/donate` with:
   ```json
   {
     "requestId": "REQUEST_MONGODB_ID",
     "amount": 5000,
     "message": "Hope this helps!"
   }
   ```
4. The system verifies the request is "approved" and records the contribution.

## Security Features
... (existing content)
