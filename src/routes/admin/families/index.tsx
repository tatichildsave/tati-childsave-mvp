/**
 * Admin Families Management
 * List all enrolled families with search and filtering
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Page, PageHeader, Card, Button } from "@/components/tati";

export const Route = createFileRoute("/admin/families/")({
  component: FamiliesList,
});

interface Family {
  id: string;
  name: string;
  parentName: string;
  parentEmail: string;
  childrenCount: number;
  status: "active" | "inactive" | "pending";
  createdAt: string;
}

// Placeholder data - in production this would come from an API
const FAMILIES_DATA: Family[] = [
  {
    id: "fam-001",
    name: "Johnson Family",
    parentName: "John Johnson",
    parentEmail: "john@example.com",
    childrenCount: 2,
    status: "active",
    createdAt: "2026-10-01",
  },
  {
    id: "fam-002",
    name: "Smith Family",
    parentName: "Mary Smith",
    parentEmail: "mary@example.com",
    childrenCount: 1,
    status: "active",
    createdAt: "2026-10-05",
  },
];

function FamiliesList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "pending">(
    "all"
  );

  const filteredFamilies = useMemo(() => {
    return FAMILIES_DATA.filter((family) => {
      const matchesSearch =
        family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        family.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        family.parentEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || family.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus]);

  const getStatusColor = (status: Family["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Page>
      <PageHeader title="Families" subtitle="Manage enrolled families and their details" />

      {/* Search and Filter */}
      <Card className="mb-6 p-4">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by family name, parent name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2 flex-wrap">
            {(["all", "active", "inactive", "pending"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Families List */}
      {filteredFamilies.length === 0 ? (
        <Card className="p-8 text-center">
          <div>
            <p className="text-lg font-semibold mb-2">No families found</p>
            <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
            <Button onClick={() => navigate({ to: "/admin/enroll" })}>
              Enrol New Family
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFamilies.map((family) => (
            <Card
              key={family.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate({ to: `/admin/families/${family.id}` })}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-lg">{family.name}</p>
                  <p className="text-sm text-gray-600">{family.parentName}</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                  family.status === "active"
                    ? "bg-green-100 text-green-800"
                    : family.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}>
                  {family.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-mono text-xs">{family.parentEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600">Children</p>
                  <p className="font-semibold">{family.childrenCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Enrolled</p>
                  <p className="font-semibold">{family.createdAt}</p>
                </div>
                <div className="text-right">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({ to: `/admin/families/${family.id}` });
                    }}
                    className="text-sm"
                  >
                    View →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-8 flex gap-3">
        <Button
          onClick={() => navigate({ to: "/admin/enroll" })}
          variant="primary"
          className="w-full sm:w-auto"
        >
          + Enrol New Family
        </Button>
      </div>
    </Page>
  );
}
