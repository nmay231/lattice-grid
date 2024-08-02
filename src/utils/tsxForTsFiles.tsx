import { Button, Stack } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

// I don't feel like renaming PuzzleManager.ts to PuzzleManager.tsx
export const showSolvedPopup = () => {
    showNotification({
        title: "Yay! You solved it",
        message: (
            <div>
                <Stack>
                    <p>Your answer matches the setter&apos;s answer</p>
                    <Button onClick={() => window.location.assign("/edit")}>
                        Go and make your own puzzle!
                    </Button>
                </Stack>
            </div>
        ),
        color: "green",
        autoClose: false,
    });
};
