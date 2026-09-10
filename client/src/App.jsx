import { useEffect, useMemo, useState } from 'react';
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

const initialUserForm = {
  name: '',
  rollNo: '',
  dept: '',
  semester: '1',
  email: '',
  password: '',
  role: 'Student',
  isVerified: false,
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
  const [userForm, setUserForm] = useState(initialUserForm);
  const [view, setView] = useState('login');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [availability, setAvailability] = useState({ email: null, username: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('libraryUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('libraryUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('libraryUser');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'Admin') {
      loadUsers();
    }
    if (currentUser.role === 'Librarian') {
      setUsers([]);
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load users');
      }
      setUsers(data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const loadMyProfile = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load profile');
      }
      setCurrentUser(data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

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

      localStorage.setItem('libraryToken', data.token);
      setCurrentUser(data.user);
      setStatus({ type: 'success', message: `Welcome ${data.user.name}.` });
      setView('logged-in');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrUpdateUser = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const isEditing = editingUserId !== null;
      const response = await fetch(
        isEditing
          ? `http://localhost:5121/api/Auth/admin/users/${editingUserId}`
          : 'http://localhost:5121/api/Auth/admin/create-user',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: userForm.name,
            rollNo: userForm.rollNo,
            dept: userForm.dept,
            semester: Number(userForm.semester),
            email: userForm.email,
            password: userForm.password,
            role: userForm.role,
            isVerified: userForm.isVerified,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'User save failed');
      }

      setStatus({
        type: 'success',
        message: isEditing ? 'User updated successfully.' : `${userForm.role} account created successfully.`,
      });
      setUserForm(initialUserForm);
      setEditingUserId(null);
      await loadUsers();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.studentId);
    setUserForm({
      name: user.name,
      rollNo: user.rollNo,
      dept: user.dept,
      semester: String(user.semester),
      email: user.email,
      password: '',
      role: user.role,
      isVerified: user.isVerified,
    });
  };

  const handleDeleteUser = async (id) => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Auth/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Delete failed');
      }
      setStatus({ type: 'success', message: 'User deleted successfully.' });
      await loadUsers();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const logout = () => {
    localStorage.removeItem('libraryToken');
    setCurrentUser(null);
    setUsers([]);
    setView('login');
    setStatus({ type: 'success', message: 'Logged out successfully.' });
  };

  const emailAvailable = availability.email === false;
  const usernameAvailable = availability.username === false;
  const isAdmin = currentUser && currentUser.role === 'Admin';
  const isLibrarian = currentUser && currentUser.role === 'Librarian';

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">University system</p>
          <h1>Library &amp; Exam Portal</h1>
        </div>

        {!currentUser ? (
          <>
            <div className="auth-toggle">
              <button type="button" className={view === 'login' ? 'active' : ''} onClick={() => setView('login')}>
                Login
              </button>
              <button type="button" className={view === 'register' ? 'active' : ''} onClick={() => setView('register')}>
                Register
              </button>
            </div>

            {view === 'login' ? (
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
          </>
        ) : (
          <div className="dashboard-panel">
            <div className="admin-summary">
              <div>
                <strong>{currentUser.name}</strong>
                <span>{currentUser.role}</span>
              </div>
              <button type="button" className="logout-button" onClick={logout}>Logout</button>
            </div>

            {isLibrarian && (
              <div className="librarian-panel">
                <h2>My profile</h2>
                <div className="profile-card">
                  <div><label>Name</label><strong>{currentUser.name}</strong></div>
                  <div><label>Role</label><strong>{currentUser.role}</strong></div>
                  <div><label>Email</label><strong>{currentUser.email || currentUser.contact || 'N/A'}</strong></div>
                  <div><label>Department</label><strong>{currentUser.dept || 'N/A'}</strong></div>
                  <div><label>Semester</label><strong>{currentUser.semester ?? 'N/A'}</strong></div>
                  <div><label>Roll number</label><strong>{currentUser.rollNo || 'N/A'}</strong></div>
                </div>
                <p className="restricted-note">Librarian view is limited to personal perspective only; no global user list is shown.</p>
              </div>
            )}

            {isAdmin && (
              <div className="admin-panel">
                <form onSubmit={handleCreateOrUpdateUser} className="auth-form" noValidate>
                  <h2>{editingUserId ? 'Edit user' : 'Create user'}</h2>

                  <label>
                    Full name
                    <input value={userForm.name} onChange={(e) => setUserForm((current) => ({ ...current, name: e.target.value }))} required />
                  </label>

                  <div className="split-fields">
                    <label>
                      Roll number
                      <input value={userForm.rollNo} onChange={(e) => setUserForm((current) => ({ ...current, rollNo: e.target.value }))} required />
                    </label>
                    <label>
                      Department
                      <input value={userForm.dept} onChange={(e) => setUserForm((current) => ({ ...current, dept: e.target.value }))} required />
                    </label>
                  </div>

                  <div className="split-fields">
                    <label>
                      Semester
                      <select value={userForm.semester} onChange={(e) => setUserForm((current) => ({ ...current, semester: e.target.value }))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Role
                      <select value={userForm.role} onChange={(e) => setUserForm((current) => ({ ...current, role: e.target.value }))}>
                        <option value="Student">Student</option>
                        <option value="Librarian">Librarian</option>
                        <option value="Exam Coordinator">Exam Coordinator</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Email address
                    <input type="email" value={userForm.email} onChange={(e) => setUserForm((current) => ({ ...current, email: e.target.value }))} required />
                  </label>

                  <label>
                    Password
                    <input type="password" value={userForm.password} onChange={(e) => setUserForm((current) => ({ ...current, password: e.target.value }))} placeholder={editingUserId ? 'Leave blank to keep current password' : 'Enter password'} />
                  </label>

                  <label className="checkbox-row">
                    <input type="checkbox" checked={userForm.isVerified} onChange={(e) => setUserForm((current) => ({ ...current, isVerified: e.target.checked }))} />
                    Verified user
                  </label>

                  {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

                  <div className="button-row">
                    <button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (editingUserId ? 'Saving...' : 'Creating...') : (editingUserId ? 'Save changes' : 'Create user')}
                    </button>
                    {editingUserId && (
                      <button type="button" className="secondary-button" onClick={() => { setEditingUserId(null); setUserForm(initialUserForm); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <div className="table-panel">
                  <h2>All users</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.studentId}>
                          <td>{user.name}</td>
                          <td>{user.role}</td>
                          <td>{user.email}</td>
                          <td>{user.dept}</td>
                          <td>
                            <div className="action-group">
                              <button type="button" className="secondary-button" onClick={() => handleEditUser(user)}>Edit</button>
                              <button type="button" className="danger-button" onClick={() => handleDeleteUser(user.studentId)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {status.message && !isAdmin && !isLibrarian && <div className={`message ${status.type}`}>{status.message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
