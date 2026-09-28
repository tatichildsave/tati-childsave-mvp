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
import {
  useSchool,
  useSchoolAdmins,
  useSchoolFacilitators,
  useSchoolCohorts,
  useSchoolLearners,
} from "@/lib/academy";
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
        <p className="text-sm text-red-700 mt-1">{error ? String(error) : "School not found"}</p>
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
          {["overview", "admins", "facilitators", "cohorts", "learners"].map((tab) => (
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
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "overview" && <OverviewTab school={school} canManage={true} />}
        {activeTab === "admins" && <AdminsTab schoolId={schoolId} canManage={true} />}
        {activeTab === "facilitators" && <FacilitatorsTab schoolId={schoolId} />}
        {activeTab === "cohorts" && <CohortsTab schoolId={schoolId} />}
        {activeTab === "learners" && <LearnersTab schoolId={schoolId} />}
      </div>
    </div>
  );
}

function OverviewTab({ school, canManage }: { school: School; canManage: boolean }) {
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
        <p className="mt-1 text-lg text-gray-900">{school.createdAt.toDate().toLocaleString()}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Last Updated</label>
        <p className="mt-1 text-lg text-gray-900">{school.updatedAt.toDate().toLocaleString()}</p>
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

function AdminsTab({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const { data: admins, isLoading } = useSchoolAdmins(schoolId);

  if (isLoading) {
    return <div className="text-gray-500">Loading admins...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">School Administrators</h3>
        {canManage && (
          <button className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Add Administrator
          </button>
        )}
      </div>

      {!admins || admins.length === 0 ? (
        <p className="text-sm text-gray-500">No administrators found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Role
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.adminUid}>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">{admin.adminUid}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{admin.role}</td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FacilitatorsTab({ schoolId }: { schoolId: string }) {
  const { data: facilitators, isLoading } = useSchoolFacilitators(schoolId);

  if (isLoading) {
    return <div className="text-gray-500">Loading facilitators...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Facilitators</h3>

      {!facilitators || facilitators.length === 0 ? (
        <p className="text-sm text-gray-500">No facilitators found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilitators.map((facilitator) => (
            <div key={facilitator.uid} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-medium text-gray-900">
                {facilitator.displayName || facilitator.uid}
              </div>
              <div className="text-sm text-gray-500 mt-1">{facilitator.email}</div>
              <div className="mt-3 space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">Cohorts: </span>
                  <span className="font-medium text-gray-900">{facilitator.cohortCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Learners: </span>
                  <span className="font-medium text-gray-900">{facilitator.learnerCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CohortsTab({ schoolId }: { schoolId: string }) {
  const { data: cohorts, isLoading } = useSchoolCohorts(schoolId);

  if (isLoading) {
    return <div className="text-gray-500">Loading cohorts...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Cohorts</h3>

      {!cohorts || cohorts.length === 0 ? (
        <p className="text-sm text-gray-500">No cohorts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Cohort Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Facilitator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Learners
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cohorts.map((cohort) => (
                <tr key={cohort.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {cohort.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {cohort.facilitatorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {cohort.learnerCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        cohort.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {cohort.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LearnersTab({ schoolId }: { schoolId: string }) {
  const { data: learners, isLoading } = useSchoolLearners(schoolId);

  if (isLoading) {
    return <div className="text-gray-500">Loading learners...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Learner Roster</h3>

      {!learners || learners.length === 0 ? (
        <p className="text-sm text-gray-500">No learners found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Cohort
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Facilitator
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {learners.map((learner) => (
                <tr key={learner.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {learner.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{learner.age}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {learner.cohortName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {learner.facilitatorName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
