import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RideLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface RideContextType {
  pickup?: RideLocation;
  dropoff?: RideLocation;
  setPickup: (loc?: RideLocation) => void;
  setDropoff: (loc?: RideLocation) => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const [pickup, setPickupState] = useState<RideLocation | undefined>(undefined);
  const [dropoff, setDropoffState] = useState<RideLocation | undefined>(undefined);

  return (
    <RideContext.Provider
      value={{ pickup, dropoff, setPickup: setPickupState, setDropoff: setDropoffState }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error('useRide must be used within RideProvider');
  return ctx;
};
