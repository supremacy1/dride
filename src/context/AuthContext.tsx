import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the user object
interface User {
  id: number | string;
  fullname?: string;
  email?: string;
  phone?: string;
  // allow additional server fields
  [key: string]: any;
}

interface SignInPayload {
  user?: User;
  token?: string | null;
  userType?: 'rider' | 'driver' | string | null;
}

interface AuthContextType {
  user: User | null;
  userToken: string | null;
  userType: string | null;
  isLoading: boolean;
  signIn: (payload: SignInPayload | User) => void;
  signOut: () => void;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // signIn accepts either a user object or a richer payload { user, token, userType }
  const signIn = (payload: SignInPayload | User) => {
    // If payload looks like a plain User (has id/email), treat it as user
    const maybeUser = (payload as any).id || (payload as any).email ? (payload as User) : undefined;

    if (maybeUser) {
      setUser(maybeUser);
      // Create a simple token placeholder if server did not provide one
      setUserToken(String((maybeUser as any).id || Date.now()));
      // Default to rider unless caller specifies otherwise
      setUserType((payload as any).userType || 'rider');
      return;
    }

    const p = payload as SignInPayload;
    if (p.user) setUser(p.user);
    if (p.token) setUserToken(p.token);
    else if (p.user && (p.user.id || p.user.email)) setUserToken(String(p.user.id || p.user.email));
    if (p.userType) setUserType(p.userType as string);
    else if (p.user && (p.user as any).type) setUserType((p.user as any).type);
    else setUserType('rider');
  };

  const signOut = () => {
    setUser(null);
    setUserToken(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{ user, userToken, userType, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};