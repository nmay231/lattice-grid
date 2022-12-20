import { Button } from "@mantine/core";
import { modalProxy } from "./ResizeModal";

export const ResizeGridButton = () => {
    return <Button onClick={() => (modalProxy.modal = "resize-grid")}>Resize Grid</Button>;
};
