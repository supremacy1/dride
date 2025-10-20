// Minimal mock payments API

export const pay = async (amount: number, method: string) => {
	// pretend we charged the card
	return { success: true, transactionId: `txn_${Date.now()}` };
};