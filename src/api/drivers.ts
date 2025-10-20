// Minimal mock API for drivers used by the driver registration flow

export interface DriverRegistration {
	id?: string;
	name: string;
	phone: string;
	vehicle: string;
	plate: string;
	documents?: string[];
	approved?: boolean;
}

let pendingDrivers: DriverRegistration[] = [];

export const submitDriverRegistration = async (payload: DriverRegistration) => {
	const newDriver = { ...payload, id: `${Date.now()}`, approved: false };
	pendingDrivers.push(newDriver);
	return newDriver;
};

export const listPendingDrivers = async () => {
	return pendingDrivers;
};

export const approveDriver = async (id: string) => {
	pendingDrivers = pendingDrivers.map(d => (d.id === id ? { ...d, approved: true } : d));
	return pendingDrivers.find(d => d.id === id) || null;
};