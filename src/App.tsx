import { MantineProvider, MantineThemeOverride } from "@mantine/core";
import "@mantine/core/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import { Route, Switch } from "wouter";
import { LoadPuzzle } from "./pages/LoadPuzzle";
import { RedirectHome } from "./pages/RedirectHome";
import { _404Page } from "./pages/_404Page";

const theme: MantineThemeOverride = {
    cursorType: "pointer", // Add cursors to checkboxes and similar elements.
    components: {
        Switch: {
            styles: { track: { border: "1px solid gray", backgroundColor: "lightgray" } },
        },
    },
};

export const App = () => {
    return (
        <MantineProvider theme={theme}>
            <Notifications />
            <Switch>
                <Route path="/">
                    <RedirectHome />
                </Route>
                <Route path="edit">
                    <LoadPuzzle key="edit" pageMode="edit" />
                </Route>
                <Route path="play">
                    <LoadPuzzle key="play" pageMode="play" />
                </Route>
                <Route path="*">
                    <_404Page />
                </Route>
            </Switch>
        </MantineProvider>
    );
};
