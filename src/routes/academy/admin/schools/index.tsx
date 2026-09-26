/**
 * Academy Admin Schools Index Route
 *
 * Displays list of all schools with quick actions.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useAllSchools } from "@/lib/academy";

export const Route = createFileRoute("/academy/admin/schools/")({
  component: SchoolsIndex,
});

function SchoolsIndex() {
  const { data: schools = [], isLoading, error } = useAllSchools();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-600 mt-2">Loading schools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading schools</h3>
        <p className="text-sm text-red-700 mt-1">{String(error)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Schools</h2>
        <Link
          to="/academy/admin/schools/create"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Create School
        </Link>
      </div>

      {schools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No schools found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Link
              key={school.id}
              to={`/academy/admin/schools/${school.id}`}
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {school.name}
                  </h3>
                  <div className="mt-2 flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        school.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {school.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>Created: {school.createdAt.toDate().toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
