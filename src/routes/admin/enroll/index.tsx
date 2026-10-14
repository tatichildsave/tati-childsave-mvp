/**
 * Family Enrolment Workflow (Phase 5A.3)
 * ======================================
 * 4-step process to enrol new families:
 * 1. Family details (name, notes)
 * 2. Parent details (email, name, phone)
 * 3. Children (name, age, TATI ID + PIN generation)
 * 4. Review and confirm
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page, PageHeader, Card, Button, Text } from "@/components/tati";
import Step1Family from "./_step-1-family";
import Step2Parent from "./_step-2-parent";
import Step3Children from "./_step-3-children";
import Step4Review from "./_step-4-review";

export const Route = createFileRoute("/admin/enroll/")({
  component: EnrollmentWorkflow,
});

export type EnrollmentData = {
  // Step 1: Family
  familyName: string;
  familyNotes?: string;

  // Step 2: Parent
  parentEmail: string;
  parentName: string;
  parentPhone?: string;
  parentUid?: string;

  // Step 3: Children
  children: Array<{
    name: string;
    age: number;
    dateOfBirth?: string;
    preferredName?: string;
    tatiId?: string;
    pin?: string;
  }>;
};

function EnrollmentWorkflow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EnrollmentData>({
    familyName: "",
    familyNotes: "",
    parentEmail: "",
    parentName: "",
    parentPhone: "",
    children: [],
  });

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      // Validate Step 1
      if (!data.familyName.trim()) {
        setError("Family name is required");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate Step 2 and provision parent
      if (!data.parentEmail.trim()) {
        setError("Parent email is required");
        return;
      }
      if (!data.parentName.trim()) {
        setError("Parent name is required");
        return;
      }

      setLoading(true);
      try {
        // Call provisionParent function
        const response = await fetch("/api/provisioning/parent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.parentEmail,
            displayName: data.parentName,
            phone: data.parentPhone,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create parent account");
        }

        const result = await response.json();
        setData((prev) => ({
          ...prev,
          parentUid: result.parentUid,
        }));
        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create parent account");
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      // Validate Step 3
      if (data.children.length === 0) {
        setError("At least one child is required");
        return;
      }

      for (const child of data.children) {
        if (!child.tatiId || !child.pin) {
          setError("All children must have generated TATI ID and PIN");
          return;
        }
      }

      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
      setError(null);
    }
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel enrolment?")) {
      navigate({ to: "/admin" });
    }
  };

  const handleConfirm = async () => {
    // Submit all data in Step 4
    console.log("Confirming enrolment:", data);
    // Implementation in Step 4 component
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <Page>
      <PageHeader title="Enrol New Family" subtitle="4-step enrollment workflow" />

      {/* Progress Bar */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between mb-2">
          <Text className="text-sm font-medium">Step {step} of 4</Text>
          <Text className="text-sm text-gray-600">
            {step === 1 && "Family Details"}
            {step === 2 && "Parent Details"}
            {step === 3 && "Children"}
            {step === 4 && "Review & Confirm"}
          </Text>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 p-4 bg-red-50 border border-red-200">
          <Text className="text-red-700 text-sm">{error}</Text>
        </Card>
      )}

      {/* Step Content */}
      <Card className="mb-6 p-6">
        {step === 1 && (
          <Step1Family
            data={data}
            onDataChange={(newData) => setData(newData)}
          />
        )}

        {step === 2 && (
          <Step2Parent
            data={data}
            onDataChange={(newData) => setData(newData)}
            loading={loading}
          />
        )}

        {step === 3 && (
          <Step3Children
            data={data}
            onDataChange={(newData) => setData(newData)}
          />
        )}

        {step === 4 && (
          <Step4Review
            data={data}
            loading={loading}
            onConfirm={handleConfirm}
          />
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex gap-3 justify-between">
        <Button
          onClick={handleCancel}
          variant="outline"
          disabled={loading}
        >
          Cancel
        </Button>

        <div className="flex gap-3">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={step === 1 || loading}
          >
            Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={loading}
              loading={loading}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={loading}
              loading={loading}
              variant="primary"
            >
              Confirm Enrolment
            </Button>
          )}
        </div>
      </div>
    </Page>
  );
}
