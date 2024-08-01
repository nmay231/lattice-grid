import { Modal } from "@mantine/core";
import { AboutPageContent } from "../../pages/AboutPage";
import { useModal } from "../../utils/focusManagement";

export const ModalAbout = () => {
    const { opened, close } = useModal("about");
    return (
        <Modal title="About Lattice Grid" opened={opened} onClose={close} size="lg">
            <AboutPageContent />
        </Modal>
    );
};
