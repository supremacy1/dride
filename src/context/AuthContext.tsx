import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the user object and the context
interface User {
  id: number;
  fullname: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (userData: User) => void;
  signOut: () => void;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const signIn = (userData: User) => {
    setUser(userData);
  };

  const signOut = () => {
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};