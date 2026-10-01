import { Link } from 'react-router'

export function AgentLoginLink() {
  return <div className="agent-login-entry">
    <div className="auth-divider"><span>OR</span></div>
    <Link className="auth-button agent-login-link" to="/admin/login">Agent Login</Link>
  </div>
}
