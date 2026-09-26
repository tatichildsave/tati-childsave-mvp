/**
 * Academy Admin School Detail Route
 *
 * Displays school details with tabs for:
 * - Overview (name, status, creation date)
 * - Admins (manage school admin assignments)
 * - Facilitators (view assigned facilitators)
 * - Cohorts (view school cohorts)
 * - Learners (view school learners)
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useSchool } from "@/lib/academy";
import type { School } from "@/lib/academy";

export const Route = createFileRoute("/academy/admin/schools/$schoolId")({
  component: SchoolDetail,
});

type Tab = "overview" | "admins" | "facilitators" | "cohorts" | "learners";

function SchoolDetail() {
  const { schoolId } = useParams({ from: "/academy/admin/schools/$schoolId" });
  const { data: school, isLoading, error } = useSchool(schoolId);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-2">Loading school...</p>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading school</h3>
        <p className="text-sm text-red-700 mt-1">
          {error ? String(error) : "School not found"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">{school.name}</h2>
        <div className="mt-2 flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              school.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {school.status}
          </span>
          <span className="text-sm text-gray-500">
            Created {school.createdAt.toDate().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {["overview", "admins", "facilitators", "cohorts", "learners"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as Tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "overview" && (
          <OverviewTab school={school} canManage={true} />
        )}
        {activeTab === "admins" && (
          <AdminsTab schoolId={schoolId} canManage={true} />
        )}
        {activeTab === "facilitators" && (
          <FacilitatorsTab schoolId={schoolId} />
        )}
        {activeTab === "cohorts" && <CohortsTab schoolId={schoolId} />}
        {activeTab === "learners" && <LearnersTab schoolId={schoolId} />}
      </div>
    </div>
  );
}

function OverviewTab({
  school,
  canManage,
}: {
  school: School;
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">School Name</label>
        <p className="mt-1 text-lg text-gray-900">{school.name}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Status</label>
        <p className="mt-1 text-lg text-gray-900">{school.status}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Created</label>
        <p className="mt-1 text-lg text-gray-900">
          {school.createdAt.toDate().toLocaleString()}
        </p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Last Updated</label>
        <p className="mt-1 text-lg text-gray-900">
          {school.updatedAt.toDate().toLocaleString()}
        </p>
      </div>

      {canManage && (
        <div className="pt-4 border-t border-gray-200 mt-6">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
            Edit School
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            Archive School
          </button>
        </div>
      )}
    </div>
  );
}

function AdminsTab({
  schoolId,
  canManage,
}: {
  schoolId: string;
  canManage: boolean;
}) {
  // TODO: Implement useSchoolAdmins hook
  return (
    <div>
      <p className="text-gray-600">Manage school administrators</p>
      {canManage && (
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Add Admin
        </button>
      )}
      <div className="mt-4">
        <p className="text-sm text-gray-500">No admins found.</p>
      </div>
    </div>
  );
}

function FacilitatorsTab({ schoolId }: { schoolId: string }) {
  // TODO: Implement getFacilitatorsBySchool
  return (
    <div>
      <p className="text-gray-600">
        Facilitators assigned to this school (if school-scoped)
      </p>
      <div className="mt-4">
        <p className="text-sm text-gray-500">No facilitators found.</p>
      </div>
    </div>
  );
}

function CohortsTab({ schoolId }: { schoolId: string }) {
  // TODO: Implement getCohortsBySchool
  return (
    <div>
      <p className="text-gray-600">Cohorts in this school</p>
      <div className="mt-4">
        <p className="text-sm text-gray-500">No cohorts found.</p>
      </div>
    </div>
  );
}

function LearnersTab({ schoolId }: { schoolId: string }) {
  // TODO: Implement getLearnersBySchool
  return (
    <div>
      <p className="text-gray-600">Learners in this school (aggregate view)</p>
      <div className="mt-4">
        <p className="text-sm text-gray-500">No learners found.</p>
      </div>
    </div>
  );
}
