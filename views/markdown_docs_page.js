// Markdown Documentation Page - Simple Preview/Raw toggle like docGen2.html reference
// Shows markdown documentation with preview mode and raw code toggle
// Uses real Blockly rendering for authentic App Inventor-style blocks

import { View } from './view.js';
import { Label, Button, Dialog, Downloader, Dropdown, DropdownItem } from './widgets.js';
import { ExtensionViewer, MockBlockRenderer } from '../unchive/extension_viewer.js';
import { BlocklyBlockRenderer } from './blockly_block_renderer.js';
import { AIProject, BlocklyWorkspace } from '../unchive/ai_project.js';
import { ImageCompressor } from './image_compressor.js';
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
                // Classic AI2 Colors
                event: { fill: '#b18e35', stroke: '#B38520' },    // AI2 Component Mustard/Gold
                method: { fill: '#7c5385', stroke: '#6421B3' },   // AI2 Component Purple
                property: { fill: '#266643', stroke: '#23803C' }  // AI2 Component Green
            },
            'Kodular': {
                // Kodular's slightly muted, modern pastel-material palette
                event: { fill: '#ffa726', stroke: '#B87322' },    // Kodular Amber/Orange
                method: { fill: '#5e35b1', stroke: '#624188' },   // Kodular Soft Indigo/Purple
                property: { fill: '#388e3c', stroke: '#318548' }  // Kodular Teal-ish Green
            },
            'Niotron': {
                // Niotron's vibrant, high-contrast Material Design palette
                event: { fill: '#FF9800', stroke: '#C67600' },    // Niotron Material Orange
                method: { fill: '#9C27B0', stroke: '#7A1EA1' },   // Niotron Material Purple
                property: { fill: '#4CAF50', stroke: '#388E3C' }  // Niotron Material Green
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
                    ${this.extractAndRenderLinks(this.descriptor.helpString || '')}  
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
        this.applyTheme(this.currentTheme, 50);
    }

    setTheme(themeName) {
        // Normalize incoming value and guard against invalid names
        themeName = (themeName || '').toString().trim();
        console.log(`\n✅ ====== THEME SELECTOR ====== `);
        console.log(`🎯 setTheme called with: '${themeName}'`);

        if (!MarkdownDocsPage.THEMES[themeName]) {
            console.warn(`Theme '${themeName}' not found, falling back to default`);
            themeName = 'App Inventor';
        }

        // always update even if the same theme is selected so colors are reapplied
        this.currentTheme = themeName;

        // Update the dropdown UI (if available)
        if (this.toolbar && this.toolbar.themeDropdown) {
            this.toolbar.themeDropdown.setValue(themeName);
        }

        // Apply colors IMMEDIATELY
        console.log(`\n⏱️  Applying theme now...`);
        this.applyTheme(themeName, 0);
        
        // Retry after delay
        setTimeout(() => {
            console.log(`⏱️  Retry #1...`);
            this.applyTheme(themeName, 0);
        }, 150);

        setTimeout(() => {
            console.log(`⏱️  Retry #2...`);
            this.applyTheme(themeName, 0);
        }, 300);
    }

    applyTheme(themeName, wait = 50) {
        const theme = MarkdownDocsPage.THEMES[themeName];
        if (!theme) {
            console.warn(`❌ Theme '${themeName}' not found`);
            return;
        }

        console.log(`📋 applyTheme: theme=${themeName}, wait=${wait}ms`);

        if (!this.previewArea || !this.previewArea.domElement) {
            console.warn(`❌ previewArea not available`);
            return;
        }

        // Find containers
        const containers = this.previewArea.domElement.querySelectorAll(`.docs-block-preview, .docs-block-export`);
        console.log(`Found ${containers.length} containers`);

        if (containers.length === 0) {
            console.warn(`⚠️ No containers found`);
            return;
        }

        // Process each container
        containers.forEach((container, idx) => {
            const type = container.getAttribute('data-block-type');
            
            if (!type || !theme[type]) {
                console.warn(`Container ${idx}: type="${type}" - SKIP (not in theme)`);
                return;
            }

            const colors = theme[type];
            console.log(`Container ${idx}: type="${type}" -> colors`);

            // Find SVG (with wait)
            setTimeout(() => {
                const svg = container.querySelector('svg');
                if (!svg) {
                    console.warn(`Container ${idx}: SVG NOT FOUND`);
                    return;
                }
                
                console.log(`Container ${idx}: SVG found! Coloring...`);
                
                // Step 1: Color main block FIRST
                this.applyColorToSvg(svg, colors);
                
                // Step 2: Color helpers AFTER (so they override)
                setTimeout(() => {
                    this.applyHelperBlocksRed(svg);
                }, 20);
            }, wait);
        });
    }

    /**
     * Apply theme colors to MAIN block only
     */
    applyColorToSvg(svg, colors) {
        if (!svg || !colors) {
            console.warn('applyColorToSvg: missing svg or colors');
            return;
        }

        try {
            console.log('🎨 applyColorToSvg - MAIN BLOCK:', colors);
            
            // Get ONLY the first (main) block group
            const mainGroup = svg.querySelector('g.blocklyDraggable');
            if (!mainGroup) {
                console.warn('⚠️ No main group found');
                return;
            }

            // Color ONLY elements in main group
            const mainElements = mainGroup.querySelectorAll('path, rect, circle, ellipse, polygon');
            console.log(`Found ${mainElements.length} elements to color`);

            let count = 0;
            mainElements.forEach((elem) => {
                const fill = elem.getAttribute('fill');
                
                // Skip white/transparent/none
                if (!fill || fill === '#ffffff' || fill === 'white' || fill === 'none') {
                    return;
                }

                // Don't touch red (leave for helpers)
                if (fill === '#BF4343') {
                    return;
                }

                // Color it
                elem.setAttribute('fill', colors.fill);
                elem.setAttribute('stroke', colors.stroke);
                elem.style.fill = colors.fill + ' !important';
                elem.style.stroke = colors.stroke + ' !important';
                count++;
            });

            console.log(`✅ Main block: colored ${count} elements`);

        } catch (e) {
            console.error('❌ Error:', e);
        }
    }

    /**
     * Apply RED color to HELPER blocks only (separate function)
     * This forcefully colors ALL elements in helper blocks to red
     */
    applyHelperBlocksRed(svg) {
        if (!svg) return;

        try {
            console.log('🔴 applyHelperBlocksRed - Making helpers RED');
            
            // Get all groups
            const allGroups = Array.from(svg.querySelectorAll('g.blocklyDraggable'));
            console.log(`Total groups: ${allGroups.length}`);
            
            if (allGroups.length <= 1) {
                console.log('ℹ️ No helper blocks');
                return;
            }

            const helperRed = '#BF4343';
            let filledCount = 0;
            let pathCount = 0;

            // Color groups 1+ (helpers) - FORCEFULLY
            for (let i = 1; i < allGroups.length; i++) {
                const group = allGroups[i];
                console.log(`\nProcessing group ${i} (helper)...`);
                
                // Get ALL elements that have any fill or stroke
                const allElems = group.querySelectorAll('*');
                console.log(`  Found ${allElems.length} total elements`);
                
                allElems.forEach((elem) => {
                    const tag = elem.tagName.toLowerCase();
                    
                    // Color SVG shape elements
                    if (['path', 'rect', 'circle', 'ellipse', 'polygon'].includes(tag)) {
                        // FORCE set both fill and stroke
                        elem.setAttribute('fill', helperRed);
                        elem.setAttribute('stroke', helperRed);
                        
                        // FORCE via style with !important
                        elem.style.fill = helperRed + ' !important';
                        elem.style.stroke = helperRed + ' !important';
                        
                        // Also remove any other fill style attributes
                        elem.removeAttribute('fill-opacity');
                        
                        filledCount++;
                        if (['path', 'rect'].includes(tag)) {
                            pathCount++;
                        }
                    }
                });
                
                console.log(`  ✓ Colored ${allElems.length} elements in group ${i}`);
            }

            console.log(`\n✅ DONE: ${filledCount} total elements, ${pathCount} shapes colored RED`);

        } catch (e) {
            console.error('❌ Error in applyHelperBlocksRed:', e);
        }
    }

    /**
     * Darken a color by a percentage
     */
    darkenColor(hex, percent) {
        try {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const r = Math.max(0, (num >> 16) - amt);
            const g = Math.max(0, (num >> 8 & 0x00FF) - amt);
            const b = Math.max(0, (num & 0x0000FF) - amt);
            return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
        } catch (e) {
            return hex; // Return original if error
        }
    }

    /**
     * Extract and render links from helpString HTML
     * Converts HTML links to clickable elements
     */
    extractAndRenderLinks(htmlString) {
        if (!htmlString) return '';

        try {
            // Extract all <a> tags from the HTML string
            const linkRegex = /<a\s+href=["']([^"']+)["']\s*(?:target=["']([^"']*)["'])?\s*>\s*<small>\s*<u>([^<]+)<\/u>\s*<\/small>\s*<\/a>/gi;
            let links = [];
            let match;

            while ((match = linkRegex.exec(htmlString)) !== null) {
                links.push({
                    href: match[1],
                    target: match[2] || '_blank',
                    text: match[3]
                });
            }

            if (links.length === 0) return '';

            // Render as a nice link section
            let linksHtml = '<div class="docs-links-section" style="margin-top: 16px; padding: 12px; background: rgba(98, 0, 234, 0.08); border-radius: 8px; border-left: 4px solid #6200EA;">';
            linksHtml += '<p style="margin: 0 0 8px 0; font-size: 0.9em; color: #666;"><strong>📎 Quick Links:</strong></p>';
            linksHtml += '<div style="display: flex; gap: 12px; flex-wrap: wrap;">';

            links.forEach(link => {
                linksHtml += `<a href="${link.href}" target="${link.target}" style="display: inline-block; padding: 6px 12px; background: #6200EA; color: white; text-decoration: none; border-radius: 20px; font-size: 0.85em; transition: all 0.2s; border: none;" onmouseover="this.style.background='#5000D0'" onmouseout="this.style.background='#6200EA'">${link.text}</a>`;
            });

            linksHtml += '</div></div>';
            return linksHtml;
        } catch (e) {
            console.error('Error extracting links:', e);
            return '';
        }
    }

    get descriptor() {
        return this.viewers[0]?.extension?.descriptorJSON || {};
    }

    colorBlocksRecursive(element, colors) {
        if (!element) return;

        // Color this element if it's a block
        if (element.classList && element.classList.contains('blocklyDraggable')) {
            // Find all path elements in this block
            const paths = element.querySelectorAll('path.blocklyPath');
            paths.forEach(path => {
                path.setAttribute('fill', colors.fill);
                path.setAttribute('stroke', colors.stroke);
                path.style.fill = colors.fill;
                path.style.stroke = colors.stroke;
            });
        }

        // Recursively color child blocks (but skip helper blocks)
        Array.from(element?.children || []).forEach(child => {
            if (child.classList && !child.classList.contains('blocklyNote')) {
                this.colorBlocksRecursive(child, colors);
            }
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
                const isMobile = window.innerWidth <= 768;
                const maxWidth = isMobile ? 350 : 450;

                wrapperDiv.style.maxWidth = (maxWidth + 50) + 'px'; // +50 for download button
                wrapperDiv.style.width = 'auto';
                wrapperDiv.style.minWidth = '50px';
                wrapperDiv.style.overflow = isMobile ? 'auto' : 'visible';
                previewDiv.style.overflow = isMobile ? 'auto' : 'visible';
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

        // After rendering, adjust container width
        requestAnimationFrame(() => {
            const isMobile = window.innerWidth <= 768;
            const maxWidth = isMobile ? 350 : 450;

            previewDiv.style.maxWidth = (maxWidth + 50) + 'px';
            previewDiv.style.width = 'auto';
            previewDiv.style.overflow = isMobile ? 'auto' : 'visible';
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

        // After rendering, adjust container width
        requestAnimationFrame(() => {
            const isMobile = window.innerWidth <= 768;
            const maxWidth = isMobile ? 350 : 450;

            previewDiv.style.maxWidth = (maxWidth + 50) + 'px';
            previewDiv.style.width = 'auto';
            previewDiv.style.overflow = isMobile ? 'auto' : 'visible';
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
                // Apply mobile-responsive styles to SVG
                this.applyMobileBlockStyles(container);
                // Apply theme colors immediately after rendering
                setTimeout(() => {
                    const svg = container.querySelector('svg');
                    if (svg) {
                        const blockType = type; // Use the type parameter, not the attribute
                        const theme = MarkdownDocsPage.THEMES[this.currentTheme];
                        console.log(`Coloring block: type=${blockType}, theme=${this.currentTheme}, colors=`, theme[blockType]);
                        if (theme && blockType && theme[blockType]) {
                            this.applyColorToSvg(svg, theme[blockType]);
                        }
                    }
                }, 50);
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
                    // Apply mobile-responsive styles to SVG
                    this.applyMobileBlockStyles(container);
                    // Apply theme colors immediately after rendering
                    setTimeout(() => {
                        const renderedSvg = container.querySelector('svg');
                        if (renderedSvg) {
                            const blockType = type; // Use the type parameter
                            const theme = MarkdownDocsPage.THEMES[this.currentTheme];
                            console.log(`Coloring fallback block: type=${blockType}, theme=${this.currentTheme}, colors=`, theme[blockType]);
                            if (theme && blockType && theme[blockType]) {
                                this.applyColorToSvg(renderedSvg, theme[blockType]);
                            }
                        }
                    }, 50);
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                container.innerHTML = '<div style="color:red;padding:8px;font-size:12px;">Block unavailable</div>';
            }
        }
    }

    /**
     * Apply mobile-responsive styles to block SVG
     * Desktop: 350-450px width, 80-100px height, no scroll
     * Mobile: 350px width, 80px height, horizontal scroll enabled
     */
    applyMobileBlockStyles(container) {
        requestAnimationFrame(() => {
            const svg = container.querySelector('svg');
            if (!svg) return;

            // Ensure SVG has proper namespace and attributes
            if (!svg.getAttribute('xmlns')) {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            // Get bounding box to ensure viewBox is correct
            let bbox;
            try {
                bbox = svg.getBBox();
            } catch (e) {
                // If getBBox fails, use width/height attributes
                bbox = {
                    x: 0,
                    y: 0,
                    width: parseFloat(svg.getAttribute('width') || 100),
                    height: parseFloat(svg.getAttribute('height') || 80)
                };
            }

            const currentWidth = Math.max(bbox.width, parseFloat(svg.getAttribute('width') || bbox.width));
            const currentHeight = Math.max(bbox.height, parseFloat(svg.getAttribute('height') || bbox.height));

            // Set preserveAspectRatio to prevent distortion
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Set viewBox with small padding to prevent clipping
            const padding = 4;
            svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${currentWidth + padding * 2} ${currentHeight + padding * 2}`);

            // Check if mobile
            const isMobile = window.innerWidth <= 768;

            // Set constraints based on device
            const maxWidth = isMobile ? 350 : 450;
            const maxHeight = isMobile ? 80 : 100;
            const minHeight = 80;

            // Calculate scale to fit within constraints
            let scale = 1;
            let newWidth = currentWidth;
            let newHeight = currentHeight;

            if (currentWidth > maxWidth || currentHeight > maxHeight) {
                const widthScale = maxWidth / currentWidth;
                const heightScale = maxHeight / currentHeight;
                scale = Math.min(widthScale, heightScale, 1);
                newWidth = currentWidth * scale;
                newHeight = currentHeight * scale;
            }

            // Apply styling
            svg.setAttribute('width', Math.ceil(newWidth));
            svg.setAttribute('height', Math.ceil(newHeight));

            // Set container constraints
            svg.style.maxWidth = maxWidth + 'px';
            svg.style.maxHeight = maxHeight + 'px';
            svg.style.minHeight = minHeight + 'px';
            svg.style.width = 'auto';
            svg.style.height = 'auto';
            svg.style.display = 'block';
            svg.style.overflow = isMobile ? 'auto' : 'visible';

            // Ensure SVG is responsive
            svg.classList.add('blocklySvg');
        });
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
     * Generate PNG Blob from a Block container with size constraints
     * Uses ImageCompressor utility for reliable compression
     * MAX: 500px width × 80px height
     * @param {HTMLElement} container - Container with the block SVG
     * @returns {Promise<Blob>}
     */
    async getBlockPngBlob(container) {
        return new Promise((resolve, reject) => {
            try {
                const svg = container.querySelector('svg');
                if (!svg) {
                    reject(new Error('No SVG found in container'));
                    return;
                }

                // Use the new ImageCompressor utility
                ImageCompressor.svgToPNG(svg)
                    .then(blob => {
                        resolve(blob);
                    })
                    .catch(error => {
                        console.error('ImageCompressor error:', error);
                        reject(error);
                    });

            } catch (error) {
                console.error('Error in getBlockPngBlob:', error);
                reject(error);
            }
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

        this.showToast(`📦 Preparing ${blocks.length} blocks (max 80px×500px)...`);
        return this.downloadBlocksFromArray(blocks, 'blocks');
    }

    /**
     * Download blocks from an array with compression and size constraints
     * @param {Array} blocks - Array of block containers to download
     * @param {String} subfolder - Optional subfolder name for blocks in ZIP (default: root)
     */
    async downloadBlocksFromArray(blocks, subfolder = '') {
        const info = this.viewers[0]?.getInfo();
        const filename = subfolder ?
            `${(info?.name || 'extension').replace(/[^a-zA-Z0-9]/g, '_')}_blocks.zip` :
            `${(info?.name || 'extension').replace(/[^a-zA-Z0-9]/g, '_')}_blocks.zip`;

        try {
            if (!window.zip) throw new Error('ZIP library not loaded');
            const blobWriter = new window.zip.BlobWriter('application/zip');

            await new Promise((resolve, reject) => {
                window.zip.createWriter(blobWriter, (writer) => {
                    // Recursive function to add files sequentially
                    let index = 0;
                    const usedNames = new Set();
                    let addedCount = 0;

                    const addNextFile = async () => {
                        if (index >= blocks.length) {
                            // All files added, close writer
                            writer.close((blob) => {
                                console.log(`✅ ZIP created: ${blocks.length} blocks compressed`);
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

                            const filePath = subfolder ? `${subfolder}/${uniqueName}.png` : `${uniqueName}.png`;
                            writer.add(filePath, new window.zip.BlobReader(pngBlob), () => {
                                // Success callback
                                addedCount++;
                                console.log(`  ✓ Added ${filePath} (${addedCount}/${blocks.length})`);
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

            this.showToast(`✅ Downloaded ${blocks.length} blocks (compressed ZIP)!`);
        } catch (error) {
            console.error('Error downloading blocks:', error);
            const errorMessage = error.message || error.toString() || 'Unknown error';
            new Dialog('Export Error', 'Failed to export blocks: ' + errorMessage).open();
            this.showToast('❌ Download failed');
        }
    }

    /**
     * Download full documentation with markdown and block PNGs (compressed ZIP)
     */
    async downloadFullDocumentation() {
        // Collect rendered blocks
        const blocks = this.collectRenderedBlockSVGs();

        this.showToast(`📄 Preparing documentation with ${blocks.length} blocks (max 80px×500px)...`);

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

                    console.log('Adding documentation.md');
                    writer.add('documentation.md', new window.zip.BlobReader(mdBlob), () => {

                        // Then add blocks
                        let index = 0;
                        const usedNames = new Set();
                        let addedCount = 1; // Start at 1 for the markdown file

                        const addNextFile = async () => {
                            if (index >= blocks.length) {
                                writer.close((blob) => {
                                    console.log(`✅ ZIP created: documentation.md + ${blocks.length} blocks compressed`);
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

                                const filePath = `blocks/${uniqueName}.png`;
                                writer.add(filePath, new window.zip.BlobReader(pngBlob), () => {
                                    addedCount++;
                                    console.log(`  ✓ Added ${filePath} (${addedCount}/${blocks.length + 1})`);
                                    addNextFile();
                                });
                            } catch (e) {
                                console.error(`Error adding block ${block.name}:`, e);
                                // Skip failed block and continue
                                addNextFile();
                            }
                        };

                        // Start adding block files
                        addNextFile();

                    });
                }, (err) => {
                    reject(err);
                });
            });

            this.showToast(`✅ Downloaded docs with ${blocks.length} blocks (compressed ZIP)!`);
        } catch (error) {
            console.error('Error downloading documentation:', error);
            const errorMessage = error.message || error.toString() || 'Unknown error';
            new Dialog('Export Error', 'Failed to export documentation: ' + errorMessage).open();
            this.showToast('❌ Download failed');
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
            (e) => {
                // trim whitespace just in case
                const val = (e.target.value || '').toString().trim();
                this.page.setTheme(val);
            }
        );

        Object.keys(MarkdownDocsPage.THEMES).forEach(themeName => {
            const item = new DropdownItem(themeName, themeName);
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
