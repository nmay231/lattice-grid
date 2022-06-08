export const blurActiveElement = () => {
    // Sometimes, I hate JS... Why event loop? WHY?
    setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
};
