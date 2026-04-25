# Deployment Guide

## Frontend Deployment (InsForge)

### Prerequisites
- InsForge account with API key
- Your frontend code ready

### Steps

1. **Prepare Environment Variables**
   Create a list of environment variables your app needs:
   - `NEXT_PUBLIC_API_URL`: Your backend URL (Render or other)
   - `NEXT_PUBLIC_INSFORGE_URL`: Your InsForge backend URL
   - `NEXT_PUBLIC_INSFORGE_ANON_KEY`: Your InsForge anon key
   - `NEXT_PUBLIC_TAVILY_API_KEY`: Your Tavily API key
   - `NEXT_PUBLIC_TAVUS_API_KEY`: Your Tavus API key
   - `NEXT_PUBLIC_TAVUS_REPLICA_ID`: Your Tavus replica ID
   - `NEXT_PUBLIC_OPENROUTER_API_KEY`: Your OpenRouter API key

2. **Deploy Using MCP Tool**
   Use the InsForge MCP tool to deploy:
   
   ```bash
   # Get absolute path to your frontend directory
   cd synapse/frontend
   pwd  # Copy this path
   ```
   
   Then use the MCP tool with:
   - `sourceDirectory`: The absolute path from above (e.g., `D:\projects 2026\openbook\synapse\frontend`)
   - `envVars`: Array of your environment variables
   - `projectSettings.buildCommand`: `npm run build`
   - `projectSettings.outputDirectory`: `.next`

3. **Check Deployment Status**
   Query deployment status:
   ```sql
   SELECT id, status, url, created_at
   FROM deployments.runs
   ORDER BY created_at DESC
   LIMIT 1;
   ```

4. **Get Deployment URL**
   Once status is `READY`, get your URL:
   ```sql
   SELECT url FROM deployments.runs WHERE status = 'READY' ORDER BY created_at DESC LIMIT 1;
   ```

### Deployment Status
- `WAITING`: Preparing files
- `UPLOADING`: Uploading to InsForge
- `BUILDING`: Building your app (~1-2 minutes)
- `READY`: Live! URL available
- `ERROR`: Build failed (check logs)

---

