import { useEffect } from "react";
import { RouteProps, useHistory } from "react-router-dom";
import { importPuzzle } from "../components/ImportExportModal/ImportExportModal";
import { usePuzzle } from "../state/puzzle";

export const RedirectHome: React.FC<RouteProps> = ({ location }) => {
    const history = useHistory();
    const puzzle = usePuzzle();

    useEffect(() => {
        history.replace("/edit");
        if (location?.search) {
            window.setTimeout(() => {
                importPuzzle(puzzle, location.search);
            }, 50);
        }
    }, [location?.search, history, puzzle]);

    return <>Redirecting</>;
};
