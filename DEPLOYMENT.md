# Deployment Guide

This project is ready for a three-service deployment:

- Frontend: Vercel
- Backend API: Render
- Database: Neon PostgreSQL

## 1. Neon Database

1. Create a Neon project.
2. Copy the direct connection string from the Neon dashboard.
3. Use the direct connection string for EF Core migrations on Render:

```text
ConnectionStrings__DefaultConnection=Host=...;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true;
```

Neon also offers pooled connection strings. Prefer the direct connection string for this API because the app applies EF Core migrations at startup.

## 2. Render Backend

1. Push this repository to GitHub.
2. In Render, create a new Blueprint from the repository, or create a Web Service manually.
3. Use Docker deployment with:

```text
Dockerfile Path: ./Dockerfile
Health Check Path: /api/ping
```

4. Add these Render environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<your Neon direct connection string>
ClientApp__AllowedOrigins=https://<your-vercel-app>.vercel.app
JwtSettings__Key=<long random secret>
JwtSettings__Issuer=LibraryExamAPI
JwtSettings__Audience=LibraryExamClient
DefaultAdmin__Email=<admin email>
DefaultAdmin__Password=<strong admin password>
Smtp__Host=smtp.gmail.com
Smtp__Port=587
Smtp__Username=<smtp username>
Smtp__Password=<smtp app password>
Smtp__From=<from email>
Smtp__EnableSsl=true
```

5. Deploy the service.
6. Confirm these endpoints work:

```text
https://<render-api>.onrender.com/api/ping
https://<render-api>.onrender.com/api/health
```

## 3. Vercel Frontend

1. Import the same GitHub repository into Vercel.
2. Set the project root directory to:

```text
client
```

3. Use these build settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

4. Add this Vercel environment variable:

```text
VITE_API_BASE_URL=https://<render-api>.onrender.com
```

5. Deploy the frontend.
6. Copy the final Vercel domain back into Render:

```text
ClientApp__AllowedOrigins=https://<your-vercel-app>.vercel.app
```

Then redeploy the Render service so CORS accepts the frontend.

## 4. Local Development With .env

Backend:

```powershell
Copy-Item .env.example .env
cd .\LibraryExamAPI
dotnet run
```

Frontend:

```powershell
Copy-Item .\client\.env.example .\client\.env
cd .\client
npm install
npm run dev
```

Local `.env` files are ignored by Git. Commit only `.env.example` files.
