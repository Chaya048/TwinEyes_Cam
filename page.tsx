// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // ตรวจสอบรหัสผ่าน (Demo: user อะไรก็ได้ แต่รหัสต้อง 1234)
    if (password === '3489') {
      console.log('User:', username); // เช็ค Log ได้ว่าใครล็อกอิน
      router.push('/dashboard');
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-800 font-sans">
      
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
        
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">TwinEyes Login</h1>
        
        {/* --- ช่อง Username --- */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Enter username"
            required
          />
        </div>

        {/* --- ช่อง Password --- */}
        <div className="mb-2">
          <label className="block mb-2 text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Enter password"
          />
        </div>

        {/* --- ลิงก์ลืมรหัสผ่าน --- */}
        <div className="flex justify-end mb-6">
           <a href="#" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
             ลืมรหัสผ่าน?
           </a>
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