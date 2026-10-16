/**
 * Step 3: Children Provisioning
 * Add children and generate TATI IDs and PINs
 * Each child gets a unique TATI ID and 4-digit PIN (shown once)
 */

import { Button, Card } from "@/components/tati";
import type { EnrollmentData } from "./index";
import { useState } from "react";

interface ChildForm {
  name: string;
  age: string;
  dateOfBirth: string;
  preferredName: string;
}

interface Step3ChildrenProps {
  data: EnrollmentData;
  onDataChange: (data: EnrollmentData) => void;
}

export default function Step3Children({
  data,
  onDataChange,
}: Step3ChildrenProps) {
  const [newChild, setNewChild] = useState<ChildForm>({
    name: "",
    age: "",
    dateOfBirth: "",
    preferredName: "",
  });
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateChild = (): boolean => {
    if (!newChild.name.trim()) {
      setError("Child name is required");
      return false;
    }
    if (!newChild.age || parseInt(newChild.age) < 5 || parseInt(newChild.age) > 18) {
      setError("Child age must be between 5 and 18");
      return false;
    }
    return true;
  };

  const generateTatiIdAndPin = async () => {
    setError(null);

    if (!validateChild()) {
      return;
    }

    setGeneratingIndex(data.children.length);

    try {
      // Generate PIN locally (4 random digits)
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Create a placeholder TATI ID (will be generated server-side in step 4)
      const tempTatiId = `TATI-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Add child to list with generated credentials
      const updatedChildren = [
        ...data.children,
        {
          name: newChild.name,
          age: parseInt(newChild.age),
          dateOfBirth: newChild.dateOfBirth,
          preferredName: newChild.preferredName,
          tatiId: tempTatiId,
          pin: pin, // Shown once only
        },
      ];

      onDataChange({
        ...data,
        children: updatedChildren,
      });

      // Reset form
      setNewChild({
        name: "",
        age: "",
        dateOfBirth: "",
        preferredName: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate credentials");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const removeChild = (index: number) => {
    onDataChange({
      ...data,
      children: data.children.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Added Children List */}
      {data.children.length > 0 && (
        <div className="space-y-4">
          <p className="font-semibold">Added Children ({data.children.length})</p>
          {data.children.map((child, index) => (
            <Card key={index} className="p-4 bg-green-50 border border-green-200">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{child.name}</p>
                    <p className="text-sm text-gray-600">Age: {child.age}</p>
                  </div>
                  <button
                    onClick={() => removeChild(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>

                <div className="bg-white rounded p-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600">TATI ID</p>
                    <p className="font-mono text-lg font-bold text-blue-600">
                      {child.tatiId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600">4-Digit PIN</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-lg font-bold text-blue-600">
                        {child.pin}
                      </p>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Shown once
                      </span>
                    </div>
                  </div>

                  {child.preferredName && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Preferred Name</p>
                      <p className="text-sm">{child.preferredName}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Child Form */}
      <Card className="p-4 bg-gray-50 border border-gray-200">
        <p className="font-semibold mb-4">
          {data.children.length === 0 ? "Add First Child" : "Add Another Child"}
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="childName" className="block text-sm font-semibold mb-2">
              Child Name *
            </label>
            <input
              id="childName"
              type="text"
              placeholder="e.g., Sarah Johnson"
              value={newChild.name}
              onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
              disabled={generatingIndex !== null}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="childAge" className="block text-sm font-semibold mb-2">
                Age (5-18) *
              </label>
              <input
                id="childAge"
                type="number"
                min="5"
                max="18"
                placeholder="10"
                value={newChild.age}
                onChange={(e) => setNewChild({ ...newChild, age: e.target.value })}
                disabled={generatingIndex !== null}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-semibold mb-2">
                Date of Birth (Optional)
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={newChild.dateOfBirth}
                onChange={(e) => setNewChild({ ...newChild, dateOfBirth: e.target.value })}
                disabled={generatingIndex !== null}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="preferredName" className="block text-sm font-semibold mb-2">
              Preferred Name (Optional)
            </label>
            <input
              id="preferredName"
              type="text"
              placeholder="e.g., Sara (if full name is Sarah)"
              value={newChild.preferredName}
              onChange={(e) => setNewChild({ ...newChild, preferredName: e.target.value })}
              disabled={generatingIndex !== null}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={generateTatiIdAndPin}
            disabled={generatingIndex !== null}
            className="w-full"
          >
            {generatingIndex !== null ? "Generating..." : "Generate TATI ID & PIN"}
          </Button>
        </div>
      </Card>

      {/* At Least One Child Required */}
      {data.children.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">
            <strong>Required:</strong> At least one child must be added before proceeding.
          </p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Important:</strong> The PIN is displayed here only once. Make sure the parent
          has noted it down before proceeding to the next step.
        </p>
      </div>
    </div>
  );
}
