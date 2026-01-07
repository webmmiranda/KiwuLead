export const handleApiError = (error: any, fallbackMessage: string): string => {
    if (error?.message) return error.message;
    if (typeof error === 'string') return error;
    return fallbackMessage;
};

export const withApiCall = async <T,>(
    apiCall: () => Promise<T>,
    onSuccess: (data: T) => void,
    onError: (error: string) => void
): Promise<void> => {
    try {
        const data = await apiCall();
        onSuccess(data);
    } catch (error) {
        onError(handleApiError(error, 'Error en la operación'));
    }
};
