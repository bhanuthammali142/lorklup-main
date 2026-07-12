# HostelOS Backend Setup & Deployment Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Amazon EC2 Instance (for production hosting)

---

## Local Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   # Database (PostgreSQL Connection String)
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/hostel_management

   # JWT
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # Server
   PORT=5001
   ```

3. **Initialize the PostgreSQL database schema:**
   ```bash
   psql -U postgres -d hostel_management -f schema.sql
   ```

4. **Seed the default superadmin account:**
   ```bash
   npm run seed
   ```

   This creates the default superadmin credentials:
   - **Email:** admin@hostel.com
   - **Password:** Bhanu@2006
   - **Role:** Super Admin

---

## Running the Server Locally

**Development (with watch mode):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The local API server runs on `http://localhost:5001/api`.

---

## Amazon EC2 Deployment (Production)

To deploy the backend to your Amazon EC2 instance:

### 1. Security Group Configuration
Ensure your EC2 Security Group allows inbound traffic on the backend port:
- **Type**: Custom TCP
- **Port Range**: `5001` (or your configured port)
- **Source**: `Anywhere-IPv4` or restricted to your frontend application's origins.

### 2. Install Node.js & PM2 on EC2
Log in to your EC2 instance and set up Node.js along with a process manager like **PM2** to keep the server running continuously:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install pm2 -g
```

### 3. Deploy and Start Backend
Transfer the backend code to your EC2 instance, populate the production `.env` file (with your EC2 database configurations), then run:
```bash
# Navigate to the backend directory
cd /path/to/project/backend

# Install production dependencies
npm install --omit=dev

# Start the server using PM2
pm2 start server.js --name "hostelos-backend"

# Save the PM2 process list to start automatically on system reboot
pm2 save
pm2 startup
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/register` - Register a new admin account
- `GET /api/auth/me` - Get current user profile information
- `POST /api/auth/change-password` - Change account password

---

## Troubleshooting

**PostgreSQL Connection Failed:**
- Verify PostgreSQL service is active: `sudo systemctl status postgresql`.
- Ensure connection parameters (user, password, host, port) in the `.env` file are correct.
- Check that the database specified in `DATABASE_URL` has been created.

**Port Already in Use:**
- Check for running processes on the port: `lsof -ti:5001`.
- Terminate the process if necessary: `kill -9 $(lsof -t -i:5001)`.