### Prerequisites
- GitHub account (https://github.com)
- Render account (https://render.com - free tier available)
- Git installed locally
- All required API keys ready

### Option 1: Deploy with render.yaml (Recommended)

This method uses the pre-configured `render.yaml` file for automatic setup.

1. **Prepare Your Repository**
   ```bash
   # Navigate to your project root
   cd synapse
   
   # Initialize git if not already done
   git init
   
   # Add all files
   git add .
   git commit -m "Initial commit for Render deployment"
   
   # Create GitHub repository and push
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

2. **Create Render Service**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub account if not already connected
   - Select your repository
   - Render will detect `backend/render.yaml` automatically
   - Click "Apply" to create the service

3. **Configure Environment Variables**
   After service creation, go to Environment tab and add:
   
   **Required:**
   - `INSFORGE_URL`: Your InsForge backend URL (e.g., `https://your-project.insforge.app`)
   - `INSFORGE_ANON_KEY`: Your InsForge anonymous key
   - `INSFORGE_API_KEY`: Your InsForge API key (admin key)
   
   **Optional (for enhanced features):**
   - `OPENROUTER_API_KEY`: For OpenRouter LLM access
   - `GOOGLE_API_KEY`: For Google Gemini API
   - `GEMINI_API_KEY`: Same as GOOGLE_API_KEY
   - `TAVILY_API_KEY`: For web search functionality
   - `CORS_ORIGINS`: Frontend URL (update after frontend deployment, default is `*`)

4. **Deploy**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait 2-5 minutes for build to complete
   - Your backend URL will be: `https://YOUR_SERVICE_NAME.onrender.com`
   - Test it by visiting: `https://YOUR_SERVICE_NAME.onrender.com/health`

### Option 2: Manual Configuration

If you prefer manual setup or `render.yaml` doesn't work:

1. **Push Code to GitHub** (same as Option 1, step 1)

2. **Create Web Service**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `synapse-backend` (or your preferred name)
     - **Region**: Choose closest to your users
     - **Branch**: `main`
     - **Root Directory**: `synapse/backend`
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
     - **Plan**: Free (or paid for better performance)

3. **Add Environment Variables** (same as Option 1, step 3)

4. **Create Service**
   - Click "Create Web Service"
   - Render will build and deploy automatically

### Important Notes

- **Free Tier Limitations**: 
  - Service sleeps after 15 minutes of inactivity
  - First request after sleep takes 30-60 seconds (cold start)
  - 750 hours/month free compute time
  
- **Python Version**: Render uses Python 3.12 by default (specified in render.yaml)

- **Port Configuration**: Render automatically provides `$PORT` environment variable - don't hardcode port 8000

- **Root Directory**: Make sure to set `synapse/backend` as root directory if your repo contains multiple folders

---

## Backend Deployment (Render)

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository

### Steps

1. **Update API URL**
   Before deploying, update the backend URL in your code:
   ```bash
   # In synapse/frontend/.env.local (for local dev)
   NEXT_PUBLIC_API_URL=http://localhost:8000
   
   # In Vercel dashboard (for production)
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```

2. **Push to GitHub**
   ```bash
   cd synapse/frontend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the `synapse/frontend` directory as root
   - Vercel will auto-detect Next.js

4. **Configure Environment Variables**
   In Vercel dashboard → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL
   - `NEXT_PUBLIC_INSFORGE_URL`: Your InsForge URL
   - `NEXT_PUBLIC_INSFORGE_ANON_KEY`: Your InsForge anon key
   - `NEXT_PUBLIC_TAVILY_API_KEY`: Your Tavily API key
   - `NEXT_PUBLIC_TAVUS_API_KEY`: Your Tavus API key
   - `NEXT_PUBLIC_TAVUS_REPLICA_ID`: Your Tavus replica ID
   - `NEXT_PUBLIC_OPENROUTER_API_KEY`: Your OpenRouter API key

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Note your frontend URL (e.g., `https://synapse.vercel.app`)

6. **Update Backend CORS**
   - Go back to Render dashboard
   - Update `CORS_ORIGINS` environment variable with your deployment URL (InsForge or Vercel)
   - Redeploy backend

---

## Post-Deployment

### Update CORS in Backend
After getting your frontend URL (from InsForge or Vercel), update the backend:

1. In Render dashboard, update `CORS_ORIGINS`:
   ```
   https://your-deployment.insforge.app,https://your-app.vercel.app
   ```

2. Redeploy the backend service

### Test the Deployment
1. Visit your deployment URL
2. Try creating a notebook
3. Upload a source
4. Test the chat functionality

---

## Troubleshooting

### InsForge Deployment Issues
- **Build fails**: Check build logs in deployment status
- **Environment variables missing**: Ensure all `NEXT_PUBLIC_*` vars are set
- **Deployment stuck**: Check status with SQL query
- **404 errors**: Add `vercel.json` for SPA routing (see below)

### SPA Routing Fix (React/Next.js)
If you get 404 on page refresh, create `synapse/frontend/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Backend Issues (Render)
- **Build fails**: 
  - Check build logs in Render dashboard
  - Verify Python version is 3.12 (set in render.yaml)
  - Ensure all dependencies in `requirements.txt` are valid
  - Check for typos in package names
  
- **Import errors**: 
  - Verify all dependencies in `requirements.txt`
  - Check if any packages need system dependencies
  - Review deploy logs for specific error messages
  
- **Service won't start**:
  - Verify start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Check that `main.py` exists in root directory
  - Ensure `$PORT` variable is used (not hardcoded port)
  
- **502 Bad Gateway**: 
  - Free tier: Service is waking up from sleep (wait 30-60 seconds)
  - Check service logs for startup errors
  - Verify all required environment variables are set
  
- **CORS errors**: 
  - Update `CORS_ORIGINS` environment variable with your frontend URL
  - Format: `https://your-frontend.vercel.app` or `https://your-app.insforge.app`
  - Multiple origins: `https://app1.com,https://app2.com` (comma-separated, no spaces)
  - Redeploy after changing CORS settings
  
- **Database connection issues**:
  - Verify `INSFORGE_URL`, `INSFORGE_ANON_KEY`, and `INSFORGE_API_KEY` are set
  - Check InsForge backend is accessible from Render
  - Test connection using health endpoint
  
- **Cold starts (Free tier)**:
  - First request after 15min inactivity takes 30-60 seconds
  - Consider upgrading to paid tier ($7/month) for always-on service
  - Or use a service like UptimeRobot to ping your backend every 10 minutes

### Frontend Issues
- **API connection fails**: Check `NEXT_PUBLIC_API_URL` is correct
- **Build fails**: Run `npm run build` locally first
- **Environment variables not working**: Redeploy after adding env vars

### Common Issues
- **502 Bad Gateway**: Backend might be sleeping (free tier). Wait 30s for cold start
- **CORS errors**: Update backend `CORS_ORIGINS` with exact deployment URL
- **API key errors**: Double-check all environment variables are set correctly
- **InsForge build timeout**: Large projects may need optimization

---

## Monitoring

### InsForge
- Check deployment status: Use SQL queries
- View logs: Query `deployments.runs` table

### Render
- View logs: Dashboard → Your Service → Logs
- Monitor metrics: Dashboard → Your Service → Metrics

### Vercel (if used)
- View deployments: Dashboard → Your Project → Deployments
- Check logs: Click on deployment → View Function Logs

---

## Updating

### Frontend Updates (InsForge)
Redeploy using the MCP tool with the same parameters. InsForge will create a new deployment.

### Frontend Updates (Vercel)
```bash
git add .
git commit -m "Update backend"
git push
```
Render will auto-deploy on push.

### Frontend Updates
```bash
git add .
git commit -m "Update frontend"
git push
```
Vercel will auto-deploy on push.

### Backend Updates
```bash
git add .
git commit -m "Update backend"
git push
```
Render will auto-deploy on push.

---

## Cost Optimization

### Free Tier Limits
- **InsForge**: Check your plan limits
- **Render**: 750 hours/month, sleeps after 15min inactivity
- **Vercel**: 100GB bandwidth, unlimited deployments (if used)

### Tips
- Use Render's free tier for development
- Upgrade to paid tier for production (no sleep, better performance)
- Monitor usage in dashboards
- InsForge deployments are optimized for performance
