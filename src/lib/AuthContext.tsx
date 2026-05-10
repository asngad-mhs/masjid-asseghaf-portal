import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'admin' | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const isAdminEmail = firebaseUser.email === 'asngad@mhs.unugha.ac.id';
        
        if (!userDoc.exists()) {
          const newRole = isAdminEmail ? 'admin' : 'user';
          await setDoc(userDocRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Unknown User',
            role: newRole,
            createdAt: new Date().toISOString()
          });
          setRole(newRole);
        } else {
          const data = userDoc.data();
          const currentRole = data.role;
          
          // Sync displayName and role for admin
          let needsUpdate = false;
          const updates: any = {};
          
          if (isAdminEmail && currentRole !== 'admin') {
            updates.role = 'admin';
            needsUpdate = true;
          }
          if (firebaseUser.displayName && data.displayName !== firebaseUser.displayName) {
            updates.displayName = firebaseUser.displayName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await setDoc(userDocRef, { ...data, ...updates }, { merge: true });
            setRole(updates.role || currentRole);
          } else {
            setRole(currentRole as 'user' | 'admin');
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
