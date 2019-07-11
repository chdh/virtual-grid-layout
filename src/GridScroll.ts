// Scroll control logic for grids.

// This module implements a simple scroll logic for a grid.
// Snap mode is used. The start of the grid viewport is always aligned with the start of a row or column.
// The behavior is the same as in Excel, Access, etc.

import {MeasureResult} from "./GridLayout";

export const enum ScrollUnit {
   absPosition,              // absolute position
      // ScrollValue is a row/column index in the range 0..elementCount-1.
   propPosition,             // proportional position
      // ScrollValue is a floating point value in the range 0..1. Used for scrollbar movement.
   smallIncr,                // small increment
      // ScrollValue is usually +/-1. Used for up/down buttons of scrollbar.
   mediumIncr,               // medium increment
      // ScrollValue is usually +/-1. Used for mouse wheel.
   largeIncr }               // large increment
      // ScrollValue is usually +/-1. Used for page up/down buttons and for clicks within the scrollbar trough.

// Function to measure row heights or column widths.
//
// @param startNdx
//    The row/column index to start. A 0-based integer.
// @param distance
//    The distance to move, in pixels. Positive to move forward, negative to move backward.
export type MeasureFunction = (startNdx: number, distance: number) => MeasureResult;

export interface InputParms {
   scrollUnit:               ScrollUnit;                   // unit for scrollValue
   scrollValue:              number;                       // the meaning of this value depends on scrollUnit
   topNdx:                   number;                       // index of first visible row/column, 0-based integer
   elementCount:             number;                       // total number of rows/columns in the grid
   viewportSize:             number;                       // viewport size (width or height) in pixels
   measure:                  MeasureFunction; }            // function to measure element sizes

export interface OutputParms {
   topNdx:                   number;                       // index of first visible row/column, 0-based integer
   scrollbarPosition:        number;                       // scrollbar position value, float value in the range 0..1
   scrollbarThumbSize:       number; }                     // scrollbar thumb size relative to the trough, float value in the range 0..1

export function process (ip: InputParms) : OutputParms {
   if (ip.elementCount <= 1 || ip.viewportSize <= 0) {
      return {topNdx: 0, scrollbarPosition: 0, scrollbarThumbSize: 0}; }
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
         const r = ip.measure(ip.topNdx, d1);
         const n = r.sizes.length;
         const d2 = Math.max(1, (r.distance > Math.abs(d1)) ? n - 1 : n);
         topNdx = ip.topNdx + d2 * Math.sign(ip.scrollValue);
         break; }
      default: {
         throw new Error("Unknown scrollUnit."); }}
   topNdx = Math.max(0, Math.min(ip.elementCount - 1, Math.round(topNdx)));
   const scrollbarPosition = topNdx / (ip.elementCount - 1);
   const scrollbarThumbSize = estimateScrollbarThumbSize(ip);
   return {topNdx, scrollbarPosition, scrollbarThumbSize}; }

function estimateScrollbarThumbSize (ip: InputParms) : number {
   const sampleFactor = 4;
   const r = ip.measure(0, ip.viewportSize * sampleFactor);
   const n = Math.max(1, r.sizes.length);
   return ip.viewportSize / ( r.distance / n * (ip.elementCount - 1) + ip.viewportSize ); }
