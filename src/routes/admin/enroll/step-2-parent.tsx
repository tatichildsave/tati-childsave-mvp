/**
 * Step 2: Parent Details
 * Capture parent email, name, and optional phone
 * Integrates with provisionParent server function
 */

import { Input, Label, Text, Alert } from "@/components/tati";
import type { EnrollmentData } from "./index";
import { useState } from "react";

interface Step2ParentProps {
  data: EnrollmentData;
  onDataChange: (data: EnrollmentData) => void;
  loading: boolean;
}

export default function Step2Parent({
  data,
  onDataChange,
  loading,
}: Step2ParentProps) {
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    onDataChange({
      ...data,
      parentEmail: email,
    });

    // Validate on blur or when explicit validation needed
    if (email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDataChange({
      ...data,
      parentName: e.target.value,
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDataChange({
      ...data,
      parentPhone: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="parentEmail">Email Address *</Label>
        <Input
          id="parentEmail"
          type="email"
          placeholder="parent@example.com"
          value={data.parentEmail}
          onChange={handleEmailChange}
          disabled={loading}
          required
          autoFocus
          aria-invalid={emailError ? "true" : "false"}
        />
        {emailError && (
          <Text className="text-red-600 text-sm mt-1">{emailError}</Text>
        )}
      </div>

      <div>
        <Label htmlFor="parentName">Display Name *</Label>
        <Input
          id="parentName"
          type="text"
          placeholder="e.g., John Johnson"
          value={data.parentName}
          onChange={handleNameChange}
          disabled={loading}
          required
        />
      </div>

      <div>
        <Label htmlFor="parentPhone">Phone Number (Optional)</Label>
        <Input
          id="parentPhone"
          type="tel"
          placeholder="e.g., +1 (555) 123-4567"
          value={data.parentPhone || ""}
          onChange={handlePhoneChange}
          disabled={loading}
        />
      </div>

      <Alert type="info">
        <p className="text-sm">
          <strong>Important:</strong> A temporary account will be created for this parent email.
          The parent will set their own password on first login.
        </p>
      </Alert>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-sm text-yellow-800">
          <strong>Security:</strong> Credentials will be generated and can be printed or downloaded
          as a PDF in the next step.
        </p>
      </div>
    </div>
  );
}
