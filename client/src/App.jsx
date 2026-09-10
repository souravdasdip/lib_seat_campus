import { useMemo, useState } from 'react';
import './App.css';

const initialForm = {
  name: '',
  rollNo: '',
  dept: '',
  semester: '1',
  email: '',
  password: '',
  role: 'Student',
};

const initialLoginForm = {
  email: 'admin@library.edu',
  password: 'Admin@123',
};

const initialAdminUserForm = {
  name: '',
  rollNo: '',
  dept: '',
  semester: '1',
  email: '',
  password: '',
  role: 'Student',
};

const passwordChecks = [
  { label: '8+ characters', test: (value) => value.length >= 8 },
  { label: 'Uppercase', test: (value) => /[A-Z]/.test(value) },
  { label: 'Lowercase', test: (value) => /[a-z]/.test(value) },
  { label: 'Number', test: (value) => /\d/.test(value) },
  { label: 'Symbol', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

function App() {
  const [form, setForm] = useState(initialForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [adminUserForm, setAdminUserForm] = useState(initialAdminUserForm);
  const [view, setView] = useState('login');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [availability, setAvailability] = useState({ email: null, username: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const passwordStrength = useMemo(() => {
    const score = passwordChecks.filter(({ test }) => test(form.password)).length;
    const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

    return {
      score,
      label: labels[Math.min(score, labels.length - 1)],
      percent: (score / passwordChecks.length) * 100,
    };
  }, [form.password]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === 'email' && value.trim()) {
      fetch(`http://localhost:5121/api/Auth/check-availability?email=${encodeURIComponent(value)}`)
        .then((res) => res.json())
        .then((data) => setAvailability((current) => ({ ...current, email: data.emailTaken })))
        .catch(() => setAvailability((current) => ({ ...current, email: null })));
    }

    if (field === 'rollNo' && value.trim()) {
      fetch(`http://localhost:5121/api/Auth/check-availability?username=${encodeURIComponent(value)}`)
        .then((res) => res.json())
        .then((data) => setAvailability((current) => ({ ...current, username: data.usernameTaken })))
        .catch(() => setAvailability((current) => ({ ...current, username: null })));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    const payload = {
      name: form.name,
      rollNo: form.rollNo,
      dept: form.dept,
      semester: Number(form.semester),
      email: form.email,
      password: form.password,
      role: form.role,
    };

    try {
      const response = await fetch('http://localhost:5121/api/Auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setStatus({ type: 'success', message: 'Registration successful. Please sign in.' });
      setForm(initialForm);
      setAvailability({ email: null, username: null });
      setView('login');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:5121/api/Auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setCurrentUser(data.user);
      setStatus({ type: 'success', message: `Welcome ${data.user.name}.` });
      setView('logged-in');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminCreateUser = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Auth/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: adminUserForm.name,
          rollNo: adminUserForm.rollNo,
          dept: adminUserForm.dept,
          semester: Number(adminUserForm.semester),
          email: adminUserForm.email,
          password: adminUserForm.password,
          role: adminUserForm.role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'User creation failed');
      }

      setStatus({ type: 'success', message: `${adminUserForm.role} account created successfully.` });
      setAdminUserForm(initialAdminUserForm);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('libraryToken');
    setCurrentUser(null);
    setView('login');
    setStatus({ type: 'success', message: 'Logged out successfully.' });
  };

  const emailAvailable = availability.email === false;
  const usernameAvailable = availability.username === false;

  const showAdminPanel = currentUser && currentUser.role === 'Admin';

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">University system</p>
          <h1>Library &amp; Exam Portal</h1>
        </div>

        <div className="auth-toggle">
          <button type="button" className={view === 'login' ? 'active' : ''} onClick={() => setView('login')}>
            Login
          </button>
          <button type="button" className={view === 'register' ? 'active' : ''} onClick={() => setView('register')}>
            Register
          </button>
        </div>

        {showAdminPanel ? (
          <div className="admin-panel">
            <div className="admin-summary">
              <strong>Admin signed in</strong>
              <span>{currentUser.name} ({currentUser.role})</span>
              <button type="button" className="logout-button" onClick={logout}>Logout</button>
            </div>

            <form onSubmit={handleAdminCreateUser} className="auth-form" noValidate>
              <h2>Create user</h2>

              <label>
                Full name
                <input value={adminUserForm.name} onChange={(e) => setAdminUserForm((current) => ({ ...current, name: e.target.value }))} required />
              </label>

              <div className="split-fields">
                <label>
                  Roll number
                  <input value={adminUserForm.rollNo} onChange={(e) => setAdminUserForm((current) => ({ ...current, rollNo: e.target.value }))} required />
                </label>

                <label>
                  Department
                  <input value={adminUserForm.dept} onChange={(e) => setAdminUserForm((current) => ({ ...current, dept: e.target.value }))} required />
                </label>
              </div>

              <div className="split-fields">
                <label>
                  Semester
                  <select value={adminUserForm.semester} onChange={(e) => setAdminUserForm((current) => ({ ...current, semester: e.target.value }))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Role
                  <select value={adminUserForm.role} onChange={(e) => setAdminUserForm((current) => ({ ...current, role: e.target.value }))}>
                    <option value="Student">Student</option>
                    <option value="Librarian">Librarian</option>
                    <option value="Exam Coordinator">Exam Coordinator</option>
                  </select>
                </label>
              </div>

              <label>
                Email address
                <input type="email" value={adminUserForm.email} onChange={(e) => setAdminUserForm((current) => ({ ...current, email: e.target.value }))} required />
              </label>

              <label>
                Password
                <input type="password" value={adminUserForm.password} onChange={(e) => setAdminUserForm((current) => ({ ...current, password: e.target.value }))} required />
              </label>

              {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating user...' : 'Create user'}
              </button>
            </form>
          </div>
        ) : view === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form" noValidate>
            <label>
              Email address
              <input type="email" value={loginForm.email} onChange={(e) => setLoginForm((current) => ({ ...current, email: e.target.value }))} required />
            </label>

            <label>
              Password
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))} required />
            </label>

            <div className="demo-credentials">
              <small>Default admin: admin@library.edu / Admin@123</small>
            </div>

            {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <label>
              Full name
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            </label>

            <div className="split-fields">
              <label>
                Roll number
                <input value={form.rollNo} onChange={(e) => updateField('rollNo', e.target.value)} required />
                {availability.username !== null && (
                  <small className={usernameAvailable ? 'ok' : 'warn'}>
                    {usernameAvailable ? 'Roll number available' : 'Roll number already taken'}
                  </small>
                )}
              </label>

              <label>
                Department
                <input value={form.dept} onChange={(e) => updateField('dept', e.target.value)} required />
              </label>
            </div>

            <div className="split-fields">
              <label>
                Semester
                <select value={form.semester} onChange={(e) => updateField('semester', e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Role
                <select value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                  <option value="Student">Student</option>
                  <option value="Librarian">Librarian</option>
                  <option value="Exam Coordinator">Exam Coordinator</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
            </div>

            <label>
              Email address
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
              {availability.email !== null && (
                <small className={emailAvailable ? 'ok' : 'warn'}>
                  {emailAvailable ? 'Email available' : 'Email already registered'}
                </small>
              )}
            </label>

            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} required />
            </label>

            <div className="password-meter" aria-live="polite">
              <div className="meter-bar">
                <span style={{ width: `${passwordStrength.percent}%` }} />
              </div>
              <small>{passwordStrength.label}</small>
            </div>

            <ul className="password-rules">
              {passwordChecks.map(({ label, test }) => (
                <li key={label} className={test(form.password) ? 'valid' : ''}>{label}</li>
              ))}
            </ul>

            {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
