// Demo application for the virtual grid layout module.

import * as GridLayout from "virtual-grid-layout/GridLayout";
import {LayoutController, ViewportPosition, CellType} from "virtual-grid-layout/GridLayout";
import * as GridScroll from "virtual-grid-layout/GridScroll";
import {ScrollUnit} from "virtual-grid-layout/GridScroll";
import * as GridResize from "virtual-grid-layout/GridResize";
import {ResizeController} from "virtual-grid-layout/GridResize";
import * as PlainScrollbar from "plain-scrollbar";
import {PlainScrollbar as Scrollbar} from "plain-scrollbar";
import * as Utils from "./Utils";

interface AppParms {
   rowCount:                 number;
   rowHeightLo:              number;
   rowHeightHi:              number;
   colCount:                 number;
   colWidthLo:               number;
   colWidthHi:               number;
   macroCellRate:            number;
   macroCellHeightLo:        number;
   macroCellHeightHi:        number; }

const topLeftPosition:       ViewportPosition = {rowNdx: 0, colNdx: 0, rowPixelOffset: 0, colPixelOffset: 0};

var appParms:                AppParms;
var layoutController:        LayoutController;
var resizeController:        ResizeController;
var gridViewportElement:     HTMLElement;
var vScrollbar:              Scrollbar;
var hScrollbar:              Scrollbar;
var viewportPosition:        ViewportPosition;
var rowHeights:              Int16Array;
var colWidths:               Int16Array;
var macroCellHeights:        Int16Array;
var renderRequested:         boolean = false;
var animationFrameRequestId: number = 0;

function getAppParms() {
   const ap = <AppParms>{};
   ap.rowCount          = Utils.getInputElementValueNum("rowCount");
   ap.rowHeightLo       = Utils.getInputElementValueNum("rowHeightLo");
   ap.rowHeightHi       = Utils.getInputElementValueNum("rowHeightHi");
   ap.colCount          = Utils.getInputElementValueNum("colCount");
   ap.colWidthLo        = Utils.getInputElementValueNum("colWidthLo");
   ap.colWidthHi        = Utils.getInputElementValueNum("colWidthHi");
   ap.macroCellRate     = Utils.getInputElementValueNum("macroCellRate");
   ap.macroCellHeightLo = Utils.getInputElementValueNum("macroCellHeightLo");
   ap.macroCellHeightHi = Utils.getInputElementValueNum("macroCellHeightHi");
   appParms = ap; }

function randomSize (lo: number, hi: number) : number {
   return Math.round(lo + Math.max(0, (hi - lo)) * Math.random()); }

function buildGridData() {
   rowHeights = new Int16Array(appParms.rowCount);
   macroCellHeights = new Int16Array(appParms.rowCount);
   for (let rowNdx = 0; rowNdx < appParms.rowCount; rowNdx++) {
      macroCellHeights[rowNdx] = Math.random() < appParms.macroCellRate ? randomSize(appParms.macroCellHeightLo, appParms.macroCellHeightHi) : 0;
      rowHeights[rowNdx] = macroCellHeights[rowNdx] + randomSize(appParms.rowHeightLo, appParms.rowHeightHi); }
   colWidths = new Int16Array(appParms.colCount);
   for (let colNdx = 0; colNdx < appParms.colCount; colNdx++) {
      colWidths[colNdx] = randomSize(appParms.colWidthLo, appParms.colWidthHi); }}

function getCellColor (rowNdx: number, colNdx: number) : string {
   const colorMin = 235 - (rowNdx % 5) * 5;
   const colorMax = 245;
   const colorTone = colNdx % 8;
   return "rgb(" + (colorTone & 1 ? colorMax : colorMin) + "," + (colorTone & 2 ? colorMax : colorMin) + "," + (colorTone & 4 ? colorMax : colorMin) + ")"; } // tslint:disable-line:no-bitwise

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
      viewportPosition,
      rowHeights,
      colWidths,
      macroCellHeights,
      prepareCell };
   layoutController.render(renderParms);
   renderRequested = false; }

function requestRender() {
   renderRequested = true;
   scheduleAnimationFrame(); }

function animationFrameHandler() {
   animationFrameRequestId = 0;
   if (renderRequested) {
      renderGrid(); }}

function scheduleAnimationFrame() {
   if (animationFrameRequestId) {
      return; }
   animationFrameRequestId = requestAnimationFrame(animationFrameHandler); }

function scroll (scrollbar: Scrollbar, scrollUnit: ScrollUnit, scrollValue: number) {
   const orientation = scrollbar.orientationBoolean;
   const ip = {
      scrollUnit,
      scrollValue,
      topNdx:       orientation ? viewportPosition.rowNdx : viewportPosition.colNdx,
      elementCount: orientation ? appParms.rowCount : appParms.colCount,
      viewportSize: orientation ? gridViewportElement.clientHeight : gridViewportElement.clientWidth,
      elementSizes: orientation ? rowHeights : colWidths };
   const r = GridScroll.process(ip);
   if (orientation) {
      viewportPosition.rowNdx = r.topNdx; }
    else {
      viewportPosition.colNdx = r.topNdx; }
   scrollbar.value = r.scrollbarPosition;
   scrollbar.thumbSize = r.scrollbarThumbSize; }

