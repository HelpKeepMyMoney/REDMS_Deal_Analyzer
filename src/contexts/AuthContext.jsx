import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  updatePassword as firebaseUpdatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Check if the current user is an admin (document exists in admins/{uid}). */
export async function checkIsAdmin(uid) {
  if (!db || !uid) return false;
  try {
    const ref = doc(db, "admins", uid);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return () => {};
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    checkIsAdmin(user.uid).then((admin) => {
      if (!cancelled) setIsAdmin(admin);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const signUp = async (email, password) => {
    if (!auth) throw new Error("Firebase Auth is not configured");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const signIn = async (email, password) => {
    if (!auth) throw new Error("Firebase Auth is not configured");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
  };

  /** Re-authenticate with current password, then send verification email to new address. */
  const updateEmail = async (newEmail, currentPassword) => {
    if (!auth?.currentUser) throw new Error("Not signed in");
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
  };

  /** Re-authenticate with current password, then update password. */
  const updatePassword = async (newPassword, currentPassword) => {
    if (!auth?.currentUser) throw new Error("Not signed in");
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const value = {
    user,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    updateEmail,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
