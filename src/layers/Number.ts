import {
    HistoryAction,
    Layer,
    LayerClass,
    LayerHandlerResult,
    SVGGroup,
    StorageFilter,
} from "../types";
import { PUT_AT_END } from "../utils/OrderedMap";
import { zip } from "../utils/data";
import { notify } from "../utils/notifications";
import { BaseLayer } from "./BaseLayer";
import { numberTyper } from "./controls/numberTyper";
import { KeyDownEventHandler, SelectedProps, handleEventsSelection } from "./controls/selection";
import styles from "./layers.module.css";
import { CurrentCharacterProps, LayerCurrentCharacter } from "./traits/currentCharacterSetting";
import { GOOFyProps, GridOrObject, LayerGOOFy } from "./traits/gridOrObjectFirst";

export interface NumberProps extends GOOFyProps, CurrentCharacterProps, SelectedProps {
    ObjectState: { state: string };
    TempStorage: SelectedProps["TempStorage"];
    Settings: {
        max: number;
        negatives: boolean;
        gridOrObjectFirst: GridOrObject;
        currentCharacter: string | null;
        _numberTyper: ReturnType<typeof numberTyper>;
    };
}

interface INumberLayer
    extends Layer<NumberProps>,
        LayerGOOFy<NumberProps>,
        KeyDownEventHandler<NumberProps>,
        LayerCurrentCharacter<NumberProps> {}

export class NumberLayer extends BaseLayer<NumberProps> implements INumberLayer {
    static ethereal = false;
    static readonly type = "NumberLayer";
    static displayName = "Number";
    static defaultSettings: LayerClass<NumberProps>["defaultSettings"] = {
        max: 9,
        negatives: false,
        _numberTyper: () => {
            throw notify.error({
                message: `${this.type}._numberTyper() called before implementing!`,
            });
        },
        currentCharacter: "1",
        gridOrObjectFirst: "grid",
    };

    static create = ((puzzle): NumberLayer => {
        return new NumberLayer(NumberLayer, puzzle);
    }) satisfies LayerClass<NumberProps>["create"];

    eventPlaceSinglePointObjects: INumberLayer["eventPlaceSinglePointObjects"] = () => ({});

    handleKeyDown: INumberLayer["handleKeyDown"] = ({ points: ids, storage, settings }) => {
        const stored = storage.getObjects<NumberProps>(this.id);
        if (!ids.length) {
            return {};
        }

        const states: Array<string | null> = ids.map((id) => {
            const object = stored.getObject(settings.editMode, id);
            return object?.state ?? null;
        });

        const newStates = this.settings._numberTyper(states, this.settings.currentCharacter);

        if (newStates === "doNothing") return {};

        const history: LayerHandlerResult<NumberProps>["history"] = [];

        for (const [id, old, new_] of zip(ids, states, newStates)) {
            if (old === new_) continue;

            history.push({
                id,
                object: new_ === null ? null : { state: new_ },
            });
        }
        return { history };
    };

    static controls: LayerClass<NumberProps>["controls"] = {
        numpadControls: true,
        elements: {},
    };
    static constraints: LayerClass<NumberProps>["constraints"] = {
        elements: {
            max: { type: "number", label: "Max", min: 0 },
            negatives: { type: "boolean", label: "Allow negatives" },
        },
    };

    static settingsDescription: LayerClass<NumberProps>["settingsDescription"] = {
        max: { type: "constraints" },
        negatives: { type: "constraints" },
        _numberTyper: { type: "constraints", derived: true },
        gridOrObjectFirst: { type: "controls" },
        currentCharacter: { type: "controls" },
    };

    static isValidSetting<K extends keyof NumberProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is NumberProps["Settings"][K] {
        if (key === "negatives") {
            return typeof value === "boolean";
        } else if (key === "max") {
            return typeof value === "number";
        } else if (key === "gridOrObjectFirst") {
            return value === "grid" || value === "object";
        } else if (key === "currentCharacter") {
            // TODO: Change this when key presses are switched from `ctrl-a` to `ctrl+a`
            return value === null || (typeof value === "string" && value.length === 1);
        }
        return false;
    }

    updateSettings: INumberLayer["updateSettings"] = ({ oldSettings }) => {
        if (!oldSettings || oldSettings.gridOrObjectFirst !== this.settings.gridOrObjectFirst) {
            const { gatherPoints, handleEvent, getOverlaySVG, eventPlaceSinglePointObjects } =
                handleEventsSelection<NumberProps>({});
            this.gatherPoints = gatherPoints;
            this.handleEvent = handleEvent;
            this.getOverlaySVG =
                this.settings.gridOrObjectFirst === "grid" ? getOverlaySVG : undefined;
            this.eventPlaceSinglePointObjects = eventPlaceSinglePointObjects;
        }

        const removeFilters = [] as StorageFilter[];
        if (
            !oldSettings ||
            oldSettings.max !== this.settings.max ||
            oldSettings.negatives !== this.settings.negatives
        ) {
            this.settings._numberTyper = numberTyper(this.settings);
            // TODO: Is this a pattern I want to support? Removing a filter only to add it again to scrub history?
            removeFilters.push(this.filterNumbersOutOfRange);
        }

        return {
            removeFilters,
            filters: [
                { filter: this.filterOverlappingObjects },
                { filter: this.filterNumbersOutOfRange },
            ],
        };
    };

    filterOverlappingObjects: StorageFilter = ({ storage }, action) => {
        const stored = storage.getObjects<NumberProps>(this.id);

        // given digits can override answer ones, but not the other way around
        if (action.storageMode === "answer" && stored.getObject("question", action.objectId)) {
            return { keep: false };
        } else if (
            action.storageMode === "question" &&
            stored.getObject("answer", action.objectId)
        ) {
            return {
                keep: true,
                extraActions: [
                    {
                        layerId: this.id,
                        batchId: action.batchId,
                        objectId: action.objectId,
                        object: null,
                        storageMode: "answer",
                        prevObjectId: PUT_AT_END,
                    },
                ],
            };
        } else {
            return { keep: true };
        }
    };

    _isNumberLayerAction(action: HistoryAction): action is HistoryAction<NumberProps> {
        return action.layerId === this.id;
    }

    filterNumbersOutOfRange: StorageFilter = (_, action) => {
        if (action.object === null || !this._isNumberLayerAction(action)) return { keep: true };

        const min = this.settings.negatives ? -this.settings.max : 0;
        const max = this.settings.max;
        const num = parseInt(action.object.state);
        return { keep: min <= num && num <= max };
    };

    getSVG: INumberLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getObjects<NumberProps>(this.id);
        const group = stored.keys(settings.editMode);

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", [...group]);
        const toSVG = cells.toSVGPoints();
        const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });

        const className = [styles.textHorizontalCenter, styles.textVerticalCenter].join(" ");
        const elements: SVGGroup["elements"] = new Map();
        for (const [id, object] of stored.entries(settings.editMode)) {
            const point = toSVG.get(cellMap.get(id));
            if (!point) continue; // TODO?

            elements.set(id, {
                className,
                children: object.state,
                x: point[0],
                y: point[1],
                fontSize: maxRadius * 1.6,
            });
        }

        return [{ id: "number", type: "text", elements }];
    };

    getOverlaySVG: INumberLayer["getOverlaySVG"];
}
