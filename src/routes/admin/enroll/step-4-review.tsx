/**
 * Step 4: Review & Confirm
 * Final review of all enrolment data
 * Generates confirmation and allows PDF download/print
 */

import { Button, Card } from "@/components/tati";
import type { EnrollmentData } from "./index";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

interface Step4ReviewProps {
  data: EnrollmentData;
  loading: boolean;
  onConfirm: () => Promise<void>;
}

export default function Step4Review({
  data,
  loading,
  onConfirm,
}: Step4ReviewProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    setError(null);

    try {
      await onConfirm();
      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate({ to: "/admin" });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm enrolment");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      // Generate PDF with family, parent, and children credentials
      const pdfContent = generateCredentialsPDF();
      const blob = new Blob([pdfContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.familyName.replace(/\s+/g, "-")}-credentials.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Failed to generate file");
    }
  };

  const generateCredentialsPDF = (): string => {
    // Simple text-based representation
    let content = `TATI ChildSave - Family Enrollment Confirmation\n`;
    content += `${"=".repeat(50)}\n\n`;

    content += `FAMILY DETAILS\n`;
    content += `${"-".repeat(50)}\n`;
    content += `Family Name: ${data.familyName}\n`;
    if (data.familyNotes) {
      content += `Notes: ${data.familyNotes}\n`;
    }
    content += `\n`;

    content += `PARENT DETAILS\n`;
    content += `${"-".repeat(50)}\n`;
    content += `Name: ${data.parentName}\n`;
    content += `Email: ${data.parentEmail}\n`;
    if (data.parentPhone) {
      content += `Phone: ${data.parentPhone}\n`;
    }
    content += `\n`;

    content += `CHILDREN & CREDENTIALS\n`;
    content += `${"-".repeat(50)}\n`;
    data.children.forEach((child, index) => {
      content += `\nChild ${index + 1}: ${child.name}\n`;
      content += `  Age: ${child.age}\n`;
      content += `  TATI ID: ${child.tatiId}\n`;
      content += `  PIN: ${child.pin}\n`;
      if (child.preferredName) {
        content += `  Preferred Name: ${child.preferredName}\n`;
      }
    });

    content += `\n\n${"-".repeat(50)}\n`;
    content += `Important: Keep these credentials secure and share them\n`;
    content += `with the parent through secure channels.\n`;
    content += `The PIN is shown only once and cannot be recovered.\n`;

    return content;
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">✅</div>
        <div>
          <p className="text-2xl font-bold text-green-600">
            Family Enrollment Confirmed!
          </p>
          <p className="text-gray-600 mt-2">
            Redirecting to admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Family Summary */}
      <Card className="p-4 bg-blue-50 border border-blue-200">
        <div className="flex justify-between items-start mb-3">
          <p className="font-semibold">Family Information</p>
          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Family</span>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-600">Family Name</p>
            <p className="font-semibold">{data.familyName}</p>
          </div>
          {data.familyNotes && (
            <div>
              <p className="text-sm text-gray-600">Notes</p>
              <p className="text-sm">{data.familyNotes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Parent Summary */}
      <Card className="p-4 bg-purple-50 border border-purple-200">
        <div className="flex justify-between items-start mb-3">
          <p className="font-semibold">Parent Information</p>
          <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">Parent</span>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-semibold">{data.parentName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold font-mono text-sm">{data.parentEmail}</p>
          </div>
          {data.parentPhone && (
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-semibold">{data.parentPhone}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Children Summary */}
      <Card className="p-4 bg-green-50 border border-green-200">
        <div className="flex justify-between items-start mb-3">
          <p className="font-semibold">Children ({data.children.length})</p>
          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Children</span>
        </div>
        <div className="space-y-3">
          {data.children.map((child, index) => (
            <div key={index} className="bg-white rounded p-3 border border-green-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-600">Name</p>
                  <p className="font-semibold text-sm">{child.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Age</p>
                  <p className="font-semibold text-sm">{child.age}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">TATI ID</p>
                  <p className="font-mono font-bold text-blue-600 text-sm">
                    {child.tatiId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">PIN</p>
                  <p className="font-mono font-bold text-sm">
                    {child.pin} <span className="text-red-600 text-xs">⚠️</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Download/Print Options */}
      <Card className="p-4 bg-yellow-50 border border-yellow-200">
        <p className="font-semibold mb-3">Save & Share Credentials</p>
        <div className="flex gap-3 flex-col sm:flex-row">
          <Button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex-1"
          >
            📥 Download as Text
          </Button>
          <Button
            onClick={handlePrint}
            disabled={loading}
            className="flex-1"
          >
            🖨️ Print
          </Button>
        </div>
        <p className="text-xs text-yellow-700 mt-3">
          <strong>Security:</strong> Share credentials through secure channels. The PIN cannot be
          recovered if lost.
        </p>
      </Card>

      {/* Final Confirmation */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm font-semibold mb-2">
          <strong>Ready to confirm?</strong> Click the button below to complete the enrollment.
          This will:
        </p>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>Create the family record</li>
          <li>Activate the parent account</li>
          <li>Register all children with their TATI IDs</li>
          <li>Lock in the PINs (cannot be changed)</li>
        </ul>
      </div>

      {/* Confirm Button */}
      <Button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        ✓ Confirm & Complete Enrollment
      </Button>
    </div>
  );
}
