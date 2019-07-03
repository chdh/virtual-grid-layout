// Layout control logic for a virtual grid.

// Grids can contain regular cells and macro cells.
// Macro cells are positioned below the regular cells of a row and can be used e.g. for sub-grids.
export const enum CellType {regular, macro}

// Position and dimension of a cell element, in pixels.
export interface Rect {
   x:                        number;
   y:                        number;
   width:                    number;
   height:                   number; }

// A viewport position of the grid.
export interface ViewportPosition {
   rowNdx:                   number;                       // index of first visible row, 0-based integer
   colNdx:                   number;                       // index of first visible column, 0-based integer
   rowPixelOffset:           number;                       // vertical pixel offset within first visible row, integer in range 0 .. rowHeight-1
   colPixelOffset:           number; }                     // horizontal pixel offset within first visible column, integer in range 0 .. colWidth-1

// Function to measure row heights or column widths.
//
// @param startNdx
//    Row or column index to start the measurement.
// @param orientation
//    false=horizontal (measure column widths), true=vertical (measure row heights)
// @distance
//    The distance to cover, in pixels.
//    If `distance` extends beyond the edge of the grid, only array entries up to the edge are returned.
// @returns
//    An array with row heights or column widths in pixels.
//    For vertical measurement, two arrays can be returned.
//    The first array contains the overall row heights.
//    The optional second array contains the hights of macro cells, or 0 where there are no macro cell.
export type MeasureFunction = (startNdx: number, orientation: boolean, distance: number) => Int16Array | Int16Array[];

// Function to creates and/or prepare a cell element.
//
// @param cellType
//    The type of the cell.
// @param rowNdx
//    The row index of the cell.
// @param colNdx
//    The column index of the cell.
//    This parameter is ignored if `cellType` is `macro`.
// @param rect
//    The pixel position and dimension for the cell.
// @param oldCell
//    An old cell element with the same `rowNdx`/`colNdx`, that can be reused.
// @returns
//    A prepared cell element that can be added to the grid.
//    If an `oldElement` is passed and the returned element is not the same, the `oldElement` is released.
export type PrepareCellFunction = (cellType: CellType, rowNdx: number, colNdx: number, rect: Rect, oldCell: HTMLElement | undefined) => HTMLElement;

export interface RenderParms {
   measure:                  MeasureFunction;              // measures row/column distances
   prepareCell:              PrepareCellFunction;          // creates and/or prepares grid cells
   releaseCell?:             (cell: HTMLElement) => void;  // called with cells that are no longer in use
   viewportPosition:         ViewportPosition; }           // grid viewport position

interface RenderState extends RenderParms {
   viewportHeight:           number;                       // height of the viewport in pixels
   viewportWidth:            number;                       // width of the viewport in pixels
   viewportRows:             number;                       // number of rows visible in the viewport
   viewportCols:             number;                       // number of columns visible in the viewport
   rowHeights:               Int16Array;                   // heights of the visible rows [0..viewportRows-1]
   colWidths:                Int16Array;                   // widths of the visible columns [0..viewportCols-1]
   macroCellHeights?:        Int16Array;                   // heights of the macro cells within the visible rows [0..viewportRows-1]
   rowYPositions:            Int16Array;                   // row y positions relative to viewport [0..viewportRows]
   colXPositions:            Int16Array;                   // column x positions relative to viewport [0..viewportCols]
   oldRegularCells?:         CellRectMap;                  // old regular cells that can be re-used
   oldMacroCells?:           CellRectMap; }                // old macro cells that can be re-used

export class Controller {

   private rootElement:      HTMLElement;                  // root HTML element of the grid
   private regularCells?:    CellRectMap;                  // regular cells currently in use
   private macroCells?:      CellRectMap;                  // macro cells currently in use

   // @param rootElement
   //    A DOM element, normally a DIV element, in which the grid is to be rendered.
   constructor (rootElement: HTMLElement) {
      this.rootElement = rootElement; }

   // Renders the currently visible grid cells.
   public render (renderParms: RenderParms) {
      const rs = <RenderState>{...renderParms};
      this.initRender(rs);
      this.renderCells(rs);
      this.finishRender(rs); }

   private initRender (rs: RenderState) {
      // get grid viewport size
      rs.viewportHeight = this.rootElement.clientHeight;
      rs.viewportWidth = this.rootElement.clientWidth;
      // measure visible rows+columns
      const pos = rs.viewportPosition;
      if (pos.rowNdx < 0 || pos.colNdx < 0 || !Number.isInteger(pos.rowNdx) || !Number.isInteger(pos.colNdx) || pos.rowPixelOffset < 0 || pos.colPixelOffset < 0) {
         throw new Error("Invalid viewport position."); }
      const rowHeights2 = rs.measure(pos.rowNdx, true,  pos.rowPixelOffset + rs.viewportHeight);
      if (rowHeights2 instanceof Int16Array) {
         rs.rowHeights = rowHeights2;
         rs.macroCellHeights = undefined; }
       else {
         rs.rowHeights = rowHeights2[0];
         rs.macroCellHeights = rowHeights2[1];
         if (rs.macroCellHeights && rs.macroCellHeights.length != rs.rowHeights.length) {
            throw new Error("Lenghts of height arrays are not equal."); }}
      rs.colWidths = <Int16Array>rs.measure(pos.colNdx, false, pos.colPixelOffset + rs.viewportWidth);
      rs.viewportRows = rs.rowHeights.length;
      rs.viewportCols = rs.colWidths.length;
      if (rs.viewportRows > 0 && pos.rowPixelOffset > 0 && pos.rowPixelOffset >= rs.rowHeights[0]) {
          throw new Error("Row pixel offset exceeds height of first visible row."); }
      if (rs.viewportCols > 0 && pos.colPixelOffset > 0 && pos.colPixelOffset >= rs.colWidths[0]) {
          throw new Error("Column pixel offset exceeds width of first visible column."); }
      rs.rowYPositions = this.integrateCellSizes(-pos.rowPixelOffset, rs.rowHeights);
      rs.colXPositions = this.integrateCellSizes(-pos.colPixelOffset, rs.colWidths);
      // prepare cell containers
      rs.oldRegularCells = this.regularCells;
      rs.oldMacroCells = this.macroCells;
      this.regularCells = new CellRectMap(pos.rowNdx, pos.colNdx, rs.viewportRows, rs.viewportCols);
      this.macroCells = new CellRectMap(pos.rowNdx, 0, rs.viewportRows, 1);
      this.rootElement.innerHTML = ""; }

