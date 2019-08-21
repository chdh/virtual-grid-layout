function getInputElement (elementId: string) : HTMLInputElement {
   const e = <HTMLInputElement>document.getElementById(elementId);
   if (!e) {
      throw new Error("No HTML element found with ID \"" + elementId + "\"."); }
   return e; }

function getInputElementLabelText (e: HTMLInputElement) : string {
   let s = (e.labels && e.labels.length > 0) ? e.labels[0].textContent || "" : "";
   if (s.length > 0 && s[s.length - 1] == ":") {
      s = s.substring(0, s.length - 1); }
   return s; }

function checkValidity (e: HTMLInputElement) {
   if (!e.checkValidity()) {
      const labelText = getInputElementLabelText(e);
      const info = labelText ? ` with label "${labelText}"` : e.id ? ` with ID "${e.id}"` : "";
      throw new Error("Invalid value in input field" + info + "."); }}

export function getInputElementValueNum (elementId: string, defaultValue: number = NaN) : number {
   const e = getInputElement(elementId);
   checkValidity(e);
   if (e.value == "") {
      return defaultValue; }
   return e.valueAsNumber; }
