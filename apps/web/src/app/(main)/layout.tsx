"use client";

import { AppLayout } from "@/components/layouts";
import { useAuth, useRequireAuth } from "@/providers";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const headerUser = user
    ? {
        displayName: user.displayName,
        email: user.email,
        role: user.role.name,
      }
    : undefined;

  return (
    <AppLayout user={headerUser} onLogout={logout}>
      {children}
    </AppLayout>
  );
}
