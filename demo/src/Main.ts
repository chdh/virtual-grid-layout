// Demo application for the virtual grid layout module.

import * as GridLayout from "virtual-grid-layout/GridLayout";
import {ViewportPosition, CellType} from "virtual-grid-layout/GridLayout";
import * as GridScroll from "virtual-grid-layout/GridScroll";
import {ScrollUnit} from "virtual-grid-layout/GridScroll";
import * as PlainScrollbar from "plain-scrollbar";
import {PlainScrollbar as Scrollbar} from "plain-scrollbar";

const rowCount               = 10000;
const colCount               = 1000;
const topLeftPosition:       ViewportPosition = {rowNdx: 0, colNdx: 0, rowPixelOffset: 0, colPixelOffset: 0};

var controller:              GridLayout.Controller;
var gridRootElement:         HTMLElement;
var vScrollbar:              Scrollbar;
var hScrollbar:              Scrollbar;
var viewportPosition:        ViewportPosition;
var rowHeights:              Int16Array;
var colWidths:               Int16Array;
var macroCellHeights:        Int16Array;

function getCellColor (rowNdx: number, colNdx: number) : string {
   const colorMin = 235 - (rowNdx % 5) * 5;
   const colorMax = 245;
   const colorTone = colNdx % 8;
   return "rgb(" + (colorTone & 1 ? colorMax : colorMin) + "," + (colorTone & 2 ? colorMax : colorMin) + "," + (colorTone & 4 ? colorMax : colorMin) + ")"; } // tslint:disable-line:no-bitwise

function scanDistance (a: Int16Array, startNdx: number, distance: number) : {ndx: number; distance: number} {
   let i = startNdx;
   let d = 0;
   while (d < distance && i < a.length) {
      d += a[i++]; }
   return {ndx: i, distance: d}; }

function scanDistanceReverse (a: Int16Array, startNdx: number, distance: number) : {ndx: number; distance: number} {
   let i = startNdx;
   let d = 0;
   while (d < distance && i > 0) {
      d += a[--i]; }
   return {ndx: i, distance: d}; }

function measure (startNdx: number, distance: number, orientation: boolean) : GridLayout.MeasureResult {
   const a = orientation ? rowHeights : colWidths;
   let topNdx: number;
   let bottomNdx: number;
   let distance2: number;
   if (distance >= 0) {
      const r = scanDistance(a, startNdx, distance);
      topNdx = startNdx;
      bottomNdx = r.ndx;
      distance2 = r.distance; }
    else {
      const r = scanDistanceReverse(a, startNdx, -distance);
      topNdx = r.ndx;
      bottomNdx = startNdx;
      distance2 = r.distance; }
   return {
      sizes:      a.subarray(topNdx, bottomNdx),
      macroSizes: orientation ? macroCellHeights.subarray(topNdx, bottomNdx) : undefined,
      distance:   distance2 }; }

function positionCell (cell: HTMLElement, rect: GridLayout.Rect) {
   const style = cell.style;
   style.left   = rect.x      + "px";
   style.top    = rect.y      + "px";
   style.width  = rect.width  + "px";
   style.height = rect.height + "px"; }

function prepareCell (cellType: CellType, rowNdx: number, colNdx: number, rect: GridLayout.Rect, oldCell: HTMLElement | undefined) : HTMLElement {
   if (oldCell) {
      positionCell(oldCell, rect);
      return oldCell; }
   const cell = document.createElement("div");
   positionCell(cell, rect);
   switch (cellType) {
      case CellType.regular: {
         cell.className = "gridCell";
         cell.textContent = rowNdx + " / " + colNdx;
         cell.style.backgroundColor = getCellColor(rowNdx, colNdx);
         break; }
      case CellType.macro: {
         cell.className = "macroCell";
         cell.textContent = "Macro cell " + rowNdx;
         break; }}
   return cell; }

function renderGrid() {
   const renderParms : GridLayout.RenderParms = {
      measure,
      prepareCell,
      viewportPosition};
   controller.render(renderParms); }

function scroll (scrollbar: Scrollbar, scrollUnit: ScrollUnit, scrollValue: number) {
   const orientation = scrollbar.orientationBoolean;
   const ip = {
      scrollUnit,
      scrollValue,
      topNdx:       orientation ? viewportPosition.rowNdx : viewportPosition.colNdx,
      elementCount: orientation ? rowCount : colCount,
      viewportSize: orientation ? gridRootElement.clientHeight : gridRootElement.clientWidth,
      measure: (startNdx: number, distance: number) => measure(startNdx, distance, orientation) };
   const r = GridScroll.process(ip);
   if (orientation) {
      viewportPosition.rowNdx = r.topNdx; }
    else {
      viewportPosition.colNdx = r.topNdx; }
   scrollbar.value = r.scrollbarPosition;
   scrollbar.thumbSize = r.scrollbarThumbSize; }

function scrollbarInputEventHandler (this: Scrollbar, event: CustomEvent) {
   const scrollbar = this;
   // console.log("Scrollbar event " + event.detail + " " + scrollbar.value + " " + scrollbar.orientationBoolean);
   switch (event.detail) {
      case "value": {
         scroll(scrollbar, ScrollUnit.propPosition, scrollbar.value);
         break; }
      case "decrementSmall": {
         scroll(scrollbar, ScrollUnit.smallIncr, -1);
         break; }
      case "incrementSmall": {
         scroll(scrollbar, ScrollUnit.smallIncr, 1);
         break; }
      case "decrementLarge": {
         scroll(scrollbar, ScrollUnit.largeIncr, -1);
         break; }
      case "incrementLarge": {
         scroll(scrollbar, ScrollUnit.largeIncr, 1);
         break; }}
   renderGrid(); }

function mouseWheelEventHandler (event: WheelEvent) {
   scroll(vScrollbar, ScrollUnit.mediumIncr, Math.sign(event.deltaY));
   renderGrid(); }

function init() {
   rowHeights = new Int16Array(rowCount);
   macroCellHeights = new Int16Array(rowCount);
   for (let rowNdx = 0; rowNdx < rowCount; rowNdx++) {
      macroCellHeights[rowNdx] = Math.random() < 0.25 ? Math.round(30 + 100 * Math.random()) : 0;
      rowHeights[rowNdx] = macroCellHeights[rowNdx] + Math.round(25 + 100 * Math.random()); }
   colWidths = new Int16Array(colCount);
   for (let colNdx = 0; colNdx < colCount; colNdx++) {
      colWidths[colNdx] = Math.round(40 + 200 * Math.random()); }
   //
   gridRootElement = document.getElementById("gridRoot")!;
   controller = new GridLayout.Controller(gridRootElement);
   PlainScrollbar.registerCustomElement();
   vScrollbar = <any>document.getElementById("verticalGridScrollbar");
   vScrollbar.addEventListener("scrollbar-input", <any>scrollbarInputEventHandler);
   hScrollbar = <any>document.getElementById("horizontalGridScrollbar");
   hScrollbar.addEventListener("scrollbar-input", <any>scrollbarInputEventHandler);
   const containerElement = document.getElementById("gridContainer")!;
   containerElement.addEventListener("wheel", mouseWheelEventHandler);
   viewportPosition = topLeftPosition;
   scroll(vScrollbar, ScrollUnit.absPosition, 0);
   scroll(hScrollbar, ScrollUnit.absPosition, 0);
   renderGrid(); }

async function startup() {
   try {
      init(); }
    catch (e) {
      console.log(e);
      alert("Error: " + e); }}

document.addEventListener("DOMContentLoaded", startup);
