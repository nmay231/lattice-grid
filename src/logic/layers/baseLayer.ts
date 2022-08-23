import { ILayer } from "../../globals";
import { errorNotification } from "../../utils/DOMUtils";

const throwError =
    ({ message }: { message: string }) =>
    () => {
        errorNotification({ message, forever: true });
        throw Error(message);
    };

// Change this to only contain properties that layers would add at runtime (i.e. remove id, ethereal, and unique since those should always be defined on init)
export const BaseLayer: Omit<ILayer, "newSettings" | "getBlits"> = {
    id: "INTERNAL_DO_NOT_USE",
    // In case it does get used, it should absolutely be shown
    ethereal: false,
    unique: true,
    rawSettings: {},
    defaultSettings: {},
    gatherPoints: throwError({ message: "gatherPoints not initialized" }),
    handleEvent: throwError({ message: "handleEvent not initialized" }),
};
