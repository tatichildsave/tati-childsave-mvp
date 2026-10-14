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

type Tab = "overview" | "users" | "schools" | "facilitators" | "families" | "parent-provisioning" | "family-management" | "child-provisioning";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSchools: 0,
    totalFamilies: 0,
    totalChildren: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newFacilitatorEmail, setNewFacilitatorEmail] = useState("");
  const [newFacilitatorSchoolId, setNewFacilitatorSchoolId] = useState("");
  
  // Parent provisioning form states
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [newParentName, setNewParentName] = useState("");

  // Family management form states
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyParentId, setNewFamilyParentId] = useState("");

  // Child provisioning form states
  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState("8");
  const [newChildFamilyId, setNewChildFamilyId] = useState("");
  const [generatedChildData, setGeneratedChildData] = useState<{ tatiId: string; pin: string } | null>(null);

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

      // Load parents
      const parentsData = usersData.filter((u) =>
        (u.roles as string[])?.includes("parent"),
      );
      setParents(parentsData);

      // Load families
      const familiesSnap = await getDocs(collection(db, "families"));
      const familiesData = familiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFamilies(familiesData);

      // Load children
      const childrenSnap = await getDocs(collection(db, "children"));
      const childrenData = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChildren(childrenData);

      // Calculate stats
      const adminsCount = usersData.filter((u) => (u.roles as string[])?.includes("admin")).length;
      const parentsCountVal = usersData.filter((u) =>
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
      setError(err instanceof Error ? err.message : "Failed to load admin data");
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
      setError(err instanceof Error ? err.message : "Failed to create admin user");
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
      setError(err instanceof Error ? err.message : "Failed to create school");
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
      setError(err instanceof Error ? err.message : "Failed to create facilitator");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateParent(e: React.FormEvent) {
    e.preventDefault();
    if (!newParentEmail || !newParentPassword || !newParentName) {
      setError("Email, password, and name required");
      return;
    }

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth not available");

      // Create Firebase user for parent
      const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + (window as any).FIREBASE_API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newParentEmail,
          password: newParentPassword,
          returnSecureToken: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Firebase user");
      }

      const firebaseUser = await response.json();
      const uid = firebaseUser.localId;

      // Create user document in Firestore with parent role
      await setDoc(doc(db, "users", uid), {
        uid,
        email: newParentEmail,
        displayName: newParentName,
        status: "active",
        roles: ["parent"],
        emailVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setNewParentEmail("");
      setNewParentPassword("");
      setNewParentName("");
      setSuccess(`Parent account created: ${newParentEmail}`);
      setError(null);
      setTimeout(() => setSuccess(null), 5000);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create parent account");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!newFamilyName || !newFamilyParentId) {
      setError("Family name and parent required");
      return;
    }

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      const familyId = `family-${Date.now()}`;
      await setDoc(doc(db, "families", familyId), {
        id: familyId,
        name: newFamilyName,
        parentId: newFamilyParentId,
        childrenIds: [],
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setNewFamilyName("");
      setNewFamilyParentId("");
      setSuccess(`Family created: ${newFamilyName}`);
      setError(null);
      setTimeout(() => setSuccess(null), 5000);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create family");
    } finally {
      setBusy(false);
    }
  }

  function generateTatiId(): string {
    // Format: TATI-XXXX-XXXX (8 alphanumeric characters)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) {
      if (i === 4) id += "-";
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "TATI-" + id;
  }

  function generatePin(): string {
    // Generate a 4-digit PIN
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  function hashPin(pin: string): string {
    // Simple hash for PIN (in production, use bcrypt)
    // For MVP, we'll use a basic approach
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return "pin_" + Math.abs(hash).toString(36);
  }

  async function handleCreateChild(e: React.FormEvent) {
    e.preventDefault();
    if (!newChildName || !newChildFamilyId) {
      setError("Child name and family required");
      return;
    }

    const age = parseInt(newChildAge);
    if (isNaN(age) || age < 8 || age > 12) {
      setError("Child age must be between 8 and 12");
      return;
    }

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      const tatiId = generateTatiId();
      const pin = generatePin();
      const hashedPin = hashPin(pin);
      const childId = `child-${Date.now()}`;

      // Create child document
      await setDoc(doc(db, "children", childId), {
        id: childId,
        tatiId,
        hashedPin,
        familyId: newChildFamilyId,
        name: newChildName,
        age,
        status: "active",
        tier: "beginner",
        progress: {
          completedLessons: [],
          completedAssessments: [],
          completedScenarios: [],
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update family to include child
      const familyRef = doc(db, "families", newChildFamilyId);
      const familySnap = await getDocs(query(collection(db, "families"), where("id", "==", newChildFamilyId)));
      if (!familySnap.empty) {
        const familyData = familySnap.docs[0].data();
        const childrenIds = Array.isArray(familyData.childrenIds) ? [...familyData.childrenIds, childId] : [childId];
        await updateDoc(familyRef, {
          childrenIds,
          updatedAt: Timestamp.now(),
        });
      }

      setGeneratedChildData({ tatiId, pin });
      setNewChildName("");
      setNewChildAge("8");
      setNewChildFamilyId("");
      setSuccess(`Child created: ${newChildName} (TATI ID: ${tatiId}, PIN: ${pin})`);
      setError(null);
      setTimeout(() => setSuccess(null), 7000);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create child");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteParent(parentId: string) {
    if (!confirm("Are you sure you want to delete this parent account?")) return;

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      await deleteDoc(doc(db, "users", parentId));
      setSuccess("Parent account deleted");
      setError(null);
      setTimeout(() => setSuccess(null), 5000);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete parent");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFamily(familyId: string) {
    if (!confirm("Are you sure you want to delete this family?")) return;

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      await deleteDoc(doc(db, "families", familyId));
      setSuccess("Family deleted");
      setError(null);
      setTimeout(() => setSuccess(null), 5000);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete family");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteChild(childId: string, familyId: string) {
    if (!confirm("Are you sure you want to delete this child profile?")) return;

    setBusy(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) throw new Error("Database not available");

      // Delete child document
      await deleteDoc(doc(db, "children", childId));

      // Remove from family
      const familySnap = await getDocs(query(collection(db, "families"), where("id", "==", familyId)));
      if (!familySnap.empty) {
        const familyRef = familySnap.docs[0].ref;
        const familyData = familySnap.docs[0].data();
        const childrenIds = (Array.isArray(familyData.childrenIds) ? familyData.childrenIds : []).filter((id: string) => id !== childId);
        await updateDoc(familyRef, {
          childrenIds,
          updatedAt: Timestamp.now(),
        });
      }

      setSuccess("Child profile deleted");
      setError(null);
      setTimeout(() => setSuccess(null), 5000);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete child");
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
      {success && <CardNote variant="success" text={success} />}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {(["overview", "users", "schools", "facilitators", "families", "parent-provisioning", "family-management", "child-provisioning"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
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

          {/* Quick Actions */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="primary" 
                onClick={() => navigate({ to: "/admin/enroll" })}
                className="w-full"
              >
                + Enrol New Family
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate({ to: "/admin/families" })}
                className="w-full"
              >
                View All Families
              </Button>
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
              <Button variant="primary" onClick={handleCreateAdmin} disabled={busy}>
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
              <Button variant="primary" onClick={handleCreateSchool} disabled={busy}>
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
              <Button variant="primary" onClick={handleCreateFacilitator} disabled={busy}>
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

      {/* Parent Provisioning Tab */}
      {activeTab === "parent-provisioning" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">Create Parent Account</h2>
            <form onSubmit={handleCreateParent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="Parent's full name"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Temporary Password</label>
                <input
                  type="password"
                  placeholder="Temporary password"
                  value={newParentPassword}
                  onChange={(e) => setNewParentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                />
              </div>
              <Button variant="primary" onClick={handleCreateParent} disabled={busy}>
                {busy ? "Creating..." : "Create Parent Account"}
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4">Parents List ({parents.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map((parent) => (
                    <tr key={parent.id} className="border-b border-border hover:bg-gray-50">
                      <td className="px-4 py-2">{parent.displayName || "—"}</td>
                      <td className="px-4 py-2">{parent.email || parent.id}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            parent.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {parent.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteParent(parent.id)}
                          disabled={busy}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Family Management Tab */}
      {activeTab === "family-management" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">Create Family</h2>
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Family Name</label>
                <input
                  type="text"
                  placeholder="Family name"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Assign Parent</label>
                <select
                  value={newFamilyParentId}
                  onChange={(e) => setNewFamilyParentId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                >
                  <option value="">Select a parent</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.displayName} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="primary" onClick={handleCreateFamily} disabled={busy}>
                {busy ? "Creating..." : "Create Family"}
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4">Families List ({families.length})</h2>
            <div className="space-y-4">
              {families.map((family) => {
                const parentData = parents.find((p) => p.id === family.parentId);
                return (
                  <div key={family.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{family.name || "Unnamed Family"}</h3>
                        <p className="text-sm text-gray-600">ID: {family.id}</p>
                        <p className="text-sm text-gray-600">Parent: {parentData?.displayName || parentData?.email || family.parentId}</p>
                        <p className="text-sm text-gray-600">Children: {(family.childrenIds?.length || 0)}</p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                          family.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {family.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteFamily(family.id)}
                        disabled={busy}
                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Child Provisioning Tab */}
      {activeTab === "child-provisioning" && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-bold mb-4">Create Child Profile</h2>
            <form onSubmit={handleCreateChild} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Child Name</label>
                <input
                  type="text"
                  placeholder="Child's name"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Age</label>
                <select
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  disabled={busy}
                >
                  {[8, 9, 10, 11, 12].map((age) => (
                    <option key={age} value={age}>
                      {age} years old
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Assign to Family</label>
                <select
                  value={newChildFamilyId}
                  onChange={(e) => setNewChildFamilyId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                  required
                  disabled={busy}
                >
                  <option value="">Select a family</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name} (ID: {family.id})
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="primary" onClick={handleCreateChild} disabled={busy}>
                {busy ? "Creating..." : "Create Child Profile"}
              </Button>
            </form>

            {generatedChildData && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-2">Generated Credentials</h3>
                <p className="text-sm text-blue-800 mb-1">
                  <strong>TATI ID:</strong> <code className="bg-white px-2 py-1 rounded">{generatedChildData.tatiId}</code>
                </p>
                <p className="text-sm text-blue-800 mb-3">
                  <strong>PIN:</strong> <code className="bg-white px-2 py-1 rounded">{generatedChildData.pin}</code>
                </p>
                <p className="text-xs text-blue-700">Save these credentials in a secure location. The PIN will be required for child login.</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4">Children List ({children.length})</h2>
            <div className="space-y-4">
              {children.map((child) => {
                const familyData = families.find((f) => f.id === child.familyId);
                return (
                  <div key={child.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{child.name}</h3>
                        <p className="text-sm text-gray-600">TATI ID: {child.tatiId}</p>
                        <p className="text-sm text-gray-600">Age: {child.age} years</p>
                        <p className="text-sm text-gray-600">Family: {familyData?.name || child.familyId}</p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                          child.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {child.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteChild(child.id, child.familyId)}
                        disabled={busy}
                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
