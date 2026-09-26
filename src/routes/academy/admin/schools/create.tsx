/**
 * Academy Admin Create School Route
 *
 * Form for creating new schools.
 * Platform admin only.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateSchool } from "@/lib/academy";

export const Route = createFileRoute("/academy/admin/schools/create")({
  component: CreateSchool,
});

function CreateSchool() {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateSchool();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolName.trim()) {
      setError("School name is required");
      return;
    }

    try {
      const schoolId = await createMutation.mutateAsync({
        name: schoolName.trim(),
      });

      // Navigate to the new school's detail page
      navigate({ to: `/academy/admin/schools/${schoolId}` });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create school"
      );
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create School</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School Name *
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Enter school name"
            disabled={createMutation.isPending}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
            maxLength={200}
          />
          <p className="mt-1 text-xs text-gray-500">
            {schoolName.length}/200 characters
          </p>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? "Creating..." : "Create School"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/academy/admin/schools/" })}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
