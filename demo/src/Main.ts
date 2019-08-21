// Demo application for the virtual-grid-layout module.

import * as GridLayout from "virtual-grid-layout/GridLayout";
import {LayoutController, ViewportPosition, CellType} from "virtual-grid-layout/GridLayout";
import * as GridScroll from "virtual-grid-layout/GridScroll";
import {ScrollUnit} from "virtual-grid-layout/GridScroll";
import * as GridResize from "virtual-grid-layout/GridResize";
import {ResizeController} from "virtual-grid-layout/GridResize";
import * as GridUtils from "virtual-grid-layout/GridUtils";
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
   macroCellHeightHi:        number;
   macroCellWidth:           number; }

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
   ap.macroCellWidth    = Utils.getInputElementValueNum("macroCellWidth");
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

function prepareCell (cellType: CellType, rowNdx: number, colNdx: number, _width: number, _height: number, oldCell: HTMLElement | undefined) : HTMLElement {
   if (oldCell) {
      return oldCell; }
   const cell = document.createElement("div");
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
      macroCellWidth: appParms.macroCellWidth,
      vCellOverlap: 1,
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

function scroll (orientation: boolean, scrollUnit: ScrollUnit, scrollValue: number) {
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
   const scrollbar = orientation ? vScrollbar : hScrollbar;
   scrollbar.value = r.scrollbarPosition;
   scrollbar.thumbSize = r.scrollbarThumbSize; }

function scrollbar_input (this: Scrollbar, event: CustomEvent) {
   const scrollbar = this;
   const r = GridUtils.convertPlainScrollbarInputEvent(event);
   if (!r) {
      return; }
   scroll(scrollbar.orientationBoolean, r.scrollUnit, r.scrollValue);
   requestRender(); }

function container_wheel (event: WheelEvent) {
   scroll(true, ScrollUnit.mediumIncr, Math.sign(event.deltaY));
   requestRender();
   event.stopPropagation();
   event.preventDefault(); }

function container_keydown (event: KeyboardEvent) {
   const r = GridUtils.convertKeyboardEvent(event);
   if (!r) {
      return; }
   scroll(r.orientation, r.scrollUnit, r.scrollValue);
   requestRender();
   event.stopPropagation();
   event.preventDefault(); }

function resizeController_elementResize (event: CustomEvent) {
   const d = event.detail;
   const sizes = d.orientation ? rowHeights : colWidths;
   if (d.ndx < 0 || d.ndx >= sizes.length) {
      return; }
   sizes[d.ndx] = d.size;
// if (d.orientation) {
//    macroCellHeights[d.ndx] = Math.min(d.size, macroCellHeights[d.ndx]); }
   scroll(d.orientation, ScrollUnit.none, 0);
   requestRender(); }

function processAppParms() {
   getAppParms();
   buildGridData();
   scroll(true, ScrollUnit.absPosition, 0);
   scroll(false, ScrollUnit.absPosition, 0);
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
      rowSizingEnabled:     true,
      colSizingEnabled:     true,
      rowSizingTopWidth:    6,
      rowSizingBottomWidth: 5,
      colSizingLeftWidth:   6,
      colSizingRightWidth:  5 };
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
   viewportPosition = {...GridLayout.topLeftViewportPosition};
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
