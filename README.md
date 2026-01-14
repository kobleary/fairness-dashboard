# Fairness Dashboard

A static, browser-based dashboard for exploring fairness measures across demographics, states, and time.

## Features

-   **Panel 1: Compare Fairness Measures** - View multiple fairness measures over time for a specific state and demographic group
-   **Panel 2: Compare Demographics** - Compare all demographic groups within a category for a single fairness measure
-   **Panel 3: Compare States** - View state-by-state variation for a specific measure, year, and demographic

## Tech Stack

-   **Frontend**: Vanilla JavaScript (ES modules), HTML, CSS
-   **Charts**: Observable Plot
-   **Data**: DuckDB-WASM for in-browser querying of Parquet files
-   **Build**: Vite
-   **Deploy**: GitHub Pages via GitHub Actions

## Development

Install dependencies:

``` bash
npm install
```

Run development server:

``` bash
npm run dev
```

Build for production:

``` bash
npm run build
```

Preview production build:

``` bash
npm run preview
```

## Data

The dashboard queries `data/fairness.parquet` directly in the browser using DuckDB-WASM. No backend required.

## Deployment

Pushing to the `main` branch automatically triggers a GitHub Actions workflow that builds and deploys to GitHub Pages.