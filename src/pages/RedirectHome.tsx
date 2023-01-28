import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { importPuzzle } from "../components/ImportExportModal/ImportExportModal";
import { usePuzzle } from "../state/puzzle";

export const RedirectHome = () => {
    const navigate = useNavigate();
    const { search: params } = useLocation();
    const puzzle = usePuzzle();

    useEffect(() => {
        navigate("/edit", { replace: true });
        if (params) {
            window.setTimeout(() => {
                importPuzzle(puzzle, params);
            }, 50);
        }
    }, [navigate, params, puzzle]);

    return <>Redirecting</>;
};
