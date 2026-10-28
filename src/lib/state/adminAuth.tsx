'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

export type AdminRole = 'super_admin' | 'volunteer';

export interface AdminUser {
  uid: string;
  email?: string;
  name: string;
  phone?: string;
  role: AdminRole;
}

export interface VolunteerStaff {
  id: string;
  name: string;
  phone: string;
  pin: string;
  assignedVenue?: string;
  createdAt?: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithVolunteerPin: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  volunteers: VolunteerStaff[];
  addVolunteer: (name: string, phone: string, pin: string, assignedVenue?: string) => Promise<{ success: boolean; error?: string }>;
  removeVolunteer: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Initial fallback volunteer for quick counter testing
const DEFAULT_VOLUNTEERS: VolunteerStaff[] = [
  {
    id: 'vol-default-1',
    name: 'Counter Volunteer 1',
    phone: '9947748552',
    pin: '4855',
    assignedVenue: 'Kuppam Unit Gathering',
    createdAt: new Date().toISOString(),
  },
];

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [volunteers, setVolunteers] = useState<VolunteerStaff[]>([]);

  // 1. Fetch Volunteers from Firestore (with local fallback)
  const fetchVolunteers = async (): Promise<VolunteerStaff[]> => {
    try {
      const snap = await getDocs(collection(db, 'volunteers'));
      const list: VolunteerStaff[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setVolunteers(list);
      localStorage.setItem('masjid_volunteers_cache', JSON.stringify(list));
      return list;
    } catch (e) {
      console.warn('Firestore volunteers fetch error, falling back to local cache:', e);
      try {
        const cached = localStorage.getItem('masjid_volunteers_cache');
        if (cached) {
          const list: VolunteerStaff[] = JSON.parse(cached);
          setVolunteers(list);
          return list;
        }
      } catch (err) {}
      return [];
    }
  };

  // 2. Listen to Firebase Auth state for Super Admins
  useEffect(() => {
    fetchVolunteers();

    // Check volunteer session in localStorage first
    try {
      const volSession = localStorage.getItem('masjid_volunteer_session');
      if (volSession) {
        const parsed = JSON.parse(volSession);
        if (parsed?.role === 'volunteer') {
          setAdminUser(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {}

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Super Admin verified by Firebase Auth
        setAdminUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'salafimasjidkuppam@gmail.com',
          name: 'Committee Super Admin',
          role: 'super_admin',
        });
      } else {
        // If no firebase user and no volunteer session
        const volSession = localStorage.getItem('masjid_volunteer_session');
        if (!volSession) {
          setAdminUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Super Admin Email/Password Login
  const loginWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Clear any volunteer session
      localStorage.removeItem('masjid_volunteer_session');

      // Attempt standard Firebase Auth sign-in
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const user: AdminUser = {
        uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        name: 'Committee Super Admin',
        role: 'super_admin',
      };
      setAdminUser(user);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      // If user does not exist yet and credentials match the authorized committee setup, auto-create
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (cleanEmail === 'salafimasjidkuppam@gmail.com' || cleanEmail === 'admin@kuppam.org') {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
            const user: AdminUser = {
              uid: newCred.user.uid,
              email: newCred.user.email || cleanEmail,
              name: 'Committee Super Admin',
              role: 'super_admin',
            };
            setAdminUser(user);
            setIsLoading(false);
            return { success: true };
          } catch (createErr: any) {
            console.error('Auto create super admin error:', createErr);
          }
        }
      }

      setIsLoading(false);
      let errorMsg = 'Invalid email or password.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect password. Please verify and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed login attempts. Please wait a moment.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. Please check your internet connection.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // 4. Counter Volunteer PIN Login
  const loginWithVolunteerPin = async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanPin = pin.trim();

    if (cleanPhone.length !== 10) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    if (cleanPin.length < 4) {
      setIsLoading(false);
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    let matched: VolunteerStaff | undefined;

    // 1. Direct query to Firestore for real-time authentication across any device
    try {
      const q = query(collection(db, 'volunteers'), where('phone', '==', cleanPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.forEach((d) => {
          const data = d.data() as VolunteerStaff;
          if (data.pin === cleanPin) {
            matched = { ...data, id: d.id };
          }
        });
      }
    } catch (err) {
      console.warn('Direct Firestore volunteer lookup failed, checking local memory/cache:', err);
    }

    // 2. Fallback to in-memory volunteers list
    if (!matched) {
      matched = volunteers.find((v) => v.phone.replace(/\D/g, '').slice(-10) === cleanPhone && v.pin === cleanPin);
    }

    // 3. Fallback: re-fetch all volunteers directly from Firestore to catch any recent cross-device adds
    if (!matched) {
      try {
        const freshList = await fetchVolunteers();
        if (freshList && freshList.length > 0) {
          matched = freshList.find((v: VolunteerStaff) => v.phone.replace(/\D/g, '').slice(-10) === cleanPhone && v.pin === cleanPin);
        }
      } catch (err) {}
    }

    // 4. Fallback to local cache
    if (!matched) {
      try {
        const cached = localStorage.getItem('masjid_volunteers_cache');
        if (cached) {
          const list: VolunteerStaff[] = JSON.parse(cached);
          matched = list.find((v) => v.phone.replace(/\D/g, '').slice(-10) === cleanPhone && v.pin === cleanPin);
        }
      } catch (e) {}
    }

    if (matched) {
      const volUser: AdminUser = {
        uid: matched.id,
        phone: matched.phone,
        name: matched.name,
        role: 'volunteer',
      };
      setAdminUser(volUser);
      localStorage.setItem('masjid_volunteer_session', JSON.stringify(volUser));
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, error: 'Invalid Mobile Number or PIN. Please contact the Committee Super Admin.' };
  };

  // 5. Add Volunteer (Super Admin only)
  const addVolunteer = async (name: string, phone: string, pin: string, assignedVenue?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanPin = pin.trim();

    if (!name.trim()) return { success: false, error: 'Please enter volunteer name' };
    if (cleanPhone.length !== 10) return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    if (cleanPin.length < 4) return { success: false, error: 'PIN must be at least 4 digits' };

    const newVol: VolunteerStaff = {
      id: `vol-${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      pin: cleanPin,
      assignedVenue: assignedVenue || 'General Venue',
      createdAt: new Date().toISOString(),
    };

    try {
      // Save directly to Firestore
      await setDoc(doc(db, 'volunteers', newVol.id), {
        ...newVol,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error('Firestore save volunteer error:', e);
      return { success: false, error: `Failed to save to database: ${e?.message || 'Check firestore rules'}` };
    }

    const updated = [newVol, ...volunteers.filter((v) => v.id !== newVol.id)];
    setVolunteers(updated);
    localStorage.setItem('masjid_volunteers_cache', JSON.stringify(updated));

    return { success: true };
  };

  // 6. Remove Volunteer (Super Admin only)
  const removeVolunteer = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteDoc(doc(db, 'volunteers', id));
    } catch (e: any) {
      console.error('Firestore delete volunteer error:', e);
      return { success: false, error: `Failed to delete from database: ${e?.message || 'Error'}` };
    }

    const updated = volunteers.filter((v) => v.id !== id);
    setVolunteers(updated);
    localStorage.setItem('masjid_volunteers_cache', JSON.stringify(updated));

    return { success: true };
  };

  // 7. Logout
  const logout = async () => {
    setIsLoading(true);
    localStorage.removeItem('masjid_volunteer_session');
    try {
      await signOut(auth);
    } catch (e) {}
    setAdminUser(null);
    setIsLoading(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isLoading,
        loginWithEmail,
        loginWithVolunteerPin,
        logout,
        volunteers,
        addVolunteer,
        removeVolunteer,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
