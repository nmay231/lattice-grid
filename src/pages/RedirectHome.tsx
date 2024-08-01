import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

export const RedirectHome = () => {
    const search = useSearch();
    const [, setLocation] = useLocation();

    useEffect(() => {
        const urlSearch = new URLSearchParams(search);
        const puzzleString = urlSearch.get("0");
        if (puzzleString) {
            setLocation(`/play?${urlSearch}`, { replace: true });
        } else {
            setLocation("/edit", { replace: true });
        }
    }, [search, setLocation]);

    return <>Redirecting</>;
};
