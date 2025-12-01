# Complete Deployment Guide

Choose the best deployment option for your radio website.

## Quick Comparison

| Platform | Free Tier | Ease | System Deps | Best For |
|----------|-----------|------|--------------|----------|
| **Railway** | ✅ $5/month credit | ⭐⭐⭐⭐⭐ | ✅ Yes | Best overall |
| **Render** | ✅ Limited | ⭐⭐⭐⭐ | ✅ Yes (Docker) | Free hosting |
| **Fly.io** | ✅ 3 VMs | ⭐⭐⭐⭐ | ✅ Yes | Global edge |
| **Vercel** | ✅ Yes | ⭐⭐⭐⭐⭐ | ❌ No | Frontend only |
| **Netlify** | ✅ Yes | ⭐⭐⭐⭐⭐ | ❌ No | Frontend only |
| **Heroku** | ❌ Paid | ⭐⭐⭐⭐ | ✅ Yes | Classic option |
| **DigitalOcean** | ❌ Paid | ⭐⭐⭐⭐ | ✅ Yes | Docker support |
| **Docker/VPS** | Varies | ⭐⭐⭐ | ✅ Yes | Full control |

## Recommended: Railway (Easiest)

**Best for**: Quick deployment with system dependencies

See [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md) for detailed instructions.

**Quick start**:
1. Push code to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Done!

## Alternative: Render (Free Tier)

**Best for**: Free hosting with Docker support

See [DEPLOY_RENDER.md](DEPLOY_RENDER.md) for detailed instructions.

**Quick start**:
1. Push code to GitHub
2. Go to https://render.com
3. New Web Service → Connect GitHub
4. Use Dockerfile (provided)
5. Deploy!

## Alternative: Fly.io (Global Edge)

**Best for**: Global distribution, fast performance

See [DEPLOY_FLYIO.md](DEPLOY_FLYIO.md) for detailed instructions.

## Frontend-Only Options

If you want to deploy frontend separately:

### Vercel (Frontend)
```bash
npm install -g vercel
vercel
```

### Netlify (Frontend)
```bash
npm install -g netlify-cli
netlify deploy --prod
```

Then update `public/app.js` to point to your backend URL.

## Self-Hosted Options

### VPS Providers
- **DigitalOcean**: $6/month
- **Linode**: $5/month
- **Vultr**: $2.50/month
- **Hetzner**: €4/month

See [DEPLOY_DOCKER.md](DEPLOY_DOCKER.md) for Docker deployment.

## Before Deploying

### 1. Update server.js
Make sure it uses environment PORT:
```javascript
const PORT = process.env.PORT || 3000;
```

### 2. Update frontend URLs (if needed)
If deploying frontend separately, update API URLs in `public/app.js`.

### 3. Environment Variables
Set any needed environment variables in your platform's dashboard.

## Need Help?

- Railway: https://docs.railway.app
- Render: https://render.com/docs
- Fly.io: https://fly.io/docs
- Docker: https://docs.docker.com

## Recommendation

**For beginners**: Start with **Railway** - it's the easiest and handles system dependencies well.

**For free hosting**: Use **Render** with Docker.

**For production**: Use **Railway** or **Fly.io** for better performance.

