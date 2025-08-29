export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verifyOTP = (inputOTP: string, storedOTP: string): boolean => {
    return inputOTP === storedOTP;
};
