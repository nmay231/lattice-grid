import { Center, Stack, Title } from "@mantine/core";
import { Link } from "react-router-dom";

export const _404Page = () => {
    return (
        <div>
            <Center style={{ height: "100vh", width: "100vw" }}>
                <Stack>
                    <Title order={2}>404: Page not found!</Title>
                    <Link to="/">Go to edit page</Link>
                </Stack>
            </Center>
        </div>
    );
};
