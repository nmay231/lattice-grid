import {
    BrowserRouter as Router,
    Redirect,
    Route,
    Switch,
} from "react-router-dom";
import { PuzzleContextProvider } from "./components/PuzzleContext/PuzzleContext";
import { EditPage } from "./pages/Edit";

export const App = () => {
    return (
        <Router>
            <Switch>
                <Redirect exact path="/" to="/edit" />
                <PuzzleContextProvider>
                    <Route component={EditPage} exact path="/edit" />
                </PuzzleContextProvider>
            </Switch>
        </Router>
    );
};
