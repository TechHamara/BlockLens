// Markdown Documentation Page - Simple Preview/Raw toggle like docGen2.html reference
// Shows markdown documentation with preview mode and raw code toggle
// Uses real Blockly rendering for authentic App Inventor-style blocks

import { View } from './view.js';
import { Label, Button, Dialog, Downloader, Dropdown, DropdownItem } from './widgets.js';
import { ExtensionViewer, MockBlockRenderer } from '../unchive/extension_viewer.js';
import { BlocklyBlockRenderer } from './blockly_block_renderer.js';
import { AIProject, BlocklyWorkspace } from '../unchive/ai_project.js';
/**
 * MarkdownDocsPage - Documentation page with Preview/Raw toggle
 * Similar to docGen2.html reference design
 * Now includes block PNG export functionality
 */
export class MarkdownDocsPage extends View {
    constructor(extensions) {
        super('DIV');
        this.extensions = extensions || [];
        this.viewers = this.extensions.map(ext => new ExtensionViewer(ext));
        this.setStyleName('markdown-docs-page');

        // State
        this.viewMode = 'preview'; // 'preview' or 'raw'
        this.markdownContent = '';
        this.currentTheme = 'App Inventor'; // Default theme

        this.render();
    }

    static get THEMES() {
        return {
            'App Inventor': {
                event: { fill: '#B19E3E', stroke: '#8E7E32' }, // Goldish
                method: { fill: '#804080', stroke: '#663366' }, // Purple
                property: { fill: '#2F6D38', stroke: '#26572D' } // Green
            },
            'Kodular': {
                event: { fill: '#E0AB16', stroke: '#B38812' }, // Darker Yellow
                method: { fill: '#8E24AA', stroke: '#721D88' }, // Deep Purple
                property: { fill: '#009688', stroke: '#00786D' } // Teal
            },
            'Niotron': {
                event: { fill: '#FBC02D', stroke: '#C99A24' }, // Bright Yellow
                method: { fill: '#9C27B0', stroke: '#7D1F8D' }, // Violet
                property: { fill: '#4CAF50', stroke: '#3D8C40' } // Light Green
            }
        };
    }

