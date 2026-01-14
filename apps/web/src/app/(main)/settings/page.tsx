import Link from "next/link";
import {
  User,
  Shield,
  Bell,
  Palette,
  Globe,
  Key,
  Building2,
  Users,
  Network,
  Lock,
  UserCog,
  Share2,
  ShieldCheck,
  Workflow,
  CheckCircle,
  Map,
} from "lucide-react";

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

const personalSettings: SettingSection[] = [
  {
    id: "profile",
    title: "Profile",
    description: "Update your personal information and photo",
    icon: <User className="h-5 w-5" />,
    href: "/settings/profile",
  },
  {
    id: "security",
    title: "Security",
    description: "Manage password and two-factor authentication",
    icon: <Shield className="h-5 w-5" />,
    href: "/settings/security",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure email and push notification preferences",
    icon: <Bell className="h-5 w-5" />,
    href: "/settings/notifications",
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Customize theme and display preferences",
    icon: <Palette className="h-5 w-5" />,
    href: "/settings/appearance",
  },
  {
    id: "language",
    title: "Language & Region",
    description: "Set language, timezone, and date format",
    icon: <Globe className="h-5 w-5" />,
    href: "/settings/language",
  },
];

const adminSettings: SettingSection[] = [
  {
    id: "organization",
    title: "Organization",
    description: "Manage organization details and branding",
    icon: <Building2 className="h-5 w-5" />,
    href: "/settings/organization",
  },
  {
    id: "users",
    title: "Users & Teams",
    description: "Manage users, roles, and team assignments",
    icon: <Users className="h-5 w-5" />,
    href: "/settings/users",
  },
  {
    id: "api",
    title: "API Keys",
    description: "Manage API access and integrations",
    icon: <Key className="h-5 w-5" />,
    href: "/settings/api",
  },
];

const securitySettings: SettingSection[] = [
  {
    id: "roles",
    title: "Role Hierarchy",
    description: "Define organizational role structure and reporting relationships",
    icon: <Network className="h-5 w-5" />,
    href: "/settings/roles",
  },
  {
    id: "profiles",
    title: "Permission Profiles",
    description: "Manage base permission sets for different user types",
    icon: <UserCog className="h-5 w-5" />,
    href: "/settings/profiles",
  },
  {
    id: "permission-sets",
    title: "Permission Sets",
    description: "Create additional permission grants for specific users",
    icon: <ShieldCheck className="h-5 w-5" />,
    href: "/settings/permission-sets",
  },
  {
    id: "sharing",
    title: "Sharing Settings",
    description: "Configure organization-wide defaults and sharing rules",
    icon: <Share2 className="h-5 w-5" />,
    href: "/settings/sharing",
  },
  {
    id: "public-groups",
    title: "Public Groups",
    description: "Manage groups for sharing and access control",
    icon: <Lock className="h-5 w-5" />,
    href: "/settings/public-groups",
  },
];

const automationSettings: SettingSection[] = [
  {
    id: "workflows",
    title: "Workflow Rules",
    description: "Automate field updates and actions based on record changes",
    icon: <Workflow className="h-5 w-5" />,
    href: "/settings/workflows",
  },
  {
    id: "approvals",
    title: "Approval Processes",
    description: "Configure multi-step approval workflows for records",
    icon: <CheckCircle className="h-5 w-5" />,
    href: "/settings/approvals",
  },
];

const territorySettings: SettingSection[] = [
  {
    id: "territories",
    title: "Territory Management",
    description: "Organize sales territories and manage user assignments",
    icon: <Map className="h-5 w-5" />,
    href: "/settings/territories",
  },
];

function SettingCard({ section }: { section: SettingSection }) {
  return (
    <Link
      href={section.href}
      className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {section.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{section.title}</h3>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Personal Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {personalSettings.map((section) => (
              <SettingCard key={section.id} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Administration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {adminSettings.map((section) => (
              <SettingCard key={section.id} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Security & Sharing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {securitySettings.map((section) => (
              <SettingCard key={section.id} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Automation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {automationSettings.map((section) => (
              <SettingCard key={section.id} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Territory Management</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {territorySettings.map((section) => (
              <SettingCard key={section.id} section={section} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
