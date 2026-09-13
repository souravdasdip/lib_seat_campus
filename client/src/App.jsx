import { useEffect, useMemo, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Moon,
  Search,
  SunMedium,
  UserRound,
  Users,
  ClipboardCheck,
  LogOut,
} from 'lucide-react';
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
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('libraryTheme') || 'dark');
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [topSearch, setTopSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('libraryUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryMembers, setLibraryMembers] = useState([]);
  const [libraryIssues, setLibraryIssues] = useState([]);
  const [libraryReports, setLibraryReports] = useState(null);
  const [myLibraryIssues, setMyLibraryIssues] = useState([]);
  const [myExamAllocations, setMyExamAllocations] = useState([]);
  const [bookDetails, setBookDetails] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [reactionType, setReactionType] = useState('like');
  const [notifications, setNotifications] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [libraryForm, setLibraryForm] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: 'Technology',
    copiesAvailable: 1,
    coverImageUrl: '',
    description: '',
    publisher: '',
    publishedYear: new Date().getFullYear(),
  });
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryGenre, setLibraryGenre] = useState('all');
  const [editingBookId, setEditingBookId] = useState(null);
  const [issueForm, setIssueForm] = useState({ bookId: '', studentId: '', dueDays: 14 });
  const [examRooms, setExamRooms] = useState([]);
  const [examInvigilators, setExamInvigilators] = useState([]);
  const [exams, setExams] = useState([]);
  const [examAllocations, setExamAllocations] = useState([]);
  const [roomForm, setRoomForm] = useState({ roomNo: '', capacity: 30, benchLayout: '10-per-bench' });
  const [invigilatorForm, setInvigilatorForm] = useState({ name: '', dept: '' });
  const [examForm, setExamForm] = useState({
    course: '',
    semester: '1',
    examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    timeSlot: '09:00',
  });
  const [allocationForm, setAllocationForm] = useState({
    examId: '',
    roomId: '',
    invigilatorId: '',
    semester: '1',
    dept: '',
  });
  const [overrideSeatForm, setOverrideSeatForm] = useState({
    seatId: '',
    roomId: '',
    benchNo: '1',
    seatNo: '1',
    invigilatorId: '',
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('libraryTheme', theme);
  }, [theme]);

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

    if (currentUser.role === 'Admin' || currentUser.role === 'Librarian') {
      loadLibraryData();
    }

    if (currentUser.role === 'Admin' || currentUser.role === 'Exam Coordinator') {
      loadExamData();
    }

    if (currentUser.role === 'Admin' || currentUser.role === 'Librarian' || currentUser.role === 'Exam Coordinator') {
      loadNotifications();
    }

    if (currentUser.role === 'Student') {
      loadStudentData();
      loadRecommendations();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5121/hubs/notifications')
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (payload) => {
      setNotifications((current) => [{ type: 'live', message: payload.message }, ...current].slice(0, 8));
    });

    connection.start().catch(() => {
      setNotifications((current) => [...current, { type: 'info', message: 'Realtime updates are unavailable right now.' }]);
    });

    return () => {
      connection.stop();
    };
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

  const loadLibraryData = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const [booksResponse, membersResponse, issuesResponse, reportsResponse] = await Promise.all([
        fetch(`http://localhost:5121/api/Library/books?q=${encodeURIComponent(librarySearch)}&genre=${encodeURIComponent(libraryGenre)}&page=1&pageSize=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Library/members', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Library/issues', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Library/reports', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const booksData = await booksResponse.json();
      const membersData = await membersResponse.json();
      const issuesData = await issuesResponse.json();
      const reportsData = await reportsResponse.json();

      if (!booksResponse.ok || !membersResponse.ok || !issuesResponse.ok || !reportsResponse.ok) {
        throw new Error('Failed to load library data');
      }

      setLibraryBooks(booksData.items || []);
      setLibraryMembers(membersData || []);
      setLibraryIssues(issuesData || []);
      setLibraryReports(reportsData || null);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const loadExamData = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const [roomsResponse, invigilatorsResponse, examsResponse, allocationsResponse] = await Promise.all([
        fetch('http://localhost:5121/api/Exam/rooms', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Exam/invigilators', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Exam/exams', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Exam/allocations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const roomsData = await roomsResponse.json();
      const invigilatorsData = await invigilatorsResponse.json();
      const examsData = await examsResponse.json();
      const allocationsData = await allocationsResponse.json();

      if (!roomsResponse.ok || !invigilatorsResponse.ok || !examsResponse.ok || !allocationsResponse.ok) {
        throw new Error('Failed to load exam data');
      }

      setExamRooms(roomsData || []);
      setExamInvigilators(invigilatorsData || []);
      setExams(examsData || []);
      setExamAllocations(allocationsData || []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const [summaryResponse, analyticsResponse] = await Promise.all([
        fetch('http://localhost:5121/api/Notifications/summary', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Notifications/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const summaryData = await summaryResponse.json();
      const analyticsData = await analyticsResponse.json();

      if (!summaryResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      setNotifications(summaryData.notifications || []);
      setDashboardAnalytics(analyticsData || null);
    } catch (error) {
      setNotifications([]);
      setDashboardAnalytics(null);
    }
  };

  const loadStudentData = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const [issuesResponse, allocationsResponse] = await Promise.all([
        fetch('http://localhost:5121/api/Library/my-issues', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5121/api/Exam/my-allocations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const issuesData = await issuesResponse.json();
      const allocationsData = await allocationsResponse.json();

      if (!issuesResponse.ok || !allocationsResponse.ok) {
        throw new Error('Failed to load student dashboard data');
      }

      setMyLibraryIssues(issuesData || []);
      setMyExamAllocations(allocationsData || []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const loadBookDetails = async (bookId) => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Library/books/${bookId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load book details');
      }
      setBookDetails(data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const loadRecommendations = async () => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Library/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load recommendations');
      }
      setRecommendedBooks(data.recommendations || []);
    } catch (error) {
      setRecommendedBooks([]);
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

      setOtpEmail(form.email);
      setOtpCode('');
      setStatus({
        type: 'success',
        message: `Registration successful. Use the OTP code ${data.otpCode} to verify your account before logging in.`,
      });
      setForm(initialForm);
      setAvailability({ email: null, username: null });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!otpEmail || !otpCode.trim()) {
      setStatus({ type: 'error', message: 'Enter the email and OTP code.' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5121/api/Auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otpCode: otpCode.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      setStatus({ type: 'success', message: 'OTP verified successfully. You can now sign in.' });
      setOtpEmail('');
      setOtpCode('');
      setView('login');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
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
      setStatus({ type: 'success', message: data.message || `Welcome ${data.user.name}.` });
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

  const handleLibraryFormSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const isEditing = editingBookId !== null;
      const response = await fetch(
        isEditing
          ? `http://localhost:5121/api/Library/books/${editingBookId}`
          : 'http://localhost:5121/api/Library/books',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: libraryForm.title,
            author: libraryForm.author,
            isbn: libraryForm.isbn,
            genre: libraryForm.genre,
            copiesAvailable: Number(libraryForm.copiesAvailable),
            coverImageUrl: libraryForm.coverImageUrl,
            description: libraryForm.description,
            publisher: libraryForm.publisher,
            publishedYear: Number(libraryForm.publishedYear),
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Book save failed');
      }

      setStatus({ type: 'success', message: isEditing ? 'Book updated successfully.' : 'Book added successfully.' });
      setLibraryForm({
        title: '',
        author: '',
        isbn: '',
        genre: 'Technology',
        copiesAvailable: 1,
        coverImageUrl: '',
        description: '',
        publisher: '',
        publishedYear: new Date().getFullYear(),
      });
      setEditingBookId(null);
      await loadLibraryData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBook = (book) => {
    setEditingBookId(book.bookId);
    setLibraryForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      copiesAvailable: book.copiesAvailable,
      coverImageUrl: book.coverImageUrl || '',
      description: book.description || '',
      publisher: book.publisher || '',
      publishedYear: book.publishedYear || new Date().getFullYear(),
    });
  };

  const handleDeleteBook = async (bookId) => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Library/books/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Delete failed');
      }
      setStatus({ type: 'success', message: 'Book deleted successfully.' });
      await loadLibraryData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const handleIssueBook = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Library/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookId: Number(issueForm.bookId),
          studentId: Number(issueForm.studentId),
          dueDays: Number(issueForm.dueDays),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Issue action failed');
      }

      setStatus({ type: 'success', message: 'Book issued successfully.' });
      setIssueForm({ bookId: '', studentId: '', dueDays: 14 });
      await loadLibraryData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnBook = async (issueId) => {
    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Library/issues/${issueId}/return`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Return failed');
      }
      setStatus({ type: 'success', message: `Return processed. Fine: ${data.fineAmount}` });
      await loadLibraryData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Exam/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomNo: roomForm.roomNo,
          capacity: Number(roomForm.capacity),
          benchLayout: roomForm.benchLayout,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Room creation failed');
      }

      setStatus({ type: 'success', message: 'Room created successfully.' });
      setRoomForm({ roomNo: '', capacity: 30, benchLayout: '10-per-bench' });
      await loadExamData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvigilator = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Exam/invigilators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: invigilatorForm.name,
          dept: invigilatorForm.dept,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invigilator creation failed');
      }

      setStatus({ type: 'success', message: 'Invigilator created successfully.' });
      setInvigilatorForm({ name: '', dept: '' });
      await loadExamData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExam = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Exam/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course: examForm.course,
          semester: Number(examForm.semester),
          examDate: examForm.examDate,
          timeSlot: examForm.timeSlot,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Exam creation failed');
      }

      setStatus({ type: 'success', message: 'Exam created successfully.' });
      setExamForm({
        course: '',
        semester: '1',
        examDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        timeSlot: '09:00',
      });
      await loadExamData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllocateSeats = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Exam/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examId: Number(allocationForm.examId),
          roomId: Number(allocationForm.roomId),
          semester: Number(allocationForm.semester),
          dept: allocationForm.dept || null,
          invigilatorId: allocationForm.invigilatorId ? Number(allocationForm.invigilatorId) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Seat allocation failed');
      }

      setStatus({ type: 'success', message: `Seat allocation generated successfully. ${data.allocatedCount} seats assigned.` });
      setAllocationForm({ examId: '', roomId: '', invigilatorId: '', semester: '1', dept: '' });
      await loadExamData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverrideSeat = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Exam/seat-allocations/${Number(overrideSeatForm.seatId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: Number(overrideSeatForm.roomId),
          benchNo: Number(overrideSeatForm.benchNo),
          seatNo: Number(overrideSeatForm.seatNo),
          invigilatorId: overrideSeatForm.invigilatorId ? Number(overrideSeatForm.invigilatorId) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Seat override failed');
      }

      setStatus({ type: 'success', message: 'Seat assignment overridden successfully.' });
      setOverrideSeatForm({ seatId: '', roomId: '', benchNo: '1', seatNo: '1', invigilatorId: '' });
      await loadExamData();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBroadcast = async (event) => {
    event.preventDefault();
    if (!notificationMessage.trim()) return;

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch('http://localhost:5121/api/Notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: notificationMessage.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to broadcast notification');
      }

      setNotificationMessage('');
      setStatus({ type: 'success', message: 'Broadcast sent to active sessions.' });
      await loadNotifications();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!bookDetails || !commentText.trim()) return;

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Library/books/${bookDetails.bookId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commentText: commentText.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Comment failed');
      }

      setCommentText('');
      await loadBookDetails(bookDetails.bookId);
      setStatus({ type: 'success', message: 'Comment added.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const handleAddReaction = async (type) => {
    if (!bookDetails) return;

    try {
      const token = localStorage.getItem('libraryToken');
      const response = await fetch(`http://localhost:5121/api/Library/books/${bookDetails.bookId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Reaction failed');
      }

      setReactionType(type);
      await loadBookDetails(bookDetails.bookId);
      setStatus({ type: 'success', message: 'Reaction updated.' });
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
  const isExamCoordinator = currentUser && currentUser.role === 'Exam Coordinator';
  const canManageExams = Boolean(currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Exam Coordinator'));

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'library', label: 'Library', icon: BookOpen, children: [
      { id: 'library-books', label: 'Books', icon: BookOpen },
      { id: 'library-issues', label: 'Issues', icon: ClipboardCheck },
    ] },
    { id: 'exams', label: 'Exams', icon: ClipboardCheck, children: [
      { id: 'exam-rooms', label: 'Rooms', icon: LayoutGrid },
      { id: 'exam-invigilators', label: 'Invigilators', icon: Users },
      { id: 'exam-schedule', label: 'Schedule', icon: ClipboardCheck },
      { id: 'exam-allocations', label: 'Allocations', icon: BriefcaseBusiness },
    ] },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (isAdmin) {
    sidebarItems.push({ id: 'users', label: 'Users', icon: Users });
  }

  const statCards = [
    { label: 'Total students', value: dashboardAnalytics?.totalStudents ?? 0, trend: '+12.4%' },
    { label: 'Total books', value: dashboardAnalytics?.totalBooks ?? libraryBooks.length, trend: '+8.1%' },
    { label: 'Active issues', value: dashboardAnalytics?.activeIssues ?? libraryIssues.filter((issue) => issue.returnDate === null).length, trend: '-4.2%' },
    { label: 'Overdue', value: dashboardAnalytics?.overdueIssues ?? libraryIssues.filter((issue) => issue.returnDate === null && issue.isOverdue).length, trend: '+2.3%' },
  ];

  if (!currentUser) {
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

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <label>
                  Full name
                  <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
                </label>

                <div className="form-row">
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

                <div className="form-row">
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

                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              {otpEmail && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <div className="card-header">
                    <h3>Verify OTP</h3>
                  </div>
                  <form onSubmit={handleVerifyOtp} className="auth-form" noValidate>
                    <label>
                      Email
                      <input value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} type="email" required />
                    </label>
                    <label>
                      6-digit OTP
                      <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} placeholder="Enter OTP" required />
                    </label>
                    <button type="submit" className="btn btn-primary">Verify OTP</button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-mark">L</div>
            {!sidebarCollapsed && (
              <div className="brand-copy">
                <strong>LibSeat</strong>
                <span>Campus</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {sidebarItems.map((item) => (
            item.children ? (
              <div className="nav-group" key={item.id}>
                <button
                  type="button"
                  className={`nav-item nav-group-title ${activeSection.startsWith(`${item.id}-`) ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.children[0].id)}
                  title={item.label}
                >
                  <span className="nav-icon"><item.icon size={18} /></span>
                  <span>{item.label}</span>
                </button>
                {!sidebarCollapsed && (
                  <div className="nav-submenu">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={`nav-item nav-subitem ${activeSection === child.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(child.id)}
                      >
                        <span className="nav-icon"><child.icon size={16} /></span>
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
                title={item.label}
              >
                <span className="nav-icon"><item.icon size={18} /></span>
                <span>{item.label}</span>
              </button>
            )
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-card">
            <span>Access level</span>
            <strong>{currentUser.role}</strong>
          </div>
        )}
      </aside>

      <div className="dashboard-panel">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-title-block">
              <p className="eyebrow">Campus portal</p>
              <h2>{({
                'library-books': 'Books',
                'library-issues': 'Issues',
                'exam-rooms': 'Rooms',
                'exam-invigilators': 'Invigilators',
                'exam-schedule': 'Schedule',
                'exam-allocations': 'Allocations',
              })[activeSection] || activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h2>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="top-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search..."
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
              />
            </label>

            <button
              type="button"
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
            </button>

            <button type="button" className="profile-button" onClick={() => loadMyProfile()}>
              <span className="profile-avatar"><UserRound size={16} /></span>
              <span className="profile-meta">
                <strong>{currentUser.name}</strong>
                <small>{currentUser.role}</small>
              </span>
            </button>

            <button type="button" className="icon-button" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="content-area">
          {/* OVERVIEW SECTION */}
          <section className={`section ${activeSection === 'overview' ? 'active' : ''}`}>
            <div className="section-header">
              <h1>Dashboard Overview</h1>
              <p>Welcome back, {currentUser.name}</p>
            </div>

            {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

            {dashboardAnalytics && (
              <>
                <div className="stats-grid">
                  {statCards.map((card) => (
                    <div className="stat-card" key={card.label}>
                      <div className="stat-header">
                        <span>{card.label}</span>
                        <span className="trend-badge">{card.trend}</span>
                      </div>
                      <strong>{card.value}</strong>
                    </div>
                  ))}
                </div>

                {currentUser.role === 'Student' && (
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-header">
                        <span>Books borrowed</span>
                        <span className="trend-badge">+3.2%</span>
                      </div>
                      <strong>{myLibraryIssues.length}</strong>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <span>Open issues</span>
                        <span className="trend-badge">-1.1%</span>
                      </div>
                      <strong>{myLibraryIssues.filter((issue) => !issue.returnDate).length}</strong>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <span>Exam allocations</span>
                        <span className="trend-badge">+5.4%</span>
                      </div>
                      <strong>{myExamAllocations.length}</strong>
                    </div>
                    <div className="stat-card">
                      <div className="stat-header">
                        <span>Outstanding fine</span>
                        <span className="trend-badge">+0.8%</span>
                      </div>
                      <strong>${myLibraryIssues.reduce((sum, issue) => sum + (issue.fineAmount || 0), 0)}</strong>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="profile-card">
              <div>
                <label>Name</label>
                <strong>{currentUser.name}</strong>
              </div>
              <div>
                <label>Role</label>
                <strong>{currentUser.role}</strong>
              </div>
              <div>
                <label>Email</label>
                <strong>{currentUser.email || currentUser.contact || 'N/A'}</strong>
              </div>
              <div>
                <label>Department</label>
                <strong>{currentUser.dept || 'N/A'}</strong>
              </div>
              <div>
                <label>Semester</label>
                <strong>{currentUser.semester ?? 'N/A'}</strong>
              </div>
              <div>
                <label>Roll number</label>
                <strong>{currentUser.rollNo || 'N/A'}</strong>
              </div>
            </div>
          </section>

          {/* LIBRARY SECTION */}
          {(isAdmin || isLibrarian) && (
            <section className={`section ${activeSection.startsWith('library-') ? 'active' : ''}`}>
              <div className="section-header">
                <h1>Library Management</h1>
                <p>Manage books, issues, and library resources</p>
              </div>

              {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

              {libraryReports && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-header">
                      <span>Total books</span>
                      <span className="trend-badge">+8.1%</span>
                    </div>
                    <strong>{libraryReports?.totalBooks ?? libraryBooks.length}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span>Available copies</span>
                      <span className="trend-badge">+6.7%</span>
                    </div>
                    <strong>{libraryReports?.totalAvailableCopies ?? libraryBooks.reduce((sum, book) => sum + (book.copiesAvailable || 0), 0)}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span>Active issues</span>
                      <span className="trend-badge">-4.2%</span>
                    </div>
                    <strong>{libraryReports?.activeIssueCount ?? libraryIssues.filter((issue) => issue.returnDate === null).length}</strong>
                  </div>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span>Overdue</span>
                      <span className="trend-badge">+2.3%</span>
                    </div>
                    <strong>{libraryReports?.overdueCount ?? libraryIssues.filter((issue) => issue.returnDate === null && issue.isOverdue).length}</strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {activeSection === 'library-books' && (
                  <div className="form-card">
                  <h2>{editingBookId ? 'Edit book' : 'Add new book'}</h2>
                  <form onSubmit={handleLibraryFormSubmit} className="form-group">
                    <label>
                      Title
                      <input value={libraryForm.title} onChange={(e) => setLibraryForm((current) => ({ ...current, title: e.target.value }))} required />
                    </label>

                    <div className="form-row">
                      <label>
                        Author
                        <input value={libraryForm.author} onChange={(e) => setLibraryForm((current) => ({ ...current, author: e.target.value }))} required />
                      </label>
                      <label>
                        ISBN
                        <input value={libraryForm.isbn} onChange={(e) => setLibraryForm((current) => ({ ...current, isbn: e.target.value }))} required />
                      </label>
                    </div>

                    <div className="form-row">
                      <label>
                        Genre
                        <input value={libraryForm.genre} onChange={(e) => setLibraryForm((current) => ({ ...current, genre: e.target.value }))} required />
                      </label>
                      <label>
                        Copies
                        <input type="number" min="1" value={libraryForm.copiesAvailable} onChange={(e) => setLibraryForm((current) => ({ ...current, copiesAvailable: Number(e.target.value) }))} required />
                      </label>
                    </div>

                    <label>
                      Cover URL
                      <input value={libraryForm.coverImageUrl} onChange={(e) => setLibraryForm((current) => ({ ...current, coverImageUrl: e.target.value }))} />
                    </label>

                    <label>
                      Publisher
                      <input value={libraryForm.publisher} onChange={(e) => setLibraryForm((current) => ({ ...current, publisher: e.target.value }))} />
                    </label>

                    <div className="form-row">
                      <label>
                        Published year
                        <input type="number" value={libraryForm.publishedYear} onChange={(e) => setLibraryForm((current) => ({ ...current, publishedYear: Number(e.target.value) }))} />
                      </label>
                      <label>
                        Description
                        <input value={libraryForm.description} onChange={(e) => setLibraryForm((current) => ({ ...current, description: e.target.value }))} />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingBookId ? 'Save book' : 'Add book'}</button>
                      {editingBookId && (
                        <button type="button" className="btn btn-secondary" onClick={() => { setEditingBookId(null); setLibraryForm({ title: '', author: '', isbn: '', genre: 'Technology', copiesAvailable: 1, coverImageUrl: '', description: '', publisher: '', publishedYear: new Date().getFullYear() }); }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                  </div>
                )}

                {activeSection === 'library-issues' && (
                  <div className="form-card">
                  <h2>Issue a book</h2>
                  <form onSubmit={handleIssueBook} className="form-group">
                    <label>
                      Book
                      <select value={issueForm.bookId} onChange={(e) => setIssueForm((current) => ({ ...current, bookId: e.target.value }))} required>
                        <option value="">Select a book</option>
                        {libraryBooks.filter((book) => book.copiesAvailable > 0).map((book) => (
                          <option key={book.bookId} value={book.bookId}>
                            {book.title} ({book.copiesAvailable} available)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Student
                      <select value={issueForm.studentId} onChange={(e) => setIssueForm((current) => ({ ...current, studentId: e.target.value }))} required>
                        <option value="">Select a student</option>
                        {libraryMembers.filter((member) => member.role === 'Student').map((member) => (
                          <option key={member.studentId} value={member.studentId}>
                            {member.name} ({member.rollNo || `Student #${member.studentId}`})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Due days
                      <input type="number" min="1" max="90" value={issueForm.dueDays} onChange={(e) => setIssueForm((current) => ({ ...current, dueDays: e.target.value }))} />
                    </label>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Issuing...' : 'Issue book'}</button>
                  </form>
                  </div>
                )}
              </div>

              {activeSection === 'library-books' && (
                <div className="table-container">
                <div className="table-header">
                  <h2>Book catalog</h2>
                  <div className="table-toolbar">
                    <input value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Search books" />
                    <select value={libraryGenre} onChange={(e) => setLibraryGenre(e.target.value)}>
                      <option value="all">All genres</option>
                      {Array.from(new Set(libraryBooks.map((book) => book.genre))).filter(Boolean).map((genre) => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-secondary" onClick={loadLibraryData}>Refresh</button>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>ISBN</th>
                      <th>Genre</th>
                      <th>Copies</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {libraryBooks.map((book) => (
                      <tr key={book.bookId}>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>{book.isbn}</td>
                        <td>{book.genre}</td>
                        <td>{book.copiesAvailable}</td>
                        <td>
                          <div className="action-group">
                            <button type="button" className="btn btn-secondary" onClick={() => { loadBookDetails(book.bookId); }}>View</button>
                            <button type="button" className="btn btn-secondary" onClick={() => handleEditBook(book)}>Edit</button>
                            <button type="button" className="btn btn-destructive" onClick={() => handleDeleteBook(book.bookId)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}

              {activeSection === 'library-books' && bookDetails && (
                <div className="card">
                  <div className="card-header">
                    <h3>{bookDetails.title}</h3>
                  </div>
                  <div className="card-body">
                    <div className="profile-card">
                      <div>
                        <label>Author</label>
                        <strong>{bookDetails.author}</strong>
                      </div>
                      <div>
                        <label>ISBN</label>
                        <strong>{bookDetails.isbn}</strong>
                      </div>
                      <div>
                        <label>Genre</label>
                        <strong>{bookDetails.genre}</strong>
                      </div>
                      <div>
                        <label>Copies</label>
                        <strong>{bookDetails.copiesAvailable}</strong>
                      </div>
                    </div>

                    <form onSubmit={handleAddComment} className="auth-form">
                      <label>
                        Add comment
                        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows="3" placeholder="Share your feedback on this book" />
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Post comment</button>
                    </form>

                    <div style={{ marginTop: '1rem' }}>
                      <h3>Comments</h3>
                      {bookDetails.comments?.map((comment) => (
                        <div key={comment.commentId} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                          <strong>{comment.studentName}</strong>
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}> • {new Date(comment.createdAt).toLocaleDateString()}</span>
                          <p style={{ marginTop: '0.5rem' }}>{comment.commentText}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'library-issues' && (
                <div className="table-container">
                <div className="table-header">
                  <h2>Issue ledger</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Book</th>
                      <th>Issue date</th>
                      <th>Due date</th>
                      <th>Fine</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {libraryIssues.map((issue) => (
                      <tr key={issue.issueId}>
                        <td>{issue.studentName}</td>
                        <td>{issue.bookTitle}</td>
                        <td>{new Date(issue.issueDate).toLocaleDateString()}</td>
                        <td>{new Date(issue.dueDate).toLocaleDateString()}</td>
                        <td>${issue.fineAmount ?? 0}</td>
                        <td>
                          {!issue.returnDate && (
                            <button type="button" className="btn btn-secondary" onClick={() => handleReturnBook(issue.issueId)}>Return</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          )}

          {/* EXAMS SECTION */}
          {canManageExams && (
            <section className={`section ${activeSection.startsWith('exam-') ? 'active' : ''}`}>
              <div className="section-header">
                <h1>Exam Management</h1>
                <p>Manage exam schedules, rooms, and seat allocations</p>
              </div>

              {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {activeSection === 'exam-rooms' && (
                  <div className="form-card">
                  <h2>Create room</h2>
                  <form onSubmit={handleCreateRoom} className="form-group">
                    <label>
                      Room number
                      <input value={roomForm.roomNo} onChange={(e) => setRoomForm((current) => ({ ...current, roomNo: e.target.value }))} required />
                    </label>

                    <div className="form-row">
                      <label>
                        Capacity
                        <input type="number" min="1" value={roomForm.capacity} onChange={(e) => setRoomForm((current) => ({ ...current, capacity: Number(e.target.value) }))} required />
                      </label>
                      <label>
                        Bench layout
                        <input value={roomForm.benchLayout} onChange={(e) => setRoomForm((current) => ({ ...current, benchLayout: e.target.value }))} required />
                      </label>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Create room</button>
                  </form>
                  </div>
                )}

                {activeSection === 'exam-invigilators' && (
                  <div className="form-card">
                  <h2>Add invigilator</h2>
                  <form onSubmit={handleCreateInvigilator} className="form-group">
                    <label>
                      Full name
                      <input value={invigilatorForm.name} onChange={(e) => setInvigilatorForm((current) => ({ ...current, name: e.target.value }))} required />
                    </label>

                    <label>
                      Department
                      <input value={invigilatorForm.dept} onChange={(e) => setInvigilatorForm((current) => ({ ...current, dept: e.target.value }))} required />
                    </label>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Add invigilator</button>
                  </form>
                  </div>
                )}

                {activeSection === 'exam-schedule' && (
                  <div className="form-card">
                  <h2>Create exam</h2>
                  <form onSubmit={handleCreateExam} className="form-group">
                    <label>
                      Course name
                      <input value={examForm.course} onChange={(e) => setExamForm((current) => ({ ...current, course: e.target.value }))} required />
                    </label>

                    <div className="form-row">
                      <label>
                        Semester
                        <select value={examForm.semester} onChange={(e) => setExamForm((current) => ({ ...current, semester: e.target.value }))}>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Time slot
                        <input type="time" value={examForm.timeSlot} onChange={(e) => setExamForm((current) => ({ ...current, timeSlot: e.target.value }))} required />
                      </label>
                    </div>

                    <label>
                      Exam date
                      <input type="date" value={examForm.examDate} onChange={(e) => setExamForm((current) => ({ ...current, examDate: e.target.value }))} required />
                    </label>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Create exam</button>
                  </form>
                  </div>
                )}

                {activeSection === 'exam-allocations' && (
                  <div className="form-card">
                  <h2>Allocate seats</h2>
                  <form onSubmit={handleAllocateSeats} className="form-group">
                    <div className="form-row">
                      <label>
                        Exam
                        <select value={allocationForm.examId} onChange={(e) => setAllocationForm((current) => ({ ...current, examId: e.target.value }))}>
                          <option value="">Select exam</option>
                          {exams.map((exam) => (
                            <option key={exam.examId} value={exam.examId}>{exam.course}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Room
                        <select value={allocationForm.roomId} onChange={(e) => setAllocationForm((current) => ({ ...current, roomId: e.target.value }))}>
                          <option value="">Select room</option>
                          {examRooms.map((room) => (
                            <option key={room.roomId} value={room.roomId}>{room.roomNo}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="form-row">
                      <label>
                        Semester
                        <select value={allocationForm.semester} onChange={(e) => setAllocationForm((current) => ({ ...current, semester: e.target.value }))}>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Department
                        <input value={allocationForm.dept} onChange={(e) => setAllocationForm((current) => ({ ...current, dept: e.target.value }))} placeholder="Optional" />
                      </label>
                    </div>

                    <label>
                      Invigilator
                      <select value={allocationForm.invigilatorId} onChange={(e) => setAllocationForm((current) => ({ ...current, invigilatorId: e.target.value }))}>
                        <option value="">Optional</option>
                        {examInvigilators.map((invigilator) => (
                          <option key={invigilator.staffId} value={invigilator.staffId}>{invigilator.name}</option>
                        ))}
                      </select>
                    </label>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Generate seat plan</button>
                  </form>
                  </div>
                )}

                {activeSection === 'exam-allocations' && (
                  <div className="form-card">
                  <h2>Manual seat override</h2>
                  <form onSubmit={handleOverrideSeat} className="form-group">
                    <label>
                      Seat ID
                      <input type="number" min="1" value={overrideSeatForm.seatId} onChange={(e) => setOverrideSeatForm((current) => ({ ...current, seatId: e.target.value }))} required />
                    </label>
                    <div className="form-row">
                      <label>
                        Room ID
                        <input type="number" min="1" value={overrideSeatForm.roomId} onChange={(e) => setOverrideSeatForm((current) => ({ ...current, roomId: e.target.value }))} required />
                      </label>
                      <label>
                        Invigilator ID
                        <input type="number" min="1" value={overrideSeatForm.invigilatorId} onChange={(e) => setOverrideSeatForm((current) => ({ ...current, invigilatorId: e.target.value }))} />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Bench No
                        <input type="number" min="1" value={overrideSeatForm.benchNo} onChange={(e) => setOverrideSeatForm((current) => ({ ...current, benchNo: e.target.value }))} required />
                      </label>
                      <label>
                        Seat No
                        <input type="number" min="1" value={overrideSeatForm.seatNo} onChange={(e) => setOverrideSeatForm((current) => ({ ...current, seatNo: e.target.value }))} required />
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Override seat</button>
                  </form>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {activeSection === 'exam-rooms' && (
                  <div className="table-container">
                  <div className="table-header">
                    <h2>Rooms</h2>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Capacity</th>
                        <th>Layout</th>
                        <th>Occupied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examRooms.map((room) => (
                        <tr key={room.roomId}>
                          <td>{room.roomNo}</td>
                          <td>{room.capacity}</td>
                          <td>{room.benchLayout}</td>
                          <td>{room.occupiedSeats}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}

                {activeSection === 'exam-invigilators' && (
                  <div className="table-container">
                  <div className="table-header">
                    <h2>Invigilators</h2>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examInvigilators.map((invigilator) => (
                        <tr key={invigilator.staffId}>
                          <td>{invigilator.name}</td>
                          <td>{invigilator.dept}</td>
                          <td>{invigilator.assignedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

              {activeSection === 'exam-schedule' && (
                <div className="table-container">
                <div className="table-header">
                  <h2>Exams</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Semester</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Seats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <tr key={exam.examId}>
                        <td>{exam.course}</td>
                        <td>{exam.semester}</td>
                        <td>{new Date(exam.examDate).toLocaleDateString()}</td>
                        <td>{exam.timeSlot}</td>
                        <td>{exam.seatCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}

              {activeSection === 'exam-allocations' && (
                <div className="table-container">
                <div className="table-header">
                  <h2>Seat allocations</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Room</th>
                      <th>Student</th>
                      <th>Roll no</th>
                      <th>Bench</th>
                      <th>Seat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examAllocations.map((allocation) => (
                      <tr key={allocation.seatId}>
                        <td>{allocation.course}</td>
                        <td>{allocation.roomNo}</td>
                        <td>{allocation.studentName}</td>
                        <td>{allocation.rollNo}</td>
                        <td>{allocation.benchNo}</td>
                        <td>{allocation.seatNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          )}

          {/* NOTIFICATIONS SECTION */}
          {(isAdmin || isLibrarian || isExamCoordinator) && (
            <section className={`section ${activeSection === 'notifications' ? 'active' : ''}`}>
              <div className="section-header">
                <h1>System Notifications</h1>
                <p>View and broadcast system messages</p>
              </div>

              {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

              <div className="card">
                <div className="card-header">
                  <h3>Recent notifications</h3>
                </div>
                <div className="card-body">
                  {notifications.length > 0 ? (
                    notifications.map((item, index) => (
                      <div key={`${item.type}-${index}`} className={`message ${item.type}`} style={{ marginBottom: '0.5rem' }}>
                        {item.message}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--muted-foreground)' }}>No notifications yet</p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="form-card">
                  <h2>Broadcast message</h2>
                  <form onSubmit={handleSendBroadcast} className="form-group">
                    <label>
                      Message
                      <textarea
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        placeholder="Type your message here..."
                        rows="4"
                      />
                    </label>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Send broadcast</button>
                  </form>
                </div>
              )}
            </section>
          )}

          {/* USERS SECTION */}
          {isAdmin && (
            <section className={`section ${activeSection === 'users' ? 'active' : ''}`}>
              <div className="section-header">
                <h1>User Management</h1>
                <p>Create, edit, and manage system users</p>
              </div>

              {status.message && <div className={`message ${status.type}`}>{status.message}</div>}

              <div className="form-card">
                <h2>{editingUserId ? 'Edit user' : 'Create user'}</h2>
                <form onSubmit={handleCreateOrUpdateUser} className="form-group">
                  <label>
                    Full name
                    <input value={userForm.name} onChange={(e) => setUserForm((current) => ({ ...current, name: e.target.value }))} required />
                  </label>

                  <div className="form-row">
                    <label>
                      Roll number
                      <input value={userForm.rollNo} onChange={(e) => setUserForm((current) => ({ ...current, rollNo: e.target.value }))} required />
                    </label>
                    <label>
                      Department
                      <input value={userForm.dept} onChange={(e) => setUserForm((current) => ({ ...current, dept: e.target.value }))} required />
                    </label>
                  </div>

                  <div className="form-row">
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

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={userForm.isVerified} onChange={(e) => setUserForm((current) => ({ ...current, isVerified: e.target.checked }))} />
                    Verified user
                  </label>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? (editingUserId ? 'Saving...' : 'Creating...') : (editingUserId ? 'Save changes' : 'Create user')}
                    </button>
                    {editingUserId && (
                      <button type="button" className="btn btn-secondary" onClick={() => { setEditingUserId(null); setUserForm(initialUserForm); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="table-container">
                <div className="table-header">
                  <h2>All users</h2>
                </div>
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
                            <button type="button" className="btn btn-secondary" onClick={() => handleEditUser(user)}>Edit</button>
                            <button type="button" className="btn btn-destructive" onClick={() => handleDeleteUser(user.studentId)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* STUDENT SECTION */}
          {currentUser && currentUser.role === 'Student' && (
            <>
              {recommendedBooks.length > 0 && (
                <section className={`section ${activeSection === 'overview' ? 'active' : ''}`}>
                  <div className="section-header" style={{ marginTop: '2rem' }}>
                    <h1>Recommended for you</h1>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {recommendedBooks.map((book) => (
                      <div className="card" key={book.bookId}>
                        <div className="card-header">
                          <h3>{book.title}</h3>
                        </div>
                        <div className="card-body">
                          <p><strong>{book.author}</strong></p>
                          <p>Genre: {book.genre}</p>
                          <p>Copies available: {book.copiesAvailable}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {myLibraryIssues.length > 0 && (
                <section className={`section ${activeSection === 'overview' ? 'active' : ''}`}>
                  <div className="section-header" style={{ marginTop: '2rem' }}>
                    <h1>My library activity</h1>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Book</th>
                          <th>Issue date</th>
                          <th>Due date</th>
                          <th>Fine</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myLibraryIssues.map((issue) => (
                          <tr key={issue.issueId}>
                            <td>{issue.bookTitle}</td>
                            <td>{new Date(issue.issueDate).toLocaleDateString()}</td>
                            <td>{new Date(issue.dueDate).toLocaleDateString()}</td>
                            <td>${issue.fineAmount || 0}</td>
                            <td>{issue.returnDate ? 'Returned' : issue.isOverdue ? 'Overdue' : 'Active'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {myExamAllocations.length > 0 && (
                <section className={`section ${activeSection === 'overview' ? 'active' : ''}`}>
                  <div className="section-header" style={{ marginTop: '2rem' }}>
                    <h1>My exam seat plan</h1>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Room</th>
                          <th>Bench</th>
                          <th>Seat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myExamAllocations.map((allocation) => (
                          <tr key={allocation.seatId}>
                            <td>{allocation.course}</td>
                            <td>{new Date(allocation.examDate).toLocaleDateString()}</td>
                            <td>{allocation.timeSlot}</td>
                            <td>{allocation.roomNo}</td>
                            <td>{allocation.benchNo}</td>
                            <td>{allocation.seatNo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
