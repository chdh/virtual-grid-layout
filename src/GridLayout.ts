// Layout control logic for a virtual grid.

// Grids can contain regular cells and macro cells.
// Macro cells are positioned below the regular cells of a row and can be used e.g. for sub-grids.
export const enum CellType {regular, macro}

// A viewport position of the grid.
export interface ViewportPosition {
   rowNdx:                             number;                       // index of first visible row, 0-based integer
   colNdx:                             number;                       // index of first visible column, 0-based integer
   rowPixelOffset:                     number;                       // vertical pixel offset within first visible row, integer in range 0..rowHeight-1
   colPixelOffset:                     number; }                     // horizontal pixel offset within first visible column, integer in range 0..colWidth-1

export const topLeftViewportPosition: Readonly<ViewportPosition> = {rowNdx: 0, colNdx: 0, rowPixelOffset: 0, colPixelOffset: 0};

// Function to measure undetermined row heights or column widths.
//
// The `rowHeights` and `colWidths` arrays may contain entries with the value -1, which means that the value
// has not yet been determined. This function is used to measure these undetermined entries.
//
// @param startNdx
//    Row or column index to start.
// @param n
//    Number of entries to process.
// @param orientation
//    false = horizontal (measure column widths), true = vertical (measure row heights)
export type MeasureFunction = (startNdx: number, n: number, orientation: boolean) => void;

// Function to creates and/or prepare a cell element.
//
// @param cellType
//    The type of the cell.
// @param rowNdx
//    The row index of the cell.
// @param colNdx
//    The column index of the cell.
//    This parameter is ignored if `cellType` is `macro`.
// @param width
//    The width of the cell in pixels. Can be ignored.
// @param height
//    The height of the cell in pixels. Can be ignored.
// @param oldCell
//    An old cell element with the same `rowNdx`/`colNdx`, that can be reused.
// @returns
//    A prepared cell element that can be added to the grid.
//    If an `oldElement` is passed and the returned element is not the same, the `oldElement` is released.
export type PrepareCellFunction = (cellType: CellType, rowNdx: number, colNdx: number, width: number, height: number, oldCell: HTMLElement | undefined) => HTMLElement;

// This function is called when cells are no longer used.
export type ReleaseCellFunction = (cell: HTMLElement) => void;

export interface RenderParms {                                       // parameters for `render()`
   viewportPosition:                   ViewportPosition;             // grid viewport position
   rowHeights:                         Int16Array;                   // row heights of the grid, may contain -1 for undetermined heights
   colWidths:                          Int16Array;                   // column widths of the grid, may contain -1 for undetermined widths
   macroCellHeights?:                  Int16Array;                   // macro cell heights, 0 = no macro cell
   macroCellWidth:                     number;                       // width of the macro cells in pixels
   vCellOverlap:                       number;                       // vertical cell overlap in pixels
   measure?:                           MeasureFunction;              // function to measure undetermined row heights or column widths
   prepareCell:                        PrepareCellFunction;          // function to create and/or prepare grid cells
   releaseCell?:                       ReleaseCellFunction; }        // function to release cells that are no longer in use

export interface RenderedState {                                     // current rendered state
   viewportPosition:                   ViewportPosition;             // grid viewport position
   viewportHeight:                     number;                       // height of the viewport in pixels
   viewportWidth:                      number;                       // width of the viewport in pixels
   visibleRows:                        number;                       // number of rows visible in the viewport
   visibleCols:                        number;                       // number of columns visible in the viewport
   visibleRowHeights:                  Int16Array;                   // heights of the visible rows [0..visibleRows-1]
   visibleColWidths:                   Int16Array;                   // widths of the visible columns [0..visibleCols-1]
   visibleMacroCellHeights?:           Int16Array;                   // heights of the macro cells within the visible rows [0..visibleRows-1]
   rowYPositions:                      Int16Array;                   // row y positions relative to viewport [0..visibleRows]
   colXPositions:                      Int16Array;                   // column x positions relative to viewport [0..visibleCols]
   regularCells:                       CellRectMap;                  // regular cells currently in use
   macroCells:                         CellRectMap; }                // macro cells currently in use

export class LayoutController extends EventTarget {

   public  viewportElement:            HTMLElement;                  // viewport element of the grid
   public  renderedState?:             RenderedState;                // state of the currently rendered grid
   private cellContainerElement?:      HTMLElement;

   // @param viewportElement
   //    A DOM element, normally a DIV element, in which the grid is to be rendered.
   constructor (viewportElement: HTMLElement) {
      super();
      this.viewportElement = viewportElement; }

   // Renders the currently visible grid cells.
   public render (rp: RenderParms) {
      const oldRs = this.renderedState;
      const rs = <RenderedState>{};
      this.initRender(rp, rs);
      this.renderCells(rp, rs, oldRs);
      this.releaseOldRenderStateCells(oldRs, rp.releaseCell);
      this.dispatchEvent(new Event("render")); }

