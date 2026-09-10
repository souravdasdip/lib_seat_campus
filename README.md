# Library & Exam Portal

A full-stack university portal built with:
- ASP.NET Core Web API (.NET 8)
- React + Vite frontend
- PostgreSQL database
- JWT-based authentication and role-based access control

This project supports:
- Student registration and login
- Default admin account startup seeding
- Admin user management (create, edit, delete, list all users)
- Librarian-only profile view
- Library book management and issue/return tracking
- Exam room, invigilator, and seat-allocation management
- Role-restricted access across the app

## Project structure

- `LibraryExamAPI/` — ASP.NET Core backend API
- `client/` — React frontend application
- `package-lock.json` — root lockfile for the workspace

## Prerequisites

Before running the app, make sure you have installed:

- .NET 8 SDK
- Node.js 18+ and npm
- PostgreSQL 14+ / 18 compatible
- A local PostgreSQL server running on `localhost:5432`

## Database setup

Create the database if it does not already exist:

```sql
CREATE DATABASE lib_seat_campus;
```

The project is configured to use:

- Host: `localhost`
- Port: `5432`
- Database: `lib_seat_campus`
- Username: `postgres`
- Password: `postgres`

The connection string is stored in:
- `LibraryExamAPI/appsettings.Development.json`

The backend runs EF Core migrations automatically on startup and seeds the default admin account if needed.

## Default admin account

The app seeds a default administrator automatically:

- Email: `admin@library.edu`
- Password: `Admin@123`

## Run the backend

Open a terminal and run:

```powershell
cd /d E:\projects\lib_seat_campus\LibraryExamAPI
"C:\Program Files\dotnet\dotnet.exe" run --project "E:\projects\lib_seat_campus\LibraryExamAPI\LibraryExamAPI.csproj" --urls http://localhost:5121
```

The API will run at:
- http://localhost:5121
- Swagger UI is available in Development mode at:
  - http://localhost:5121/swagger

## Run the frontend

Open a second terminal and run:

```powershell
cd /d E:\projects\lib_seat_campus\client
npm run dev -- --host 0.0.0.0 --port 5173
```

The frontend will run at:
- http://localhost:5173

## App login flows

### Admin
Use the seeded admin account:

- Email: `admin@library.edu`
- Password: `Admin@123`

Admin can:
- view all users
- create users
- edit users
- delete users
- access the full management dashboard

### Librarian
A librarian account can be created by the admin. Once logged in, a librarian sees only their own profile view and does not see the global user list.

### Exam Coordinator
An exam coordinator can create rooms, add invigilators, schedule exams, and generate seat allocations without viewing the global user admin list.

### Student
Students can register via the registration form and then log in with their own email and password.

## Important notes

- The backend uses JWT authentication.
- CORS is enabled for the frontend on `http://localhost:5173` and `http://127.0.0.1:5173`.
- HTTPS redirection is disabled in Development mode to make local testing easier.
- If a stale backend is still running on port `5121`, stop it before starting a new instance.

## Useful checks

### Health endpoint
```bash
http://localhost:5121/api/ping
```

Expected response:

```json
{ "status": "ok", "message": "LibraryExamAPI is running." }
```

### Admin user list
The protected endpoint is:

```bash
http://localhost:5121/api/Auth/users
```

This requires a valid admin JWT token.

## Troubleshooting

### Backend does not start
- Ensure PostgreSQL is running.
- Confirm the database `lib_seat_campus` exists.
- Check the username/password in `appsettings.Development.json`.

### Frontend cannot connect to API
- Make sure the backend is running on `http://localhost:5121`.
- Confirm CORS is enabled for the frontend origin.

### Registration fails or database schema mismatch happens
- Make sure migrations are applied.
- Restart the API after database changes.
- Verify the local database schema matches the entity model.

## Build verification

The project was validated with:

```powershell
cd /d E:\projects\lib_seat_campus\LibraryExamAPI
"C:\Program Files\dotnet\dotnet.exe" build
```

```powershell
cd /d E:\projects\lib_seat_campus\client
npm run build
```

## Summary

This project is structured for a university library/exam system with RBAC support. The default admin is seeded automatically, admin user management is enabled, library operations are available to admins and librarians, and exam coordination is available to admins and exam coordinators for rooms, staff, exams, and seat allocation planning.
