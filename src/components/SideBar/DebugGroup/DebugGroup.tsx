import { Button, Center, Code, Group, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { Group as Collapse } from "../Group";
import { DummyFocusGroup } from "./DummyFocusGroup";

export const DebugGroup = () => {
    const navigate = useNavigate();

    return (
        <Collapse name="Debug" expanded>
            <Center style={{ width: "100%" }} my="sm" component={Group}>
                <Stack align="center">
                    <Text mx="lg" align="center" weight="bold">
                        If you don&#39;t know what you did, you can type <Code>ctrl-`</Code> or{" "}
                        <Code>cmd-`</Code> to go back to normal.
                    </Text>

                    <Text>Focus group testing</Text>
                    <DummyFocusGroup />

                    <Button
                        m="lg"
                        color="red"
                        onClick={() => {
                            // TODO: I might want to be less aggressive when I have things like keybinds.
                            localStorage.clear();
                            navigate(0);
                        }}
                    >
                        Delete puzzles from localStorage and refresh page
                    </Button>
                </Stack>
            </Center>
        </Collapse>
    );
};
