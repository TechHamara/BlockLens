<p align="center">
  <img src="logo.png" alt="BlockLens Logo" width="120" height="120">
</p>

<h1 align="center">BlockLens</h1>

<p align="center">
  <strong>A powerful AIA Project Viewer and AIX Extension Analyzer for App Inventor 2 & its distributions</strong>
</p>

<p align="center">
  <a href="https://techhamara.github.io/BlockLens/">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit%20Website-6200EA?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo">
  </a>
  <img src="https://img.shields.io/badge/Version-1.1.0-blue?style=for-the-badge" alt="Version 1.1.0">
  <img src="https://img.shields.io/badge/Built%20With-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Built with Vanilla JS">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License">
</p>

<p align="center">
  View your projects and analyze extensions directly in your browser without logging into any Creator.
</p>

---

## ✨ Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Project Viewer (.aia)** | ✅ Complete | View screens, components, assets, and block logic |
| **Extension Analyzer (.aix)** | ✅ Complete | Inspect extension methods, events, and properties with auto-generated blocks |
| **Documentation Generator** | ✅ Complete | Generate and export Markdown documentation for your extensions |
| **Smart Block Export** | ✅ Complete | Download all blocks as a single ZIP file or individual PNGs |
| **Helper Support** | ✅ Complete | Renders interconnected helper blocks (dropdowns) for properties |
| **Dark Mode** | ✅ Complete | Switch between light and dark themes for comfortable viewing |
| **Block Color Themes** | ✅ Complete | Toggle between App Inventor, Kodular, and Niotron block colors |
| **Responsive Design** | ✅ Complete | Works seamlessly on mobile and desktop devices |
| **Offline Capable** | ✅ Complete | Easy to set up and run locally |

---

## 🚀 Key Functions

### For AIA Projects
- 📂 **Screen Explorer** - Browse through all screens in your project
- 🧩 **Component Tree** - View hierarchical component structure
- 📁 **Asset Manager** - Preview images, audio, and other assets
- 🔲 **Block Viewer** - Visualize all block logic with proper rendering
- 🔲 **Export Blocks** - Download high-quality PNGs of Separate blocks for tutorials or documentation.
- 🔲 **Page Layout** - View all your page layouts in List View and Grid View.
- 🔲 **Block Scale** - Zoom in and out of blocks on Fingers Scale.

### For AIX Extensions
- 📊 **Extension Info** - View extension metadata and package details
- 🎯 **Methods Inspector** - Explore all methods with parameters and return types
- ⚡ **Events Analyzer** - See all events with their parameters
- 🔧 **Properties Browser** - View get/set properties with types in a clean vertical list
- 🎨 **Theme Switcher** - Toggle block colors (App Inventor, Kodular, Niotron)
-  **Dictionary Helpers** - Automatically renders helper dropdowns for enum properties
-  **Bulk Export** - Download full documentation (Markdown + Images) as a ZIP file
-  **Auto Documentation** - Generate professional markdown docs with one click

---

## 🛠️ Technical Features

- **Pure Vanilla JavaScript** - No heavy frameworks, fast loading
- **Blockly Integration** - Authentic block rendering using MIT App Inventor's Blockly library
- **JSZip Support** - Client-side ZIP handling for AIA/AIX files
- **Marked.js** - Beautiful markdown rendering
- **html2canvas** - High-quality PNG export functionality

---

## 🎨 UI/UX Highlights

- 🌓 **Theme Toggle** - Smooth light/dark mode transition
- 📱 **Mobile First** - Swipe-based navigation on mobile
- 🎭 **Glass Morphism** - Modern glassmorphism design elements
- ✨ **Micro Animations** - Subtle hover effects and transitions
- 🎨 **Color Coded Blocks** - Events, methods, properties with distinct colors

---

## Screenshots

<img width="1629" height="895" alt="Home-light-theme" src="https://github.com/user-attachments/assets/0aa15dc6-f684-45a7-b5d2-e2fa1e83df26" />
<img width="1631" height="899" alt="dark-theme" src="https://github.com/user-attachments/assets/acd7f5e9-fbb1-4472-a548-6613bcfa43ba" />

---