   private finishRender (rs: RenderState) {
      // Release cells that have not been re-used.
      this.releaseCells(rs, rs.oldRegularCells);
      this.releaseCells(rs, rs.oldMacroCells); }

   private releaseCells (rs: RenderState, cells: CellRectMap | undefined) {
      if (!rs.releaseCell || !cells) {
         return; }
      const a = cells.getAll();
      for (const cell of a) {
         if (cell) {
            rs.releaseCell(cell); }}}

   private renderCells (rs: RenderState) {
      const fragment = new DocumentFragment();
      for (let relRowNdx = 0; relRowNdx < rs.viewportRows; relRowNdx++) {
         const rowNdx = rs.viewportPosition.rowNdx + relRowNdx;
         for (let relColNdx = 0; relColNdx < rs.viewportCols; relColNdx++) {
            const colNdx = rs.viewportPosition.colNdx + relColNdx;
            const regularCell = this.renderCell(rs, CellType.regular, rowNdx, colNdx, relRowNdx, relColNdx);
            if (regularCell) {
               fragment.appendChild(regularCell);
               this.regularCells!.set(rowNdx, colNdx, regularCell); }}
         const macroCell = this.renderCell(rs, CellType.macro, rowNdx, 0, relRowNdx, 0);
         if (macroCell) {
            fragment.appendChild(macroCell);
            this.macroCells!.set(rowNdx, 0, macroCell); }}
      this.rootElement.appendChild(fragment); }

   private renderCell (rs: RenderState, cellType: CellType, rowNdx: number, colNdx: number, relRowNdx: number, relColNdx: number) : HTMLElement | undefined {
      const rowHeight = rs.rowHeights[relRowNdx];
      const macroCellHeight = rs.macroCellHeights ? rs.macroCellHeights[relRowNdx] : 0;
      const cellRect = <Rect>{};
      let oldCells: CellRectMap | undefined;
      switch (cellType) {
         case CellType.regular: {
            cellRect.height = rowHeight - macroCellHeight;
            cellRect.width = rs.colWidths[relColNdx];
            cellRect.y = rs.rowYPositions[relRowNdx];
            cellRect.x = rs.colXPositions[relColNdx];
            oldCells = rs.oldRegularCells;
            break; }
         case CellType.macro: {
            cellRect.height = macroCellHeight;
            cellRect.width = rs.viewportWidth;
            cellRect.y = rs.rowYPositions[relRowNdx] + rowHeight - macroCellHeight;
            cellRect.x = 0;
            oldCells = rs.oldMacroCells;
            break; }}
      if (cellRect.height <= 0 || cellRect.width <= 0) {
         return; }
      const oldCell = oldCells ? oldCells.get(rowNdx, colNdx) : undefined;
      const cell = rs.prepareCell(cellType, rowNdx, colNdx, cellRect, oldCell);
      if (oldCell && cell != oldCell) {
         oldCells!.set(rowNdx, colNdx, undefined); }
      return cell; }

   private integrateCellSizes (startPos: number, sizes: Int16Array) : Int16Array {
      const n = sizes.length;
      const a = new Int16Array(n + 1);
      let p = startPos;
      for (let i = 0; i < n; i++) {
         a[i] = p;
         p += Math.max(0, sizes[i]); }
      a[n] = p;
      return a; }}

// A map for a rectangular area of cells.
class CellRectMap {
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
   private getMapIndex (rowNdx: number, colNdx: number) : number | undefined {
      const rowRel = rowNdx - this.rowOffset;
      const colRel = colNdx - this.colOffset;
      if (rowRel < 0 || rowRel >= this.rowCount || colRel < 0 || colRel >= this.colCount || !Number.isInteger(rowRel) || !Number.isInteger(colRel)) {
         return; }
      return rowRel * this.colCount + colRel; }
   public set (rowNdx: number, colNdx: number, cell: HTMLElement | undefined) {
      const i = this.getMapIndex(rowNdx, colNdx);
      if (i == undefined) {
         throw new Error("Invalid cell position."); }
      this.a[i] = cell; }
   public get (rowNdx: number, colNdx: number) : HTMLElement | undefined {
      const i = this.getMapIndex(rowNdx, colNdx);
      if (i == undefined) {
         return; }
      return this.a[i]; }
   public getAll() {
      return this.a; }}
