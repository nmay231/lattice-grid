import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PuzzleManager } from "../PuzzleManager";
import { importPuzzleData } from "../encoding/importPuzzle";
import type { PageMode } from "../types";
import { PuzzlePage } from "./PuzzlePage";

export const LoadPuzzle = ({ pageMode }: { pageMode: PageMode }) => {
    const [puzzle, setPuzzle] = useState<PuzzleManager>();
    const [prevPageMode, setPrevPageMode] = useState<PageMode>();
    const { search } = useLocation();

    useEffect(() => {
        if (pageMode === prevPageMode) return;
        setPrevPageMode(pageMode);

        const puzzle = new PuzzleManager();
        setPuzzle(puzzle);
        if (pageMode === "edit") {
            puzzle.settings.editMode = "question";
        } else if (pageMode === "play") {
            window.setTimeout(() => {
                const urlSearch = new URLSearchParams(search);
                const puzzleString = urlSearch.get("0");

                // TODO: This temporary change breaks answer check
                puzzle.settings.editMode = "answer";
                importPuzzleData(puzzle, puzzleString!);
            }, 50);
        } else {
            // TODO
            console.error(`pageMode=${pageMode}`);
        }
    }, [pageMode, prevPageMode, search]);

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
