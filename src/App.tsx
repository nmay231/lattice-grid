import { MantineProvider } from "@mantine/core";
import { NotificationsProvider } from "@mantine/notifications";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { EditPage } from "./pages/Edit";
import { RedirectHome } from "./pages/RedirectHome";

export const App = () => {
    return (
        <MantineProvider withGlobalStyles withNormalizeCSS>
            <NotificationsProvider>
                <Router>
                    <Switch>
                        <Route component={RedirectHome} exact path="/" />
                        <Route component={EditPage} exact path="/edit" />
                    </Switch>
                </Router>
            </NotificationsProvider>
        </MantineProvider>
    );
};
