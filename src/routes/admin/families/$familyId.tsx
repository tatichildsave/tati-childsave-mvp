/**
 * Family Detail Page
 * View family information, manage parent and children
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page, PageHeader, Card, Button, Text, Badge, Tabs, Alert } from "@/components/tati";

export const Route = createFileRoute("/admin/families/$familyId")({
  component: FamilyDetail,
});

interface Child {
  id: string;
  name: string;
  age: number;
  tatiId: string;
  status: "active" | "inactive";
}

interface FamilyData {
  id: string;
  name: string;
  notes?: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  parentStatus: "active" | "inactive";
  children: Child[];
  status: "active" | "inactive" | "pending";
  createdAt: string;
}

// Placeholder - would come from API in production
const FAMILY_DATA: Record<string, FamilyData> = {
  "fam-001": {
    id: "fam-001",
    name: "Johnson Family",
    notes: "Pilot participant",
    parentName: "John Johnson",
    parentEmail: "john@example.com",
    parentPhone: "+1 (555) 123-4567",
    parentStatus: "active",
    children: [
      {
        id: "child-001",
        name: "Sarah Johnson",
        age: 10,
        tatiId: "TATI-A1B2C3D4",
        status: "active",
      },
      {
        id: "child-002",
        name: "Emma Johnson",
        age: 7,
        tatiId: "TATI-E5F6G7H8",
        status: "active",
      },
    ],
    status: "active",
    createdAt: "2026-10-01",
  },
};

function FamilyDetail() {
  const navigate = useNavigate();
  const { familyId } = Route.useParams();
  const family = FAMILY_DATA[familyId] || FAMILY_DATA["fam-001"];
  const [activeTab, setActiveTab] = useState<"overview" | "parent" | "children">("overview");
  const [resetPinChild, setResetPinChild] = useState<string | null>(null);
  const [resetPinLoading, setResetPinLoading] = useState(false);

  const handleResetPin = async (childId: string) => {
    setResetPinLoading(true);
    try {
      // Call resetChildPin function
      const response = await fetch("/api/provisioning/child/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: childId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset PIN");
      }

      const result = await response.json();
      setResetPinChild(childId);

      // Show PIN for 10 seconds then clear
      setTimeout(() => {
        setResetPinChild(null);
      }, 10000);
    } catch (err) {
      console.error("Error resetting PIN:", err);
    } finally {
      setResetPinLoading(false);
    }
  };

  return (
    <Page>
      <div className="mb-6">
        <Button onClick={() => navigate({ to: "/admin/families" })} variant="outline" size="sm">
          ← Back to Families
        </Button>
      </div>

      <PageHeader
        title={family.name}
        subtitle={`Enrolled: ${family.createdAt}`}
      />

      {/* Status Badge */}
      <div className="mb-6">
        <Badge
          label={family.status.toUpperCase()}
          className={
            family.status === "active"
              ? "bg-green-100 text-green-800"
              : family.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "parent", label: "Parent" },
          { id: "children", label: `Children (${family.children.length})` },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
      />

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {family.notes && (
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <Text className="text-sm font-semibold text-blue-900">Notes</Text>
              <Text className="text-sm text-blue-800 mt-2">{family.notes}</Text>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parent Summary */}
            <Card className="p-4">
              <Text className="font-semibold mb-4">Parent Information</Text>
              <div className="space-y-3 text-sm">
                <div>
                  <Text className="text-gray-600">Name</Text>
                  <Text className="font-semibold">{family.parentName}</Text>
                </div>
                <div>
                  <Text className="text-gray-600">Email</Text>
                  <Text className="font-mono">{family.parentEmail}</Text>
                </div>
                {family.parentPhone && (
                  <div>
                    <Text className="text-gray-600">Phone</Text>
                    <Text>{family.parentPhone}</Text>
                  </div>
                )}
                <div>
                  <Text className="text-gray-600">Status</Text>
                  <Badge
                    label={family.parentStatus}
                    className={
                      family.parentStatus === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Children Summary */}
            <Card className="p-4">
              <Text className="font-semibold mb-4">Children</Text>
              <div className="space-y-2">
                {family.children.map((child) => (
                  <div key={child.id} className="flex justify-between items-center text-sm">
                    <div>
                      <Text className="font-semibold">{child.name}</Text>
                      <Text className="text-xs text-gray-600">Age: {child.age}</Text>
                    </div>
                    <Badge
                      label={child.status}
                      className={
                        child.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Parent Tab */}
      {activeTab === "parent" && (
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Text className="text-sm text-gray-600">Full Name</Text>
              <Text className="font-semibold text-lg">{family.parentName}</Text>
            </div>
            <div>
              <Text className="text-sm text-gray-600">Email Address</Text>
              <Text className="font-mono">{family.parentEmail}</Text>
            </div>
            <div>
              <Text className="text-sm text-gray-600">Phone Number</Text>
              <Text>{family.parentPhone || "Not provided"}</Text>
            </div>
            <div>
              <Text className="text-sm text-gray-600">Status</Text>
              <Badge
                label={family.parentStatus}
                className={
                  family.parentStatus === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              />
            </div>
          </div>

          <Alert type="info">
            <p className="text-sm">
              To change parent credentials, use the password reset functionality or contact support.
            </p>
          </Alert>

          <div className="flex gap-3">
            <Button variant="outline">Reset Password</Button>
            <Button variant="outline" className="text-red-600">
              Deactivate Account
            </Button>
          </div>
        </Card>
      )}

      {/* Children Tab */}
      {activeTab === "children" && (
        <div className="space-y-6">
          {family.children.length === 0 ? (
            <Card className="p-6 text-center">
              <Text>No children enrolled yet</Text>
            </Card>
          ) : (
            family.children.map((child) => (
              <Card key={child.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Text className="font-semibold text-lg">{child.name}</Text>
                    <Text className="text-sm text-gray-600">Age: {child.age}</Text>
                  </div>
                  <Badge
                    label={child.status}
                    className={
                      child.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  />
                </div>

                <div className="bg-gray-50 rounded p-4 mb-4">
                  <Text className="text-xs text-gray-600">TATI ID</Text>
                  <Text className="font-mono font-bold text-lg text-blue-600">{child.tatiId}</Text>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleResetPin(child.id)}>
                    {resetPinLoading ? "Generating..." : "Reset PIN"}
                  </Button>
                  <Button variant="outline" size="sm">
                    View Activity
                  </Button>
                </div>

                {resetPinChild === child.id && (
                  <Alert type="warning" className="mt-4">
                    <p className="text-sm font-semibold">
                      New PIN: <span className="font-mono text-lg">****</span>
                    </p>
                    <p className="text-xs text-yellow-700 mt-2">
                      This PIN will disappear in 10 seconds. Make sure it's recorded securely.
                    </p>
                  </Alert>
                )}
              </Card>
            ))
          )}

          <Button variant="outline" className="w-full">
            + Add Another Child
          </Button>
        </div>
      )}
    </Page>
  );
}
