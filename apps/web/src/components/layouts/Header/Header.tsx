"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  User,
  LogOut,
  Settings,
} from "lucide-react";

interface UserInfo {
  displayName: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

interface HeaderProps {
  user?: UserInfo;
  onLogout?: () => void;
  className?: string;
}

export function Header({ user, onLogout, className }: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showCreateMenu, setShowCreateMenu] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const createMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const createMenuItems = [
    { label: "New Account", href: "/accounts/new" },
    { label: "New Contact", href: "/contacts/new" },
    { label: "New Lead", href: "/leads/new" },
    { label: "New Opportunity", href: "/opportunities/new" },
    { label: "New Quote", href: "/quotes/new" },
  ];

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b bg-card px-4",
        className
      )}
    >
      {/* Left Section - Search */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-2">
        {/* Create New Menu */}
        <div ref={createMenuRef} className="relative">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          {showCreateMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-card py-1 shadow-lg">
              {createMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-sm hover:bg-accent"
                  onClick={() => setShowCreateMenu(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium">
                {user?.displayName || "User"}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.role || "User"}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-card py-1 shadow-lg">
              <div className="border-b px-4 py-3">
                <div className="font-medium">{user?.displayName || "User"}</div>
                <div className="text-sm text-muted-foreground">
                  {user?.email || "user@example.com"}
                </div>
              </div>
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                onClick={() => setShowUserMenu(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <div className="border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout?.();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
