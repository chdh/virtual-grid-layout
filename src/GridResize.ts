// Row/column resize logic for grids.

import {LayoutController} from "./GridLayout";

interface Point {x: number; y: number; }

interface Boundary {                                                 // represents a row or column boundary that can be dragged
   ndx:                                number;                       // absolute row or column boundary index
   orientation:                        boolean; }                    // false=horizontal, true=vertical

export interface ControllerParms {
   layoutController:                   LayoutController;             // the layout controller of the grid
   rowSizingEnabled:                   boolean;                      // true to enable row sizing
   colSizingEnabled:                   boolean;                      // true to enable column sizing
   rowSizingTopWidth:                  number;                       // horizontal resize handle width above row boundary
   rowSizingBottomWidth:               number;                       // horizontal resize handle width below row boundary
   colSizingLeftWidth:                 number;                       // vertical resize handle width left of column boundary
   colSizingRightWidth:                number;                       // vertical resize handle width right of column boundary
   rowSizingMaxCols?:                  number;                       // maximum active columns for row sizing
   colSizingMaxRows?:                  number; }                     // maximum active rows for column sizing

export class ResizeController extends EventTarget {

   private controllerParms:            ControllerParms;
   private layoutController:           LayoutController;
   private viewportElement:            HTMLElement;
   private isDisposed:                 boolean = false;

   private dragging:                   boolean = false;              // true while dragging
   private dragPointerId?:             number;                       // ID of captured pointer, `undefined` = no capture
   private dragNdx:                    number;                       // row or column index
   private dragOrientation:            boolean;                      // false=horizontal, true=vertical
   private dragStartSize:              number;                       // row height or column width at start
   private dragStartPos:               number;

   private resizeHandleElement?:       HTMLElement;
   private resizeHandleBoundary?:      Boundary;                     // undefined = resize handle element is not visible
   private resizeHandlePositionValid:  boolean = false;

   constructor (cp: ControllerParms) {
      super();
      this.controllerParms = cp;
      this.layoutController = cp.layoutController;
      this.viewportElement = cp.layoutController.viewportElement;
      this.viewportElement.addEventListener("pointermove", this.viewport_pointerMoveEventListener);
      this.viewportElement.addEventListener("pointerup", this.viewport_pointerUpEventListener);
      this.layoutController.addEventListener("render", this.layoutController_renderEventListener); }

   public dispose() {
      if (this.isDisposed) {
         return; }
      this.isDisposed = true;
      this.viewportElement.removeEventListener("pointermove", this.viewport_pointerMoveEventListener);
      this.viewportElement.removeEventListener("pointerup", this.viewport_pointerUpEventListener);
      this.layoutController.removeEventListener("render", this.layoutController_renderEventListener);
      if (this.resizeHandleElement) {
         this.resizeHandleElement.removeEventListener("pointerdown", this.resizeHandle_pointerDownEventListener);
         this.resizeHandleElement.removeEventListener("pointermove", this.resizeHandle_pointerMoveEventListener);
         if (this.dragPointerId != undefined) {
            this.resizeHandleElement.releasePointerCapture(this.dragPointerId); }
         this.viewportElement.removeChild(this.resizeHandleElement);
         this.resizeHandleElement = undefined; }}

   private layoutController_renderEventListener = () => {
      if (this.dragging && this.resizeHandleBoundary) {
         this.resizeHandlePositionValid = false;
         this.adjustResizeHandleElement(this.resizeHandleBoundary); }};

   private viewport_pointerMoveEventListener = (event: PointerEvent) => {
      if (this.isDisposed || !this.layoutController.renderedState) {
         return; }
      if (!event.isPrimary || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.buttons) {
         return; }
      if (this.dragging) {
         return; }
      const point = this.getRelativeCoordinates(event);
      const boundary = this.findBoundary2D(point);
      this.adjustResizeHandleElement(boundary);
      if (boundary) {
         event.preventDefault(); }};

   private resizeHandle_pointerMoveEventListener = (event: PointerEvent) => {
      if (this.isDisposed || !this.layoutController.renderedState) {
         return; }
      if (!event.isPrimary || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
         return; }
      if (!this.dragging) {
         return; }
      this.performDragging(event);
      event.preventDefault(); };