   // Removes all cells from the viewport element.
   public clear (releaseCell: ReleaseCellFunction | undefined) {
      const oldRs = this.renderedState;
      if (this.cellContainerElement) {
         this.cellContainerElement.innerHTML = ""; }
      this.renderedState = undefined;
      this.releaseOldRenderStateCells(oldRs, releaseCell);
      this.dispatchEvent(new Event("clear")); }

   private initRender (rp: RenderParms, rs: RenderedState) {
      rs.viewportPosition = {...rp.viewportPosition};
      // Get viewport size.
      rs.viewportHeight = this.viewportElement.clientHeight;
      rs.viewportWidth = this.viewportElement.clientWidth;
      // Determine visible rows+columns.
      const pos = rs.viewportPosition;
      if (pos.rowNdx < 0 || pos.colNdx < 0 || !Number.isInteger(pos.rowNdx) || !Number.isInteger(pos.colNdx) || pos.rowPixelOffset < 0 || pos.colPixelOffset < 0) {
         throw new Error("Invalid viewport position."); }
      const bottomRowNdx = scanDistance(rp.rowHeights, pos.rowNdx, pos.rowPixelOffset + rs.viewportHeight, rp.measure, true);
      rs.visibleRows = bottomRowNdx - pos.rowNdx;
      const rightColNdx = scanDistance(rp.colWidths, pos.colNdx, pos.colPixelOffset + rs.viewportWidth, rp.measure, false);
      rs.visibleCols = rightColNdx - pos.colNdx;
      rs.visibleRowHeights = rp.rowHeights.slice(pos.rowNdx, bottomRowNdx);                                                // (clone to preserve current values)
      rs.visibleMacroCellHeights = rp.macroCellHeights ? rp.macroCellHeights.slice(pos.rowNdx, bottomRowNdx) : undefined;  // (clone to preserve current values)
      rs.visibleColWidths = rp.colWidths.slice(pos.colNdx, rightColNdx);                                                   // (clone to preserve current values)
      if (rs.visibleRows > 0 && pos.rowPixelOffset > 0 && pos.rowPixelOffset >= rs.visibleRowHeights[0]) {
          console.log("Warning: Row pixel offset exceeds height of first visible row.");
          pos.rowPixelOffset = 0; }
      if (rs.visibleCols > 0 && pos.colPixelOffset > 0 && pos.colPixelOffset >= rs.visibleColWidths[0]) {
          console.log("Warning: Column pixel offset exceeds width of first visible column.");
          pos.colPixelOffset = 0; }
      rs.rowYPositions = integrateSizes(-pos.rowPixelOffset, rs.visibleRowHeights);
      rs.colXPositions = integrateSizes(-pos.colPixelOffset, rs.visibleColWidths);
      // Prepare cell containers.
      rs.regularCells = new CellRectMap(pos.rowNdx, pos.colNdx, rs.visibleRows, rs.visibleCols);
      rs.macroCells = new CellRectMap(pos.rowNdx, 0, rs.visibleRows, 1);
      if (this.cellContainerElement) {
         this.cellContainerElement.innerHTML = ""; }
       else {
         this.cellContainerElement = document.createElement("div");
         const style = this.cellContainerElement.style;
         style.position = "relative";
         style.height = "100%";
         style.overflow = "hidden";
         (<any>style).contain = "content";                           // ? (for faster layout)
         this.viewportElement.appendChild(this.cellContainerElement); }
      this.renderedState = rs; }

   // Release cells that have not been re-used.
   private releaseOldRenderStateCells (oldRs: RenderedState | undefined, releaseCell: ReleaseCellFunction | undefined) {
      if (oldRs) {
         this.releaseCells(oldRs.regularCells, releaseCell);
         this.releaseCells(oldRs.macroCells, releaseCell); }}

   private releaseCells (cells: CellRectMap, releaseCell: ReleaseCellFunction | undefined) {
      if (!releaseCell) {
         return; }
      const a = cells.getAll();
      for (const cell of a) {
         if (cell) {
            releaseCell(cell); }}}

   private renderCells (rp: RenderParms, rs: RenderedState, oldRs?: RenderedState) {
      const fragment = new DocumentFragment();
      for (let relRowNdx = 0; relRowNdx < rs.visibleRows; relRowNdx++) {
         const rowNdx = rp.viewportPosition.rowNdx + relRowNdx;
         for (let relColNdx = 0; relColNdx < rs.visibleCols; relColNdx++) {
            const colNdx = rs.viewportPosition.colNdx + relColNdx;
            const regularCell = this.renderCell(rp, rs, oldRs, CellType.regular, rowNdx, colNdx, relRowNdx, relColNdx);
            if (regularCell) {
               fragment.appendChild(regularCell);
               rs.regularCells.set(rowNdx, colNdx, regularCell); }}
         const macroCell = this.renderCell(rp, rs, oldRs, CellType.macro, rowNdx, 0, relRowNdx, 0);
         if (macroCell) {
            fragment.appendChild(macroCell);
            rs.macroCells.set(rowNdx, 0, macroCell); }}
      this.cellContainerElement!.appendChild(fragment); }

