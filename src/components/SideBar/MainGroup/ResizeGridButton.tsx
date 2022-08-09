import { Button } from "@mantine/core";
import { useAtom } from "jotai";
import { resizeModalAtom } from "./ResizeModal";

export const ResizeGridButton = () => {
    const [show, setShow] = useAtom(resizeModalAtom);

    return <Button onClick={() => setShow(!show)}>Resize Grid</Button>;
};
