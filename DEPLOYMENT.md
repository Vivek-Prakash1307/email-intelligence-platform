# 🚀 Email Domain Checker - Deployment Guide

This guide will help you deploy your Email Domain Checker to Vercel (frontend) and Render (backend).

## 📋 Prerequisites

- GitHub account
- Vercel account (free)
- Render account (free)

## 🎯 Deployment Steps

### **Step 1: Deploy Backend to Render**

1. **Go to [Render.com](https://render.com)** and sign up/login
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `email-checker-backend`
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Root Directory**: `email-checker-backend`
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Start Command**: Leave empty (uses Dockerfile)

5. **Click "Create Web Service"**
6. **Wait for deployment** (takes 2-3 minutes)
7. **Copy your Render URL** (e.g., `https://your-app-name.onrender.com`)

### **Step 2: Update Frontend Configuration**

1. **Update the API URL** in `email-checker-frontend/vercel.json`:
   ```json
   "env": {
     "REACT_APP_API_URL": "https://your-app-name.onrender.com"
   }
   ```

### **Step 3: Deploy Frontend to Vercel**

1. **Go to [Vercel.com](https://vercel.com)** and sign up/login
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `email-checker-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. **Add Environment Variable:**
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://your-app-name.onrender.com` (your Render URL)

6. **Click "Deploy"**
7. **Wait for deployment** (takes 1-2 minutes)

## 🌐 Your Live Application

- **Frontend**: `https://your-project-name.vercel.app`
- **Backend**: `https://your-app-name.onrender.com`

## 🔧 Environment Variables

### **Frontend (Vercel):**
- `REACT_APP_API_URL`: Your Render backend URL

### **Backend (Render):**
- `PORT`: Automatically set by Render

## 🧪 Testing Your Deployment

1. **Visit your Vercel URL**
2. **Test with domains**: `gmail.com, yahoo.com, nonexist.xyz`
3. **Verify results display correctly**

## 📝 Troubleshooting

### **If frontend can't connect to backend:**
1. Check CORS settings in backend
2. Verify environment variables are set correctly
3. Ensure backend is running on Render

### **If backend fails to deploy:**
1. Check Dockerfile syntax
2. Verify Go version compatibility
3. Check build logs on Render

## 🎉 Success!

Your Email Domain Checker will be publicly available for anyone to use!

**Features Available:**
- ✅ Real-time domain validation
- ✅ Multiple domain checking
- ✅ Beautiful responsive UI
- ✅ Error handling
- ✅ Public access 