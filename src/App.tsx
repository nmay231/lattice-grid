import { MantineProvider } from "@mantine/core";
import { NotificationsProvider } from "@mantine/notifications";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { AboutPage } from "./pages/AboutPage";
import { EditPage } from "./pages/Edit";
import { RedirectHome } from "./pages/RedirectHome";
import { _404Page } from "./pages/_404Page";

export const App = () => {
    return (
        <MantineProvider withGlobalStyles withNormalizeCSS>
            <NotificationsProvider>
                <Router>
                    <Switch>
                        <Route component={RedirectHome} exact path="/" />
                        <Route component={EditPage} exact path="/edit" />
                        <Route component={AboutPage} exact path="/about" />
                        <Route component={_404Page} path="*" />
                    </Switch>
                </Router>
            </NotificationsProvider>
        </MantineProvider>
    );
};
