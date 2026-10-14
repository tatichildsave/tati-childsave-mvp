/**
 * Step 1: Family Details
 * Simple form to capture family name and optional notes
 */

import type { EnrollmentData } from "./index";

interface Step1FamilyProps {
  data: EnrollmentData;
  onDataChange: (data: EnrollmentData) => void;
}

export default function Step1Family({ data, onDataChange }: Step1FamilyProps) {
  const handleFamilyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDataChange({
      ...data,
      familyName: e.target.value,
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDataChange({
      ...data,
      familyNotes: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="familyName" className="block text-sm font-semibold mb-2">
          Family Name *
        </label>
        <input
          id="familyName"
          type="text"
          placeholder="e.g., Johnson Family"
          value={data.familyName}
          onChange={handleFamilyNameChange}
          required
          autoFocus
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="familyNotes" className="block text-sm font-semibold mb-2">
          Notes (Optional)
        </label>
        <textarea
          id="familyNotes"
          placeholder="Add any additional notes about the family (e.g., language preferences, special needs)"
          value={data.familyNotes || ""}
          onChange={handleNotesChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          <strong>Next:</strong> We'll create the parent account and add children for this family.
        </p>
      </div>
    </div>
  );
}
