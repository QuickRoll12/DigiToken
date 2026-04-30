<div align="center">
  <h1>🎫 DigiToken</h1>
  <p><strong>Enterprise-Grade Digital Food Token & Event Management System</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![AWS SES](https://img.shields.io/badge/Amazon_AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/ses/)
  [![Material UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white)](https://mui.com/)
</div>

<br />

## 📖 Overview

**DigiToken** is a comprehensive, scalable web application designed to revolutionize the distribution and management of food tokens for large-scale college events (fests, farewells, freshers, etc.). 

It completely eliminates the logistical nightmare, costs, and environmental impact of physical paper tokens by replacing them with a secure, highly-optimized **QR-code-based distribution and verification system**. Capable of handling thousands of students, it features bulk-emailing capabilities powered by AWS SES, real-time scanning validation, and detailed analytical dashboards.

---

## ✨ Key Features

### 👨‍💼 Administrator Capabilities
*   **Centralized Event Management:** Create, manage, and toggle active status for multiple campus events simultaneously.
*   **Student Database Integration:** Bulk upload student data via CSV parsing (Name, Email, Course, Year, Roll Number) for seamless token mapping.
*   **Intelligent QR Generation:** Generate unique, cryptographically secure QR codes mapped to specific students, courses, years, and dietary preferences (Veg/Non-Veg).
*   **High-Volume Bulk Emailing (AWS SES):** Distribute thousands of QR codes directly to student inboxes securely without rate-limiting, powered by Amazon Simple Email Service (SES).
*   **Advanced Bounce Tracking:** A dedicated Bounced Emails dashboard to automatically track, log, and manage failed email deliveries (invalid addresses, full mailboxes) without halting the entire batch process.
*   **Real-time Analytics Dashboard:** Visualize token distribution, usage rates, daily scanning trends, and course-wise analytics through interactive Chart.js graphs.
*   **Role-Based Access Control:** Secure JWT authentication distinguishing between `admin` (full access) and `staff` (scanning only) roles.

### 📱 Scanner / Staff Capabilities
*   **Instant QR Verification:** Built-in HTML5 camera scanner to validate student QR codes at food counters instantly.
*   **Fraud Prevention:** Prevents double-dipping by marking QR codes as "Used" immediately upon the first successful scan.
*   **Event Filtering:** Ensure students are scanning tokens valid for the *current* active event, preventing cross-event token usage.

---

## 🛠️ Technology Stack

### Frontend (Client)
*   **Core:** React.js (v18), React Router DOM (v6)
*   **UI/UX:** Material-UI (MUI v5) for a responsive, modern, and accessible interface.
*   **Data Visualization:** Chart.js & React-Chartjs-2
*   **Utilities:** `html5-qrcode` (camera scanning), `qrcode.react` (QR rendering), `papaparse` (CSV handling).

### Backend (Server)
*   **Core:** Node.js, Express.js
*   **Database:** MongoDB via Mongoose (v7)
*   **Authentication:** JSON Web Tokens (JWT), bcryptjs for password hashing.
*   **Email Infrastructure:** Nodemailer integrated securely with **AWS SES (Simple Email Service)**.
*   **Utilities:** `multer` (file uploads), `csv-parser` (data extraction).

---

## 🏗️ System Architecture Flow

1.  **Preparation:** Admin creates an `Event` and uploads a CSV of `Students`.
2.  **Generation:** Admin generates `QRCodes` targeting specific demographics (e.g., "B.Tech 4th Year for Farewell Event").
3.  **Distribution:** Admin triggers the bulk email process. The server batches the requests and securely dispatches HTML emails containing the unique QR codes via AWS SES.
4.  **Error Handling:** If a student's email bounces, AWS SES notifies the server. The server logs this into the `BouncedEmail` collection for Admin review, while the rest of the batch continues uninterrupted.
5.  **Execution:** At the event, students present their QR codes on their phones. Staff use the built-in `AdminQRScanner` (via laptop webcam or mobile browser) to scan.
6.  **Validation:** The server verifies the token's authenticity, checks if it has been used, and updates its status in real-time.

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16.x or higher)
*   [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster)
*   [Git](https://git-scm.com/)
*   An **AWS Account** with SES configured for production access (or verified email addresses if in Sandbox mode).

### 1. Clone the Repository
```bash
git clone https://github.com/QuickRoll12/DigiToken.git
cd DigiToken
```

### 2. Environment Configuration
Navigate to the `server` directory and create a `.env` file based on the provided configuration variables below:

#### `server/.env`
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment state | `development` or `production` |
| `MONGO_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@cluster...` |
| `JWT_SECRET` | Secret key for JWT signing | `your_super_secret_jwt_key_here` |
| `AWS_SES_SMTP_HOST` | AWS SES SMTP Endpoint | `email-smtp.ap-south-1.amazonaws.com` |
| `AWS_SES_SMTP_PORT` | AWS SES SMTP Port | `587` |
| `AWS_SES_SMTP_USER` | AWS SES SMTP Username | `AKIA...` |
| `AWS_SES_SMTP_PASS` | AWS SES SMTP Password | `BII...` |
| `SES_FROM_EMAIL` | Verified sender email address | `noreply@yourdomain.com` |
| `SES_FROM_NAME` | Sender display name | `DigiToken Events` |

### 3. Installation
You will need to install dependencies for both the frontend and backend.

**Install Backend Dependencies:**
```bash
cd server
npm install
```

**Install Frontend Dependencies:**
```bash
cd ../client
npm install
```

### 4. Running the Application locally

To run both the client and server concurrently during development:

**Start the Backend:**
```bash
cd server
npm run dev
# Server will run on http://localhost:5000
```

**Start the Frontend:**
```bash
cd client
npm start
# Client will run on http://localhost:3000
```

---

## 📂 Project Structure

```text
DigiToken/
├── client/                     # React Frontend
│   ├── public/                 # Static assets
│   └── src/
│       ├── components/         # Reusable UI components (Auth, Layout)
│       ├── context/            # React Context (AuthContext)
│       ├── pages/              # Main application views (Dashboard, Events, QRManagement, etc.)
│       ├── utils/              # API interceptors and helper functions
│       ├── App.js              # Main routing component
│       └── index.js            # React entry point
│
├── server/                     # Node.js/Express Backend
│   ├── controllers/            # Business logic (qrController, statsController, bouncedEmailController, etc.)
│   ├── middleware/             # Custom middleware (auth.js for JWT & Role verification)
│   ├── models/                 # Mongoose schemas (User, Student, Event, QRCode, BouncedEmail)
│   ├── routes/                 # Express API routes
│   └── server.js               # Express application entry point
│
├── README.md                   # Project documentation
└── DEPLOYMENT.md               # Detailed deployment guide
```

---

## 📧 Notes on AWS SES Integration
This project relies heavily on **Amazon Simple Email Service (SES)** via SMTP for delivering thousands of QR codes. 
*   **Batch Processing:** The `qrController` is specifically optimized to send emails in small batches (e.g., 5-10 at a time) with brief pauses to respect AWS SES rate limits (e.g., 14 emails/second limit) and avoid account blacklisting.
*   **Bounce Resilience:** If an email fails due to a typo (e.g., `@gamil.com`), the system catches the error, logs the student's details in the **Bounced Emails** dashboard, and continues processing the remaining thousands of emails without crashing.

---

## 🔒 Security
*   All passwords are encrypted using `bcryptjs` before being stored in the database.
*   API endpoints are secured using `jsonwebtoken`. Protected routes require a valid Bearer token.
*   Admin-specific routes (like generating tokens or viewing analytics) utilize an `admin` middleware to ensure standard staff cannot access sensitive operations.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ for efficient college event management.</p>
</div>
