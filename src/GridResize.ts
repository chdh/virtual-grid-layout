// Row/column resize logic for grids.

// import * as GridLayout from "./GridLayout";
import {LayoutController} from "./GridLayout";

interface Point {x: number; y: number; }

interface Boundary {
   ndx:                                number;                       // absolute row or column boundary index
   orientation:                        boolean; }                    // false=horizontal, true=vertical

export interface ControllerParms {
   layoutController:                   LayoutController;             // the layout controller of the grid
   rowSizingEnabled:                   boolean;                      // true to enable row sizing
   colSizingEnabled:                   boolean;                      // true to enable column sizing
   topWidth:                           number;                       // horizontal resize handle width above row boundary
   bottomWidth:                        number;                       // horizontal resize handle width below row boundary
   leftWidth:                          number;                       // vertical resize handle width left of column boundary
   rightWidth:                         number; }                     // vertical resize handle width right of column boundary

export class ResizeController extends EventTarget {

   private cp:                         ControllerParms;
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
      this.cp = cp;
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
         this.resizeHandleElement.removeEventListener("pointermove", this.resizeHandle_pointerMoveEventListener); }
      if (this.dragPointerId != undefined) {
         this.resizeHandleElement!.releasePointerCapture(this.dragPointerId); }}

   private layoutController_renderEventListener = () => {
      if (this.dragging && this.resizeHandleBoundary) {
         this.resizeHandlePositionValid = false;
         this.adjustResizeHandleElement(this.resizeHandleBoundary); }}

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
         event.preventDefault(); }}

   private resizeHandle_pointerMoveEventListener = (event: PointerEvent) => {
      if (this.isDisposed || !this.layoutController.renderedState) {
         return; }
      if (!event.isPrimary || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
         return; }
      if (!this.dragging) {
         return; }
      this.performDragging(event);
      event.preventDefault(); }

   private resizeHandle_pointerDownEventListener = (event: PointerEvent) => {
      if (this.isDisposed || !this.layoutController.renderedState) {
         return; }
      if (!event.isPrimary || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button != 0) {
         return; }
      if (!this.resizeHandleBoundary || !this.resizeHandleElement || this.dragging) {
         return; }
      this.startDragging(event);
      event.preventDefault(); }

   private viewport_pointerUpEventListener = (event: PointerEvent) => {
      if (this.isDisposed) {
         return; }
      if (this.dragging) {
         this.stopDragging();
         event.preventDefault(); }}

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
      const cp = this.cp;
      const rs = this.layoutController.renderedState!;
      if (cp.colSizingEnabled) {
         const ndx = this.findBoundary1D(point.x, rs.colXPositions, rs.viewportPosition.colNdx, cp.leftWidth, cp.rightWidth);
         if (ndx != undefined && !this.InMacroCell(point.y)) {
            return {ndx, orientation: false}; }}
      if (cp.rowSizingEnabled) {
         const ndx = this.findBoundary1D(point.y, rs.rowYPositions, rs.viewportPosition.rowNdx, cp.topWidth, cp.bottomWidth);
         if (ndx != undefined) {
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

   // Returns true if the specified y coordinate lies within a macro cell.
   private InMacroCell (y: number) : boolean {
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
      const cp = this.cp;
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
         this.resizeHandleElement.className = "virtual-grid-layout-gridResizeHandle";
         this.resizeHandleElement.style.position = "absolute";
         this.resizeHandleElement.style.zIndex = "99";
         this.resizeHandleElement.addEventListener("pointerdown", this.resizeHandle_pointerDownEventListener);
         this.resizeHandleElement.addEventListener("pointermove", this.resizeHandle_pointerMoveEventListener);
         this.viewportElement.appendChild(this.resizeHandleElement); }
      const style = this.resizeHandleElement.style;
      style.display = "";
      if (boundary.orientation) {
         const y = rs.rowYPositions[boundary.ndx - rs.viewportPosition.rowNdx];
         style.top = (y - cp.topWidth) + "px";
         style.height = (cp.topWidth + cp.bottomWidth) + "px";
         style.left = "0";
         style.width = rs.viewportWidth + "px";
         style.cursor = "row-resize"; }
       else {
         const x = rs.colXPositions[boundary.ndx - rs.viewportPosition.colNdx];
         style.left = (x - cp.leftWidth) + "px";
         style.width = (cp.leftWidth + cp.rightWidth) + "px";
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
