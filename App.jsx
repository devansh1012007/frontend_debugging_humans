import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  MessageSquare, 
  Users, 
  AlertCircle, 
  LogOut, 
  Plus, 
  Send, 
  Menu, 
  X, 
  LayoutDashboard,
  ChevronRight,
  User,
  Settings
} from 'lucide-react';

// --- Configuration ---
const API_BASE = 'https://any-sara-mixed-shorter.trycloudflare.com/'; // Change this to your backend URL http://0.0.0.0:8000

// --- Auth Context ---
const AuthContext = createContext(null);

// --- API Utility with Silent Refresh ---
// This class manages the tokens and request logic to ensure the user stays logged in
class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, options = {}) {
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      // If unauthorized, try to refresh token
      if (response.status === 401 && this.refreshToken) {
        console.log("Access token expired. Attempting silent refresh...");
        const refreshSuccess = await this.refreshAccessToken();
        
        if (refreshSuccess) {
          // Update header with new token and retry original request
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, config);
        } else {
          // Refresh failed, user must login again
          this.clearTokens();
          window.location.href = '/'; // Simple redirect to login
          throw new Error('Session expired');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE}/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access, this.refreshToken); // Keep old refresh token usually, or update if provided
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

const api = new ApiClient();

// --- Components ---

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Assuming your URL structure based on requirements
      const data = await api.request('/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      // The view returns { access, refresh }
      api.setTokens(data.access, data.refresh);
      onLogin();
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <input
              type="text"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          <div className="text-center">
            <button type="button" onClick={onSwitchToRegister} className="text-sm text-indigo-600 hover:text-indigo-500">
              Need an account? Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.request('/register/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      // Auto login after register or ask to login. For now, switch to login.
      alert("Registration successful! Please login.");
      onSwitchToLogin();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Create Account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-2">
            <input
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
            <input
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
          <div className="text-center">
            <button type="button" onClick={onSwitchToLogin} className="text-sm text-indigo-600 hover:text-indigo-500">
              Already have an account? Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main Chat Component ---
const ChatInterface = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Chat Form State
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatMode, setNewChatMode] = useState('therapy');

  // Load chat sessions (Titles)
  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.request('/Chats/');
      setSessions(data);
    } catch (error) {
      console.error("Failed to load chats", error);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load messages for a specific session
  const loadChatHistory = async (sessionId) => {
    setLoading(true);
    try {
      const allHistories = await api.request('/ChatData/');
      const history = allHistories.find(h => h.chat === sessionId);
      
      // FIX STARTS HERE
      if (history && history.content) { // 1. Check for 'content', not 'messages'
        // 2. Map backend 'message' key to frontend 'content' key
        const formattedMessages = history.content.map(msg => ({
          role: msg.role,
          // Backend uses 'message', Frontend UI expects 'content'
          // We use a fallback OR just in case legacy data has 'content'
          content: msg.message || msg.content || '' 
        }));
        
        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
      // FIX ENDS HERE

      setActiveSessionId(sessionId);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (!newChatTitle) return;

    try {
      // 1. Create the session
      const newSession = await api.request('/Chats/', {
        method: 'POST',
        body: JSON.stringify({ 
          title: newChatTitle, 
          AiMode: newChatMode 
        })
      });

      // 2. Refresh list
      await fetchSessions();
      
      // 3. Close modal
      setIsModalOpen(false);
      setNewChatTitle('');
      
      // 4. Automatically switch to the new endpoint/chat view
      setActiveSessionId(newSession.id);
      setMessages([]); // New chat is empty initially
      
    } catch (error) {
      alert("Failed to create chat");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      
      // Call the continue_chat endpoint
      const response = await api.request('/ChatData/continue_chat/', {
        method: 'POST',
        body: JSON.stringify({
          ChatID: activeSessionId,
          prompt: userMsg.content,
          mode: activeSession?.AiMode || 'therapy'
        })
      });

      const aiMsg = { role: 'assistant', content: response.response };
      setMessages(prev => [...prev, aiMsg]);
      
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: 'Error getting response.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      {/* Sidebar List */}
      <div className="w-1/4 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => loadChatHistory(session.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition ${activeSessionId === session.id ? 'bg-white border-l-4 border-l-indigo-500' : ''}`}
            >
              <h3 className="font-semibold text-gray-800 truncate">{session.title}</h3>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">
                  {session.AiMode}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(session.last_updated).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!activeSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Select a chat or start a new one</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                  Start talking to your {sessions.find(s => s.id === activeSessionId)?.AiMode} AI...
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-gray-400 animate-pulse">AI is typing...</div>}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Start New Session</h2>
            <form onSubmit={handleCreateChat}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
                <input 
                  type="text" 
                  required
                  value={newChatTitle}
                  onChange={e => setNewChatTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Anxiety about work"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Mode</label>
                <select 
                  value={newChatMode}
                  onChange={e => setNewChatMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="therapy">Therapy</option>
                  <option value="counselor">Counselor</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Team Component ---
const TeamMembersView = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Simple view for demo: Fetch all teams
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const data = await api.request('/TeamMembers/');
        setTeams(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <div key={team.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{team.teamname}</h3>
                <Users className="text-indigo-500" size={20} />
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 font-medium mb-2">Members:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(team.content) && team.content.map((member, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {typeof member === 'string' ? member : JSON.stringify(member)}
                    </span>
                  ))}
                  {(!team.content || team.content.length === 0) && <span className="text-xs text-gray-400">No members</span>}
                </div>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                Edit Members
              </button>
            </div>
          ))}
          {teams.length === 0 && <p className="text-gray-500">No teams found.</p>}
        </div>
      )}
    </div>
  );
};

