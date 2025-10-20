// Minimal mock rides API

export interface RideRequest {
	id?: string;
	riderId?: string;
	pickup: { lat: number; lng: number; address?: string };
	dropoff: { lat: number; lng: number; address?: string };
	status?: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
}

let rides: RideRequest[] = [];

export const requestRide = async (payload: RideRequest) => {
		const newRide: RideRequest = { ...payload, id: `${Date.now()}`, status: 'requested' };
	rides.push(newRide);
	return newRide;
};

export const listRides = async () => rides;