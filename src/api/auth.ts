// Minimal mock auth API for development

export const mockLogin = async (email: string, password: string) => {
	// Very simple mock: any email/password works. If email includes 'driver' mark as driver
	const isDriver = email.includes('driver');
	return { token: `token-${Date.now()}`, userType: isDriver ? 'driver' : 'rider' };
};

export const mockRegister = async (email: string, password: string, name?: string) => {
	return { token: `token-${Date.now()}`, userType: 'rider' };
};

export const mockLogout = async () => true;