    /**
     * Helper to enable keyboard scrolling for focused elements
     */
    enableKeyboardScroll(element) {
        element.setAttribute('tabindex', '0');
        element.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                element.scrollLeft += 50;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                element.scrollLeft -= 50;
                e.preventDefault();
            }
        });
    }

    render() {
        this.clear();

        if (this.viewers.length === 0) {
            this.addView(new Label('No extension documentation available.'));
            return;
        }

        // Generate markdown content
        this.markdownContent = this.viewers.map(v => v.generateMarkdown(false)).join('\n\n---\n\n');

        // Header
        this.header = new DocsHeader(this);
        this.addView(this.header);

        // Main content container
        this.mainContent = new View('DIV');
        this.mainContent.setStyleName('markdown-docs-main');
        this.addView(this.mainContent);

        // Toolbar with toggle and action buttons
        this.toolbar = new DocsToolbar(this);
        this.mainContent.addView(this.toolbar);

        // Content wrapper
        this.contentWrapper = new View('DIV');
        this.contentWrapper.setStyleName('markdown-docs-wrapper');
        this.mainContent.addView(this.contentWrapper);

        // Preview area (rendered markdown)
        this.previewArea = new View('DIV');
        this.previewArea.setStyleName('markdown-preview-area');
        this.previewArea.addStyleName('markdown-body');
        this.enableKeyboardScroll(this.previewArea.domElement);
        this.contentWrapper.addView(this.previewArea);

        // Raw code textarea
        this.rawArea = new View('TEXTAREA');
        this.rawArea.setStyleName('markdown-raw-area');
        this.rawArea.domElement.spellcheck = false;
        this.rawArea.domElement.value = this.markdownContent;
        this.rawArea.setVisible(false);
        this.contentWrapper.addView(this.rawArea);

        // Render preview
        this.renderPreview();
    }

    renderPreview() {
        // Generate rich documentation with inline block images
        this.previewArea.domElement.innerHTML = '';

        for (const viewer of this.viewers) {
            const info = viewer.getInfo();

            // Create documentation container
            const docContainer = document.createElement('div');
            docContainer.className = 'docs-extension-container';

            // Header
            docContainer.innerHTML = `
                <div class="docs-header-section">
                    <h1>🧩 ${info.name}</h1>
                    <p><strong>An extension for MIT App Inventor 2</strong></p>
                    ${info.description ? `<blockquote>${viewer.cleanDescription(info.description)}</blockquote>` : ''}
                </div>
                
                <h2>📝 Specifications</h2>
                <div class="table-responsive">
                    <table class="doc-table">
                        <tbody>
                            <tr><td>📦 Package</td><td><code>${info.type}</code></td></tr>
                            <tr><td>⚙️ Version</td><td><code>${info.versionName}</code></td></tr>
                            ${info.minSdk ? `<tr><td>📱 Minimum API Level</td><td>${info.minSdk}</td></tr>` : ''}
                            ${info.author ? `<tr><td>👤 Author</td><td>${info.author}</td></tr>` : ''}
                            <tr><td>📅 Updated</td><td>${info.dateBuilt ? info.dateBuilt.split('T')[0] : new Date().toISOString().split('T')[0]}</td></tr>
                            ${info.compiledBy ? `<tr><td>💻 Built Using</td><td>${info.compiledBy}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `;

            // Events Section
            if (info.events.length > 0) {
                const eventsSection = document.createElement('div');
                eventsSection.className = 'docs-section';
                eventsSection.innerHTML = `
                    <h2><kbd>Events:</kbd></h2>
                    <p><strong>${info.name}</strong> has total ${info.events.length} events.</p>
                `;

                info.events.forEach((event, idx) => {
                    const itemDiv = this.createBlockItem(event, 'event', info.name, idx + 1);
                    eventsSection.appendChild(itemDiv);
                });

                docContainer.appendChild(eventsSection);
            }

            // Methods Section
            if (info.methods.length > 0) {
                const methodsSection = document.createElement('div');
                methodsSection.className = 'docs-section';
                methodsSection.innerHTML = `
                    <h2><kbd>Methods:</kbd></h2>
                    <p><strong>${info.name}</strong> has total ${info.methods.length} methods.</p>
                `;

                info.methods.forEach((method, idx) => {
                    const itemDiv = this.createBlockItem(method, 'method', info.name, idx + 1);
                    methodsSection.appendChild(itemDiv);
                });

                docContainer.appendChild(methodsSection);
            }

            // Separate properties into Setters (write-only, read-write) and Getters (read-only, read-write)
            const setterProps = info.blockProperties.filter(p => p.rw === 'write-only' || p.rw === 'read-write');
            const getterProps = info.blockProperties.filter(p => p.rw === 'read-only' || p.rw === 'read-write');

            // Setters Section
            if (setterProps.length > 0) {
                const settersSection = document.createElement('div');
                settersSection.className = 'docs-section';
                settersSection.innerHTML = `
                    <h2><kbd>Setters:</kbd></h2>
                    <p><strong>${info.name}</strong> has total ${setterProps.length} setter properties.</p>
                `;

                setterProps.forEach((prop, idx) => {
                    const itemDiv = this.createSetterBlockItem(prop, info.name, idx + 1);
                    settersSection.appendChild(itemDiv);
                });

                docContainer.appendChild(settersSection);
            }

            // Getters Section
            if (getterProps.length > 0) {
                const gettersSection = document.createElement('div');
                gettersSection.className = 'docs-section';
                gettersSection.innerHTML = `
                    <h2><kbd>Getters:</kbd></h2>
                    <p><strong>${info.name}</strong> has total ${getterProps.length} getter properties.</p>
                `;

                getterProps.forEach((prop, idx) => {
                    const itemDiv = this.createGetterBlockItem(prop, info.name, idx + 1);
                    gettersSection.appendChild(itemDiv);
                });

                docContainer.appendChild(gettersSection);
            }

            // Regular Properties - also separate into Setters and Getters
            if (info.properties.length > 0) {
                // Convert properties to have rw field if not present (designer properties are usually read-write)
                const propsWithRw = info.properties.map(p => ({
                    ...p,
                    rw: p.rw || 'read-write' // Default to read-write for designer properties
                }));

                const propSetters = propsWithRw.filter(p => p.rw === 'write-only' || p.rw === 'read-write');
                const propGetters = propsWithRw.filter(p => p.rw === 'read-only' || p.rw === 'read-write');

                // Designer Properties Setters Section
                if (propSetters.length > 0) {
                    const propSettersSection = document.createElement('div');
                    propSettersSection.className = 'docs-section';
                    propSettersSection.innerHTML = `
                        <h2><kbd>Designer Property Setters:</kbd></h2>
                        <p><strong>${info.name}</strong> has total ${propSetters.length} designer property setters.</p>
                    `;

                    propSetters.forEach((prop, idx) => {
                        const itemDiv = this.createSetterBlockItem(prop, info.name, idx + 1);
                        propSettersSection.appendChild(itemDiv);
                    });

                    docContainer.appendChild(propSettersSection);
                }

                // Designer Properties Getters Section
                if (propGetters.length > 0) {
                    const propGettersSection = document.createElement('div');
                    propGettersSection.className = 'docs-section';
                    propGettersSection.innerHTML = `
                        <h2><kbd>Designer Property Getters:</kbd></h2>
                        <p><strong>${info.name}</strong> has total ${propGetters.length} designer property getters.</p>
                    `;

                    propGetters.forEach((prop, idx) => {
                        const itemDiv = this.createGetterBlockItem(prop, info.name, idx + 1);
                        propGettersSection.appendChild(itemDiv);
                    });

                    docContainer.appendChild(propGettersSection);
                }
            }

            // Footer
            const footer = document.createElement('div');
            footer.className = 'docs-footer';
            footer.innerHTML = `
                <hr>
                <div style="text-align: center;">
                    <p>📄 <strong>Documentation generated with</strong> <a href="https://techhamara.github.io/BlockLens/" target="_blank">BlockLens</a></p>
                    <p><sub>🛠️ Built for MIT App Inventor 2 & its distributions</sub></p>
                </div>
            `;
            docContainer.appendChild(footer);

            this.previewArea.domElement.appendChild(docContainer);
        }

        // Apply current theme to newly rendered blocks
        this.applyTheme(this.currentTheme);
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
    }

    applyTheme(themeName) {
        const theme = MarkdownDocsPage.THEMES[themeName];
        if (!theme) return;

        const containers = this.previewArea.domElement.querySelectorAll('.docs-block-preview');
        console.log(`Applying theme '${themeName}' to ${containers.length} containers`);

        containers.forEach(container => {
            const type = container.getAttribute('data-block-type');
            if (!type || !theme[type]) return;

            const colors = theme[type];
            const svg = container.querySelector('svg');
            if (!svg) return;

            // Find the main block group
            const rootBlock = svg.querySelector('.blocklyBlockCanvas > .blocklyDraggable') || svg.querySelector('.blocklyDraggable');
            if (!rootBlock) return;

            // Update main paths - ONLY direct children of the root block
            // ensuring we don't theme connected helper blocks or inputs (they keep their red color)
            const paths = Array.from(rootBlock.children).filter(el =>
                el.tagName === 'path' &&
                (el.classList.contains('blocklyPath') ||
                    el.classList.contains('blocklyPathLight') ||
                    el.classList.contains('blocklyPathDark'))
            );

            paths.forEach(path => {
                if (path.classList.contains('blocklyPath')) {
                    path.style.setProperty('fill', colors.fill, 'important');
                    path.style.setProperty('stroke', colors.stroke, 'important');
                } else if (path.classList.contains('blocklyPathLight')) {
                    path.style.setProperty('fill', 'none', 'important');
                    path.style.setProperty('stroke', 'rgba(255,255,255,0.3)', 'important');
                } else if (path.classList.contains('blocklyPathDark')) {
                    path.style.setProperty('fill', 'none', 'important');
                    path.style.setProperty('stroke', 'rgba(0,0,0,0.2)', 'important');
                }
            });
        });
    }

    /**
     * Create a block item with SVG preview and download button
     */
    createBlockItem(item, type, componentName, index) {
        const div = document.createElement('div');
        div.className = 'docs-block-item';
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

        const description = item.description ?
            item.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() :
            'No description available';

        // Build parameters table if available
        let paramsHtml = '';
        if (item.params && item.params.length > 0) {
            paramsHtml = `
                <div class="table-responsive">
                    <table class="doc-table">
                        <thead><tr><th>Parameter</th><th>Type</th></tr></thead>
                        <tbody>
                            ${item.params.map(p => `<tr><td>${p.name}</td><td><code>${p.type || 'any'}</code></td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Return type for methods
        let returnHtml = '';
        if (type === 'method' && item.returnType && item.returnType !== 'void') {
            returnHtml = `<p class="docs-return">Returns: <code>${item.returnType}</code></p>`;
        }

        // Create preview wrapper with inline-flex for proper alignment
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'docs-block-wrapper';
        wrapperDiv.style.display = 'inline-flex';
        wrapperDiv.style.alignItems = 'center';
        wrapperDiv.style.marginBottom = '8px';

        const previewDiv = document.createElement('div');
        previewDiv.className = 'docs-block-preview docs-block-export';
        previewDiv.setAttribute('data-block-type', type);
        previewDiv.setAttribute('data-ext-name', componentName);
        previewDiv.setAttribute('data-item-name', item.name);
        previewDiv.setAttribute('data-unique-id', uniqueId);
        const typeSuffix = type.charAt(0).toUpperCase() + type.slice(1);
        previewDiv.setAttribute('data-export-name', `${item.name}_${typeSuffix}`);
        this.enableKeyboardScroll(previewDiv);
        wrapperDiv.appendChild(previewDiv);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'docs-block-download-btn';
        downloadBtn.title = 'Download Block PNG';
        downloadBtn.innerHTML = '<i class="material-icons">download</i>';
        downloadBtn.addEventListener('click', () => this.downloadBlockImage(previewDiv, `${item.name}_${typeSuffix}`, uniqueId));
        wrapperDiv.appendChild(downloadBtn);

        div.innerHTML = `
            <h3><span class="num">${index}.</span> ${item.name}</h3>
            <p class="docs-description">${description}</p>
        `;
        div.appendChild(wrapperDiv);

        // Add params and return info after the block
        if (paramsHtml) {
            const paramsDiv = document.createElement('div');
            paramsDiv.innerHTML = paramsHtml;
            div.appendChild(paramsDiv);
        }
        if (returnHtml) {
            const returnDiv = document.createElement('div');
            returnDiv.innerHTML = returnHtml;
            div.appendChild(returnDiv);
        }

        // Render REAL Blockly block
        this.renderRealBlock(previewDiv, type, componentName, item);

        // After rendering, adjust container width to match block width
        requestAnimationFrame(() => {
            const svg = previewDiv.querySelector('.blocklySvg');
            if (svg) {
                const blockWidth = svg.getBoundingClientRect().width;
                if (blockWidth > 0) {
                    wrapperDiv.style.width = (blockWidth + 50) + 'px'; // +50 for download button
                }
            }
        });

        return div;
    }

    /**
     * Create a property block item with getter/setter real Blockly previews
     * Each getter/setter is now in its own container with width matching the block
     */
    createPropertyBlockItem(prop, componentName, index) {
        const div = document.createElement('div');
        div.className = 'docs-block-item';

        const description = prop.description ?
            prop.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() :
            'No description available';

        // Build helper info HTML
        let helperHtml = '';
        if (prop.helper) {
            const helperData = prop.helper.data;
            let helperTypeName = '';
            let enums = [];

            if (helperData && helperData.tag) {
                helperTypeName = helperData.tag;
            } else if (helperData && helperData.key) {
                helperTypeName = helperData.key;
            } else if (prop.helper.type && prop.helper.type !== 'OPTION_LIST') {
                helperTypeName = prop.helper.type;
            }

            if (helperData && helperData.options && Array.isArray(helperData.options)) {
                enums = helperData.options.map(opt => opt.name);
            }

            if (helperTypeName) {
                helperHtml += `<p>Helper type: <code>${helperTypeName}</code></p>`;
            }
            if (enums.length > 0) {
                helperHtml += `<p>Helper enums: ${enums.map(e => `<code>${e}</code>`).join(', ')}</p>`;
            }
        }

        div.innerHTML = `
            <h3><span class="num">${index}.</span> ${prop.name}</h3>
            <p class="docs-description">${description}</p>
            <div class="docs-property-blocks-container"></div>
            ${prop.type ? `<p>Input type: <code>${prop.type}</code></p>` : ''}
            ${helperHtml}
        `;

        const blocksContainer = div.querySelector('.docs-property-blocks-container');

        // Helper function to create a block with its own container
        const createBlockContainer = (accessType, exportName) => {
            const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

            // Outer preview div for each block (separate row)
            const previewDiv = document.createElement('div');
            previewDiv.className = 'docs-block-preview docs-block-preview--property-single';
            previewDiv.setAttribute('data-block-type', 'property');
            this.enableKeyboardScroll(previewDiv);
            previewDiv.style.display = 'inline-flex';
            previewDiv.style.alignItems = 'center';
            previewDiv.style.marginBottom = '8px';

            const wrapper = document.createElement('div');
            wrapper.className = 'docs-block-wrapper docs-block-wrapper--property';
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';

            const blockContainer = document.createElement('div');
            blockContainer.className = 'docs-block-svg docs-block-export';
            blockContainer.setAttribute('data-unique-id', uniqueId);
            blockContainer.setAttribute('data-export-name', exportName);
            wrapper.appendChild(blockContainer);

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'docs-block-download-btn';
            downloadBtn.title = 'Download Block PNG';
            downloadBtn.innerHTML = '<i class="material-icons">download</i>';
            downloadBtn.addEventListener('click', () => this.downloadBlockImage(blockContainer, exportName, uniqueId));
            wrapper.appendChild(downloadBtn);

            previewDiv.appendChild(wrapper);
            blocksContainer.appendChild(previewDiv);

            // Render the block
            this.renderRealBlock(blockContainer, 'property', componentName, prop, accessType);

            // After rendering, adjust container width to match block width
            requestAnimationFrame(() => {
                const svg = blockContainer.querySelector('.blocklySvg');
                if (svg) {
                    const blockWidth = svg.getBoundingClientRect().width;
                    if (blockWidth > 0) {
                        previewDiv.style.width = (blockWidth + 50) + 'px'; // +50 for download button
                    }
                }
            });
        };

        // Getter block (separate container)
        if (prop.rw !== 'write-only') {
            createBlockContainer('get', `${prop.name}_Getter`);
        }

        // Setter block (separate container)
        if (prop.rw !== 'read-only') {
            createBlockContainer('set', `${prop.name}_Setter`);
        }

        return div;
    }

    /**
     * Create a setter-only block item with description and dynamic width
     */
    createSetterBlockItem(prop, componentName, index) {
        const div = document.createElement('div');
        div.className = 'docs-block-item';

        const description = prop.description ?
            prop.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() :
            'No description available';

        // Build helper info HTML
        let helperHtml = '';
        if (prop.helper) {
            const helperData = prop.helper.data;
            let helperTypeName = '';
            let enums = [];

            if (helperData && helperData.tag) {
                helperTypeName = helperData.tag;
            } else if (helperData && helperData.key) {
                helperTypeName = helperData.key;
            } else if (prop.helper.type && prop.helper.type !== 'OPTION_LIST') {
                helperTypeName = prop.helper.type;
            }

            if (helperData && helperData.options && Array.isArray(helperData.options)) {
                enums = helperData.options.map(opt => opt.name);
            }

            if (helperTypeName) {
                helperHtml += `<p>Helper type: <code>${helperTypeName}</code></p>`;
            }
            if (enums.length > 0) {
                helperHtml += `<p>Helper enums: ${enums.map(e => `<code>${e}</code>`).join(', ')}</p>`;
            }
        }

        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const exportName = `${prop.name}_Setter`;

        div.innerHTML = `
            <h3><span class="num">${index}.</span> ${prop.name}</h3>
            <p class="docs-description">${description}</p>
        `;

        // Create preview wrapper with inline-flex
        const previewDiv = document.createElement('div');
        previewDiv.className = 'docs-block-preview docs-block-preview--property-single';
        previewDiv.setAttribute('data-block-type', 'property');
        this.enableKeyboardScroll(previewDiv);
        previewDiv.style.display = 'inline-flex';
        previewDiv.style.alignItems = 'center';
        previewDiv.style.marginBottom = '8px';

        const wrapper = document.createElement('div');
        wrapper.className = 'docs-block-wrapper docs-block-wrapper--property';
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';

        const blockContainer = document.createElement('div');
        blockContainer.className = 'docs-block-svg docs-block-export';
        blockContainer.setAttribute('data-unique-id', uniqueId);
        blockContainer.setAttribute('data-export-name', exportName);
        wrapper.appendChild(blockContainer);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'docs-block-download-btn';
        downloadBtn.title = 'Download Block PNG';
        downloadBtn.innerHTML = '<i class="material-icons">download</i>';
        downloadBtn.addEventListener('click', () => this.downloadBlockImage(blockContainer, exportName, uniqueId));
        wrapper.appendChild(downloadBtn);

        previewDiv.appendChild(wrapper);
        div.appendChild(previewDiv);

        // Add type and helper info
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            ${prop.type ? `<p>Input type: <code>${prop.type}</code></p>` : ''}
            ${helperHtml}
        `;
        div.appendChild(infoDiv);

        // Render the setter block
        this.renderRealBlock(blockContainer, 'property', componentName, prop, 'set');

        // After rendering, adjust container width to match block width
        requestAnimationFrame(() => {
            const svg = blockContainer.querySelector('.blocklySvg');
            if (svg) {
                const blockWidth = svg.getBoundingClientRect().width;
                if (blockWidth > 0) {
                    previewDiv.style.width = (blockWidth + 50) + 'px';
                }
            }
        });

        return div;
    }

    /**
     * Create a getter-only block item with description and dynamic width
     */
    createGetterBlockItem(prop, componentName, index) {
        const div = document.createElement('div');
        div.className = 'docs-block-item';

        const description = prop.description ?
            prop.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() :
            'No description available';

        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const exportName = `${prop.name}_Getter`;

        div.innerHTML = `
            <h3><span class="num">${index}.</span> ${prop.name}</h3>
            <p class="docs-description">${description}</p>
        `;

        // Create preview wrapper with inline-flex
        const previewDiv = document.createElement('div');
        previewDiv.className = 'docs-block-preview docs-block-preview--property-single';
        previewDiv.setAttribute('data-block-type', 'property');
        this.enableKeyboardScroll(previewDiv);
        previewDiv.style.display = 'inline-flex';
        previewDiv.style.alignItems = 'center';
        previewDiv.style.marginBottom = '8px';

        const wrapper = document.createElement('div');
        wrapper.className = 'docs-block-wrapper docs-block-wrapper--property';
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';

        const blockContainer = document.createElement('div');
        blockContainer.className = 'docs-block-svg docs-block-export';
        blockContainer.setAttribute('data-unique-id', uniqueId);
        blockContainer.setAttribute('data-export-name', exportName);
        wrapper.appendChild(blockContainer);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'docs-block-download-btn';
        downloadBtn.title = 'Download Block PNG';
        downloadBtn.innerHTML = '<i class="material-icons">download</i>';
        downloadBtn.addEventListener('click', () => this.downloadBlockImage(blockContainer, exportName, uniqueId));
        wrapper.appendChild(downloadBtn);

        previewDiv.appendChild(wrapper);
        div.appendChild(previewDiv);

        // Add return type info
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            ${prop.type ? `<p>Return type: <code>${prop.type}</code></p>` : ''}
        `;
        div.appendChild(infoDiv);

        // Render the getter block
        this.renderRealBlock(blockContainer, 'property', componentName, prop, 'get');

        // After rendering, adjust container width to match block width
        requestAnimationFrame(() => {
            const svg = blockContainer.querySelector('.blocklySvg');
            if (svg) {
                const blockWidth = svg.getBoundingClientRect().width;
                if (blockWidth > 0) {
                    previewDiv.style.width = (blockWidth + 50) + 'px';
                }
            }
        });

        return div;
    }

    /**
     * Render a real Blockly block into a container
     * Uses BlocklyBlockRenderer for authentic App Inventor-style blocks
     */
    renderRealBlock(container, type, extName, item, access = null, helper = null) {
        try {
            // Get the extension descriptor for this component
            const viewer = this.viewers.find(v => v.getInfo().name === extName);
            if (!viewer) {
                throw new Error(`Viewer not found for ${extName}`);
            }

            const descriptor = viewer.extension.descriptorJSON;
            const renderer = new BlocklyBlockRenderer(descriptor);

            let blockElement;
            if (type === 'event') {
                blockElement = renderer.createEventBlock(item);
            } else if (type === 'method') {
                blockElement = renderer.createMethodBlock(item);
            } else if (type === 'property') {
                if (access === 'get') {
                    blockElement = renderer.createPropertyGetterBlock(item);
                } else {
                    blockElement = renderer.createPropertySetterBlock(item);
                }
            }

            if (blockElement) {
                container.appendChild(blockElement);
            }
        } catch (e) {
            console.error('Error rendering real Blockly block:', e);
            // Fallback to MockBlockRenderer
            try {
                let svg;
                if (type === 'event') {
                    svg = MockBlockRenderer.createEventBlock(item, extName);
                } else if (type === 'method') {
                    svg = MockBlockRenderer.createMethodBlock(item, extName);
                } else if (type === 'property') {
                    if (access === 'get') {
                        svg = MockBlockRenderer.createPropertyGetterBlock(item, extName);
                    } else {
                        // Pass helper to render connected helper block
                        svg = MockBlockRenderer.createPropertySetterBlock(item, extName, helper);
                    }
                }
                if (svg) {
                    container.appendChild(svg);
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                container.innerHTML = '<div style="color:red;padding:8px;font-size:12px;">Block unavailable</div>';
            }
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        if (mode === 'preview') {
            // Sync textarea content back to markdownContent if edited
            this.markdownContent = this.rawArea.domElement.value;
            this.renderPreview();
            this.previewArea.setVisible(true);
            this.rawArea.setVisible(false);
        } else {
            this.previewArea.setVisible(false);
            this.rawArea.setVisible(true);
        }
        this.toolbar.updateToggle(mode);
    }

    /**
     * Download a block as PNG image
     * @param {HTMLElement} container - Container with the block SVG
     * @param {string} blockName - Name of the block
     * @param {string} uniqueId - Unique ID (unused for filename now)
     */
    async downloadBlockImage(container, blockName, uniqueId) {
        try {
            const blob = await this.getBlockPngBlob(container);
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeName = blockName.replace(/[^a-zA-Z0-9_-]/g, '_');
            link.download = `${safeName}.png`;
            link.href = downloadUrl;
            link.click();
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading block image:', error);
            this.showToast('Error downloading block');
        }
    }

    /**
     * Generate PNG Blob from a Block container (WYSIWYG)
     * @param {HTMLElement} container - Container with the block SVG
     * @returns {Promise<Blob>}
     */
    getBlockPngBlob(container) {
        return new Promise((resolve, reject) => {
            const svg = container.querySelector('svg');
            if (!svg) {
                reject(new Error('No SVG found in container'));
                return;
            }

            // Get SVG dimensions
            const bbox = svg.getBBox();
            const svgWidth = svg.getAttribute('width') || bbox.width + bbox.x + 10;
            const svgHeight = svg.getAttribute('height') || bbox.height + bbox.y + 10;

            // Add padding to prevent cropping
            const padding = 10;
            const totalWidth = parseFloat(svgWidth) + padding * 2;
            const totalHeight = parseFloat(svgHeight) + padding * 2;

            // Clone and prepare SVG for export with proper dimensions
            const svgClone = svg.cloneNode(true);
            svgClone.setAttribute('width', totalWidth);
            svgClone.setAttribute('height', totalHeight);

            // SYNC COMPUTED STYLES for WYSIWYG fidelity
            const sourceElements = svg.querySelectorAll('*');
            const cloneElements = svgClone.querySelectorAll('*');

            for (let i = 0; i < sourceElements.length; i++) {
                const source = sourceElements[i];
                const clone = cloneElements[i];

                if (!clone || source.tagName !== clone.tagName) continue;

                const computed = window.getComputedStyle(source);

                clone.style.fill = computed.fill;
                clone.style.stroke = computed.stroke;
                clone.style.strokeWidth = computed.strokeWidth;
                clone.style.opacity = computed.opacity;
                clone.style.display = computed.display;
                clone.style.visibility = computed.visibility;

                if (source.tagName === 'text' || source.tagName === 'tspan') {
                    clone.style.fontFamily = computed.fontFamily;
                    clone.style.fontSize = computed.fontSize;
                    clone.style.fontWeight = computed.fontWeight;
                    clone.style.fontStyle = computed.fontStyle;
                    clone.style.fill = computed.fill;
                }
            }

            // Wrap content in a group with translation for padding
            const content = svgClone.innerHTML;
            svgClone.innerHTML = `<g transform="translate(${padding}, ${padding})">${content}</g>`;

            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 2; // High resolution
                canvas.width = totalWidth * scale;
                canvas.height = totalHeight * scale;

                const ctx = canvas.getContext('2d');
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, totalWidth, totalHeight);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                }, 'image/png');
            };
            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(new Error('Error loading SVG for PNG export'));
            };
            img.src = url;
        });
    }

    copyToClipboard() {
        const text = this.rawArea.domElement.value || this.markdownContent;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!');
        }).catch(() => {
            // Fallback
            this.rawArea.domElement.select();
            document.execCommand('copy');
            this.showToast('Copied to clipboard!');
        });
    }

    downloadMarkdown() {
        const info = this.viewers[0]?.getInfo();
        const filename = `${(info?.name || 'extension').replace(/[^a-zA-Z0-9]/g, '_')}-docs.md`;
        const content = this.rawArea.domElement.value || this.markdownContent;
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        Downloader.downloadBlob(blob, filename);
        this.showToast('Download started!');
    }

    /**
     * Collect rendered Block SVGs from the preview (WYSIWYG)
     */
    collectRenderedBlockSVGs() {
        const blocks = [];
        // Target specific block previews used in docs
        const containers = this.previewArea.domElement.querySelectorAll('.docs-block-export');

        containers.forEach(container => {
            // Find real block SVG inside
            const svg = container.querySelector('svg');
            if (svg) {
                blocks.push({
                    name: container.getAttribute('data-export-name') || 'block',
                    container: container
                });
            }
        });

        return blocks;
    }

    /**
     * Download all blocks as PNG in a ZIP file
     */
    async downloadAllBlocks() {
        // Collect rendered blocks
        const blocks = this.collectRenderedBlockSVGs();

        if (blocks.length === 0) {
            new Dialog('No Blocks', 'No blocks available to download.').open();
            return;
        }

        this.showToast('Generating block PNGs...');
        return this.downloadBlocksFromArray(blocks);
    }

    /**
     * Download blocks from an array
     */
    async downloadBlocksFromArray(blocks) {
        const info = this.viewers[0]?.getInfo();
        const filename = `${(info?.name || 'extension').replace(/[^a-zA-Z0-9]/g, '_')}_blocks.zip`;

        try {
            if (!window.zip) throw new Error('ZIP library not loaded');
            const blobWriter = new window.zip.BlobWriter('application/zip');

            await new Promise((resolve, reject) => {
                window.zip.createWriter(blobWriter, (writer) => {
                    // Recursive function to add files sequentially
                    let index = 0;
                    const usedNames = new Set();

                    const addNextFile = async () => {
                        if (index >= blocks.length) {
                            // All files added, close writer
                            writer.close((blob) => {
                                Downloader.downloadBlob(blob, filename);
                                resolve();
                            });
                            return;
                        }

                        const block = blocks[index];
                        index++;

                        try {
                            const pngBlob = await this.getBlockPngBlob(block.container);

                            // Deduplicate filename
                            let baseName = block.name;
                            let uniqueName = baseName;
                            let counter = 1;
                            while (usedNames.has(uniqueName)) {
                                uniqueName = `${baseName}_${counter}`;
                                counter++;
                            }
                            usedNames.add(uniqueName);

                            writer.add(`${uniqueName}.png`, new window.zip.BlobReader(pngBlob), () => {
                                // Success callback
                                addNextFile();
                            });
                        } catch (e) {
                            console.error(`Error adding block ${block.name}:`, e);
                            // Skip failed block and continue
                            addNextFile();
                        }
                    };

                    // Start adding files
                    addNextFile();

                }, (err) => {
                    reject(err);
                });
            });

            this.showToast(`Downloaded ${blocks.length} blocks!`);
        } catch (error) {
            console.error('Error downloading blocks:', error);
            const errorMessage = error.message || error.toString() || 'Unknown error';
            new Dialog('Export Error', 'Failed to export blocks: ' + errorMessage).open();
        }
    }

    /**
     * Download full documentation with markdown and block PNGs
     */
    async downloadFullDocumentation() {
        // Collect rendered blocks
        const blocks = this.collectRenderedBlockSVGs();

        this.showToast('Generating full documentation...');

        const info = this.viewers[0]?.getInfo();
        const filename = `${(info?.name || 'extension').replace(/[^a-zA-Z0-9]/g, '_')}_full_docs.zip`;

        // Generate markdown with image references
        const markdownWithImages = this.viewers.map(v => v.generateMarkdown(true)).join('\n\n---\n\n');

        try {
            if (!window.zip) throw new Error('ZIP library not loaded');
            const blobWriter = new window.zip.BlobWriter('application/zip');

            await new Promise((resolve, reject) => {
                window.zip.createWriter(blobWriter, (writer) => {

                    // Add markdown file first
                    const mdBlob = new Blob([markdownWithImages], { type: 'text/markdown;charset=utf-8' });

                    writer.add('documentation.md', new window.zip.BlobReader(mdBlob), () => {

                        // Then add blocks
                        let index = 0;
                        const usedNames = new Set();

                        const addNextFile = async () => {
                            if (index >= blocks.length) {
                                writer.close((blob) => {
                                    Downloader.downloadBlob(blob, filename);
                                    resolve();
                                });
                                return;
                            }

                            const block = blocks[index];
                            index++;

                            try {
                                const pngBlob = await this.getBlockPngBlob(block.container);

                                // Deduplicate filename
                                let baseName = block.name;
                                let uniqueName = baseName;
                                let counter = 1;
                                while (usedNames.has(uniqueName)) {
                                    uniqueName = `${baseName}_${counter}`;
                                    counter++;
                                }
                                usedNames.add(uniqueName);

                                writer.add(`blocks/${uniqueName}.png`, new window.zip.BlobReader(pngBlob), () => {
                                    addNextFile();
                                });
                            } catch (e) {
                                console.error(`Error adding block ${block.name}:`, e);
                                addNextFile();
                            }
                        };

                        addNextFile();
                    });

                }, (err) => {
                    reject(err);
                });
            });

            this.showToast(`Downloaded documentation with ${blocks.length} blocks!`);
        } catch (error) {
            console.error('Error downloading full docs:', error);
            const errorMessage = error.message || error.toString() || 'Unknown error';
            new Dialog('Export Error', 'Failed to export full documentation: ' + errorMessage).open();
        }
    }

    showToast(message) {
        // Create toast if not exists
        if (!this.toast) {
            this.toast = new View('DIV');
            this.toast.setStyleName('docs-toast');
            this.addView(this.toast);
        }

        this.toast.domElement.innerHTML = `
            <i class="material-icons">check_circle</i>
            <span>${message}</span>
        `;
        this.toast.addStyleName('docs-toast--visible');

        setTimeout(() => {
            this.toast.removeStyleName('docs-toast--visible');
        }, 3000);
    }

    goBack() {
        if (window.RootPanel && window.RootPanel.showMainScreen) {
            window.RootPanel.showMainScreen();
        } else {
            console.error('RootPanel not found or showMainScreen missing');
        }
    }
}

/**
 * DocsHeader - Header with back button and title
 */
class DocsHeader extends View {
    constructor(page) {
        super('DIV');
        this.page = page;
        this.setStyleName('markdown-docs-header');
        this.render();
    }

    render() {
        // Left section
        const left = new View('DIV');
        left.setStyleName('markdown-docs-header__left');

        // Back button
        const backBtn = new Button('arrow_back', true);
        backBtn.addStyleName('markdown-docs-header__back');
        backBtn.domElement.title = 'Back to Home';
        backBtn.addClickListener(() => this.page.goBack());
        left.addView(backBtn);

        // Title
        const info = this.page.viewers[0]?.getInfo();
        const title = new Label(info?.name || 'Documentation');
        title.addStyleName('markdown-docs-header__title');
        left.addView(title);

        this.addView(left);
    }
}

/**
 * DocsToolbar - Toggle buttons and action buttons
 */
class DocsToolbar extends View {
    constructor(page) {
        super('DIV');
        this.page = page;
        this.setStyleName('markdown-docs-toolbar');
        this.render();
    }

    render() {
        // Toggle container
        this.toggleContainer = new View('DIV');
        this.toggleContainer.setStyleName('markdown-docs-toggle');

        // Preview button
        this.previewBtn = new Button('Preview', false);
        this.previewBtn.addStyleName('markdown-docs-toggle__btn');
        this.previewBtn.addStyleName('markdown-docs-toggle__btn--active');
        this.previewBtn.domElement.innerHTML = '<i class="material-icons">visibility</i> Preview';
        this.previewBtn.addClickListener(() => this.page.setViewMode('preview'));
        this.toggleContainer.addView(this.previewBtn);

        // Raw button
        this.rawBtn = new Button('Raw Code', false);
        this.rawBtn.addStyleName('markdown-docs-toggle__btn');
        this.rawBtn.domElement.innerHTML = '<i class="material-icons">code</i> Raw Code';
        this.rawBtn.addClickListener(() => this.page.setViewMode('raw'));
        this.toggleContainer.addView(this.rawBtn);

        this.addView(this.toggleContainer);

        // Theme Dropdown
        const themeContainer = new View('DIV');
        themeContainer.setStyleName('markdown-docs-theme-selector');
        // Add some margin for spacing
        themeContainer.domElement.style.marginLeft = '16px';
        themeContainer.domElement.style.display = 'flex';
        themeContainer.domElement.style.alignItems = 'center';

        const themeLabel = new Label('Theme: ');
        themeLabel.domElement.style.marginRight = '8px';
        themeLabel.domElement.style.fontWeight = '500';
        themeContainer.addView(themeLabel);

        this.themeDropdown = new Dropdown(
            this.page.currentTheme,
            (e) => this.page.setTheme(e.target.value)
        );

        Object.keys(MarkdownDocsPage.THEMES).forEach(themeName => {
            const item = new DropdownItem(themeName);
            item.domElement.value = themeName;
            this.themeDropdown.addDropdownItem(item);
        });

        themeContainer.addView(this.themeDropdown);
        this.toggleContainer.addView(themeContainer);

        // Action buttons container
        const actionsContainer = new View('DIV');
        actionsContainer.setStyleName('markdown-docs-actions');

        // Copy button
        const copyBtn = new Button('Copy', false);
        copyBtn.addStyleName('markdown-docs-action-btn');
        copyBtn.addStyleName('markdown-docs-action-btn--secondary');
        copyBtn.domElement.innerHTML = '<i class="material-icons">content_copy</i> Copy';
        copyBtn.addClickListener(() => this.page.copyToClipboard());
        actionsContainer.addView(copyBtn);

        // Download Markdown button
        const downloadBtn = new Button('Download', false);
        downloadBtn.addStyleName('markdown-docs-action-btn');
        downloadBtn.addStyleName('markdown-docs-action-btn--secondary');
        downloadBtn.domElement.innerHTML = '<i class="material-icons">description</i> MD';
        downloadBtn.domElement.title = 'Download Markdown Only';
        downloadBtn.addClickListener(() => this.page.downloadMarkdown());
        actionsContainer.addView(downloadBtn);

        // Download Blocks button
        const blocksBtn = new Button('Blocks', false);
        blocksBtn.addStyleName('markdown-docs-action-btn');
        blocksBtn.addStyleName('markdown-docs-action-btn--secondary');
        blocksBtn.domElement.innerHTML = '<i class="material-icons">image</i> Blocks';
        blocksBtn.domElement.title = 'Download All Block PNGs (ZIP)';
        blocksBtn.addClickListener(() => this.page.downloadAllBlocks());
        actionsContainer.addView(blocksBtn);

        // Download Full Docs button (primary)
        const fullDocsBtn = new Button('Full Docs', false);
        fullDocsBtn.addStyleName('markdown-docs-action-btn');
        fullDocsBtn.addStyleName('markdown-docs-action-btn--primary');
        fullDocsBtn.domElement.innerHTML = '<i class="material-icons">folder_zip</i> Full Docs';
        fullDocsBtn.domElement.title = 'Download Markdown + Block PNGs (ZIP)';
        fullDocsBtn.addClickListener(() => this.page.downloadFullDocumentation());
        actionsContainer.addView(fullDocsBtn);

        this.addView(actionsContainer);
    }

    updateToggle(mode) {
        if (mode === 'preview') {
            this.previewBtn.addStyleName('markdown-docs-toggle__btn--active');
            this.rawBtn.removeStyleName('markdown-docs-toggle__btn--active');
        } else {
            this.previewBtn.removeStyleName('markdown-docs-toggle__btn--active');
            this.rawBtn.addStyleName('markdown-docs-toggle__btn--active');
        }
    }
}
