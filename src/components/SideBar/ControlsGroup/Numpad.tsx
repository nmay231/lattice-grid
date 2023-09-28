import { Button } from "@mantine/core";
import { IoMdBackspace, IoMdTrash } from "react-icons/io";
import styles from "./Numpad.module.css";

export const Numpad = ({ onKeyPress }: { onKeyPress: (x: string) => void }) => {
    return (
        <div className={styles.numpadContainer}>
            {Array.from({ length: 9 }).map((_, i) => (
                <Button
                    key={i}
                    p="xs"
                    className={styles.numpadButton}
                    onClick={() => onKeyPress(`${i + 1}`)}
                >
                    {i + 1}
                </Button>
            ))}
            <Button p="xs" className={styles.numpadButton} onClick={() => onKeyPress("Delete")}>
                <IoMdTrash size="25px" />
            </Button>
            <Button p="xs" className={styles.numpadButton} onClick={() => onKeyPress("0")}>
                0
            </Button>
            <Button p="xs" className={styles.numpadButton} onClick={() => onKeyPress("Backspace")}>
                <IoMdBackspace size="25px" />
            </Button>
        </div>
    );
};
