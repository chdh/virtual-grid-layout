# Virtual grid layout controller

This module provides a virtual grid layout controller for HTML/DOM.

Features:

* Support for very large grids with rows and columns of varying height and width.
* As measuring the individual row heights may be time-consuming, only the sizes of the visible cells need to be specified.
  The scroll position is based on row/column indexes instead of absolute pixel coordinates.
* Each layout controller manages only a single contiguous grid.
  Additional parallel synchronized grids may be used e.g. for header cells or row prefixes.
* Scrollbars are not included, because browser-generated scrollbars are not suitable to navigate large virtual grids.
* Sub-grids can be implemented through macro cells.
* The layout controller is style-agnostic. Styling is done in the higher application layers.
* User interaction is also done in the higher application layers.
  The Layout Controller's purpose is limited to controlling the virtual layout by rendering the visible grid cells.

**Online demo**: [www.source-code.biz/snippets/typescript/virtualGridLayout](http://www.source-code.biz/snippets/typescript/virtualGridLayout)
