# SecureAuth Pro - MERN Authentication System

## Features
- User Registration with Email Verification
- JWT-based Authentication
- Password Reset Functionality
- Protected Routes
- User Profile Management

## Tech Stack
- MongoDB
- Express.js
- React.js
- Node.js
- JWT for Authentication
- NodeMailer for Email Services

## Installation
1. Clone the repository
```bash
git clone https://github.com/Nikhil-Netha04/SecureAuthPro.git
```

2. Install dependencies for server
```bash
cd server
npm install
```

3. Install dependencies for client
```bash
cd client
npm install
```

4. Create .env files in both server and client directories
5. Run the development server
```bash
# In server directory
npm run dev

# In client directory
npm run dev
```

## Environment Variables
### Server
- PORT=4000
- MONGODB_URI=your_mongodb_uri
- JWT_SECRET=your_jwt_secret
- EMAIL_HOST=your_smtp_host
- EMAIL_USER=your_email
- EMAIL_PASS=your_email_password

### Client
- VITE_API_URL=http://localhost:4000

## Contributing
Pull requests are welcome.
