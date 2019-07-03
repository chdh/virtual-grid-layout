// Demo application for the virtual grid layout module.

import * as GridLayout from "virtual-grid-layout/GridLayout";
import {ViewportPosition, CellType} from "virtual-grid-layout/GridLayout";
import * as PlainScrollbar from "plain-scrollbar";
import {PlainScrollbar as Scrollbar} from "plain-scrollbar";

const minScrollbarThumbSize  = 0.03;
const rowCount               = 10000;
const colCount               = 1000;
const topLeftPosition:       ViewportPosition = {rowNdx: 0, colNdx: 0, rowPixelOffset: 0, colPixelOffset: 0};

var controller:              GridLayout.Controller;
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

function scanDistance (a: Int16Array, startNdx: number, distance: number) : number {
   let i = startNdx;
   let d = 0;
   while (d < distance && i < a.length) {
      d += a[i++]; }
   return i; }

function measure (startNdx: number, orientation: boolean, distance: number) : Int16Array | Int16Array[] {
   const a = orientation ? rowHeights : colWidths;
   const ndx = scanDistance(a, startNdx, distance);
   const a1 = a.subarray(startNdx, ndx);
   return orientation ? [a1, macroCellHeights.subarray(startNdx, ndx)] : a1; }

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

function scrollTo (relativePos: number, orientation: boolean) {
   if (orientation) {
      viewportPosition.rowNdx = Math.round((rowCount - 1) * relativePos); }
    else {
      viewportPosition.colNdx = Math.round((colCount - 1) * relativePos); }
   viewportPosition.rowPixelOffset = 0;
   viewportPosition.colPixelOffset = 0; }

function onScrollbarInput (this: Scrollbar, event: CustomEvent) {
   const scrollbar = this;
   // console.log("Scrollbar event " + event.detail + " " + scrollbar.value + " " + scrollbar.orientationBoolean);
   switch (event.detail) {
      case "value": {
         scrollTo(scrollbar.value, scrollbar.orientationBoolean);
         renderGrid();
         break; }
      /* ... */ }
   }

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
   const gridRootElement = document.getElementById("gridRoot")!;
   controller = new GridLayout.Controller(gridRootElement);
   PlainScrollbar.registerCustomElement();
   vScrollbar = <any>document.getElementById("verticalGridScrollbar");
   vScrollbar.thumbSize = minScrollbarThumbSize;
   vScrollbar.addEventListener("scrollbar-input", <EventListener>onScrollbarInput);
   hScrollbar = <any>document.getElementById("horizontalGridScrollbar");
   hScrollbar.thumbSize = minScrollbarThumbSize;
   hScrollbar.addEventListener("scrollbar-input", <EventListener>onScrollbarInput);
   // window.addEventListener("load", resize);
   viewportPosition = topLeftPosition;
   renderGrid(); }

async function startup() {
   try {
      init(); }
    catch (e) {
      console.log(e);
      alert("Error: " + e); }}

document.addEventListener("DOMContentLoaded", startup);
