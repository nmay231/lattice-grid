import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { PuzzleManager } from "../PuzzleManager";
import type { PageMode } from "../types";
import { PuzzlePage } from "./PuzzlePage";

export const LoadPuzzle = ({ pageMode }: { pageMode: PageMode }) => {
    const [puzzle, setPuzzle] = useState<PuzzleManager>();
    const [prevPageMode, setPrevPageMode] = useState<PageMode>();
    const search = useSearch();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (pageMode === prevPageMode) return;
        setPrevPageMode(pageMode);

        if (pageMode === "edit") {
            setPuzzle(PuzzleManager.createEditPuzzle());
        } else if (pageMode === "play") {
            const urlSearch = new URLSearchParams(search);
            const puzzleString = urlSearch.get("0");
            if (puzzleString) {
                const puzzle = PuzzleManager.createSolvePuzzle(puzzleString);
                if (puzzle) {
                    setPuzzle(puzzle);
                    return;
                }
            }
            setLocation("/edit", { replace: true });
        } else {
            // TODO
            console.error(`pageMode=${pageMode}`);
        }
    }, [pageMode, prevPageMode, search, setLocation]);

    if (!puzzle) return <></>;

    switch (pageMode) {
        case "edit": {
            return <PuzzlePage key="edit" puzzle={puzzle} />;
        }
        case "play": {
            return <PuzzlePage key="play" puzzle={puzzle} />;
        }
        default: {
            return <></>;
        }
    }
};