   private resizeHandle_pointerDownEventListener = (event: PointerEvent) => {
      if (this.isDisposed || !this.layoutController.renderedState) {
         return; }
      if (!event.isPrimary || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button != 0) {
         return; }
      if (!this.resizeHandleBoundary || !this.resizeHandleElement || this.dragging) {
         return; }
      this.startDragging(event);
      event.preventDefault(); };

   private viewport_pointerUpEventListener = (event: PointerEvent) => {
      if (this.isDisposed) {
         return; }
      if (this.dragging) {
         this.stopDragging();
         event.preventDefault(); }};

   private startDragging (event: PointerEvent) {
      const rs = this.layoutController.renderedState!;
      this.dragPointerId = event.pointerId;
      this.resizeHandleElement!.setPointerCapture(this.dragPointerId);
      this.dragNdx = this.resizeHandleBoundary!.ndx - 1;
      this.dragOrientation = this.resizeHandleBoundary!.orientation;
      const vPos = rs.viewportPosition;
      const relNdx = this.dragNdx - (this.dragOrientation ? vPos.rowNdx : vPos.colNdx);
      const visibleElements = this.dragOrientation ? rs.visibleRows : rs.visibleCols;
      if (relNdx < 0 || relNdx >= visibleElements) {
         console.log("`relNdx` out of range when starting to drag. This should not happen.");
         return; }
      this.dragStartSize = this.dragOrientation ? rs.visibleRowHeights[relNdx] : rs.visibleColWidths[relNdx];
      this.dragStartPos = this.dragOrientation ? event.screenY : event.screenX;
      this.dragging = true; }

   private stopDragging() {
      this.resizeHandleElement!.releasePointerCapture(this.dragPointerId!);
      this.dragPointerId = undefined;
      this.dragging = false; }

   private performDragging (event: PointerEvent) {
      const pos = this.dragOrientation ? event.screenY : event.screenX;
      const delta = pos - this.dragStartPos;
      const size = Math.max(0, this.dragStartSize + delta);
      const resizeEventDetail = {orientation: this.dragOrientation, ndx: this.dragNdx, size};
      this.dispatchEvent(new CustomEvent("element-resize", {detail: resizeEventDetail})); }

   private getRelativeCoordinates (event: PointerEvent) : Point {
      const element = this.viewportElement;
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - element.clientLeft;
      const y = event.clientY - rect.top  - element.clientTop;
      return {x, y}; }

   // Find row/column boundary associated with a coordinate point.
   private findBoundary2D (point: Point) : Boundary | undefined {
      const cp = this.controllerParms;
      const rs = this.layoutController.renderedState!;
      if (cp.colSizingEnabled) {
         const ndx = this.findBoundary1D(point.x, rs.colXPositions, rs.viewportPosition.colNdx, cp.colSizingLeftWidth, cp.colSizingRightWidth);
         if (ndx != undefined && this.isVerticalPositionActiveForHorizontalSizing(point.y)) {
            return {ndx, orientation: false}; }}
      if (cp.rowSizingEnabled) {
         const ndx = this.findBoundary1D(point.y, rs.rowYPositions, rs.viewportPosition.rowNdx, cp.rowSizingTopWidth, cp.rowSizingBottomWidth);
         if (ndx != undefined && this.isHorizontalPositionActiveForVerticalSizing(point.x)) {
            return {ndx, orientation: true}; }}
      return undefined; }

   private findBoundary1D (position: number, positions: Int16Array, startNdx: number, width1: number, width2: number) : (number | undefined) {
      const relNdx = scanPos(positions, position);
      if (relNdx == undefined) {
         return; }
      const absNdx = startNdx + relNdx;
      const offset2 = position - positions[relNdx];                  // offset right or below of boundary
      if (offset2 < width2 && relNdx > 0 && absNdx > 0) {
         return absNdx; }
      if (relNdx < positions.length - 1) {
         const offset1 = positions[relNdx + 1] - position;           // offset left or above boundary
         if (offset1 < width1) {
            return absNdx + 1; }}
      return undefined; }