function scrollAndRender (scrollbar: Scrollbar, scrollUnit: ScrollUnit, scrollValue: number) {
   scroll(scrollbar, scrollUnit, scrollValue);
   requestRender(); }

function scrollbar_input (this: Scrollbar, event: CustomEvent) {
   const scrollbar = this;
   // console.log("Scrollbar event " + event.detail + " " + scrollbar.value + " " + scrollbar.orientationBoolean);
   switch (event.detail) {
      case "value": {
         scrollAndRender(scrollbar, ScrollUnit.propPosition, scrollbar.value);
         break; }
      case "decrementSmall": {
         scrollAndRender(scrollbar, ScrollUnit.smallIncr, -1);
         break; }
      case "incrementSmall": {
         scrollAndRender(scrollbar, ScrollUnit.smallIncr, 1);
         break; }
      case "decrementLarge": {
         scrollAndRender(scrollbar, ScrollUnit.largeIncr, -1);
         break; }
      case "incrementLarge": {
         scrollAndRender(scrollbar, ScrollUnit.largeIncr, 1);
         break; }}}

function container_wheel (event: WheelEvent) {
   scrollAndRender(vScrollbar, ScrollUnit.mediumIncr, Math.sign(event.deltaY));
   event.stopPropagation();
   event.preventDefault(); }

function processKey (event: KeyboardEvent) {
   const keyName = Utils.genKeyName(event);
   switch (keyName) {
      case "PageDown": {
         scrollAndRender(vScrollbar, ScrollUnit.largeIncr, 1);
         return true; }
      case "PageUp": {
         scrollAndRender(vScrollbar, ScrollUnit.largeIncr, -1);
         return true; }
      case "ArrowDown": {
         scrollAndRender(vScrollbar, ScrollUnit.smallIncr, 1);
         return true; }
      case "ArrowUp": {
         scrollAndRender(vScrollbar, ScrollUnit.smallIncr, -1);
         return true; }
      case "ArrowRight": {
         scrollAndRender(hScrollbar, ScrollUnit.smallIncr, 1);
         return true; }
      case "ArrowLeft": {
         scrollAndRender(hScrollbar, ScrollUnit.smallIncr, -1);
         return true; }
      case "Home": {
         scrollAndRender(hScrollbar, ScrollUnit.propPosition, 0);
         return true; }
      case "End": {
         scrollAndRender(hScrollbar, ScrollUnit.propPosition, 1);
         return true; }
      case "Ctrl-Home": {
         scrollAndRender(vScrollbar, ScrollUnit.propPosition, 0);
         return true; }
      case "Ctrl-End": {
         scrollAndRender(vScrollbar, ScrollUnit.propPosition, 1);
         return true; }
      default: {
         return false; }}}

function container_keydown (event: KeyboardEvent) {
   if (processKey(event)) {
      event.stopPropagation();
      event.preventDefault(); }}

function resizeController_elementResize (event: CustomEvent) {
   const d = event.detail;
   if (d.orientation) {
      if (d.ndx < 0 || d.ndx >= rowHeights.length) {
         return; }
      rowHeights[d.ndx] = d.size;
      macroCellHeights[d.ndx] = Math.min(d.size, macroCellHeights[d.ndx]); }
    else {
      if (d.ndx < 0 || d.ndx >= colWidths.length) {
         return; }
      colWidths[d.ndx] = d.size; }
   const scrollbar = d.orientation ? vScrollbar : hScrollbar;
   scrollAndRender(scrollbar, ScrollUnit.none, 0); }

function processAppParms() {
   getAppParms();
   buildGridData();
   scroll(vScrollbar, ScrollUnit.absPosition, 0);
   scroll(hScrollbar, ScrollUnit.absPosition, 0);
   requestRender(); }

function appParms_change() {
   try {
      processAppParms(); }
    catch (e) {
      alert(e); }}

function init() {
   gridViewportElement = document.getElementById("gridViewport")!;
   layoutController = new LayoutController(gridViewportElement);
   const resizeControllerParms: GridResize.ControllerParms = {
      layoutController,
      rowSizingEnabled: true,
      colSizingEnabled: true,
      topWidth: 6,
      bottomWidth: 5,
      leftWidth: 6,
      rightWidth: 5 };
   resizeController = new ResizeController(resizeControllerParms);
   resizeController.addEventListener("element-resize", <EventListener>resizeController_elementResize);
   PlainScrollbar.registerCustomElement();
   vScrollbar = <any>document.getElementById("verticalGridScrollbar");
   vScrollbar.addEventListener("scrollbar-input", <any>scrollbar_input);
   hScrollbar = <any>document.getElementById("horizontalGridScrollbar");
   hScrollbar.addEventListener("scrollbar-input", <any>scrollbar_input);
   const containerElement = document.getElementById("gridContainer")!;
   containerElement.addEventListener("wheel", container_wheel);
   containerElement.addEventListener("keydown", container_keydown);
   viewportPosition = topLeftPosition;
   document.getElementById("appParms")!.addEventListener("change", appParms_change);
   processAppParms();
   containerElement.focus(); }

async function startup() {
   try {
      init(); }
    catch (e) {
      console.log(e);
      alert(e); }}

document.addEventListener("DOMContentLoaded", startup);
