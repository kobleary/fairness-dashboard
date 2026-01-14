## Fairness dashboard (full implementation plan)

### Goals and constraints

* Deploy as a **static site on GitHub Pages** with **no backend**.
* Use **Observable Plot** for charts and **DuckDB-WASM** for in-browser querying of `data/fairness.parquet`.
* All charts update **immediately** when controls change (no “create plot” button).
* All selection controls are **dropdowns**, except **Select Fairness Measures** which is a **type-to-search multi-select** with an optional dropdown list.
* **Interpretation/wording rule (UI-only):**

  * Values represent **differences relative to White** wherever applicable; **Representativeness** uses **levels**.
  * This is **already encoded in the data**; no additional filtering is needed—only titles/captions/legends should reflect this.

---

## Tech stack

* **Frontend:** Vanilla JS (ES modules) + HTML/CSS
* **Charts:** `@observablehq/plot`
* **Query engine:** `@duckdb/duckdb-wasm` (runs entirely in browser)
* **Map data:** TopoJSON for US states (stored in repo)
* **Build/deploy:** Vite + GitHub Actions → GitHub Pages

---

## Repository structure

```
/
  data/
    fairness.parquet
    us-states-topojson.json
    state_crosswalk.csv (only if needed for FIPS↔postal)
  src/
    index.html
    styles.css
    app.js
    duckdb.js
    components/
      controls.js
      multiselect.js
      slider.js
      tabs.js
    panels/
      panel_measures.js
      panel_demographics.js
      panel_states.js
    utils/
      format.js
      constants.js
  vite.config.js
  package.json
  README.md
  .github/workflows/deploy.yml
```

---

## Data model and conventions

### Source

* `data/fairness.parquet` with columns:

  * `year` (int)
  * `state` (2-letter code)
  * `fairness_measure` (string)
  * `demographic_category` (string: `race`, `sex`, possibly others)
  * `demographic_group` (string)
  * `value_type` (string, already correct for interpretation)
  * `value` (numeric)
  * `coalesced_n` (int)

### Data semantics (used in UI text only)

* For most measures: “Difference vs White (reference)”
* For Representativeness: “Level”
* Implemented by:

  * A function `measureLabel(measure)` returning suffix text for titles/legends/captions (e.g., “(Difference vs White)” vs “(Level)”).
  * A legend/caption note displayed on all relevant panels.

### No extra filtering rule

* All queries use the user’s chosen dimensions only.
* Do **not** conditionally filter on `value_type` (unless later data revisions require it).

---

## App architecture

### Initialization

1. On page load:

   * Initialize DuckDB-WASM.
   * Register and load `fairness.parquet` as a DuckDB table/view (e.g., `fairness`).
2. Precompute and cache option lists (distinct values):

   * `years` (sorted)
   * `states` (sorted)
   * `fairness_measures` (sorted)
   * `demographic_categories` (sorted)
   * `demographic_groups_by_category` (map: category → groups)
3. Load US states TopoJSON once and keep in memory for panel 3.

### State management

* Maintain a single `appState` object:

  * `activeTab` (panel 1/2/3)
  * `yearRange` for panels 1 & 2: `{minYear, maxYear}`
  * `panel1`: `{state, demographic_category, demographic_group, measures[]}`
  * `panel2`: `{state, demographic_category, measure}`
  * `panel3`: `{year, demographic_category, demographic_group, measure}`
* Each control updates `appState` and triggers `render()` immediately.
* For slider dragging, optionally debounce by ~50–100ms to avoid excessive rerenders while still feeling “real time”.

### Rendering model

* `render()`:

  * Render tab header + panel container.
  * Render controls for the active panel.
  * Run panel query via DuckDB, then render Plot/map into a dedicated container.
* Cache frequent query results keyed by serialized selection state (optional; likely not needed at 21k rows but easy to add).

---

## Global UI layout

### Three tabs

1. **Compare Fairness Measures**
2. **Compare Demographics**
3. **Compare States**

### Shared styling and layout rules

* Left column (or top bar on mobile): controls.
* Main area: plot/map.
* Caption area below plot:

  * Dynamic text describing what’s shown and the meaning of values:

    * “Values are differences relative to White (reference) where applicable; Representativeness is shown as levels.”
  * Include `coalesced_n` note: “Hover for sample size (coalesced_n).”

---

## Controls specification

### Year range slider (Panels 1 & 2)

* Dual-handle slider choosing `[startYear, endYear]`.
* Displays current range as text.
* Constraint: `startYear ≤ endYear`.
* Updates plot as it changes.

### Panel-specific control types

* Dropdowns for all single-select fields.
* Multi-select typeahead for Panel 1 measures:

  * Search input (type-to-filter)
  * Dropdown suggestion list
  * Selected measures shown as removable “chips”
  * Keyboard support: enter to select, backspace to remove last chip

---

## Panel 1: Compare Fairness Measures

### User story

* Pick **state**, **demographic category**, **demographic group**, and **multiple measures**, then compare trends over a year range.

### Controls

* Dropdown: **State**
* Dropdown: **Demographic category** (e.g., race, sex)
* Dropdown: **Demographic group** (filtered by category)
* Type-to-search multi-select: **Fairness measures** (`fairness_measure`)
* Dual-handle slider: **Year range**

