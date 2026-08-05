import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LogOut, LayoutDashboard, PlusCircle, BookOpen, BarChart2 } from 'lucide-react';

export default function Layout() {
  const { user, logout, isDistributor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Poll for unseen task count — drives the red dot in the nav
  const { data: unseenData } = useQuery<{ count: number }>({
    queryKey: ['unseen-count'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/unseen-count');
      return data;
    },
    enabled: isDistributor,
    refetchInterval: 15_000,
  });

  const unseenCount = unseenData?.count ?? 0;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function navLink(to: string) {
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
              <BookOpen className="text-white" size={16} />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-gray-900">TaskFlow</span>
            <span className="text-gray-200 mx-1">|</span>

            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${navLink('/') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <LayoutDashboard size={15} />
                Dashboard
                {isDistributor && unseenCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unseenCount > 9 ? '9+' : unseenCount}
                  </span>
                )}
              </Link>

              {isDistributor && (
                <>
                  <Link
                    to="/tasks/new"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${navLink('/tasks/new') ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    <PlusCircle size={15} />
                    New Task
                  </Link>
                  <Link
                    to="/expenses"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${navLink('/expenses') ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <BarChart2 size={15} />
                    Expenses
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className={`text-xs font-medium capitalize
                ${user?.role === 'DISTRIBUTOR' ? 'text-brand-600' : 'text-emerald-600'}`}>
                {user?.role.toLowerCase()}
              </p>
            </div>
            <button onClick={handleLogout} className="btn-secondary gap-1.5 !px-3 !py-1.5">
              <LogOut size={15} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        TaskFlow Academic Task Manager © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
