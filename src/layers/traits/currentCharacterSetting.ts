import { Layer, LayerProps } from "../../types";

export interface CurrentCharacterProps extends LayerProps {
    Settings: {
        currentCharacter: string | null;
    };
}

export interface LayerCurrentCharacter<LP extends CurrentCharacterProps> extends Layer<LP> {
    // allowedCharacters: Set<string>;
    // currentCharacter: {
    //     // key: K;
    //     keypressMap: Record<string, LP["ObjectState"][K]>;
    // };
    // eventKeypress: (
    //     layerEvent: LayerEventEssentials<LP> & { points: Point[] },
    // ) => LayerHandlerResult<LP>;
}

export const layerIsCurrentCharacterSetting = <LP extends LayerProps = LayerProps>(
    layer: Layer<LP>,
): layer is Layer<LP> & LayerCurrentCharacter<CurrentCharacterProps> => {
    return "currentCharacter" in layer.settings;
    // return "allowedCharacters" in layer && "currentCharacter" in layer.settings;
};
