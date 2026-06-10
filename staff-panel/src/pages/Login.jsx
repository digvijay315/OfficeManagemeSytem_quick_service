import { useState } from 'react';
import api from '../api';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.user.role === 'staff') {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.location.href = '/';
      } else {
        setError('Only staff can login here.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Invalid credentials');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-teal-600 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="Quick Service" 
            className="w-40 h-40 mx-auto mb-4 object-contain rounded-full shadow-lg border-4 border-emerald-100 bg-black" 
          />
          <h1 className="text-2xl font-extrabold text-gray-800 uppercase">Quick Service</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">NAWADIH, JARMUNDI, DUMKA</p>
          <div className="text-xs text-gray-400 mt-2 space-y-0.5">
            <p>Phone: 9973546922</p>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h2 className="text-lg font-bold text-emerald-600">Staff Portal</h2>
          </div>
        </div>
        
        {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email ID / Mobile Number</label>
            <input 
              type="text" 
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email or mobile number"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Logging in...
              </>
            ) : (
              'Access My Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
