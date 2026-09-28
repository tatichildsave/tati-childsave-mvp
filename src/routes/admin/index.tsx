import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/integrations/firebase/client";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/integrations/firebase/client";
import { Page, PageHeader, Card, CardNote, Button } from "@/components/tati";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Tab = "overview" | "users" | "schools" | "facilitators" | "families";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSchools: 0,
    totalFamilies: 0,
    totalChildren: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newFacilitatorEmail, setNewFacilitatorEmail] = useState("");
  const [newFacilitatorSchoolId, setNewFacilitatorSchoolId] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      setLoading(true);
      const db = getFirebaseFirestore();
      if (!db) {
        setError("Database not available");
        return;
      }

      // Load users
      const usersSnap = await getDocs(collection(db, "users"));
      const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(usersData);

      // Load schools
      const schoolsSnap = await getDocs(collection(db, "schools"));
      const schoolsData = schoolsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSchools(schoolsData);

      // Load facilitators
      const facilitatorsData = usersData.filter((u) =>
        (u.roles as string[])?.includes("facilitator"),
      );
      setFacilitators(facilitatorsData);

      // Load families
      const familiesSnap = await getDocs(collection(db, "families"));
      const familiesData = familiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFamilies(familiesData);

      // Calculate stats
      const adminsCount = usersData.filter((u) =>
        (u.roles as string[])?.includes("admin"),
      ).length;
      const parentsCount = usersData.filter((u) =>
        (u.roles as string[])?.includes("parent"),
      ).length;

      setStats({
        totalUsers: usersData.length,
        totalSchools: schoolsData.length,
        totalFamilies: familiesData.length,
        totalChildren: familiesData.reduce((sum, f) => sum + ((f.childCount as number) || 0), 0),
      });

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load admin data",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) {
      setError("Email and password required");
      return;
    }

    setBusy(true);
    try {
      const functions = getFirebaseFunctions();
      if (!functions) throw new Error("Functions not available");

      const createAdminUser = httpsCallable(functions, "createAdminUser");
      await createAdminUser({ email: newAdminEmail, password: newAdminPassword });

      setNewAdminEmail("");
      setNewAdminPassword("");
      setError(null);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create admin user",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSchoolName) {
      setError("School name required");
      return;
    }

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      const schoolId = `school-${Date.now()}`;
      await setDoc(doc(db, "schools", schoolId), {
        id: schoolId,
        name: newSchoolName,
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setNewSchoolName("");
      setError(null);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create school",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFacilitator(e: React.FormEvent) {
    e.preventDefault();
    if (!newFacilitatorEmail || !newFacilitatorSchoolId) {
      setError("Email and school required");
      return;
    }

    setBusy(true);
    try {
      const functions = getFirebaseFunctions();
      if (!functions) throw new Error("Functions not available");

      const createFacilitatorUser = httpsCallable(functions, "createFacilitatorUser");
      await createFacilitatorUser({
        email: newFacilitatorEmail,
        schoolId: newFacilitatorSchoolId,
      });

      setNewFacilitatorEmail("");
      setNewFacilitatorSchoolId("");
      setError(null);
      await loadAdminData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create facilitator",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
        navigate({ to: "/admin-login", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign out");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Loading admin dashboard...</div>
          <div className="text-gray-500">Fetching data...</div>
        </div>
      </div>
    );
  }

  return (
    <Page>
      <div className="flex justify-between items-center mb-8">
        <PageHeader title="Admin Dashboard" description="Manage TATI ChildSave system" />
        <Button variant="secondary" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      {error && <CardNote variant="error" text={error} />}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {(["overview", "users", "schools", "facilitators", "families"] as Tab[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold border-b-2 transition ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600 mt-2">Total Users</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{stats.totalSchools}</div>
              <div className="text-sm text-gray-600 mt-2">Schools</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">{stats.totalFamilies}</div>
              <div className="text-sm text-gray-600 mt-2">Families</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{stats.totalChildren}</div>
              <div className="text-sm text-gray-600 mt-2">Children</div>
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">Create Admin User</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
                required
                disabled={busy}
              />
              <input
                type="password"
                placeholder="Temporary Password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
                required
                disabled={busy}
              />
              <Button
                variant="primary"
                onClick={handleCreateAdmin}
                disabled={busy}
              >
                {busy ? "Creating..." : "Create Admin"}
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4">Users List ({users.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Roles</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-gray-50">
                      <td className="px-4 py-2">{user.email || user.id}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {(user.roles as string[])?.join(", ") || "none"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Schools Tab */}
      {activeTab === "schools" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">Create School</h2>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <input
                type="text"
                placeholder="School Name"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
                required
                disabled={busy}
              />
              <Button
                variant="primary"
                onClick={handleCreateSchool}
                disabled={busy}
              >
                {busy ? "Creating..." : "Create School"}
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4">Schools List ({schools.length})</h2>
            <div className="grid gap-4">
              {schools.map((school) => (
                <div key={school.id} className="p-4 border border-border rounded-lg">
                  <h3 className="font-bold text-lg">{school.name}</h3>
                  <p className="text-sm text-gray-600">ID: {school.id}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                      school.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {school.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Facilitators Tab */}
      {activeTab === "facilitators" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">Create Facilitator</h2>
            <form onSubmit={handleCreateFacilitator} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={newFacilitatorEmail}
                onChange={(e) => setNewFacilitatorEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
                required
                disabled={busy}
              />
              <select
                value={newFacilitatorSchoolId}
                onChange={(e) => setNewFacilitatorSchoolId(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
                required
                disabled={busy}
              >
                <option value="">Select School</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleCreateFacilitator}
                disabled={busy}
              >
                {busy ? "Creating..." : "Create Facilitator"}
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4">Facilitators List ({facilitators.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facilitators.map((fac) => (
                    <tr key={fac.id} className="border-b border-border hover:bg-gray-50">
                      <td className="px-4 py-2">{fac.email || fac.id}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            fac.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {fac.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Families Tab */}
      {activeTab === "families" && (
        <Card>
          <h2 className="text-2xl font-bold mb-4">Families List ({families.length})</h2>
          <div className="grid gap-4">
            {families.map((family) => (
              <div key={family.id} className="p-4 border border-border rounded-lg">
                <h3 className="font-bold text-lg">{family.name || "Unnamed Family"}</h3>
                <p className="text-sm text-gray-600">ID: {family.id}</p>
                <p className="text-sm text-gray-600">
                  Members: {family.memberCount || 0} | Children: {family.childCount || 0}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}