   private isVerticalPositionActiveForHorizontalSizing (y: number) : boolean {
      const cp = this.controllerParms;
      const rs = this.layoutController.renderedState!;
      const maxRowNdx = (cp.colSizingMaxRows != undefined) ? Math.min(cp.colSizingMaxRows, rs.visibleRows) : rs.visibleRows;
      const maxY = rs.rowYPositions[maxRowNdx];
      return y < maxY && !this.inMacroCell(y); }

   private isHorizontalPositionActiveForVerticalSizing (x: number) : boolean {
      const cp = this.controllerParms;
      const rs = this.layoutController.renderedState!;
      const maxColNdx = (cp.rowSizingMaxCols != undefined) ? Math.min(cp.rowSizingMaxCols, rs.visibleCols) : rs.visibleCols;
      const maxX = rs.colXPositions[maxColNdx];
      return x < maxX; }

   // Returns true if the specified y coordinate lies within a macro cell.
   private inMacroCell (y: number) : boolean {
      const rs = this.layoutController.renderedState!;
      if (!rs.visibleMacroCellHeights) {
         return false; }
      const relRowNdx = scanPos(rs.rowYPositions, y);
      if (relRowNdx == undefined || relRowNdx >= rs.visibleRows) {
         return false; }
      const offset = y - rs.rowYPositions[relRowNdx];
      const macroCellOffset = rs.visibleRowHeights[relRowNdx] - rs.visibleMacroCellHeights[relRowNdx];
      return offset >= macroCellOffset; }

   // When `boundary` is `undefined`, the resize handle element is hidden.
   private adjustResizeHandleElement (boundary: Boundary | undefined) {
      const cp = this.controllerParms;
      const rs = this.layoutController.renderedState!;
      if (!boundary) {                                               // hide the resize handle element
         if (!this.resizeHandleBoundary) {
            return; }
         if (this.resizeHandleElement) {
            this.resizeHandleElement.style.display = "none"; }
         this.resizeHandleBoundary = undefined;
         return; }
      if (this.resizeHandlePositionValid && this.resizeHandleBoundary && this.resizeHandleBoundary.ndx == boundary.ndx && this.resizeHandleBoundary.orientation == boundary.orientation) {
         return; }
      if (!this.resizeHandleElement) {
         this.resizeHandleElement = document.createElement("div");
         this.resizeHandleElement.className = "virtual-grid-layout-gridResizeHandle";    // (only for debugging)
         this.resizeHandleElement.style.position = "absolute";
         this.resizeHandleElement.style.zIndex = "99";
         this.resizeHandleElement.addEventListener("pointerdown", this.resizeHandle_pointerDownEventListener);
         this.resizeHandleElement.addEventListener("pointermove", this.resizeHandle_pointerMoveEventListener);
         this.viewportElement.appendChild(this.resizeHandleElement); }
      const style = this.resizeHandleElement.style;
      style.display = "";
      if (boundary.orientation) {
         const y = rs.rowYPositions[boundary.ndx - rs.viewportPosition.rowNdx];
         style.top = (y - cp.rowSizingTopWidth) + "px";
         style.height = (cp.rowSizingTopWidth + cp.rowSizingBottomWidth) + "px";
         style.left = "0";
         style.width = rs.viewportWidth + "px";
         style.cursor = "row-resize"; }
       else {
         const x = rs.colXPositions[boundary.ndx - rs.viewportPosition.colNdx];
         style.left = (x - cp.colSizingLeftWidth) + "px";
         style.width = (cp.colSizingLeftWidth + cp.colSizingRightWidth) + "px";
         style.top = "0";
         style.height = rs.viewportHeight + "px";
         style.cursor = "col-resize"; }
      this.resizeHandleBoundary = boundary;
      this.resizeHandlePositionValid = true; }

   }

function scanPos (positions: Int16Array, pos: number) : number | undefined {
   const n = positions.length;
   for (let i = 0; i < n; i++) {
      if (pos >= positions[i] && (i + 1 >= n || pos < positions[i + 1])) {
         return i; }}
   return undefined; }
