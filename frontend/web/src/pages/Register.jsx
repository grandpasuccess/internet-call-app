import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { initSocket } from '../services/socket';

const PASSWORD_RULES = [
  'At least 8 characters',
  'One uppercase letter',
  'One number',
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!username.trim() || username.length < 3) {
      errs.username = 'Username must be at least 3 characters';
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]{2,49}$/.test(username)) {
      errs.username = 'Username must start with a letter and be alphanumeric';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      errs.password = (errs.password || '') + ' One uppercase letter required';
    }
    if (!/[0-9]/.test(password)) {
      errs.password = (errs.password || '') + ' One number required';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const data = await authService.register(username, email, password);
      initSocket(data.token);
      navigate('/dashboard');
    } catch (err) {
      const serverError = err.response?.data?.error || 'Registration failed';
      const serverCode = err.response?.data?.code;
      setErrors({
        submit: serverCode === 'DUPLICATE_EMAIL' ? 'Email already registered' :
               serverCode === 'DUPLICATE_USERNAME' ? 'Username already taken' :
               serverError,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        {errors.submit && <div className="error-msg">{errors.submit}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              required
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
            <ul className="password-rules">
              {PASSWORD_RULES.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
