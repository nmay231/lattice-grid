import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "react-redux";
import { PuzzleManager } from "../../logic/PuzzleManager";

const PuzzleContext = createContext(null);

export const PuzzleContextProvider = ({ children, loading }) => {
    const store = useStore();
    const [puzzle, setPuzzle] = useState(null);

    useEffect(() => {
        setPuzzle(new PuzzleManager(store));
    }, [store]);

    if (!puzzle) {
        return loading || <></>;
    }

    return (
        <PuzzleContext.Provider value={puzzle}>
            {children}
        </PuzzleContext.Provider>
    );
};

export const usePuzzle = () => {
    const puzzle = useContext(PuzzleContext);

    return puzzle;
};
