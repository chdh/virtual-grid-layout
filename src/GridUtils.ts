import {ScrollUnit} from "./GridScroll";

// A helper routine for processing a `scrollbar-input` event of a `plain-scrollbar`.
export function convertPlainScrollbarInputEvent (event: CustomEvent) : {scrollUnit: ScrollUnit; scrollValue: number} | undefined {
   const scrollbar = <any>event.target;
   switch (event.detail) {
      case "value":          return {scrollUnit: ScrollUnit.propPosition, scrollValue: scrollbar.value};
      case "decrementSmall": return {scrollUnit: ScrollUnit.smallIncr,    scrollValue: -1             };
      case "incrementSmall": return {scrollUnit: ScrollUnit.smallIncr,    scrollValue:  1             };
      case "decrementLarge": return {scrollUnit: ScrollUnit.largeIncr,    scrollValue: -1             };
      case "incrementLarge": return {scrollUnit: ScrollUnit.largeIncr,    scrollValue:  1             };
      default:               return; }}

// A helper routine for processing a `KeyboardEvent` for scrolling.
export function convertKeyboardEvent (event: KeyboardEvent) : {orientation: boolean; scrollUnit: ScrollUnit; scrollValue: number} | undefined {
   const keyName = genKeyName(event);
   switch (keyName) {
      case "PageDown":   return {orientation: true,  scrollUnit: ScrollUnit.largeIncr,    scrollValue:  1};
      case "PageUp":     return {orientation: true,  scrollUnit: ScrollUnit.largeIncr,    scrollValue: -1};
      case "ArrowDown":  return {orientation: true,  scrollUnit: ScrollUnit.smallIncr,    scrollValue:  1};
      case "ArrowUp":    return {orientation: true,  scrollUnit: ScrollUnit.smallIncr,    scrollValue: -1};
      case "ArrowRight": return {orientation: false, scrollUnit: ScrollUnit.smallIncr,    scrollValue:  1};
      case "ArrowLeft":  return {orientation: false, scrollUnit: ScrollUnit.smallIncr,    scrollValue: -1};
      case "Home":       return {orientation: false, scrollUnit: ScrollUnit.propPosition, scrollValue:  0};
      case "End":        return {orientation: false, scrollUnit: ScrollUnit.propPosition, scrollValue:  1};
      case "Ctrl-Home":  return {orientation: true,  scrollUnit: ScrollUnit.propPosition, scrollValue:  0};
      case "Ctrl-End":   return {orientation: true,  scrollUnit: ScrollUnit.propPosition, scrollValue:  1};
      default:           return; }}

export function genKeyName (event: KeyboardEvent) : string {
   const s =
      (event.shiftKey ? "Shift-" : "") +
      (event.ctrlKey  ? "Ctrl-"  : "") +
      (event.altKey   ? "Alt-"   : "") +
      (event.metaKey  ? "Meta-"  : "") +
      event.key;
   return s; }
