# Copilot Instructions - ITALIANOS Project

## Project Overview
This is a web application project with a simple three-file structure: HTML, CSS, and vanilla JavaScript. No build tools or frameworks are currently in use - this is a static web project.

## Architecture
- **index.html**: Main entry point and structure
- **style.css**: All styling and visual presentation
- **script.js**: Client-side JavaScript logic and interactivity

## Development Workflow
- Open `index.html` directly in a browser to test (no build step required)
- Use browser DevTools for debugging JavaScript and inspecting DOM
- No package manager or dependencies currently configured

## Key Conventions
- Pure vanilla JavaScript (no frameworks like React, Vue, or Angular)
- All code should work in modern browsers without transpilation
- Keep the simple three-file structure for easy deployment

## When Adding Features
- Add DOM manipulation and event listeners in `script.js`
- Use `DOMContentLoaded` or defer script loading to ensure DOM is ready
- Keep CSS organized by component or page section
- Use semantic HTML5 elements in `index.html`

## Future Considerations
As the project grows, consider:
- Adding a local development server for testing
- Organizing CSS with a methodology (BEM, utility classes, etc.)
- Modularizing JavaScript if complexity increases
- Adding meta tags and SEO optimization in HTML

## Testing
- Manual testing in browser
- Test across different browsers if targeting broad compatibility
- Use browser console for JavaScript debugging
