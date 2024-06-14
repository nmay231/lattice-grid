import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { importPuzzleData } from "../encoding/importPuzzle";
import { usePuzzle } from "../state/puzzle";

export const RedirectHome = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const puzzle = usePuzzle();

    useEffect(() => {
        const urlSearch = new URLSearchParams(search);
        const puzzleString = urlSearch.get("0");
        if (puzzleString) {
            navigate(`/play?0=${puzzleString}`, { replace: true });
            window.setTimeout(() => {
                puzzle.settings.editMode = "answer";
                importPuzzleData(puzzle, puzzleString);
            }, 50);
        } else {
            navigate("/edit", { replace: true });
        }
    }, [navigate, puzzle, search]);

    return <>Redirecting</>;
};
