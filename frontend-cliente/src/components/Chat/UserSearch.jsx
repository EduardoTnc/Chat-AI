import React, { useState, useContext, useEffect } from 'react';
import { TiendaContext } from '../../context/TiendaContext';
import { ChatContext } from '../../context/ChatContext';
import axios from 'axios';
import './UserSearch.css';

const UserSearch = ({ onClose }) => {
  const { token, urlApi } = useContext(TiendaContext);
  const { startConversation, conversations } = useContext(ChatContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buscar usuarios cuando cambia el término de búsqueda
  useEffect(() => {

    const searchUsers = async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setUsers([]);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await axios.get(`${urlApi}/api/user/search?query=${searchTerm}`, {
          headers: { token }
        });

        if (response.data.success) {
          setUsers(response.data.users);
        } else {
          setError('Error al buscar usuarios');
        }
      } catch (error) {
        console.error('Error al buscar usuarios:', error);
        setError('Error al buscar usuarios. Inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchUsers();
      }
    }, 500); // Debounce para evitar demasiadas solicitudes

    return () => clearTimeout(timeoutId);
  }, [searchTerm, token, urlApi]);

  // Iniciar conversación con un usuario
  const handleStartConversation = (user) => {
    // Adaptar el formato del usuario al formato esperado por startConversation
    const chatUser = {
      _id: user._id,
      name: user.name,
      email: user.email
    };

    startConversation(chatUser);
    onClose();
  };

  // Filtrar usuarios que ya están en las conversaciones existentes
  const filteredUsers = users.filter(user => {
    // Verificar si ya existe una conversación con este usuario
    return !conversations.some(conv => conv._id === user._id);
  });

  return (
    <div className="user-search">
      <div className="user-search-header">
        <button className="back-button" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3>Buscar usuarios</h3>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        {searchTerm && (
          <button
            className="clear-search"
            onClick={() => setSearchTerm('')}
          >
            &times;
          </button>
        )}
      </div>

      <div className="search-results">
        {loading ? (
          <div className="search-status">Buscando usuarios...</div>
        ) : error ? (
          <div className="search-status error">{error}</div>
        ) : searchTerm.length < 2 ? (
          <div className="search-status">Ingresa al menos 2 caracteres para buscar</div>
        ) : filteredUsers.length === 0 ? (
          <div className="search-status">No se encontraron usuarios</div>
        ) : (
          <ul className="user-list">
            {filteredUsers.map(user => (
              <li
                key={user._id}
                className="user-item"
                onClick={() => handleStartConversation(user)}
              >
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <h4>{user.name}</h4>
                  <p>{user.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserSearch;