// --- Problems Component ---
const ProblemsView = () => {
  const [problems, setProblems] = useState([]);
  
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const data = await api.request('/Problems/');
        setProblems(data);
      } catch (e) { console.error(e); }
    };
    fetchProblems();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Your Assessments & Problems</h2>
      <div className="grid gap-4">
        {problems.map((prob, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-l-4 border-l-orange-400 border-gray-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-orange-400 shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Assessment Report #{i + 1}</h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{prob.content}</p>
              </div>
            </div>
          </div>
        ))}
        {problems.length === 0 && (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No problems recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ onChangeView }) => {
  return (
    <div className="space-y-8">
      <div className="bg-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h1>
        <p className="opacity-90">Track your mental health journey, manage teams, and chat with AI assistants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div 
          onClick={() => onChangeView('chat')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition group"
        >
          <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition">
            <MessageSquare size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Chat</h3>
          <p className="text-gray-500 mb-4">Start a therapy session or talk to a counselor.</p>
          <div className="flex items-center text-indigo-600 font-medium">
            Open Chat <ChevronRight size={16} className="ml-1" />
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => onChangeView('team')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition group"
        >
          <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Team Management</h3>
          <p className="text-gray-500 mb-4">View and edit team members and structures.</p>
          <div className="flex items-center text-green-600 font-medium">
            Manage Teams <ChevronRight size={16} className="ml-1" />
          </div>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => onChangeView('problems')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition group"
        >
          <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">My Problems</h3>
          <p className="text-gray-500 mb-4">Review your listed issues and assessment results.</p>
          <div className="flex items-center text-orange-600 font-medium">
            View Details <ChevronRight size={16} className="ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Shell ---
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [authView, setAuthView] = useState('login'); // login or register
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    api.clearTokens();
    setIsAuthenticated(false);
    setAuthView('login');
  };

  if (!isAuthenticated) {
    return authView === 'login' 
      ? <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
      : <Register onRegister={() => setAuthView('login')} onSwitchToLogin={() => setAuthView('login')} />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'chat': return <ChatInterface />;
      case 'team': return <TeamMembersView />;
      case 'problems': return <ProblemsView />;
      default: return <Dashboard onChangeView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <span className="text-2xl font-bold text-indigo-600">TherapyAI</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={20} className="mr-3" /> Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('chat')}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${currentView === 'chat' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MessageSquare size={20} className="mr-3" /> Chat
          </button>
          <button 
            onClick={() => setCurrentView('team')}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${currentView === 'team' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users size={20} className="mr-3" /> Team Data
          </button>
          <button 
            onClick={() => setCurrentView('problems')}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${currentView === 'problems' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <AlertCircle size={20} className="mr-3" /> Problems
          </button>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={20} className="mr-3" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600">
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-semibold capitalize text-gray-800">{currentView}</h2>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <User size={18} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;