   private renderCell (rp: RenderParms, rs: RenderedState, oldRs: RenderedState | undefined, cellType: CellType, rowNdx: number, colNdx: number, relRowNdx: number, relColNdx: number) : HTMLElement | undefined {
      const rowHeight = rs.visibleRowHeights[relRowNdx];
      const macroCellHeight = rs.visibleMacroCellHeights ? Math.min(rs.visibleMacroCellHeights[relRowNdx], rowHeight) : 0;
      let x: number;
      let y0: number;
      let width: number;
      let height0: number;
      let oldCells: CellRectMap | undefined;
      switch (cellType) {
         case CellType.regular: {
            x = rs.colXPositions[relColNdx];
            y0 = rs.rowYPositions[relRowNdx];
            width = rs.visibleColWidths[relColNdx];
            height0 = rowHeight - macroCellHeight;
            oldCells = oldRs ? oldRs.regularCells : undefined;
            break; }
         case CellType.macro: {
            x = 0;
            y0 = rs.rowYPositions[relRowNdx] + rowHeight - macroCellHeight;
            width = rp.macroCellWidth;
            height0 = macroCellHeight;
            oldCells = oldRs ? oldRs.macroCells : undefined;
            break; }
         default: {
            throw new Error("Unexpected cell type."); }}
      if (width <= 0 || height0 <= 0) {
         return; }
      const y = y0 - rp.vCellOverlap;
      const height = height0 + rp.vCellOverlap;
      const oldCell = oldCells ? oldCells.get(rowNdx, colNdx) : undefined;
      const cell = rp.prepareCell(cellType, rowNdx, colNdx, width, height, oldCell);
      if (oldCell && cell != oldCell) {
         oldCells!.delete(rowNdx, colNdx); }                         // if old cell has been re-used, delete from map
      positionCell(cell, x, y, width, height);
      return cell; }}

function integrateSizes (startPos: number, sizes: Int16Array) : Int16Array {
   const n = sizes.length;
   const a = new Int16Array(n + 1);
   let p = startPos;
   for (let i = 0; i < n; i++) {
      a[i] = p;
      p += Math.max(0, sizes[i]); }
   a[n] = p;
   return a; }

function scanDistance (a: Int16Array, startNdx: number, distance: number, measure: MeasureFunction | undefined, orientation: boolean) : number {
   const n = a.length;
   let i = startNdx;
   let d = 0;
   while (d < distance && i < n) {
      let w = a[i];
      if (w == -1) {                                                 // undetermined height/width
         if (!measure) {
            throw new Error("Undetermined `rowHeights`/`colWidths` value encountered but `measure` function is undefined."); }
         const len = Math.min(25, n - i);
         measure(i, len, orientation);
         w = a[i];
         if (a[i] == -1) {
            throw new Error("`rowHeights`/`colWidths` value stayed undetermined even after `measure` function was called."); }}
      d += Math.max(0, w);
      i++; }
   return i; }

// A map for a rectangular area of cells.
export class CellRectMap {
   private rowOffset:        number;
   private colOffset:        number;
   private rowCount:         number;
   private colCount:         number;
   private a:                (HTMLElement | undefined)[];
   constructor (rowOffset: number, colOffset: number, rowCount: number, colCount: number) {
      this.rowOffset = rowOffset;
      this.colOffset = colOffset;
      this.rowCount = rowCount;
      this.colCount = colCount;
      if (rowOffset < 0 || colOffset < 0 || rowCount < 0 || colCount < 0) {
         throw new Error("Invalid constructor parameters."); }
      this.a = new Array(rowCount * colCount); }
   private getArrayIndex (rowNdx: number, colNdx: number) : number | undefined {
      const rowRel = rowNdx - this.rowOffset;
      const colRel = colNdx - this.colOffset;
      if (rowRel < 0 || rowRel >= this.rowCount || colRel < 0 || colRel >= this.colCount || !Number.isInteger(rowRel) || !Number.isInteger(colRel)) {
         return; }
      return rowRel * this.colCount + colRel; }
   public set (rowNdx: number, colNdx: number, cell: HTMLElement | undefined) {
      const i = this.getArrayIndex(rowNdx, colNdx);
      if (i == undefined) {
         throw new Error("Invalid cell position."); }
      this.a[i] = cell; }
   public delete (rowNdx: number, colNdx: number) {
      this.set(rowNdx, colNdx, undefined); }
   public get (rowNdx: number, colNdx: number) : HTMLElement | undefined {
      const i = this.getArrayIndex(rowNdx, colNdx);
      if (i == undefined) {
         return; }
      return this.a[i]; }
   public getAll() {
      return this.a; }}

function positionCell (cell: HTMLElement, x: number, y: number, width: number, height: number) {
   const style = cell.style;
   style.position  = "absolute";
   style.boxSizing = "border-box";
   style.overflow  = "hidden";
   style.left      = x      + "px";
   style.top       = y      + "px";
   style.width     = width  + "px";
   style.height    = height + "px"; }
