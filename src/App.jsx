import {
    BrowserRouter as Router,
    Redirect,
    Route,
    Switch,
} from "react-router-dom";
import { EditPage } from "./pages/Edit";

export const App = () => {
    return (
        <Router>
            <Switch>
                <Redirect exact path="/" to="/edit" />
                <Route component={EditPage} exact path="/edit" />
            </Switch>
        </Router>
    );
};
