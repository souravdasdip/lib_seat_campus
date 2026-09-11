# Client App

This is the React frontend for the library and exam portal.

## Local dev setup

```powershell
cd .\client
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

The app connects to:
- Backend: `http://localhost:5121`
- Frontend: `http://localhost:5173`

## Default admin login
- Email: `admin@library.edu`
- Password: `Admin@123`

## Build check

```powershell
cd .\client
npm run build
```

This project includes:
- authentication UI
- library book management
- exam scheduling and seat allocation views
- live notifications via SignalR
- recommendation panel