<img width="1641" height="899" alt="aix-light-theme" src="https://github.com/user-attachments/assets/ea4795f8-ab0a-4302-ae0f-bfd6aa9a05ad" />
<img width="1634" height="904" alt="dark2" src="https://github.com/user-attachments/assets/8b1e7d77-6053-480c-b4e1-a8090ef42b5f" />
<img width="1635" height="891" alt="aia-vew-demo3" src="https://github.com/user-attachments/assets/c580f2eb-fef9-4787-8155-064c07405249" />
<img width="1633" height="894" alt="aia-vew-demo2" src="https://github.com/user-attachments/assets/c11ecc3b-77e4-4234-8901-cab150bdf5a2" />

---

## 📦 Installation

<details>
<summary><strong>🌐 Use Online (Recommended)</strong></summary>

Simply visit: **[https://techhamara.github.io/BlockLens/](https://techhamara.github.io/BlockLens/)**

No installation required! Just upload your `.aia` or `.aix` file.
</details>

<details>
<summary><strong>💻 Run Locally</strong></summary>

### Prerequisites
- Python 2.7 or Python 3.x
- An internet connection (for initial setup)

### Steps
1. Clone or download this repository
   ```bash
   git clone https://github.com/TechHamara/BlockLens.git
   ```

2. Navigate to the project folder
   ```bash
   cd ai-unchive
   ```

3. Install dependencies
   ```bash
   pip install requests
   ```

4. Start the server
   ```bash
   python setup.py serve
   ```

5. Open `http://localhost:8000` in your browser
</details>

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

| Type | Description |
|------|-------------|
| 🐛 **Bug Reports** | Found a bug? Open an issue with steps to reproduce |
| 💡 **Feature Requests** | Have an idea? Share it in discussions |
| 🔧 **Pull Requests** | Fixed something? Submit a PR! |
| 📝 **Documentation** | Improve our docs and README |
| 🌍 **Translations** | Help translate to other languages |

### Development Guidelines

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style
- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing code patterns
- Test changes in both light and dark modes

---

## 📋 Changelog

### Helper Support
- ✅ **Dynamic Dropdowns**: Automatically renders helper blocks for properties like `AlignHorizontal`, `ScreenOrientation`, etc.
- ✅ **Asset Picker**: Visual asset selection blocks in documentation.

## 📋 Changelog

### Version 1.1.0 (Latest)
#### 🆕 New Features
- **Helper Blocks**: Added full support for rendering helper blocks (dropdowns, asset pickers) in documentation.
- **Professional UI**: Revamped "Download Summary" button with modern gradient styling.
- **AIA Png Export**: Download full documentation (Project Summary + Blocks Images) as a ZIP file

#### 💅 UX Improvements
- **Scrollbars**: Added custom, high-contrast scrollbars for better visibility on both blocks and markdown pages.
- **Mobile Responsive**: Fixed Markdown documentation layout for mobile devices (padding, font sizes, table scrolling).
- **Keyboard Navigation**: Added arrow key support for scrolling through block previews.

#### 🐛 Bug Fixes
- Fixed issue where some blocks were not rendering correctly in the documentation.
- Resolved mobile overflow issues in documentation tables.
- Summary Download Button working properly(Download full documentation (Project Summary + Blocks Images) as a ZIP file)

### Version 1.0.0
- Initial Release 

---

## 🎯 Community Posts

- App Inventor Community: [BlockLens - Advanced AIA Viewer & AIX Analyzer]()
- Kodular Community: [BlockLens - Advanced AIA Viewer & AIX Analyzer]()
- Niotron Community: [BlockLens - Advanced AIA Viewer & AIX Analyzer]()

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- **[Peter Mathijssen](https://community.kodular.io/u/peter/summary)** - Original logo design
- **[MIT App Inventor Blockly](https://github.com/mit-cml/appinventor-sources)** - Block rendering library (forked from ai-unchive [https://github.com/Kodular/ai-unchive](https://github.com/Kodular/ai-unchive))
- **[JSZip](https://stuk.github.io/jszip/)** - ZIP file handling
- **[Marked.js](https://marked.js.org/)** - Markdown parsing

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/TechHamara">TechHamara</a>
</p>

<p align="center">
  <a href="https://techhamara.github.io/BlockLens/">🌐 Website</a> •
  <a href="https://github.com/TechHamara/BlockLens/issues">🐛 Report Bug</a> •
  <a href="https://github.com/TechHamara/BlockLens/discussions">💬 Discussions</a>
</p>
