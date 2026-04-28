# DigiToken Deployment Guide

This guide provides instructions for deploying the DigiToken application to production.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (for production database)
- Email service account (Gmail recommended)
- Domain name (optional but recommended)
- Hosting service (Heroku, Netlify, Vercel, AWS, etc.)

## Environment Configuration

### Server Configuration

1. Navigate to the server directory and create a `.env` file based on the `.env.production` template:

```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/digitoken
JWT_SECRET=your_secure_jwt_secret_key_here
JWT_EXPIRE=30d
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLIENT_URL=https://your-production-domain.com
CORS_ORIGIN=https://your-production-domain.com
```

2. Replace the placeholder values with your actual production values:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string for JWT token encryption
   - `EMAIL_USER` and `EMAIL_PASSWORD`: Your email credentials (for Gmail, use an App Password)
   - `CLIENT_URL` and `CORS_ORIGIN`: Your client application's production URL

### Client Configuration

1. Navigate to the client directory and create a `.env` file based on the `.env.production` template:

```
REACT_APP_API_URL=https://your-production-domain.com/api
REACT_APP_NAME=DigiToken
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
```

2. Replace `https://your-production-domain.com/api` with your actual API endpoint.

## Building for Production

### Server Build

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server in production mode:
   ```
   npm start
   ```

### Client Build

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the production bundle:
   ```
   npm run build
   ```

4. The build folder will contain the optimized production files.

## Deployment Options

### Option 1: Separate Deployment (Recommended)

#### Server Deployment (Backend API)

1. Deploy the server to a Node.js hosting service like Heroku, DigitalOcean, or AWS:
   ```
   # Example for Heroku
   heroku create digitoken-api
   git subtree push --prefix server heroku main
   ```

2. Set environment variables on your hosting platform.

#### Client Deployment (Frontend)

1. Deploy the client build folder to a static hosting service like Netlify, Vercel, or AWS S3:
   ```
   # Example for Netlify
   netlify deploy --prod --dir=client/build
   ```

### Option 2: Combined Deployment

1. Configure the server to serve the client build files:
   ```javascript
   // In server.js
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '../client/build')));
     app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
     });
   }
   ```

2. Deploy the entire application to a Node.js hosting service.

## SSL Configuration

For production, ensure your application is served over HTTPS:

1. If using a service like Heroku, Netlify, or Vercel, SSL is typically provided automatically.
2. If self-hosting, consider using Let's Encrypt for free SSL certificates.

## Database Backup

Set up regular backups of your MongoDB database:

1. Use MongoDB Atlas scheduled backups
2. Implement a custom backup solution using `mongodump`

## Monitoring

Consider setting up monitoring for your production application:

1. Use services like New Relic, Datadog, or Sentry
2. Implement logging with Winston or similar libraries

## Troubleshooting

If you encounter issues with your production deployment:

1. Check server logs for errors
2. Verify environment variables are correctly set
3. Ensure database connection is working
4. Test email functionality

## Security Considerations

1. Ensure JWT_SECRET is strong and unique
2. Use environment variables for all sensitive information
3. Implement rate limiting for API endpoints
4. Keep all packages updated to patch security vulnerabilities
