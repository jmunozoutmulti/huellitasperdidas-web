export const triggerOpenPlanesModal = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openPlanesModal'));
    }
};