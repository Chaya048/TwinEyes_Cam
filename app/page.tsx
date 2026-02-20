'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); //เก็บข้อความ Error
  const router = useRouter();

  const users: { [key: string]: string } = {
    'jeng': '1234',
    'pp': '3489'
  };
  
  //ทำงานเมื่อผู้ใช้กดปุ่ม Login หรือกด Enter
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // รีเซ็ต Error ทุกครั้งที่กด Login

    if (!username || !password) {
      setError('Information not found');
      return;
    }
    if (users[username] && users[username] === password) {
      console.log('Login Success! User:', username);
      router.push('/dashboard');
    } else {
      setError('The username or password is incorrect.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-800 font-sans">
      
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">TwinEyes Login</h1>
        
        {/* แสดงข้อความ Error ถ้ามี */}
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded text-center">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full p-2 rounded border focus:outline-none focus:ring-1 transition-colors ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Enter username"
          />
        </div>

        <div className="mb-2">
          <label className="block mb-2 text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-2 rounded border focus:outline-none focus:ring-1 transition-colors ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Enter password"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors shadow-sm"
        >
          Login
        </button>

      </form>
    </div>
  );
}
