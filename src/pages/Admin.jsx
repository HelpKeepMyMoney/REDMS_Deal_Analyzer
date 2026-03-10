import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useConfig } from "../contexts/ConfigContext.jsx";
import { createAdminApi } from "../logic/adminApi.js";
import { loadAppConfig, saveAppConfig } from "../logic/configStorage.js";
import { loadAllDealsForAdmin, updateDealSharedWith } from "../logic/firestoreStorage.js";
import { loadAllSavedSearchesForAdmin, updateSavedSearchSharedWith, removePropertyFromSavedSearch } from "../logic/savedSearchStorage.js";
import { loadInterestRequestsForAdmin, updateInterestRequestStatus } from "../logic/interestStorage.js";
import { loadAllPropertiesForAdmin, addInvestorProperty, removeInvestorProperty } from "../logic/investorPropertiesStorage.js";
import { saveImportProperty } from "../logic/storage.js";
import { AdminDropdown, PropertyResultCard } from "../components";
import { analyzePropertyForDeal } from "../logic/dealQuickAnalysis.js";
import styles from "./Admin.module.css";

export default function Admin() {
  const { user, isAdmin, signOut } = useAuth();
  const { config, refreshConfig } = useConfig();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const [params, setParams] = useState(null);
  const [paramsSaving, setParamsSaving] = useState(false);

  const [allDeals, setAllDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [shareDealSearch, setShareDealSearch] = useState("");
  const [shareWithUserIds, setShareWithUserIds] = useState([]);
  const [shareWithAll, setShareWithAll] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);

  const [allSearches, setAllSearches] = useState([]);
  const [searchesLoading, setSearchesLoading] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState("");
  const [searchShareWithUserIds, setSearchShareWithUserIds] = useState([]);
  const [searchShareWithAll, setSearchShareWithAll] = useState(false);
  const [searchShareSaving, setSearchShareSaving] = useState(false);

  const [interestRequests, setInterestRequests] = useState([]);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestFilter, setInterestFilter] = useState("all");
  const [interestStatusUpdating, setInterestStatusUpdating] = useState(null);

  const [searchEmail, setSearchEmail] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchDateCreatedAfter, setSearchDateCreatedAfter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [allPropertiesForAdmin, setAllPropertiesForAdmin] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertyFilterSearch, setPropertyFilterSearch] = useState("");
  const [propertyFilterInclusion, setPropertyFilterInclusion] = useState("all");
  const [propertyFilterSourceSearch, setPropertyFilterSourceSearch] = useState("");
  const [propertyFilterCity, setPropertyFilterCity] = useState("");
  const [propertyFilterState, setPropertyFilterState] = useState("");
  const [propertyFilterZipCode, setPropertyFilterZipCode] = useState("");
  const [propertyFilterMinPrice, setPropertyFilterMinPrice] = useState("");
  const [propertyFilterMaxPrice, setPropertyFilterMaxPrice] = useState("");
  const [propertyFilterMinBeds, setPropertyFilterMinBeds] = useState("");
  const [propertyFilterMinBaths, setPropertyFilterMinBaths] = useState("");
  const [propertyFilterMinSquareFootage, setPropertyFilterMinSquareFootage] = useState("");
  const [propertyFilterPropertyType, setPropertyFilterPropertyType] = useState("Any");
  const [propertyFilterStatus, setPropertyFilterStatus] = useState("all");
  const [propertyFilterDealStatus, setPropertyFilterDealStatus] = useState("all");
  const [propertySortBy, setPropertySortBy] = useState("price-asc");
  const [propertyToggleUpdating, setPropertyToggleUpdating] = useState(null);
  const [propertyDeletingId, setPropertyDeletingId] = useState(null);

  const adminApi = useMemo(
    () => (user ? createAdminApi(() => user.getIdToken()) : null),
    [user]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchEmail.trim()) {
        const email = (u.email || "").toLowerCase();
        const term = searchEmail.trim().toLowerCase();
        if (!email.includes(term)) return false;
      }
      if (searchRole) {
        if (u.role !== searchRole) return false;
      }
      if (searchDateCreatedAfter) {
        const created = u.created ? new Date(u.created).getTime() : 0;
        const after = new Date(searchDateCreatedAfter).getTime();
        if (created < after) return false;
      }
      return true;
    });
  }, [users, searchEmail, searchRole, searchDateCreatedAfter]);

  const selectedUserDeals = useMemo(() => {
    if (!selectedUser?.uid) return [];
    return allDeals.filter(
      (d) => (d.sharedWith || []).includes(selectedUser.uid) || d.sharedWithAll
    );
  }, [selectedUser?.uid, allDeals]);

  const selectedUserSearches = useMemo(() => {
    if (!selectedUser?.uid) return [];
    return allSearches.filter(
      (s) => (s.sharedWith || []).includes(selectedUser.uid) || s.sharedWithAll
    );
  }, [selectedUser?.uid, allSearches]);

  const filteredDealsForSharing = useMemo(() => {
    const term = shareDealSearch.trim().toLowerCase();
    if (!term) return allDeals;
    const filtered = allDeals.filter((d) => {
      const name = (d.dealName || "").toLowerCase();
      const ownerEmail = (users.find((u) => u.uid === d.userId)?.email ?? "").toLowerCase();
      return name.includes(term) || ownerEmail.includes(term);
    });
    const selected = selectedDealId ? allDeals.find((d) => d.id === selectedDealId) : null;
    if (selected && !filtered.some((d) => d.id === selectedDealId)) {
      return [selected, ...filtered];
    }
    return filtered;
  }, [allDeals, shareDealSearch, users, selectedDealId]);

  const filteredPropertiesForAdmin = useMemo(() => {
    let list = [...allPropertiesForAdmin];
    if (propertyFilterSearch.trim()) {
      const term = propertyFilterSearch.trim().toLowerCase();
      list = list.filter((item) => {
        const addr = [item.property?.addressLine1, item.property?.city, item.property?.state, item.property?.zipCode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return addr.includes(term);
      });
    }
    if (propertyFilterInclusion === "included") {
      list = list.filter((item) => item.isIncluded);
    } else if (propertyFilterInclusion === "excluded") {
      list = list.filter((item) => !item.isIncluded);
    }
    if (propertyFilterSourceSearch) {
      list = list.filter((item) =>
        (item.sourceSearchIds || []).includes(propertyFilterSourceSearch)
      );
    }
    if (propertyFilterCity.trim()) {
      const city = propertyFilterCity.trim().toLowerCase();
      list = list.filter((item) => (item.property?.city || "").toLowerCase().includes(city));
    }
    if (propertyFilterState.trim()) {
      const state = propertyFilterState.trim().toUpperCase();
      list = list.filter((item) => (item.property?.state || "").toUpperCase() === state);
    }
    if (propertyFilterZipCode.trim()) {
      const zip = propertyFilterZipCode.trim();
      list = list.filter((item) => (item.property?.zipCode || "").includes(zip));
    }
    const minP = propertyFilterMinPrice ? Number(propertyFilterMinPrice) : null;
    const maxP = propertyFilterMaxPrice ? Number(propertyFilterMaxPrice) : null;
    if (minP != null && !isNaN(minP)) list = list.filter((item) => (item.property?.price ?? 0) >= minP);
    if (maxP != null && !isNaN(maxP)) list = list.filter((item) => (item.property?.price ?? 0) <= maxP);
    if (propertyFilterMinBeds) {
      const minBeds = Number(propertyFilterMinBeds);
      if (!isNaN(minBeds)) list = list.filter((item) => (item.property?.bedrooms ?? 0) >= minBeds);
    }
    if (propertyFilterMinBaths) {
      const minBaths = Number(propertyFilterMinBaths);
      if (!isNaN(minBaths)) list = list.filter((item) => (item.property?.bathrooms ?? 0) >= minBaths);
    }
    if (propertyFilterMinSquareFootage) {
      const minSqft = Number(propertyFilterMinSquareFootage);
      if (!isNaN(minSqft) && minSqft > 0) {
        list = list.filter((item) => (item.property?.squareFootage ?? 0) >= minSqft);
      }
    }
    if (propertyFilterPropertyType && propertyFilterPropertyType !== "Any") {
      const ft = (propertyFilterPropertyType || "").replace(/\s+/g, "").toLowerCase();
      list = list.filter((item) => {
        const pt = (item.property?.propertyType || "").replace(/\s+/g, "").toLowerCase();
        if (ft === "condo") return pt.includes("condo") || pt.includes("townhouse");
        return pt === ft || pt.includes(ft);
      });
    }
    if (propertyFilterStatus === "active") {
      list = list.filter((item) => (item.property?.status || "").toLowerCase() === "active");
    } else if (propertyFilterStatus === "inactive") {
      list = list.filter((item) => (item.property?.status || "").toLowerCase() !== "active");
    }
    if (propertyFilterDealStatus === "deal" || propertyFilterDealStatus === "nodeal") {
      list = list.filter((item) => {
        const analysis = analyzePropertyForDeal(item.property, null, config);
        const isDeal = analysis?.isDeal === true;
        return propertyFilterDealStatus === "deal" ? isDeal : !isDeal;
      });
    }
    const [field, dir] = propertySortBy.split("-");
    list.sort((a, b) => {
      const pa = a.property;
      const pb = b.property;
      if (field === "price") {
        const va = pa?.price ?? 0;
        const vb = pb?.price ?? 0;
        return dir === "asc" ? va - vb : vb - va;
      }
      if (field === "date") {
        const da = pa?.listedDate ? new Date(pa.listedDate).getTime() : 0;
        const db = pb?.listedDate ? new Date(pb.listedDate).getTime() : 0;
        return dir === "asc" ? da - db : db - da;
      }
      return 0;
    });
    return list;
  }, [
    allPropertiesForAdmin,
    propertyFilterSearch,
    propertyFilterInclusion,
    propertyFilterSourceSearch,
    propertyFilterCity,
    propertyFilterState,
    propertyFilterZipCode,
    propertyFilterMinPrice,
    propertyFilterMaxPrice,
    propertyFilterMinBeds,
    propertyFilterMinBaths,
    propertyFilterMinSquareFootage,
    propertyFilterPropertyType,
    propertyFilterStatus,
    propertyFilterDealStatus,
    propertySortBy,
    config,
  ]);

  const loadUsers = async () => {
    if (!adminApi) return;
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await adminApi.listUsers();
      if (result.users) {
        setUsers(result.users);
      }
    } catch (e) {
      console.error(e);
      setMessage({
        type: "error",
        text: "Failed to load users: " + (e.message || "Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && adminApi) {
      loadUsers();
    }
  }, [isAdmin, adminApi]);

  useEffect(() => {
    if (isAdmin && activeTab === "params") {
      loadAppConfig().then(setParams);
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && (activeTab === "sharing" || activeTab === "users")) {
      setDealsLoading(true);
      loadAllDealsForAdmin()
        .then((deals) => {
          const sorted = [...deals].sort((a, b) =>
            (a.dealName || "").localeCompare(b.dealName || "", undefined, { sensitivity: "base" })
          );
          setAllDeals(sorted);
        })
        .catch((e) => {
          console.error(e);
          setMessage({ type: "error", text: "Failed to load deals: " + e.message });
        })
        .finally(() => setDealsLoading(false));
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && (activeTab === "searchSharing" || activeTab === "users" || activeTab === "propertyMgmt")) {
      setSearchesLoading(true);
      loadAllSavedSearchesForAdmin()
        .then(setAllSearches)
        .catch((e) => {
          console.error(e);
          setMessage({ type: "error", text: "Failed to load saved searches: " + e.message });
        })
        .finally(() => setSearchesLoading(false));
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && activeTab === "interest") {
      setInterestLoading(true);
      loadInterestRequestsForAdmin()
        .then(setInterestRequests)
        .catch((e) => {
          console.error(e);
          setMessage({ type: "error", text: "Failed to load interest requests: " + e.message });
        })
        .finally(() => setInterestLoading(false));
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && activeTab === "propertyMgmt") {
      setPropertiesLoading(true);
      loadAllPropertiesForAdmin()
        .then(setAllPropertiesForAdmin)
        .catch((e) => {
          console.error(e);
          setMessage({ type: "error", text: "Failed to load properties: " + e.message });
        })
        .finally(() => setPropertiesLoading(false));
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (selectedDealId && allDeals.length > 0) {
      const d = allDeals.find((x) => x.id === selectedDealId);
      if (d) {
        setShareWithUserIds(d.sharedWith || []);
        setShareWithAll(d.sharedWithAll || false);
      }
    } else {
      setShareWithUserIds([]);
      setShareWithAll(false);
    }
  }, [selectedDealId, allDeals]);

  useEffect(() => {
    if (selectedSearchId && allSearches.length > 0) {
      const s = allSearches.find((x) => x.id === selectedSearchId);
      if (s) {
        setSearchShareWithUserIds(s.sharedWith || []);
        setSearchShareWithAll(s.sharedWithAll || false);
      }
    } else {
      setSearchShareWithUserIds([]);
      setSearchShareWithAll(false);
    }
  }, [selectedSearchId, allSearches]);

  const handleSaveParams = async () => {
    if (!params) return;
    setParamsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await saveAppConfig(params);
      await refreshConfig();
      setMessage({ type: "success", text: "Parameters saved successfully." });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save: " + e.message });
    } finally {
      setParamsSaving(false);
    }
  };

  const handleSaveShare = async () => {
    if (!selectedDealId) {
      setMessage({ type: "error", text: "Select a deal first." });
      return;
    }
    setShareSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await updateDealSharedWith(selectedDealId, shareWithUserIds, shareWithAll);
      const updated = allDeals.map((d) =>
        d.id === selectedDealId
          ? { ...d, sharedWith: shareWithUserIds, sharedWithAll: shareWithAll }
          : d
      );
      setAllDeals(updated);
      setMessage({ type: "success", text: "Deal sharing updated." });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update sharing: " + e.message });
    } finally {
      setShareSaving(false);
    }
  };

  const toggleShareUser = (uid) => {
    setShareWithUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleSearchShareUser = (uid) => {
    setSearchShareWithUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleUpdateInterestStatus = async (id, status) => {
    setInterestStatusUpdating(id);
    setMessage({ type: "", text: "" });
    try {
      await updateInterestRequestStatus(id, status);
      setInterestRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      setMessage({ type: "success", text: "Status updated." });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update: " + e.message });
    } finally {
      setInterestStatusUpdating(null);
    }
  };

  const handleSaveSearchShare = async () => {
    if (!selectedSearchId) {
      setMessage({ type: "error", text: "Select a saved search first." });
      return;
    }
    setSearchShareSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await updateSavedSearchSharedWith(selectedSearchId, searchShareWithUserIds, searchShareWithAll);
      const updated = allSearches.map((s) =>
        s.id === selectedSearchId
          ? { ...s, sharedWith: searchShareWithUserIds, sharedWithAll: searchShareWithAll }
          : s
      );
      setAllSearches(updated);
      setMessage({ type: "success", text: "Saved search sharing updated." });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update sharing: " + e.message });
    } finally {
      setSearchShareSaving(false);
    }
  };

  const handlePropertyIncludeToggle = async (item) => {
    const prop = item.property;
    if (!prop?.id) return;
    setPropertyToggleUpdating(prop.id);
    setMessage({ type: "", text: "" });
    try {
      if (item.isIncluded) {
        await removeInvestorProperty(prop.id);
      } else {
        await addInvestorProperty(prop, item.sourceSearchIds?.[0] || null, user?.uid);
      }
      setAllPropertiesForAdmin((prev) =>
        prev.map((p) =>
          p.property?.id === prop.id ? { ...p, isIncluded: !item.isIncluded } : p
        )
      );
      setMessage({ type: "success", text: "Property updated." });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update: " + e.message });
    } finally {
      setPropertyToggleUpdating(null);
    }
  };

  const handlePropertyIncludeChange = (propertyId, included) => {
    const item = allPropertiesForAdmin.find((i) => i.property?.id === propertyId);
    if (item) handlePropertyIncludeToggle({ ...item, isIncluded: !included });
  };

  const handlePropertyDelete = async (property) => {
    if (!property?.id) return;
    const addr = [property.addressLine1, property.city, property.state, property.zipCode].filter(Boolean).join(", ");
    if (!window.confirm(`Delete this property from the database?\n\n${addr || property.id}`)) return;
    setPropertyDeletingId(property.id);
    setMessage({ type: "", text: "" });
    try {
      await removeInvestorProperty(property.id);
      const item = allPropertiesForAdmin.find((i) => i.property?.id === property.id);
      const searchIds = item?.sourceSearchIds || [];
      for (const searchId of searchIds) {
        await removePropertyFromSavedSearch(searchId, property.id);
      }
      setAllPropertiesForAdmin((prev) => prev.filter((i) => i.property?.id !== property.id));
      setMessage({ type: "success", text: "Property deleted." });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to delete: " + e.message });
    } finally {
      setPropertyDeletingId(null);
    }
  };

  const handleIncludeAllFromSearch = async (searchId) => {
    const toInclude = allPropertiesForAdmin.filter(
      (item) => (item.sourceSearchIds || []).includes(searchId) && !item.isIncluded
    );
    if (toInclude.length === 0) {
      setMessage({ type: "success", text: "All properties from this search are already included." });
      return;
    }
    setPropertyToggleUpdating("bulk");
    setMessage({ type: "", text: "" });
    try {
      for (const item of toInclude) {
        const prop = item.property;
        if (prop?.id) {
          await addInvestorProperty(prop, searchId, user?.uid);
        }
      }
      setAllPropertiesForAdmin((prev) =>
        prev.map((p) =>
          (p.sourceSearchIds || []).includes(searchId) ? { ...p, isIncluded: true } : p
        )
      );
      setMessage({ type: "success", text: `Added ${toInclude.length} properties to investor view.` });
    } catch (e) {
      setMessage({ type: "error", text: "Failed to update: " + e.message });
    } finally {
      setPropertyToggleUpdating(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!adminApi) {
      setMessage({ type: "error", text: "Admin API not available." });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await adminApi.createUser({ email, password, role });
      setMessage({ type: "success", text: `User created successfully: ${result.uid}` });
      setEmail("");
      setPassword("");
      setRole("user");
      await loadUsers();
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to create user: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (uid, currentRole) => {
    if (!adminApi) {
      setMessage({ type: "error", text: "Admin API not available." });
      return;
    }
    const newRole = currentRole === "admin" || currentRole === "wholesaler" ? "user" : "admin";
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    setLoading(true);
    try {
      await adminApi.setUserRole({ uid, role: newRole });
      setMessage({ type: "success", text: `User role updated to ${newRole}` });
      await loadUsers();
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to update role: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantWholesaler = async (uid) => {
    if (!adminApi) {
      setMessage({ type: "error", text: "Admin API not available." });
      return;
    }
    if (!window.confirm("Grant this user Wholesaler access?")) {
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await adminApi.setUserRole({ uid, role: "wholesaler" });
      setMessage({ type: "success", text: "Wholesaler access granted." });
      await loadUsers();
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to grant access: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWholesalerRequest = async (request) => {
    if (!adminApi) {
      setMessage({ type: "error", text: "Admin API not available." });
      return;
    }
    if (!window.confirm(`Grant Wholesaler access to ${request.userEmail}?`)) {
      return;
    }
    setInterestStatusUpdating(request.id);
    setMessage({ type: "", text: "" });
    try {
      await adminApi.setUserRole({ uid: request.userId, role: "wholesaler" });
      await updateInterestRequestStatus(request.id, "completed");
      setInterestRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: "completed" } : r))
      );
      setMessage({ type: "success", text: "Wholesaler access granted." });
      await loadUsers();
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to grant access: " + e.message });
    } finally {
      setInterestStatusUpdating(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (!isAdmin) {
    return (
      <div className={styles["admin-page"]}>
        <div className={styles["admin-card"]}>
          <h1 className={styles["admin-title"]}>Access denied</h1>
          <p className={styles["admin-text"]}>You do not have admin access.</p>
          <Link to="/investor" className={styles["admin-btn"]}>
            Back to deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["admin-container"]}>
      <header className={styles["admin-header"]}>
        <div className={styles["admin-brand"]}>
          <h1>REDMS Admin</h1>
          <p>User Management · Parameters · Deal Sharing · Search Sharing</p>
        </div>
        <nav className={styles["admin-nav"]}>
          <AdminDropdown email={user?.email} />
          <button
            type="button"
            className={`${styles["admin-btn"]} ${styles.secondary}`}
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className={styles["admin-main"]}>
        <div className={styles["admin-tabs"]}>
          <button
            type="button"
            className={`${styles["admin-tab"]} ${activeTab === "users" ? styles.active : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
          <button
            type="button"
            className={`${styles["admin-tab"]} ${activeTab === "params" ? styles.active : ""}`}
            onClick={() => setActiveTab("params")}
          >
            App Parameters
          </button>
          <button
            type="button"
            className={`${styles["admin-tab"]} ${activeTab === "sharing" ? styles.active : ""}`}
            onClick={() => setActiveTab("sharing")}
          >
            Deal Sharing
          </button>
          <button
            type="button"
            className={`${styles["admin-tab"]} ${activeTab === "searchSharing" ? styles.active : ""}`}
            onClick={() => setActiveTab("searchSharing")}
          >
            Search Sharing
          </button>
          <button
            type="button"
            className={`${styles["admin-tab"]} ${activeTab === "interest" ? styles.active : ""}`}
            onClick={() => setActiveTab("interest")}
          >
            Interest Requests
          </button>
          <button
            type="button"
            className={`${styles["admin-tab"]} ${activeTab === "propertyMgmt" ? styles.active : ""}`}
            onClick={() => setActiveTab("propertyMgmt")}
          >
            Property Management
          </button>
        </div>

        {message.text && (
          <div className={`${styles["admin-message"]} ${styles[`message-${message.type}`]}`} role="alert">
            {message.text}
          </div>
        )}

        {activeTab === "users" && (
        <div className={styles["admin-grid"]}>
          <div className={styles["admin-card"]}>
            <h2>Create New User</h2>
            <form onSubmit={handleCreateUser} className={styles["admin-form"]}>
              <div className={styles["form-group"]}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles["form-group"]}>
                <label htmlFor="password">Initial Password (min 6 chars)</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className={styles["form-group"]}>
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">User (Investor)</option>
                  <option value="admin">Admin (User Management)</option>
                  <option value="wholesaler">Wholesaler</option>
                </select>
              </div>

              <button type="submit" className={styles["admin-button"]} disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          <div className={styles["admin-card"]}>
            <div className={styles["users-header"]}>
              <h2>System Users</h2>
              <button
                onClick={loadUsers}
                className={styles["btn-refresh"]}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>

            <div className={styles["users-search-filters"]}>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="search-email">Search by email</label>
                <input
                  id="search-email"
                  type="text"
                  placeholder="Filter by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="search-role">Role</label>
                <select
                  id="search-role"
                  value={searchRole}
                  onChange={(e) => setSearchRole(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="">All roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="wholesaler">Wholesaler</option>
                </select>
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="search-date">Created after</label>
                <input
                  id="search-date"
                  type="date"
                  value={searchDateCreatedAfter}
                  onChange={(e) => setSearchDateCreatedAfter(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
            </div>

            <div className={styles["users-table-container"]}>
              <table className={styles["users-table"]}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className={styles["text-center"]}>
                        {loading ? "Loading users..." : "No users found or error loading."}
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className={styles["text-center"]}>
                        No users match the search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.uid}
                        className={selectedUser?.uid === u.uid ? styles["user-row-selected"] : ""}
                      >
                        <td>
                          {u.email}
                          {user.uid === u.uid && <span className={styles["badge-self"]}>You</span>}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles[`badge-${u.role}`]}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>{new Date(u.created).toLocaleDateString()}</td>
                        <td>
                          <button
                            onClick={() => setSelectedUser(selectedUser?.uid === u.uid ? null : u)}
                            className={styles["btn-action"]}
                            title={selectedUser?.uid === u.uid ? "Deselect" : "View deals & searches"}
                          >
                            {selectedUser?.uid === u.uid ? "Deselect" : "View"}
                          </button>
                          <button
                            onClick={() => handleToggleRole(u.uid, u.role)}
                            className={styles["btn-action"]}
                            disabled={loading || user.uid === u.uid}
                            title={u.role === "admin" || u.role === "wholesaler" ? "Remove role" : "Make Admin"}
                            style={{ marginLeft: 8 }}
                          >
                            {u.role === "admin" ? "Remove Admin" : u.role === "wholesaler" ? "Remove Wholesaler" : "Make Admin"}
                          </button>
                          {u.role !== "wholesaler" && (
                            <button
                              onClick={() => handleGrantWholesaler(u.uid)}
                              className={styles["btn-action"]}
                              disabled={loading || user.uid === u.uid}
                              title="Grant Wholesaler access"
                              style={{ marginLeft: 8 }}
                            >
                              Grant Wholesaler
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedUser && (
              <div className={styles["user-detail-panel"]}>
                <div className={styles["user-detail-header"]}>
                  <h3>Assigned to {selectedUser.email}</h3>
                  <button
                    type="button"
                    className={styles["btn-action"]}
                    onClick={() => setSelectedUser(null)}
                  >
                    Close
                  </button>
                </div>
                {dealsLoading || searchesLoading ? (
                  <p className={styles["admin-muted"]}>Loading deals and searches…</p>
                ) : (
                  <div className={styles["user-detail-grid"]}>
                    <div className={styles["user-detail-section"]}>
                      <h4>Deals ({selectedUserDeals.length})</h4>
                      {selectedUserDeals.length === 0 ? (
                        <p className={styles["admin-muted"]}>No deals assigned to this user.</p>
                      ) : (
                        <ul className={styles["user-detail-list"]}>
                          {selectedUserDeals.map((d) => (
                            <li key={d.id}>
                              {d.dealName}
                              {d.sharedWithAll && (
                                <span className={styles["badge-user"]} style={{ marginLeft: 8 }}>Shared with all</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className={styles["user-detail-section"]}>
                      <h4>Searches ({selectedUserSearches.length})</h4>
                      {selectedUserSearches.length === 0 ? (
                        <p className={styles["admin-muted"]}>No searches assigned to this user.</p>
                      ) : (
                        <ul className={styles["user-detail-list"]}>
                          {selectedUserSearches.map((s) => (
                            <li key={s.id}>
                              {s.name} ({s.resultCount ?? 0} properties)
                              {s.sharedWithAll && (
                                <span className={styles["badge-user"]} style={{ marginLeft: 8 }}>Shared with all</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === "params" && (
          <div className={styles["admin-card"]} style={{ maxWidth: 560 }}>
            <h2 className={styles["admin-section-title"]}>Equation Parameters</h2>
            <p className={styles["admin-muted"]} style={{ marginBottom: 20 }}>
              Override hardcoded values used in deal calculations. Leave blank to use defaults.
            </p>
            {params ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSaveParams(); }}
                className={styles["admin-form"]}
              >
                <div className={styles["form-group"]}>
                  <label htmlFor="maxTpc">Max Total Project Cost ($) — e.g. 60000</label>
                  <input
                    id="maxTpc"
                    type="number"
                    value={params.maxTpc ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, maxTpc: Number(e.target.value) || 0 }))}
                    min={0}
                    step={1000}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="minLoanAmount">Min 1st Mortgage Loan Amount ($) — e.g. 50000</label>
                  <input
                    id="minLoanAmount"
                    type="number"
                    value={params.minLoanAmount ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, minLoanAmount: Number(e.target.value) || 0 }))}
                    min={0}
                    step={1000}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="minAcqMgmtFee">Min Acquisition Mgmt Fee ($)</label>
                  <input
                    id="minAcqMgmtFee"
                    type="number"
                    value={params.minAcqMgmtFee ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, minAcqMgmtFee: Number(e.target.value) || 0 }))}
                    min={0}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="minRealtorFee">Min Realtor/Sale Fee ($)</label>
                  <input
                    id="minRealtorFee"
                    type="number"
                    value={params.minRealtorFee ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, minRealtorFee: Number(e.target.value) || 0 }))}
                    min={0}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="mortgagePointsRate">Mortgage Points Rate (e.g. 0.04 = 4%)</label>
                  <input
                    id="mortgagePointsRate"
                    type="number"
                    step="0.01"
                    value={params.mortgagePointsRate ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, mortgagePointsRate: Number(e.target.value) || 0 }))}
                    min={0}
                    max={1}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="initialReferralPct">Initial Referral (% of Preferred ROI) — e.g. 11.11</label>
                  <input
                    id="initialReferralPct"
                    type="number"
                    step="0.01"
                    value={params.initialReferralPct ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, initialReferralPct: Number(e.target.value) || 0 }))}
                    min={0}
                    max={100}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label htmlFor="investorReferralPct">Investor Referral (% of Preferred ROI) — e.g. 11.11</label>
                  <input
                    id="investorReferralPct"
                    type="number"
                    step="0.01"
                    value={params.investorReferralPct ?? ""}
                    onChange={(e) => setParams((p) => ({ ...p, investorReferralPct: Number(e.target.value) || 0 }))}
                    min={0}
                    max={100}
                  />
                </div>
                <button type="submit" className={styles["admin-button"]} disabled={paramsSaving}>
                  {paramsSaving ? "Saving…" : "Save Parameters"}
                </button>
              </form>
            ) : (
              <p className={styles["admin-muted"]}>Loading parameters…</p>
            )}
          </div>
        )}

        {activeTab === "sharing" && (
          <div className={styles["admin-grid"]}>
            <div className={styles["admin-card"]}>
              <h2 className={styles["admin-section-title"]}>Assign Read-Only Deal Access</h2>
              <p className={styles["admin-muted"]} style={{ marginBottom: 16 }}>
                Select a deal, then choose which users (or all users) can view it in read-only mode.
              </p>
              <div className={styles["form-group"]} style={{ marginBottom: 16 }}>
                <label htmlFor="share-deal-search">Deal</label>
                <input
                  id="share-deal-search"
                  type="text"
                  placeholder="Type address or owner email to filter..."
                  value={shareDealSearch}
                  onChange={(e) => setShareDealSearch(e.target.value)}
                  className={styles["search-input"]}
                  style={{ width: "100%", maxWidth: 400 }}
                />
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 240,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--surface2)",
                  }}
                >
                  {filteredDealsForSharing.length === 0 ? (
                    <div style={{ padding: 12, color: "var(--muted)", fontSize: 12 }}>
                      {shareDealSearch.trim() ? `No deals match "${shareDealSearch}"` : "No deals yet"}
                    </div>
                  ) : (
                    filteredDealsForSharing.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setSelectedDealId(d.id);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 12px",
                          textAlign: "left",
                          border: "none",
                          background: selectedDealId === d.id ? "var(--amber-soft)" : "transparent",
                          color: "var(--text)",
                          cursor: "pointer",
                          fontFamily: "var(--mono)",
                          fontSize: 12,
                        }}
                      >
                        {d.dealName} {d.userId ? `(owner: ${users.find((u) => u.uid === d.userId)?.email ?? d.userId})` : ""}
                      </button>
                    ))
                  )}
                </div>
              </div>
              {dealsLoading ? (
                <p className={styles["admin-muted"]}>Loading deals…</p>
              ) : selectedDealId ? (
                <>
                  <div className={styles["form-group"]} style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={shareWithAll}
                        onChange={(e) => setShareWithAll(e.target.checked)}
                      />
                      Share with all users (read-only)
                    </label>
                  </div>
                  <div className={styles["form-group"]} style={{ marginBottom: 16 }}>
                    <label>Share with specific users:</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                      {users.filter((u) => u.uid !== user?.uid).map((u) => (
                        <label key={u.uid} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={shareWithUserIds.includes(u.uid)}
                            onChange={() => toggleShareUser(u.uid)}
                          />
                          {u.email}
                        </label>
                      ))}
                      {users.length <= 1 && (
                        <span className={styles["admin-muted"]}>No other users in system.</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles["admin-button"]}
                    onClick={handleSaveShare}
                    disabled={shareSaving}
                  >
                    {shareSaving ? "Saving…" : "Update Sharing"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "searchSharing" && (
          <div className={styles["admin-grid"]}>
            <div className={styles["admin-card"]}>
              <h2 className={styles["admin-section-title"]}>Assign Read-Only Saved Search Access</h2>
              <p className={styles["admin-muted"]} style={{ marginBottom: 16 }}>
                Select a saved search, then choose which users (or all users) can view it in read-only mode on the Find Properties screen.
              </p>
              <div className={styles["form-group"]} style={{ marginBottom: 16 }}>
                <label htmlFor="share-search-select">Saved Search</label>
                <select
                  id="share-search-select"
                  value={selectedSearchId}
                  onChange={(e) => setSelectedSearchId(e.target.value)}
                  style={{ padding: 10, width: "100%", maxWidth: 400, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)" }}
                >
                  <option value="">— Select a saved search —</option>
                  {allSearches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.resultCount} properties) {s.userId ? `(owner: ${users.find((u) => u.uid === s.userId)?.email ?? s.userId})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {searchesLoading ? (
                <p className={styles["admin-muted"]}>Loading saved searches…</p>
              ) : selectedSearchId ? (
                <>
                  <div className={styles["form-group"]} style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={searchShareWithAll}
                        onChange={(e) => setSearchShareWithAll(e.target.checked)}
                      />
                      Share with all users (read-only)
                    </label>
                  </div>
                  <div className={styles["form-group"]} style={{ marginBottom: 16 }}>
                    <label>Share with specific users:</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                      {users.filter((u) => u.uid !== user?.uid).map((u) => (
                        <label key={u.uid} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={searchShareWithUserIds.includes(u.uid)}
                            onChange={() => toggleSearchShareUser(u.uid)}
                          />
                          {u.email}
                        </label>
                      ))}
                      {users.length <= 1 && (
                        <span className={styles["admin-muted"]}>No other users in system.</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles["admin-button"]}
                    onClick={handleSaveSearchShare}
                    disabled={searchShareSaving}
                  >
                    {searchShareSaving ? "Saving…" : "Update Sharing"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "interest" && (
          <div className={styles["admin-card"]} style={{ maxWidth: "100%" }}>
            <div className={styles["users-header"]}>
              <h2 className={styles["admin-section-title"]}>Interest Requests</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                  Filter:
                  <select
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value)}
                    style={{ marginLeft: 8, padding: "4px 8px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
                  >
                    <option value="all">All</option>
                    <option value="request_analysis">Request Analysis</option>
                    <option value="request_wholesaler_access">Request Wholesaler Access</option>
                    <option value="favorite">Favorite</option>
                    <option value="request_zoom">Request Zoom</option>
                    <option value="start_buying">Start Buying</option>
                  </select>
                </label>
              </div>
            </div>
            <p className={styles["admin-muted"]} style={{ marginBottom: 16 }}>
              User requests from Find Properties and Deal Analyzer. Emails are sent to admins when users submit.
            </p>
            {interestLoading ? (
              <p className={styles["admin-muted"]}>Loading…</p>
            ) : (
              <div className={styles["users-table-container"]}>
                <table className={styles["users-table"]}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Type</th>
                      <th>Property / Deal</th>
                      <th>Message</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interestRequests
                      .filter((r) => interestFilter === "all" || r.type === interestFilter)
                      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                      .map((r) => (
                        <tr key={r.id}>
                          <td>{r.userEmail}</td>
                          <td>
                            <span className={`${styles.badge} ${styles["badge-user"]}`}>
                              {r.type === "request_analysis" && "Request Analysis"}
                              {r.type === "request_wholesaler_access" && "Request Wholesaler Access"}
                              {r.type === "favorite" && "Favorite"}
                              {r.type === "request_zoom" && "Request Zoom"}
                              {r.type === "start_buying" && "Start Buying"}
                            </span>
                          </td>
                          <td>
                            {r.type === "request_analysis" && r.propertySnapshot
                              ? [r.propertySnapshot.addressLine1, r.propertySnapshot.city, r.propertySnapshot.state]
                                  .filter(Boolean)
                                  .join(", ") || "—"
                              : r.type === "request_wholesaler_access"
                                ? r.userEmail
                                : r.dealName || r.dealId || "—"}
                          </td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.message || "—"}
                          </td>
                          <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[`badge-${r.status === "pending" ? "user" : r.status === "acknowledged" ? "admin" : ""}`]}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.type === "request_wholesaler_access" && r.status === "pending" && (
                              <button
                                type="button"
                                className={styles["btn-action"]}
                                onClick={() => handleApproveWholesalerRequest(r)}
                                disabled={interestStatusUpdating === r.id}
                              >
                                Approve
                              </button>
                            )}
                            {r.status !== "completed" && (
                              <>
                                {r.status === "pending" && r.type !== "request_wholesaler_access" && (
                                  <button
                                    type="button"
                                    className={styles["btn-action"]}
                                    onClick={() => handleUpdateInterestStatus(r.id, "acknowledged")}
                                    disabled={interestStatusUpdating === r.id}
                                  >
                                    Acknowledge
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={styles["btn-action"]}
                                  onClick={() => handleUpdateInterestStatus(r.id, "completed")}
                                  disabled={interestStatusUpdating === r.id}
                                  style={r.type === "request_wholesaler_access" ? { marginLeft: 8 } : undefined}
                                >
                                  Complete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    {interestRequests.filter((r) => interestFilter === "all" || r.type === interestFilter).length === 0 && (
                      <tr>
                        <td colSpan="7" className={styles["text-center"]}>
                          No interest requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "propertyMgmt" && (
          <div className={styles["admin-card"]} style={{ maxWidth: "100%" }}>
            <div className={styles["users-header"]}>
              <h2 className={styles["admin-section-title"]}>Investor Property Management</h2>
              <button
                onClick={() => {
                  setPropertiesLoading(true);
                  loadAllPropertiesForAdmin()
                    .then(setAllPropertiesForAdmin)
                    .catch((e) => setMessage({ type: "error", text: "Failed to load: " + e.message }))
                    .finally(() => setPropertiesLoading(false));
                }}
                className={styles["btn-refresh"]}
                disabled={propertiesLoading}
              >
                Refresh
              </button>
            </div>
            <p className={styles["admin-muted"]} style={{ marginBottom: 16 }}>
              Manage which properties from saved searches are visible to investors. Toggle include/exclude for each property.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-address">Address</label>
                <input
                  id="property-filter-address"
                  type="text"
                  placeholder="Search address..."
                  value={propertyFilterSearch}
                  onChange={(e) => setPropertyFilterSearch(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-city">City</label>
                <input
                  id="property-filter-city"
                  type="text"
                  placeholder="e.g., Detroit"
                  value={propertyFilterCity}
                  onChange={(e) => setPropertyFilterCity(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-state">State</label>
                <input
                  id="property-filter-state"
                  type="text"
                  placeholder="e.g., MI"
                  maxLength={2}
                  value={propertyFilterState}
                  onChange={(e) => setPropertyFilterState(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-zip">Zip Code</label>
                <input
                  id="property-filter-zip"
                  type="text"
                  placeholder="e.g., 48201"
                  value={propertyFilterZipCode}
                  onChange={(e) => setPropertyFilterZipCode(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-min-price">Min Price ($)</label>
                <input
                  id="property-filter-min-price"
                  type="number"
                  placeholder="e.g., 50000"
                  value={propertyFilterMinPrice}
                  onChange={(e) => setPropertyFilterMinPrice(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-max-price">Max Price ($)</label>
                <input
                  id="property-filter-max-price"
                  type="number"
                  placeholder="e.g., 500000"
                  value={propertyFilterMaxPrice}
                  onChange={(e) => setPropertyFilterMaxPrice(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-min-beds">Min Beds</label>
                <input
                  id="property-filter-min-beds"
                  type="number"
                  min={0}
                  placeholder="Any"
                  value={propertyFilterMinBeds}
                  onChange={(e) => setPropertyFilterMinBeds(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-min-baths">Min Baths</label>
                <input
                  id="property-filter-min-baths"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Any"
                  value={propertyFilterMinBaths}
                  onChange={(e) => setPropertyFilterMinBaths(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-min-sqft">Min Sq Ft</label>
                <input
                  id="property-filter-min-sqft"
                  type="number"
                  min={0}
                  placeholder="Any"
                  value={propertyFilterMinSquareFootage}
                  onChange={(e) => setPropertyFilterMinSquareFootage(e.target.value)}
                  className={styles["search-input"]}
                />
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-type">Property Type</label>
                <select
                  id="property-filter-type"
                  value={propertyFilterPropertyType}
                  onChange={(e) => setPropertyFilterPropertyType(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="Any">Any Type</option>
                  <option value="Single Family">Single Family</option>
                  <option value="Multi-Family">Multi-Family</option>
                  <option value="Condo">Condo / Townhouse</option>
                </select>
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-status">Status</label>
                <select
                  id="property-filter-status"
                  value={propertyFilterStatus}
                  onChange={(e) => setPropertyFilterStatus(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-deal">Deal Status</label>
                <select
                  id="property-filter-deal"
                  value={propertyFilterDealStatus}
                  onChange={(e) => setPropertyFilterDealStatus(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="all">All</option>
                  <option value="deal">Deal only</option>
                  <option value="nodeal">No Deal only</option>
                </select>
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-sort">Sort by</label>
                <select
                  id="property-filter-sort"
                  value={propertySortBy}
                  onChange={(e) => setPropertySortBy(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="date-desc">Listed: Newest First</option>
                  <option value="date-asc">Listed: Oldest First</option>
                </select>
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-inclusion">Inclusion</label>
                <select
                  id="property-filter-inclusion"
                  value={propertyFilterInclusion}
                  onChange={(e) => setPropertyFilterInclusion(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="all">All</option>
                  <option value="included">Included only</option>
                  <option value="excluded">Excluded only</option>
                </select>
              </div>
              <div className={styles["form-group"]} style={{ margin: 0 }}>
                <label htmlFor="property-filter-source">From search</label>
                <select
                  id="property-filter-source"
                  value={propertyFilterSourceSearch}
                  onChange={(e) => setPropertyFilterSourceSearch(e.target.value)}
                  className={styles["search-input"]}
                >
                  <option value="">All searches</option>
                  {allSearches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!propertiesLoading && allSearches.length > 0 && filteredPropertiesForAdmin.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <span className={styles["admin-muted"]}>Bulk:</span>
                <select
                  value={propertyFilterSourceSearch}
                  onChange={(e) => setPropertyFilterSourceSearch(e.target.value)}
                  style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
                >
                  <option value="">Select search</option>
                  {allSearches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles["btn-action"]}
                  onClick={() => propertyFilterSourceSearch && handleIncludeAllFromSearch(propertyFilterSourceSearch)}
                  disabled={!propertyFilterSourceSearch || propertyToggleUpdating === "bulk"}
                >
                  Include all from selected search
                </button>
              </div>
            )}
            {!propertiesLoading && filteredPropertiesForAdmin.length > 0 && (
              <p className={styles["admin-muted"]} style={{ marginBottom: "1rem" }}>
                {filteredPropertiesForAdmin.length} of {allPropertiesForAdmin.length} properties
              </p>
            )}
            {propertiesLoading ? (
              <p className={styles["admin-muted"]}>Loading properties…</p>
            ) : filteredPropertiesForAdmin.length === 0 ? (
              <p className={styles["admin-muted"]}>
                {allPropertiesForAdmin.length === 0
                  ? "No properties from saved searches yet. Run a property search and save results first."
                  : "No properties match the current filters."}
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                {filteredPropertiesForAdmin.map((item) => {
                  const prop = item.property;
                  const analysis = analyzePropertyForDeal(prop, null, config);
                  return (
                    <PropertyResultCard
                      key={prop?.id}
                      property={prop}
                      analysis={analysis}
                      includeInInvestorSearch={item.isIncluded}
                      onIncludeChange={(propertyId, included) => handlePropertyIncludeChange(propertyId, included)}
                      sourceSearchNames={item.sourceSearchNames}
                      checkboxDisabled={propertyToggleUpdating === prop?.id || propertyToggleUpdating === "bulk"}
                      onDelete={handlePropertyDelete}
                      deleteDisabled={propertyDeletingId === prop?.id}
                      onAnalyze={(property) => {
                        const data = {
                          addressLine1: property.addressLine1 || "",
                          city: property.city || "",
                          state: property.state || "",
                          zipCode: property.zipCode || "",
                          price: property.price || 0,
                          bedrooms: property.bedrooms,
                          bathrooms: property.bathrooms,
                          squareFootage: property.squareFootage,
                          yearBuilt: property.yearBuilt,
                          lotSize: property.lotSize,
                          propertyType: property.propertyType || "Single Family",
                          image: property.image,
                          imageFallback: property.imageFallback,
                          apn: property.apn,
                          propertyOwner: property.propertyOwner,
                          notes: property.notes,
                        };
                        saveImportProperty(data);
                        window.open(`${window.location.origin}/investor`, "_blank");
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
