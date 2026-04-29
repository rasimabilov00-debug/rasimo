import React, { useState } from "react";
import "../styles/AdminAuthLogin.css";

const AdminAuthLogin = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      if (onLogin(password)) {
        setPassword("");
        setIsLoading(false);
      } else {
        setError("Invalid password. Please try again.");
        setPassword("");
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1>Admin Access</h1>
          <p>Enter password to manage restaurants</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Admin Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="password-input"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Access Admin Panel"}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-text">
            💡 <strong>Demo:</strong> Use password: <code>admin123</code> or set{" "}
            <code>REACT_APP_ADMIN_PASSWORD</code> in <code>.env</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthLogin;
