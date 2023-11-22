# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha-4] - Unreleased

### Changed

-   Colored objects that are indistinguishable from the background, like white squares drawn in cells or black lines drawn on edges, can no longer be drawn. No more straining your eyes looking for invisible objects to see why answer check is not working.
-   Layers/tools are now listed top to bottom in the same way they are drawn on the canvas to align with intuition.
-   ToggleCharacters is temporarily disabled and replaced with more-restricted CenterMarks and TopBottomMarks layers. It will be reintroduced later once the exact settings are settled and a way to type arbitrary text is supported on mobile.
-   Additionally, CenterMarks and TopBottomMarks can only add objects as if in solving mode, that is they cannot be used to set puzzles (for now). Same for KillerCages but with setting mode. They can both be added in either mode, however.
-   KillerCages can no longer overlap or be split into two cages. Support for overlapping killer cages or cages where some parts are diagonally connected might be considered in the future
-   All objects are forced to be within the grid, for now. Just don't try shrinking the grid with objects near the edge, or else :P
-   All interactions now use the same undo-history stack; they are not split into an undo-history for setting and one for solving. I have many thoughts on this, but it's too large to fit into the margin.

## [0.1.0-alpha-3] - 2023-10-21

### Added

-   Controls are now accessible outside of the sidebar on mobile (and desktop if you want)

### Changed

-   Modals, like the reside modal, close the sidebar automatically on mobile.

### Fixed

-   Loading certain resized grids (resized up or left) will no longer fail
-   Some style sheets were not initially included when updating some dependencies.
-   A lot more...
