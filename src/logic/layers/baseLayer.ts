import { ILayer } from "../../globals";

const throwError =
    ({ message }: { message: string }) =>
    () => {
        throw Error(message);
    };

// Change this to only contain properties that layers would add at runtime (i.e. remove id, ethereal, and unique since those should always be defined on init)
export const BaseLayer: ILayer = {
    id: "INTERNAL_DO_NOT_USE",
    // In case it does get used, it should absolutely be shown
    ethereal: false,
    unique: true,
    rawSettings: {},
    defaultSettings: {},
    gatherPoints: throwError({ message: "gatherPoints not initialized" }),
    handleEvent: throwError({ message: "handleEvent not initialized" }),
    // TODO: Should these be required?
    // newSettings: throwError({ message: "newSettings not initialized" }),
    // getBlits: throwError({ message: "getBlits not initialized" }),
};
