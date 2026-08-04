'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { FolderOpen, Download, ChevronLeft, ChevronRight, Wifi, WifiOff, BarChart2, Bot, LogIn, LogOut, User, CreditCard, UserCircle, GraduationCap,  } from 'lucide-react';

interface NavItem {
  label: string;
  labelAr: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  color: string;
  activeColor: string;
}

const navItems: NavItem[] = [
  {
    label: 'PDF Browser',
    labelAr: 'تصفح الملفات',
    href: '/',
    icon: <FolderOpen size={20} />,
    badge: 9002,
    color: 'text-blue-200 hover:bg-blue-500/20 hover:text-white',
    activeColor: 'bg-white/20 text-white border border-white/30',
  },
  {
    label: 'Download Manager',
    labelAr: 'مدير التحميل',
    href: '/download-manager',
    icon: <Download size={20} />,
    badge: 3,
    color: 'text-blue-200 hover:bg-blue-500/20 hover:text-white',
    activeColor: 'bg-white/20 text-white border border-white/30',
  },
  {
    label: 'AI Tutor',
    labelAr: 'مدرّس ذكي',
    href: '/ai-tutor',
    icon: <Bot size={20} />,
    color: 'text-blue-200 hover:bg-blue-500/20 hover:text-white',
    activeColor: 'bg-white/20 text-white border border-white/30',
  },
  {
    label: 'Pricing',
    labelAr: 'الاشتراكات',
    href: '/pricing',
    icon: <CreditCard size={20} />,
    color: 'text-blue-200 hover:bg-blue-500/20 hover:text-white',
    activeColor: 'bg-white/20 text-white border border-white/30',
  },
  {
    label: 'Account',
    labelAr: 'حسابي',
    href: '/account',
    icon: <UserCircle size={20} />,
    color: 'text-blue-200 hover:bg-blue-500/20 hover:text-white',
    activeColor: 'bg-white/20 text-white border border-white/30',
  },
];

interface SidebarProps {
  activePath: string;
}

export default function Sidebar({ activePath }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [connected] = useState(true);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch {
      // ignore
    }
  };

  return (
    <aside
      className="relative flex flex-col transition-all duration-300 ease-in-out shrink-0"
      style={{
        width: collapsed ? 64 : 240,
        background: 'linear-gradient(180deg, #4f46e5 0%, #7c3aed 55%, #6d28d9 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 overflow-hidden">
        <div className="shrink-0 bg-white/20 rounded-xl p-1.5">
          <GraduationCap size={22} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-sm text-white whitespace-nowrap leading-tight block">
              DzExams
            </span>
            <span className="text-xs text-blue-200 whitespace-nowrap block">
              PDF Downloader
            </span>
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 overflow-hidden">
        <div className="shrink-0">
          {connected ? (
            <Wifi size={14} className="text-green-300" />
          ) : (
            <WifiOff size={14} className="text-red-300" />
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={`w-2 h-2 rounded-full shrink-0 pulse-dot ${connected ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className="text-xs text-blue-200 whitespace-nowrap">
              {connected ? 'متصل / Connected' : 'غير متصل'}
            </span>
          </div>
        )}
      </div>

      {/* Nav section label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1">
          <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
            Navigation
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={`nav-${item.href}`}
              href={item.href}
              title={collapsed ? item.labelAr : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                ${isActive ? item.activeColor : item.color}`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <span className="text-sm font-semibold block truncate">
                    {item.labelAr}
                  </span>
                  <span className="text-xs text-blue-300 block truncate">
                    {item.label}
                  </span>
                </div>
              )}
              {!collapsed && item.badge !== undefined && (
                <span
                  className={`text-xs font-tabular px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-white/30 text-white' :'bg-white/10 text-blue-200'
                  }`}
                >
                  {item.badge > 999
                    ? `${(item.badge / 1000).toFixed(1)}k`
                    : item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Stats */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white/10 border border-white/15">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={14} className="text-yellow-300" />
            <span className="text-xs font-semibold text-blue-200">
              إحصائيات المنصة
            </span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: '1AS', count: '1,921', color: 'from-blue-400 to-cyan-400' },
              { label: '2AS', count: '2,824', color: 'from-violet-400 to-purple-400' },
              { label: '3AS', count: '4,257', color: 'from-pink-400 to-rose-400' },
            ].map((s) => (
              <div key={`stat-${s.label}`} className="flex items-center gap-2">
                <span className="text-xs text-blue-200 w-8">
                  {s.label}
                </span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${s.color} rounded-full`}
                    style={{
                      width:
                        s.label === '1AS' ? '45%'
                          : s.label === '2AS' ? '66%' : '100%',
                    }}
                  />
                </div>
                <span className="text-xs font-tabular text-blue-200 w-10 text-right">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User / Auth section */}
      <div className="px-2 pb-3 border-t border-white/10 pt-2 space-y-1">
        {user ? (
          <>
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              title={collapsed ? user.email : undefined}
            >
              <User size={18} className="shrink-0 text-yellow-300" />
              {!collapsed && (
                <span className="text-xs text-blue-200 truncate flex-1">
                  {user.email}
                </span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150"
              title={collapsed ? 'تسجيل الخروج' : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">تسجيل الخروج</span>
              )}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-150"
            title={collapsed ? 'تسجيل الدخول' : undefined}
          >
            <LogIn size={18} className="shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">تسجيل الدخول</span>
            )}
          </Link>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-500 border-2 border-white shadow-lg flex items-center justify-center hover:bg-indigo-400 transition-colors z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={12} className="text-white" />
        ) : (
          <ChevronLeft size={12} className="text-white" />
        )}
      </button>
    </aside>
  );
}