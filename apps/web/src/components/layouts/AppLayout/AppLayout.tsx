"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "../Sidebar";
import { Header } from "../Header";

interface UserInfo {
  displayName: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  user?: UserInfo;
  onLogout?: () => void;
  className?: string;
}

export function AppLayout({
  children,
  user,
  onLogout,
  className,
}: AppLayoutProps) {
  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onLogout={onLogout} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
