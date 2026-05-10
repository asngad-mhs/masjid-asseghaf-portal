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
        
        if (!userDoc.exists()) {
          // If no users exist, make this user admin, otherwise 'user'
          // For safety, let's just make the first login an admin, others users 
          // (Actually querying list of users needs admin, maybe we just default to 'user' 
          // or allow a specific email to be admin for demo. Let's make everyone 'user' for now, 
          // and we can manually upgrade if needed, or if email matches specific).
          const isFirstAdmin = firebaseUser.email === 'asngad@mhs.unugha.ac.id'; // Taking the user's email as admin
          
          const newRole = isFirstAdmin ? 'admin' : 'user';
          await setDoc(userDocRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Unknown User',
            role: newRole,
            createdAt: new Date().toISOString()
          });
          setRole(newRole);
        } else {
          setRole(userDoc.data().role as 'user' | 'admin');
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
