import { MantineProvider, MantineThemeOverride } from "@mantine/core";
import { NotificationsProvider } from "@mantine/notifications";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AboutPage } from "./pages/AboutPage";
import { PuzzlePage } from "./pages/PuzzlePage";
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
            <NotificationsProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<RedirectHome />} />
                        <Route path="edit" element={<PuzzlePage key="edit" pageMode="edit" />} />
                        <Route path="play" element={<PuzzlePage key="play" pageMode="play" />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="*" element={<_404Page />} />
                    </Routes>
                </BrowserRouter>
            </NotificationsProvider>
        </MantineProvider>
    );
};
