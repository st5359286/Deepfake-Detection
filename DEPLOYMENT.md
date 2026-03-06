# Deploy Your Deepfake Detection Project for Free

Your project is already on GitHub: https://github.com/st5359286/Deepfake-Detection

## Free Deployment Options

### Option 1: Render (Backend) + Vercel (Frontend) - RECOMMENDED

#### Step 1: Deploy Backend on Render (Free)

1. Go to [Render.com](https://render.com) and sign up with GitHub
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `st5359286/Deepfake-Detection`
4. Configure:
   - **Name**: `deepfake-detector-backend`
   - **Root Directory**: `Backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add Environment Variables:
   - `DB_HOST`: Your MySQL host (see Step 2)
   - `DB_USER`: Your MySQL username
   - `DB_PASSWORD`: Your MySQL password
   - `DB_NAME`: `deepfake_detection`
   - `EMAIL_USER`: Your Gmail for sending OTPs
   - `EMAIL_PASS`: Your Gmail App Password
   - `JWT_SECRET`: Generate a random string
   - `FRONTEND_URL`: Your Vercel frontend URL (after deploying)
6. Click "Create Web Service"

#### Step 2: Get Free MySQL Database

1. Go to [db4free.net](https://db4free.net) - Free MySQL hosting
2. Create an account
3. Note your: host (`db4free.net`), username, password, database name
4. Import your database schema:
   - Connect to db4free.net using MySQL Workbench or command line
   - Run the SQL commands from `Backend/database.sql`

#### Step 3: Deploy Frontend on Vercel (Free)

1. Go to [Vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `st5359286/Deepfake-Detection`
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://deepfake-detector-backend.onrender.com`)
6. Click "Deploy"

#### Step 4: Update Backend Environment Variable

1. Go to your Render backend dashboard
2. Update `FRONTEND_URL` with your Vercel URL
3. Redeploy to apply changes

---

### Option 2: Railway (Easier but Paid after free tier)

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect and deploy both frontend and backend
6. Add MySQL database from Railway's "Add Plugin" → MySQL
7. Set environment variables in Railway dashboard

---

## Important Notes

### For Email to Work

- Use Gmail with App Password (not your regular password)
- Generate App Password: Google Account → Security → 2-Step Verification → App Passwords

### Database Schema

Import this SQL to create tables:

```sql
CREATE DATABASE IF NOT EXISTS deepfake_detection;
USE deepfake_detection;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expires DATETIME,
    password_reset_token VARCHAR(255),
    password_reset_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analysis_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    is_deepfake BOOLEAN,
    confidence INT,
    analysis_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## After Deployment

Your app will be live at:

- **Frontend**: `your-project.vercel.app`
- **Backend**: `your-backend.onrender.com`

Update the frontend config to point to your backend URL in Vercel settings.

---

## Troubleshooting

1. **Backend shows "Database connection error"**: Check db4free.net credentials
2. **Email not sending**: Generate Gmail App Password
3. **CORS errors**: Update `FRONTEND_URL` in backend environment variables