### Query (DuckDB)

Filter by:

* `state = :state`
* `demographic_category = :category`
* `demographic_group = :group`
* `fairness_measure IN (:measures)`
* `year BETWEEN :y0 AND :y1`

Return:

* `year, fairness_measure, value, coalesced_n`
  Order by:
* `fairness_measure, year`

### Visualization

* **Line chart** with one line per measure:

  * x = year
  * y = value
  * stroke = fairness_measure
* Add hoverable points for tooltips.
* Tooltip fields:

  * year, measure, value (formatted), coalesced_n
* Dynamic title example:

  * “Fairness measures over time — {State}, {Demographic group}”
* Subtitle/caption includes measure semantics:

  * If selection includes Representativeness, add note: “Representativeness shown as levels; other measures as differences vs White.”

### Guardrails

* If user selects many measures (e.g., >8), switch automatically to:

  * small multiples by measure, or
  * keep one plot but add legend scrolling and reduce clutter (thin strokes, hover emphasis).

---

## Panel 2: Compare Demographics

### User story

* Choose **one measure**, **one state**, and **Race/Ethnicity or Sex**, then compare **all groups within that category** over time.

### Controls

* Dropdown: **Fairness measure** (single)
* Dropdown: **State**
* Dropdown: **Demographic category** (Race/Ethnicity or Sex)
* Dual-handle slider: **Year range**
* No group picker (by design)

### Query (DuckDB)

Filter by:

* `fairness_measure = :measure`
* `state = :state`
* `demographic_category = :category`
* `year BETWEEN :y0 AND :y1`

Return:

* `year, demographic_group, value, coalesced_n`
  Order by:
* `demographic_group, year`

### Visualization

Primary:

* **Multi-line time series** with one line per demographic_group:

  * x = year
  * y = value
  * stroke = demographic_group
* Tooltip includes year, group, value, coalesced_n
* Dynamic title:

  * “{Measure} over time by {Category} — {State}”
* Caption includes semantics:

  * “Values are differences relative to White (reference) where applicable; Representativeness is shown as levels.”

Optional secondary (recommended):

* **End-year ranking bar chart** using the slider’s end year:

  * Bars = demographic_group
  * y = value at `year = endYear`
  * Useful quick comparison alongside trends

### Guardrails

* If many groups, provide:

  * legend search/filter within the panel (optional), or
  * highlight-on-hover behavior to reduce clutter.

---

## Panel 3: Compare States (Map)

### User story

* Select **measure**, **year**, and **demographic group**, then see state-by-state variation.

### Controls

* Dropdown: **Fairness measure** (single)
* Dropdown (or single slider): **Year**
* Dropdown: **Demographic category**
* Dropdown: **Demographic group** (filtered by category)

### Query (DuckDB)

Filter by:

* `fairness_measure = :measure`
* `year = :year`
* `demographic_category = :category`
* `demographic_group = :group`

Return:

* `state, value, coalesced_n`

### Visualization

Primary:

* **US choropleth map**

  * Geometry from repo TopoJSON
  * Join on `state` postal code (use crosswalk only if needed)
  * Fill = value
  * Tooltip = state, value, coalesced_n

Color scale:

* Default to **diverging scale centered at 0** (common for “difference vs White” measures).
* For Representativeness (levels), use **sequential scale** unless your level meaning is naturally centered; title/caption should state “Level”.

Optional secondary:

* **Rank table** (top/bottom 10 states) for quick scanning.

Caption:

* Restates measure semantics and selected demographic group.

Missing data:

* States with no data shown in neutral “No data” fill and included in legend.

---

## Text, legends, and captions (semantics layer)

* Central helper:

  * `valueSemantic(measure)` returns:

    * `{kind: "difference", label: "Difference vs White (reference)"}`
    * or `{kind: "level", label: "Level"}`
* Every panel uses:

  * Title that includes measure label where relevant
  * Caption line that always states:

    * “Values are differences relative to White (reference) where applicable; Representativeness is shown as levels.”
  * Tooltips show raw numeric values plus sample size (`coalesced_n`).

---

## Performance and UX details

* Preload and cache:

  * option lists (distinct values)
  * topojson geometry
* Queries are small and fast; rerender on every control change.
* Slider interactions:

  * immediate updates with mild debounce while dragging.
* Responsive design:

  * On narrow screens, controls stack above plot.

---

## Testing and validation

* Validate that:

  * Panel 1 returns lines for each selected measure.
  * Panel 2 includes all groups within selected category and no group filter exists.
  * Panel 3 correctly joins data to map geometry.
* Add lightweight checks:

  * Empty result handling (show “No data for selection” message).
  * Value formatting and axis scaling.

---

## Delivery checklist

1. Create Vite app skeleton + GitHub Pages deploy workflow.
2. Implement DuckDB-WASM loader and register `fairness.parquet`.
3. Build controls components (dropdown, typeahead multiselect, dual slider).
4. Implement Panel 1 end-to-end (query → Plot).
5. Implement Panel 2 end-to-end (query → Plot + optional ranking).
6. Implement Panel 3 end-to-end (query → map + legend).
7. Add consistent captions/semantics labels across panels.
8. Final polish: responsive layout, tooltips, “no data” states, legend usability.
