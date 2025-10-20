import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextType {
  balance: number;
  addFunds: (amount: number) => void;
  withdraw: (amount: number) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState<number>(0);

  const addFunds = (amount: number) => setBalance(prev => prev + amount);
  const withdraw = (amount: number) => {
    if (amount > balance) return false;
    setBalance(prev => prev - amount);
    return true;
  };

  return <WalletContext.Provider value={{ balance, addFunds, withdraw }}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};
