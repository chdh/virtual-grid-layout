// Scroll control logic for grids.

// This module implements a simple scroll logic for a grid.
// Snap mode is used. The start of the grid viewport is always aligned with the start of a row and a column.
// The behavior is the same as in Excel, Access, etc.

export const enum ScrollUnit {
   absPosition,              // absolute position
      // ScrollValue is a row/column index in the range 0..elementCount-1.
   propPosition,             // proportional position
      // ScrollValue is a floating point value in the range 0..1. Used for scrollbar movement.
   smallIncr,                // small increment
      // ScrollValue is usually +/-1. Used for up/down buttons of scrollbar.
   mediumIncr,               // medium increment
      // ScrollValue is usually +/-1. Used for mouse wheel.
   largeIncr,                // large increment
      // ScrollValue is usually +/-1. Used for page up/down buttons and for clicks within the scrollbar trough.
   none }                    // no movement
      // ScrollValue is ignored. Used to re-calculate the scrollbar parameters.

// Function to measure undetermined row heights or column widths.
//
// The `elementSizes` array may contain entries with the value -1, which means that the value
// has not yet been determined. This function is used to measure these undetermined entries.
//
// @param startNdx
//    The row/column index to start.
// @param n
//    Number of entries to process.
export type MeasureFunction = (startNdx: number, n: number) => void;

export interface InputParms {
   scrollUnit:               ScrollUnit;                   // unit for scrollValue
   scrollValue:              number;                       // the meaning of this value depends on scrollUnit
   topNdx:                   number;                       // index of first visible row/column, 0-based integer
   elementCount:             number;                       // total number of rows/columns in the grid
   viewportSize:             number;                       // viewport size (width or height) in pixels
   elementSizes:             Int16Array;                   // row heights or column widths, may contain -1 for undetermined heights/widths
   measure?:                 MeasureFunction; }            // function to measure undetermined element sizes

export interface OutputParms {
   topNdx:                   number;                       // index of first visible row/column, 0-based integer
   scrollbarPosition:        number;                       // scrollbar position value, float value in the range 0..1
   scrollbarThumbSize:       number; }                     // scrollbar thumb size relative to the trough, float value in the range 0..1

export function process (ip: InputParms) : OutputParms {
   if (ip.elementCount <= 1 || ip.viewportSize <= 0) {
      return {topNdx: 0, scrollbarPosition: 0, scrollbarThumbSize: 0}; }
   if (ip.elementSizes.length != ip.elementCount) {
      throw new Error("elementSizes.length != elementCount"); }
   let topNdx: number;
   switch (ip.scrollUnit) {
      case ScrollUnit.absPosition: {
         topNdx = ip.scrollValue;
         break; }
      case ScrollUnit.propPosition: {
         topNdx = ip.scrollValue * (ip.elementCount - 1);
         break; }
      case ScrollUnit.smallIncr: {
         topNdx = ip.topNdx + ip.scrollValue;
         break; }
      case ScrollUnit.mediumIncr: {
         topNdx = ip.topNdx + ip.scrollValue * 3;
         break; }
      case ScrollUnit.largeIncr: {
         const d1 = ip.scrollValue * ip.viewportSize;
         const r = scanDistance(ip, ip.topNdx, d1);
         const d2 = Math.max(1, (r.distance > Math.abs(d1)) ? r.n - 1 : r.n);
         topNdx = ip.topNdx + d2 * Math.sign(ip.scrollValue);
         break; }
      case ScrollUnit.none: {
         topNdx = ip.topNdx;
         break; }
      default: {
         throw new Error("Unknown scrollUnit."); }}
   topNdx = Math.max(0, Math.min(ip.elementCount - 1, Math.round(topNdx)));
   const scrollbarPosition = topNdx / (ip.elementCount - 1);
   const scrollbarThumbSize = estimateScrollbarThumbSize(ip);
   return {topNdx, scrollbarPosition, scrollbarThumbSize}; }

function estimateScrollbarThumbSize (ip: InputParms) : number {
   const sampleFactor = 4;
   const r = scanDistance(ip, 0, ip.viewportSize * sampleFactor);
   const n = Math.max(1, r.n);
   return ip.viewportSize / ( r.distance / n * (ip.elementCount - 1) + ip.viewportSize ); }

function scanDistance (ip: InputParms, startNdx: number, distance: number) : {n: number; distance: number} {
   if (distance >= 0) {
      return scanDistanceForward(ip, startNdx, distance); }
    else {
      return scanDistanceReverse(ip, startNdx, -distance); }}

function scanDistanceForward (ip: InputParms, startNdx: number, distance: number) : {n: number; distance: number} {
   const a = ip.elementSizes;
   const n = a.length;
   let i = startNdx;
   let d = 0;
   while (d < distance && i < n) {
      let w = a[i];
      if (w == -1) {                                                 // undetermined height/width
         if (!ip.measure) {
            throw new Error("Undetermined `rowHeights`/`colWidths` value encountered but `measure` function is undefined."); }
         const len = Math.min(25, n - i);
         ip.measure(i, len);
         w = a[i];
         if (a[i] == -1) {
            throw new Error("`rowHeights`/`colWidths` value stayed undetermined even after `measure` function was called."); }}
      d += Math.max(0, w);
      i++; }
   return {n: i - startNdx, distance: d}; }

function scanDistanceReverse (ip: InputParms, startNdx: number, distance: number) : {n: number; distance: number} {
   const a = ip.elementSizes;
   let i = startNdx;
   let d = 0;
   while (d < distance && i > 0) {
      i--;
      let w = a[i];
      if (w == -1) {                                                 // undetermined height/width
         if (!ip.measure) {
            throw new Error("Undetermined `rowHeights`/`colWidths` value encountered but `measure` function is undefined."); }
         const p = Math.max(0, i - 24);
         ip.measure(p, i - p + 1);
         w = a[i];
         if (a[i] == -1) {
            throw new Error("`rowHeights`/`colWidths` value stayed undetermined even after `measure` function was called."); }}
      d += Math.max(0, w); }
   return {n: startNdx - i, distance: d}; }
