import React from "react";
import { useSelector } from "react-redux";

import { Line } from "./Line";
import { Polyline } from "./Polyline";

const blitters = {
    polyline: Polyline,
    line: Line,
};

export const SVGCanvas = () => {
    const borderPadding = useSelector((state) => state.settings.border);
    const blitGroups = useSelector((state) => state.blits.groups);

    return (
        <svg
            style={{ padding: borderPadding, margin: "auto" }}
            viewBox="0 0 900 900"
        >
            {blitGroups.map(({ blitter: blitterKey, blits, params }, index) => {
                const Blitter = blitters[blitterKey];
                // TODO: Change this from index
                // return React.createElement(blitter, {
                //     blits,
                //     params,
                //     key: index,
                // });
                return <Blitter blits={blits} params={params} key={index} />;
            })}
        </svg>
    );
};
