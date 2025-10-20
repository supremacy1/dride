export const currency = (amount: number) => `$${amount.toFixed(2)}`;
export const shortPhone = (phone?: string) => (phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '');
