import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const RedirectHome = () => {
    const navigate = useNavigate();
    const { search } = useLocation();

    useEffect(() => {
        const urlSearch = new URLSearchParams(search);
        const puzzleString = urlSearch.get("0");
        if (puzzleString) {
            navigate(`/play?0=${puzzleString}`, { replace: true });
        } else {
            navigate("/edit", { replace: true });
        }
    }, [navigate, search]);

    return <>Redirecting</>;
};
