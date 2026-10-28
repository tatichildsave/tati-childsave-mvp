/**
 * Admin — Settings
 * System configuration, user management, and preferences
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Settings as SettingsIcon,
  User,
  Mail,
  Lock,
  Bell,
  Globe,
  Save,
  AlertCircle,
} from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/tati";

export const Route = createFileRoute("/admin/settings/")({
  head: () => ({ meta: [{ title: "Settings — TATI ChildSave admin" }] }),
  component: SettingsPage,
});

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminWorkspace title="Settings" active="settings">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1
            className={cn(
              "text-[26px] font-extrabold leading-tight sm:text-[30px]",
              t.navy
            )}
          >
            Settings
          </h1>
          <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
            Configure TATI ChildSave admin workspace and system preferences.
          </p>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 bg-green-600 rounded-full" />
          <p className="text-sm font-medium text-green-700">
            Settings saved successfully
          </p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account Settings */}
        <SettingsSection
          title="Account Settings"
          description="Manage your admin profile and account preferences"
          icon={<User className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Display Name
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Email Address
              </label>
              <input
                type="email"
                defaultValue="admin@tatichildsave.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="+233 XXX XXX XXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          title="Security"
          description="Manage password and security preferences"
          icon={<Lock className="w-5 h-5" />}
        >
          <div className="space-y-3">
            <Button className="w-full md:w-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              <Lock className="w-4 h-4" />
              Change Password
            </Button>
            <div className="flex items-start gap-3 pt-4 border-t border-gray-200">
              <input
                type="checkbox"
                id="twofa"
                defaultChecked
                className="w-4 h-4 mt-0.5"
              />
              <div>
                <label htmlFor="twofa" className="font-semibold text-gray-900">
                  Two-Factor Authentication
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Enhance account security with 2FA. Currently enabled.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title="Notifications"
          description="Control how you receive platform notifications"
          icon={<Bell className="w-5 h-5" />}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Daily summary of platform activity</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">New Enrollment Alerts</p>
                <p className="text-sm text-gray-600">Notify when families enroll</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">System Alerts</p>
                <p className="text-sm text-gray-600">Important system and security updates</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4"
              />
            </div>
          </div>
        </SettingsSection>

        {/* System Preferences */}
        <SettingsSection
          title="System Preferences"
          description="Configure platform behavior and display options"
          icon={<Globe className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Language
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent">
                <option>English</option>
                <option>Twi</option>
                <option>Ga</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Timezone
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent">
                <option>GMT (UTC+0)</option>
                <option>West Africa Standard Time (UTC+0)</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Dark Mode</p>
                <p className="text-sm text-gray-600">Use dark theme for the interface</p>
              </div>
              <input type="checkbox" className="w-4 h-4" />
            </div>
          </div>
        </SettingsSection>

        {/* Audit & Compliance */}
        <div className={cn("rounded-xl border border-gray-200 p-6", t.card)}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Audit & Compliance
            </h3>
          </div>
          <p className={cn("text-sm mb-4", t.muted)}>
            Access audit logs and compliance documentation for your TATI ChildSave instance.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50">
              View Audit Logs
            </Button>
            <Button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50">
              Privacy Policy
            </Button>
            <Button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50">
              Terms of Service
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center pt-4">
          <p className={cn("text-sm", t.muted)}>
            Changes are saved automatically
          </p>
          <Button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </AdminWorkspace>
  );
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: SettingsSectionProps) {
  return (
    <div className={cn("rounded-xl border border-gray-200 p-6", t.card)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-blue-600">{icon}</div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className={cn("text-sm", t.muted)}>{description}</p>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">{children}</div>
    </div>
  );
}
