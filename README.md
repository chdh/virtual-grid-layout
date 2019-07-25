# Virtual grid layout controller

This module provides a virtual grid layout controller for HTML/DOM.

Features:

* Support for very large grids with rows and columns of varying height and width.
* As measuring the individual row heights may be time-consuming, only the sizes of the visible cells need to be determined.
  The scroll position is based on row/column indexes instead of absolute pixel coordinates.
* Each layout controller instance manages only a single contiguous grid.
  Additional parallel synchronized grids may be used for e.g. header cells or row prefixes.
* Scrollbars are not included, because browser-generated scrollbars are not suitable to navigate large virtual grids.
  Instead the higher application layers should use scrollbar widgets.
* Sub-grids can be implemented through macro cells.
* The layout controller is style-agnostic. Styling must be done in the higher application layers.
* The Layout Controller's purpose is limited to controlling the virtual layout by rendering the visible grid cells.
  User interaction must also be done in the higher application layers.
* There are two additional modules that assist with user interaction:
  `GridScroll` for scrolling and `GridResize` for resizing row heights and column widths.

**Online demo**: [www.source-code.biz/snippets/typescript/virtualGridLayout](http://www.source-code.biz/snippets/typescript/virtualGridLayout)<br>
**NPM package**: [virtual-grid-layout](https://www.npmjs.com/package/virtual-grid-layout)
