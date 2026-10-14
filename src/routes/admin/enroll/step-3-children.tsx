/**
 * Step 3: Children Provisioning
 * Add children and generate TATI IDs and PINs
 * Each child gets a unique TATI ID and 4-digit PIN (shown once)
 */

import { Input, Label, Text, Button, Card, Alert } from "@/components/tati";
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
      // Call provisioning function to generate TATI ID and PIN
      const response = await fetch("/api/provisioning/child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: "will-be-set", // Updated in Step 4
          name: newChild.name,
          age: parseInt(newChild.age),
          dateOfBirth: newChild.dateOfBirth,
          preferredName: newChild.preferredName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate credentials");
      }

      const result = await response.json();

      // Add child to list with generated credentials
      const updatedChildren = [
        ...data.children,
        {
          name: newChild.name,
          age: parseInt(newChild.age),
          dateOfBirth: newChild.dateOfBirth,
          preferredName: newChild.preferredName,
          tatiId: result.tatiId,
          pin: result.pin, // Shown once only
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
          <Text className="font-semibold">Added Children ({data.children.length})</Text>
          {data.children.map((child, index) => (
            <Card key={index} className="p-4 bg-green-50 border border-green-200">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Text className="font-semibold">{child.name}</Text>
                    <Text className="text-sm text-gray-600">Age: {child.age}</Text>
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
                    <Text className="text-xs font-semibold text-gray-600">TATI ID</Text>
                    <Text className="font-mono text-lg font-bold text-blue-600">
                      {child.tatiId}
                    </Text>
                  </div>

                  <div>
                    <Text className="text-xs font-semibold text-gray-600">4-Digit PIN</Text>
                    <div className="flex items-center gap-2">
                      <Text className="font-mono text-lg font-bold text-blue-600">
                        {child.pin}
                      </Text>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Shown once
                      </span>
                    </div>
                  </div>

                  {child.preferredName && (
                    <div>
                      <Text className="text-xs font-semibold text-gray-600">Preferred Name</Text>
                      <Text className="text-sm">{child.preferredName}</Text>
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
        <Text className="font-semibold mb-4">
          {data.children.length === 0 ? "Add First Child" : "Add Another Child"}
        </Text>

        <div className="space-y-4">
          <div>
            <Label htmlFor="childName">Child Name *</Label>
            <Input
              id="childName"
              type="text"
              placeholder="e.g., Sarah Johnson"
              value={newChild.name}
              onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
              disabled={generatingIndex !== null}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="childAge">Age (5-18) *</Label>
              <Input
                id="childAge"
                type="number"
                min="5"
                max="18"
                placeholder="10"
                value={newChild.age}
                onChange={(e) => setNewChild({ ...newChild, age: e.target.value })}
                disabled={generatingIndex !== null}
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={newChild.dateOfBirth}
                onChange={(e) => setNewChild({ ...newChild, dateOfBirth: e.target.value })}
                disabled={generatingIndex !== null}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="preferredName">Preferred Name (Optional)</Label>
            <Input
              id="preferredName"
              type="text"
              placeholder="e.g., Sara (if full name is Sarah)"
              value={newChild.preferredName}
              onChange={(e) => setNewChild({ ...newChild, preferredName: e.target.value })}
              disabled={generatingIndex !== null}
            />
          </div>

          {error && (
            <Alert type="error">{error}</Alert>
          )}

          <Button
            onClick={generateTatiIdAndPin}
            disabled={generatingIndex !== null}
            loading={generatingIndex !== null}
            className="w-full"
          >
            {generatingIndex !== null ? "Generating..." : "Generate TATI ID & PIN"}
          </Button>
        </div>
      </Card>

      {/* At Least One Child Required */}
      {data.children.length === 0 && (
        <Alert type="info">
          <p className="text-sm">
            <strong>Required:</strong> At least one child must be added before proceeding.
          </p>
        </Alert>
      )}

      <Alert type="warning">
        <p className="text-sm">
          <strong>⚠️ Important:</strong> The PIN is displayed here only once. Make sure the parent
          has noted it down before proceeding to the next step.
        </p>
      </Alert>
    </div>
  );
}
