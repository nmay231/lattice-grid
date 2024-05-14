import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { importPuzzleData } from "../encoding/importPuzzle";
import { usePuzzle } from "../state/puzzle";

export const RedirectHome = () => {
    const navigate = useNavigate();
    const { search: params } = useLocation();
    const puzzle = usePuzzle();

    useEffect(() => {
        if (params) {
            navigate(`/play${params}`, { replace: true });
            window.setTimeout(() => {
                puzzle.settings.editMode = "answer";
                importPuzzleData(puzzle, params.slice(1));
            }, 50);
        } else {
            navigate("/edit", { replace: true });
        }
    }, [navigate, params, puzzle]);

    return <>Redirecting</>;
};
