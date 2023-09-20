### Coordinates

There are multiple coordinate systems in use throughout the codebase.

-   DOM coordinates
-   SVG coordinates
-   grid coordinates

DOM coordinates are just the `clientX`/`clientY` provided by a pointer event. In other words, the origin is in the top left of the browser page with positive x and positive y going right and down, respectively.

SVG coordinates are part of the SVG Canvas(s). The origin starts out as (but doesn't necessary stay) the topleft of the grid. Each cell is approximately 60 [DOM pixels](https://developer.mozilla.org/en-US/docs/Glossary/CSS_pixel) across from edge center to edge center (mostly relevant when talking about non-square grids). It's from edge center to edge center so that text in square vs non-square grids are about the same size. 60 was chosen since it's highly composite.

Grid coordinates are basically SVG coordinates divided by 30 so that cells are 2 units long. This allows you to use integers when referencing the center of a cell, which is fairly common.

### Grid types

As a reference for my future self: https://www.redblobgames.com/grids/hexagons/
