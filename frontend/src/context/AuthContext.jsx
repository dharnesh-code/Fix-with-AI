import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, name, email }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);  // checking localStorage on mount

  useEffect(() => {
    const savedToken = localStorage.getItem('fwa_token');
    const savedUser  = localStorage.getItem('fwa_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  function login(token, user) {
    setToken(token);
    setUser(user);
    localStorage.setItem('fwa_token', token);
    localStorage.setItem('fwa_user', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fwa_token');
    localStorage.removeItem('fwa_user');
    delete axios.defaults.headers.common['Authorization'];
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
