import React, { useState } from 'react';
import api from './api';
import { normalizeMessage } from './messageUtils';

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { username, password });
      const user = res.data;
      onLogin(user);
    } catch (err) {
      setError(normalizeMessage(err?.response?.data?.error || err?.response?.data || err?.message, 'Erro ao entrar.'));
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '24px' }}>Gestão Residencial</h2>
        <h3 style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>Acesso Restrito</h3>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuário</label>
            <input 
              type="text" 
              required 
              className="form-control" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label>Senha</label>
            <input 
              type="password" 
              required 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
