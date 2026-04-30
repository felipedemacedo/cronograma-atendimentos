import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import api from './api';

export default function UsersView({ residences, caregivers, currentUser }) {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const defaultRole = currentUser.role === 'admin_geral' ? 'admin_geral' : 'admin_residencia';
  const [formData, setFormData] = useState({ id: '', username: '', password: '', role: defaultRole, residencia_ids: [], cuidadora_ids: [] });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    let isMounted = true;

    api.get('/users')
      .then((res) => {
        if (isMounted) setUsers(res.data);
      })
      .catch((err) => console.error(err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setFormData({ ...user, password: '' });
    } else {
      setFormData({ id: '', username: '', password: '', role: defaultRole, residencia_ids: [], cuidadora_ids: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) await api.put(`/users/${formData.id}`, formData);
      else await api.post('/users', formData);
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser.id) return alert('Você não pode excluir seu próprio usuário.');
    if (window.confirm('Excluir este usuário?')) {
      await api.delete(`/users/${id}`);
      fetchUsers();
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>Gestão de Usuários</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      <div className="grid">
        {users.filter(u => currentUser.role === 'admin_geral' || u.role !== 'admin_geral').map(u => (
          <div key={u.id} className="card">
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'white' }}>{u.username}</h3>
              <span style={{ fontSize: '0.8rem', background: u.role === 'admin_geral' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'admin_residencia' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: u.role === 'admin_geral' ? 'var(--danger)' : u.role === 'admin_residencia' ? 'var(--primary)' : '#ccc', padding: '4px 8px', borderRadius: '4px' }}>
                {u.role === 'admin_geral' ? 'Admin Geral' : u.role === 'admin_residencia' ? 'Admin Residencial' : 'Visualizador'}
              </span>
            </div>
            {(u.role === 'admin_residencia' || u.role === 'usuario_visualizador') && (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: u.role === 'usuario_visualizador' ? '4px' : '0' }}>
                  Residências: {residences.filter(r => u.residencia_ids?.includes(r.id)).map(r => r.nome).join(', ') || 'Nenhuma'}
                </p>
                {u.role === 'usuario_visualizador' && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Prestadores: {caregivers?.filter(c => u.cuidadora_ids?.includes(c.id)).map(c => c.nome).join(', ') || 'Nenhum'}
                  </p>
                )}
              </>
            )}
            <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-icon" onClick={() => handleOpenModal(u)}><Edit2 size={18} /></button>
              <button className="btn-icon" onClick={() => handleDelete(u.id)}><Trash2 size={18} color="var(--danger)" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginBottom: '24px' }}>{formData.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input required className="form-control" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password {formData.id && '(Deixe em branco para manter a atual)'}</label>
                <input type="password" required={!formData.id} className="form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Permissão</label>
                <select className="form-control" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value, residencia_ids: [], cuidadora_ids: [] })}>
                  {currentUser.role === 'admin_geral' && <option value="admin_geral">Administrador Geral</option>}
                  <option value="admin_residencia">Administrador de Residências</option>
                  <option value="usuario_visualizador">Usuário Visualizador</option>
                </select>
              </div>

              {(formData.role === 'admin_residencia' || formData.role === 'usuario_visualizador') && (
                <div className="form-group">
                  <label>Residências Permitidas</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    {residences.map(res => (
                      <label key={res.id} style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          style={{ marginRight: '8px', accentColor: 'var(--primary)' }}
                          checked={formData.residencia_ids?.includes(res.id)} 
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const ids = formData.residencia_ids || [];
                            setFormData({
                              ...formData,
                              residencia_ids: isChecked ? [...ids, res.id] : ids.filter(i => i !== res.id)
                            });
                          }} 
                        />
                        {res.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.role === 'usuario_visualizador' && formData.residencia_ids?.length > 0 && (
                <div className="form-group">
                  <label>Prestadores de Serviços Permitidos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {caregivers.filter(c => c.residencia_ids?.some(r => formData.residencia_ids?.includes(r))).map(c => (
                      <label key={c.id} style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          style={{ marginRight: '8px', accentColor: 'var(--primary)' }}
                          checked={formData.cuidadora_ids?.includes(c.id) || false} 
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const ids = formData.cuidadora_ids || [];
                            setFormData({
                              ...formData,
                              cuidadora_ids: isChecked ? [...ids, c.id] : ids.filter(i => i !== c.id)
                            });
                          }} 
                        />
                        {c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
