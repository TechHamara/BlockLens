// Extension Viewer - Generate documentation and blocks for App Inventor extensions

import { View } from '../views/view.js';
import { Label, Button, Dialog, Downloader, Dropdown, DropdownItem } from '../views/widgets.js';

/**
 * ExtensionViewer - Main class for viewing and documenting extensions
 */
export class ExtensionViewer {
    constructor(extension) {
        this.extension = extension;
        this.descriptor = extension.descriptorJSON || {};
    }

    getInfo() {
        const desc = this.descriptor;
        const buildInfo = this.extension.buildInfo || {};

        let author = buildInfo.author || desc.author || 'Unknown';
        if (author.toLowerCase() === 'unknown') {
            author = null; // Hide author if unknown
        }

        let minSdk = '21'; // Default to 21
        if (buildInfo.androidMinSdk) {
            minSdk = Array.isArray(buildInfo.androidMinSdk) ? buildInfo.androidMinSdk[0] : buildInfo.androidMinSdk;
        } else if (desc.androidMinSdk) {
            minSdk = desc.androidMinSdk;
        }
        // Remove "API " prefix if present to avoid duplication
        minSdk = String(minSdk).replace(/^API\s+/i, '');

        let compiledBy = buildInfo.compiledBy;
        if (compiledBy) {
            // Format compiledBy: "FAST v2.8.4" -> "Fast <small><mark>v2.8.4</mark></small>"
            // Assuming format "CompilerName vVersion"
            const parts = compiledBy.split(' v');
            if (parts.length === 2) {
                const compiler = parts[0].charAt(0) + parts[0].slice(1).toLowerCase(); // Title case
                const version = 'v' + parts[1];
                compiledBy = `${compiler} <small><mark>${version}</mark></small>`;
            }
        }

        return {
            name: desc.name || 'Unknown Extension',
            type: this.extension.packageName || this.extension.name || desc.type || 'Unknown',
            version: desc.version || 1,
            versionName: desc.versionName || String(desc.version || 1),
            description: this.cleanDescription(desc.helpString || desc.helpUrl || ''),
            dateBuilt: desc.dateBuilt,
            fileSize: this.extension.fileSize,
            author: author,
            compiledBy: compiledBy,
            minSdk: minSdk,
            events: desc.events || [],
            methods: desc.methods || [],
            properties: desc.properties || [],
            blockProperties: desc.blockProperties || []
        };
    }

    cleanDescription(text) {
        if (!text) return 'No description available';
        return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || 'No description available';
    }

    /**
     * Generate markdown documentation with block image references
     * @param {boolean} includeImages - Whether to include block image references
     */
    generateMarkdown(includeImages = false) {
        const info = this.getInfo();
        const lines = [];
        const safeName = info.name.replace(/[^a-zA-Z0-9]/g, '_');

        // Header - professional centered design
        lines.push(`<div align="center">`);
        lines.push(``);
        lines.push(`# 🧩 ${info.name}`);
        lines.push(``);
        lines.push(`**An extension for MIT App Inventor 2**`);
        lines.push(``);
        if (info.description) {
            lines.push(`> ${this.cleanDescription(info.description)}`);
            lines.push(``);
        }
        lines.push(`</div>`);
        lines.push('');

        // Specifications - professional list format matching extension.txt
        lines.push('## 📝 Specifications');
        lines.push('* **'); // Maintaining the separator from reference
        lines.push(`📦 **Package:** ${info.type}`);
        if (info.fileSize) lines.push(`💾 **Size:** ${this.formatFileSize(info.fileSize)}`);
        lines.push(`⚙️ **Version:** ${info.versionName}`);
        if (info.minSdk) lines.push(`📱 **Minimum API Level:** ${info.minSdk}`);
        lines.push(`📅 **Updated On:** [date=${info.dateBuilt ? info.dateBuilt.split('T')[0] : new Date().toISOString().split('T')[0]} timezone="Asia/Calcutta"]`);
        if (info.compiledBy) lines.push(`💻 **Built Using:** ${info.compiledBy}`);
        lines.push('');

        // Events
        if (info.events.length > 0) {
            lines.push(`## <kbd>Events:</kbd>`);
            lines.push(`**${info.name}** has total ${info.events.length} events.`);
            lines.push('');

            info.events.forEach((event, index) => {
                lines.push(`### ${index + 1}. ${event.name}`);
                if (event.description) lines.push(`${this.cleanDescription(event.description)}`);
                lines.push('');

                if (includeImages) {
                    lines.push(`![${event.name}](blocks/event_${safeName}_${event.name}.png)`);
                    lines.push('');
                }

                const params = event.params || [];
                if (params.length > 0) {
                    lines.push('| Parameter | Type |');
                    lines.push('| - | - |');
                    for (const p of params) lines.push(`| ${p.name} | ${p.type || 'any'} |`);
                    lines.push('');
                }
            });
        }

        // Methods
        if (info.methods.length > 0) {
            lines.push(`## <kbd>Methods:</kbd>`);
            lines.push(`**${info.name}** has total ${info.methods.length} methods.`);
            lines.push('');

            info.methods.forEach((method, index) => {
                lines.push(`### ${index + 1}. ${method.name}`);
                if (method.description) lines.push(`${this.cleanDescription(method.description)}`);
                lines.push('');

                if (includeImages) {
                    lines.push(`![${method.name}](blocks/method_${safeName}_${method.name}.png)`);
                    lines.push('');
                }

                const params = method.params || [];
                if (params.length > 0) {
                    lines.push('| Parameter | Type |');
                    lines.push('| - | - |');
                    for (const p of params) lines.push(`| ${p.name} | ${p.type || 'any'} |`);
                    lines.push('');
                }

                if (method.returnType && method.returnType !== 'void') {
                    lines.push(`* Returns: \`${method.returnType}\``);
                    lines.push('');
                }
            });
        }

        // Setters (Block Properties)
        if (info.blockProperties.length > 0) {
            lines.push(`## <kbd>Setters:</kbd>`);
            lines.push(`**${info.name}** has total ${info.blockProperties.length} setter properties.`);
            lines.push('');

            info.blockProperties.forEach((prop, index) => {
                lines.push(`### ${index + 1}. ${prop.name}`);
                if (prop.description) lines.push(`${this.cleanDescription(prop.description)}`);
                lines.push('');

                if (includeImages) {
                    if (prop.rw !== 'write-only') {
                        lines.push(`![Get ${prop.name}](blocks/property_get_${safeName}_${prop.name}.png)`);
                    }
                    if (prop.rw !== 'read-only') {
                        lines.push(`![Set ${prop.name}](blocks/property_set_${safeName}_${prop.name}.png)`);
                    }
                    lines.push('');
                }

                // Input type
                if (prop.type) {
                    lines.push(`* Input type: \`${prop.type}\``);
                }

                // Helper logic
                if (prop.helper) {
                    const helperData = prop.helper.data;
                    let helperTypeName = "";

                    // Determine Type Name
                    if (helperData && helperData.tag) {
                        helperTypeName = helperData.tag;
                    } else if (helperData && helperData.key) {
                        helperTypeName = helperData.key;
                    } else if (prop.helper.type && prop.helper.type !== "OPTION_LIST") {
                        helperTypeName = prop.helper.type;
                    }

                    if (helperTypeName) {
                        lines.push(`* Helper type: \`${helperTypeName}\``);
                    }

                    // Determine Enums
                    let enums = [];
                    if (helperData && helperData.options && Array.isArray(helperData.options)) {
                        enums = helperData.options.map(opt => opt.name);
                    } else if (helperData && Array.isArray(helperData)) {
                        enums = helperData;
                    } else if (helperData && helperData.keys && Array.isArray(helperData.keys)) {
                        enums = helperData.keys;
                    } else if (prop.helper.keys && Array.isArray(prop.helper.keys)) {
                        enums = prop.helper.keys;
                    }

                    if (enums && enums.length > 0) {
                        const enumString = enums.map(item => `\`${item}\``).join(', ');
                        lines.push(`* Helper enums: ${enumString}`);
                    }
                }

                lines.push('');
            });
        }

        // Regular Properties (Getters)
        if (info.properties.length > 0) {
            lines.push(`## <kbd>Properties:</kbd>`);
            lines.push(`**${info.name}** has total ${info.properties.length} properties.`);
            lines.push('');

            info.properties.forEach((prop, index) => {
                lines.push(`### ${index + 1}. ${prop.name}`);
                if (prop.description) lines.push(`${this.cleanDescription(prop.description)}`);
                lines.push('');

                if (prop.type) {
                    lines.push(`* Type: \`${prop.type}\``);
                }
                if (prop.rw) {
                    lines.push(`* Access: \`${prop.rw}\``);
                }
                lines.push('');
            });
        }

        // No items message if empty
        if (info.events.length === 0 && info.methods.length === 0 && info.blockProperties.length === 0 && info.properties.length === 0) {
            lines.push('');
            lines.push('> No events, methods, or properties found in this extension.');
            lines.push('');
        }

        // Professional Footer
        lines.push('');
        lines.push('---');
        lines.push('');
        lines.push('<div align="center">');
        lines.push('<br>');
        lines.push('<p>');
        lines.push('📄 <strong>Documentation generated with</strong> <a href="https://techhamara.github.io/ai-unchive/" target="_blank">ai-unchive</a>');
        lines.push('</p>');
        lines.push('<p>');
        lines.push('<sub>🛠️ Built for MIT App Inventor 2 & its distributions</sub>');
        lines.push('</p>');
        lines.push('</div>');
        lines.push('');

        return lines.join('\n');
    }

    generateHtmlDocumentation() {
        const md = this.generateMarkdown(false);

        // Convert markdown tables to HTML tables
        const lines = md.split('\n');
        const processedLines = [];
        let inTable = false;
        let tableRows = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check if this is a table row (starts and ends with |)
            if (line.startsWith('|') && line.endsWith('|')) {
                // Check if this is the separator row (contains only |, -, :, and spaces)
                if (/^\|[\s\-:|]+\|$/.test(line)) {
                    continue; // Skip separator rows
                }

                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }

                // Extract cells from the row
                const cells = line.slice(1, -1).split('|').map(c => c.trim());
                tableRows.push(cells);
            } else {
                // Not a table row - if we were in a table, close it
                if (inTable && tableRows.length > 0) {
                    let tableHtml = '<table class="doc-table">';
                    tableRows.forEach((row, idx) => {
                        if (idx === 0) {
                            tableHtml += '<thead><tr>';
                            row.forEach(cell => {
                                tableHtml += `<th>${this.formatCell(cell)}</th>`;
                            });
                            tableHtml += '</tr></thead><tbody>';
                        } else {
                            tableHtml += '<tr>';
                            row.forEach(cell => {
                                tableHtml += `<td>${this.formatCell(cell)}</td>`;
                            });
                            tableHtml += '</tr>';
                        }
                    });
                    tableHtml += '</tbody></table>';
                    processedLines.push(tableHtml);
                    tableRows = [];
                    inTable = false;
                }

                // Process normal markdown line
                let processedLine = line
                    .replace(/^# (.*)$/g, '<h1>$1</h1>')
                    .replace(/^## (.*)$/g, '<h2>$1</h2>')
                    .replace(/^### (.*)$/g, '<h3>$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]*)`/g, '<code>$1</code>')
                    .replace(/^\* (.*)$/g, '<li>$1</li>')
                    .replace(/^> (.*)$/g, '<blockquote>$1</blockquote>')
                    .replace(/^---$/g, '<hr>');

                if (processedLine) {
                    processedLines.push(processedLine);
                } else {
                    processedLines.push('<br>');
                }
            }
        }

        // Close any remaining table
        if (inTable && tableRows.length > 0) {
            let tableHtml = '<table class="doc-table">';
            tableRows.forEach((row, idx) => {
                if (idx === 0) {
                    tableHtml += '<thead><tr>';
                    row.forEach(cell => {
                        tableHtml += `<th>${this.formatCell(cell)}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                } else {
                    tableHtml += '<tr>';
                    row.forEach(cell => {
                        tableHtml += `<td>${this.formatCell(cell)}</td>`;
                    });
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table>';
            processedLines.push(tableHtml);
        }

        return processedLines.join('');
    }

    formatCell(cell) {
        return cell
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]*)`/g, '<code>$1</code>');
    }

    downloadMarkdown() {
        const markdown = this.generateMarkdown(false);
        const info = this.getInfo();
        const filename = `${info.name.replace(/[^a-zA-Z0-9]/g, '_')}_docs.md`;
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        Downloader.downloadBlob(blob, filename);
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get all block definitions for generating PNGs
     */
    getBlockDefinitions() {
        const info = this.getInfo();
        const blocks = [];
        const safeName = info.name.replace(/[^a-zA-Z0-9]/g, '_');

        // Events
        for (const event of info.events) {
            blocks.push({
                type: 'event',
                name: event.name,
                filename: `event_${safeName}_${event.name}`,
                data: event
            });
        }

        // Methods
        for (const method of info.methods) {
            blocks.push({
                type: 'method',
                name: method.name,
                filename: `method_${safeName}_${method.name}`,
                data: method
            });
        }

        // Block Properties
        for (const prop of info.blockProperties) {
            if (prop.rw !== 'write-only') {
                blocks.push({
                    type: 'property_get',
                    name: `Get ${prop.name}`,
                    filename: `property_get_${safeName}_${prop.name}`,
                    data: prop
                });
            }
            if (prop.rw !== 'read-only') {
                blocks.push({
                    type: 'property_set',
                    name: `Set ${prop.name}`,
                    filename: `property_set_${safeName}_${prop.name}`,
                    data: prop
                });
            }
        }

        return blocks;
    }
}

/**
 * MockBlockRenderer - Creates visual SVG blocks for extensions
 */
export class MockBlockRenderer {

    // App Inventor Blockly colors from lib/blockly/blocks/components.js and helpers.js
    static COLORS = {
        event: '#C4A938',          // Gold/yellow for events (from reference images)
        event_dark: '#9E8520',
        method: '#8B64A8',         // Purple for methods
        method_dark: '#6B4D88',
        property_get: '#5BA17F',   // COLOUR_GET - Green for getters
        property_get_dark: '#428A62',
        property_set: '#437F55',   // COLOUR_SET - Dark green for setters
        property_set_dark: '#2D5C3D',
        helper: '#BF4343',         // COLOUR_HELPERS - Red for helper dropdown blocks
        helper_dark: '#8F2D2D',
        // Component badge - white background with dark text (like real App Inventor)
        component_badge: '#FFFFFF',
        component_badge_text: '#333333',
        component_badge_border: 'rgba(0,0,0,0.15)',
        text: '#FFFFFF',
        param_label: 'rgba(255,255,255,0.95)'
    };

    /**
     * Create Event Block - Yellow hat block
     * Example: when Component1 .EventName
     */
    static createEventBlock(event, componentName) {
        const params = event.params || [];
        const instanceName = `${componentName}1`;

        // Calculate dimensions
        const titleWidth = this.measureText(`when  ${instanceName}  .${event.name}`) + 60;
        const paramWidth = params.length > 0 ? Math.max(...params.map(p => this.measureText(p.name) + 100)) : 0;
        const w = Math.max(220, titleWidth, paramWidth);
        const baseHeight = 45;
        const paramHeight = params.length * 28;
        const h = baseHeight + paramHeight + 15;

        const svg = this.createSvg(w + 10, h + 10);

        // Main block path with hat shape
        const blockPath = `
            M 5,25 
            Q 5,5 25,5 
            L ${w - 15},5 
            Q ${w + 5},5 ${w + 5},25
            L ${w + 5},${h - 10}
            L ${w - 25},${h - 10}
            l -4,8 l -15,0 l -4,-8
            L 5,${h - 10}
            Z
        `;
        svg.appendChild(this.createPath(blockPath, this.COLORS.event, this.COLORS.event_dark));

        // "when" label
        svg.appendChild(this.createText('when', 14, 25, 'bold', 12));

        // Component badge (includes dropdown triangle)
        const badgeX = 55;
        svg.appendChild(this.createComponentBadge(instanceName, badgeX, 12, this.COLORS.component_badge));

        // Event name (badge width = text + 20 for dropdown)
        const badgeWidth = this.measureText(instanceName) + 20;
        const eventX = badgeX + badgeWidth + 4;
        svg.appendChild(this.createText(`.${event.name}`, eventX, 25, 'bold', 12));

        // "do" label
        svg.appendChild(this.createText('do', 14, 45, 'normal', 11, 'rgba(255,255,255,0.7)'));

        // Parameters
        let y = 60;
        for (const p of params) {
            svg.appendChild(this.createText(p.name, 24, y, 'normal', 11));
            // Parameter socket
            svg.appendChild(this.createParamSocket(w - 60, y - 12, 50, 18));
            y += 28;
        }

        return svg;
    }

    /**
     * Create Method Block - Purple block with notches
     * Example: call Component1 .MethodName
     */
    static createMethodBlock(method, componentName) {
        const params = method.params || [];
        const instanceName = `${componentName}1`;

        // Calculate dimensions
        const titleWidth = this.measureText(`call  ${instanceName}  .${method.name}`) + 60;
        const paramWidth = params.length > 0 ? Math.max(...params.map(p => this.measureText(p.name) + 100)) : 0;
        const w = Math.max(200, titleWidth, paramWidth);
        const baseHeight = 35;
        const paramHeight = params.length * 28;
        const h = baseHeight + paramHeight + (params.length > 0 ? 10 : 0);

        const svg = this.createSvg(w + 10, h + 18);

        // Main block path with notches
        const blockPath = `
            M 5,10
            L 20,10 l 4,-8 l 15,0 l 4,8
            L ${w + 5},10
            L ${w + 5},${h}
            L 29,${h} l -4,8 l -15,0 l -4,-8
            L 5,${h}
            Z
        `;
        svg.appendChild(this.createPath(blockPath, this.COLORS.method, this.COLORS.method_dark));

        // "call" label
        svg.appendChild(this.createText('call', 14, 28, 'bold', 12));

        // Component badge (includes dropdown triangle)
        const badgeX = 50;
        svg.appendChild(this.createComponentBadge(instanceName, badgeX, 14, this.COLORS.component_badge));

        // Method name (badge width = text + 20 for dropdown)
        const badgeWidth = this.measureText(instanceName) + 20;
        const methodX = badgeX + badgeWidth + 4;
        svg.appendChild(this.createText(`.${method.name}`, methodX, 28, 'bold', 12));

        // Parameters
        let y = 55;
        for (const p of params) {
            svg.appendChild(this.createText(p.name, 24, y, 'normal', 11));
            svg.appendChild(this.createParamSocket(w - 60, y - 12, 50, 18));
            y += 28;
        }

        return svg;
    }

    /**
     * Create Property Getter Block - Green oval/reporter block
     * Example: Component1 .PropertyName
     */
    static createPropertyGetterBlock(prop, componentName) {
        const instanceName = `${componentName}1`;
        const labelWidth = this.measureText(`${instanceName}  .  ${prop.name}`) + 50;
        const w = Math.max(150, labelWidth);
        const h = 32;

        const svg = this.createSvg(w + 10, h + 10);

        // Reporter block (rounded ends with output notch)
        const blockPath = `
            M ${h / 2 + 5},5
            L ${w - h / 2 + 5},5
            A ${h / 2},${h / 2} 0 0 1 ${w - h / 2 + 5},${h + 5}
            L ${h / 2 + 5},${h + 5}
            A ${h / 2},${h / 2} 0 0 1 ${h / 2 + 5},5
            Z
        `;
        svg.appendChild(this.createPath(blockPath, this.COLORS.property_get, this.COLORS.property_get_dark));

        // Component badge (includes dropdown triangle)
        const badgeX = 18;
        svg.appendChild(this.createComponentBadge(instanceName, badgeX, 8, this.COLORS.component_badge));

        // Property name with dropdown (badge width = text + 20)
        const badgeWidth = this.measureText(instanceName) + 20;
        const propX = badgeX + badgeWidth + 2;
        // Add property dropdown
        svg.appendChild(this.createPropertyDropdown(prop.name, propX, 8));

        return svg;
    }

    /**
     * Create Property Setter Block - Dark green block with notches
     * Example: set Component1 .PropertyName to [Helper Block]
     * @param {Object} prop - Property descriptor
     * @param {string} componentName - Component name  
     * @param {Object} helper - Optional helper data to render connected helper block
     */
    static createPropertySetterBlock(prop, componentName, helper = null) {
        const instanceName = `${componentName}1`;

        // Calculate helper block dimensions if present
        let helperWidth = 0;
        let helperHeight = 0;
        let helperType = "";
        let helperValue = "";

        if (helper) {
            // Determine helper type and display value
            const helperData = helper.data || helper;

            // Type
            if (helperData.tag) helperType = helperData.tag;
            else if (helper.type) helperType = helper.type;
            else helperType = "Option";

            // Value
            if (helperType === 'ASSET') {
                helperValue = 'example.png'; // Mock asset
            } else if (helperType === 'SCREEN') {
                helperValue = 'Screen1'; // Mock screen
            } else if (helperType === 'PROVIDER') {
                helperValue = 'ChatBot1'; // Mock provider
                helperType = 'ChatBot'; // Friendly name
            } else if (helperType === 'PROVIDER_MODEL') {
                helperValue = 'Gemini';
                helperType = 'Model';
            } else {
                // Option list
                helperValue = helperData.defaultOpt || (helperData.options && helperData.options[0] ? helperData.options[0].name : '');
            }

            helperWidth = this.measureText(helperType) + this.measureText(helperValue) + 60;
            helperHeight = 24;
        }

        const labelWidth = this.measureText(`set  ${instanceName}  .  ${prop.name}  to`) + 80;
        const baseWidth = Math.max(220, labelWidth);
        const w = helper ? baseWidth + helperWidth - 30 : baseWidth;
        const h = 35;

        const svg = this.createSvg(w + 10, h + 18);

        // Main block path with notches
        const blockPath = `
            M 5,10
            L 20,10 l 4,-8 l 15,0 l 4,8
            L ${w + 5},10
            L ${w + 5},${h}
            L 29,${h} l -4,8 l -15,0 l -4,-8
            L 5,${h}
            Z
        `;
        svg.appendChild(this.createPath(blockPath, this.COLORS.property_set, this.COLORS.property_set_dark));

        // "set" label
        svg.appendChild(this.createText('set', 14, 28, 'bold', 12));

        // Component badge (includes dropdown triangle)
        const badgeX = 42;
        svg.appendChild(this.createComponentBadge(instanceName, badgeX, 12, this.COLORS.component_badge));

        // Property dropdown (badge width = text + 20)
        const badgeWidth = this.measureText(instanceName) + 20;
        const propX = badgeX + badgeWidth + 2;
        svg.appendChild(this.createPropertyDropdown(prop.name, propX, 12));

        // "to" label
        const propDropdownWidth = this.measureText(prop.name) + 20;
        const toX = propX + propDropdownWidth + 8;
        svg.appendChild(this.createText('to', toX, 28, 'normal', 11, 'rgba(255,255,255,0.9)'));

        // Either connected helper block or empty socket
        if (helper && helperValue) {
            // Render connected helper block inside
            const tag = helperType;
            const defaultOpt = helperValue;

            const helperX = toX + 25;
            const helperY = 10;
            const helperW = this.measureText(tag) + this.measureText(defaultOpt) + 55;
            const helperH = 25;

            // Helper block with SQUARE ends (small corner radius only)
            const helperRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            helperRect.setAttribute('x', helperX);
            helperRect.setAttribute('y', helperY);
            helperRect.setAttribute('width', helperW);
            helperRect.setAttribute('height', helperH);
            helperRect.setAttribute('rx', '3');
            helperRect.setAttribute('ry', '3');
            helperRect.setAttribute('fill', this.COLORS.helper);
            helperRect.setAttribute('stroke', this.COLORS.helper_dark);
            helperRect.setAttribute('stroke-width', '1');
            svg.appendChild(helperRect);

            // Helper tag label (white text)
            svg.appendChild(this.createText(tag, helperX + 8, helperY + 17, 'bold', 11, '#FFFFFF'));

            // White badge for value with dropdown
            const tagWidth = this.measureText(tag);
            const valueBadgeX = helperX + tagWidth + 16;
            const valueBadgeY = helperY + 4;
            const valueBadgeW = this.measureText(defaultOpt) + 20;
            const valueBadgeH = 17;

            // White rounded badge for value
            const valueRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            valueRect.setAttribute('x', valueBadgeX);
            valueRect.setAttribute('y', valueBadgeY);
            valueRect.setAttribute('width', valueBadgeW);
            valueRect.setAttribute('height', valueBadgeH);
            valueRect.setAttribute('rx', '3');
            valueRect.setAttribute('ry', '3');
            valueRect.setAttribute('fill', '#FFFFFF');
            svg.appendChild(valueRect);

            // Value text (dark)
            svg.appendChild(this.createText(defaultOpt, valueBadgeX + 5, valueBadgeY + 12, 'normal', 10, '#333333'));

            // Dropdown triangle inside white badge (visual only)
            const triX = valueBadgeX + this.measureText(defaultOpt) + 8;
            const triY = valueBadgeY + 8;
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', `${triX},${triY - 2} ${triX + 5},${triY - 2} ${triX + 2.5},${triY + 3}`);
            polygon.setAttribute('fill', '#666666');
            svg.appendChild(polygon);
        } else {
            // Empty value socket
            svg.appendChild(this.createParamSocket(w - 50, 13, 45, 18));
        }

        return svg;
    }

    /**
     * Create Helper Dropdown Block - Modern App Inventor style
     * Red pill-shaped block with white dropdown badge for value
     * Example: Type [Piano ▼]
     */
    static createHelperBlock(helper, selectedOption = null) {
        const helperData = helper.data || helper;

        // Determine type and value
        let tag = helperData.tag || helperData.key || 'Option';
        let defaultOpt = selectedOption || helperData.defaultOpt || (helperData.options && helperData.options[0] && helperData.options[0].name) || '';

        if (!defaultOpt) {
            // Handle non-option list types
            if (helper.type === 'ASSET') {
                defaultOpt = 'example.png';
            } else if (helper.type === 'SCREEN') {
                defaultOpt = 'Screen1';
            } else if (helper.type === 'PROVIDER') {
                defaultOpt = 'ChatBot1';
                tag = 'ChatBot';
            } else if (helper.type === 'PROVIDER_MODEL') {
                defaultOpt = 'Gemini';
                tag = 'Model';
            }
        }

        // Calculate dimensions
        const tagWidth = this.measureText(tag);
        const optWidth = this.measureText(defaultOpt);
        const dropdownBadgeW = optWidth + 24; // Badge width with padding and arrow
        const totalWidth = tagWidth + dropdownBadgeW + 40;
        const w = Math.max(100, totalWidth);
        const h = 26;

        const svg = this.createSvg(w + 10, h + 10);

        // Helper block with SQUARE ends (rectangle shape, small corner radius)
        const blockRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        blockRect.setAttribute('x', '5');
        blockRect.setAttribute('y', '5');
        blockRect.setAttribute('width', w);
        blockRect.setAttribute('height', h);
        blockRect.setAttribute('rx', '3');
        blockRect.setAttribute('ry', '3');
        blockRect.setAttribute('fill', this.COLORS.helper);
        blockRect.setAttribute('stroke', this.COLORS.helper_dark);
        blockRect.setAttribute('stroke-width', '1');
        svg.appendChild(blockRect);

        // Tag label (white text on red background)
        svg.appendChild(this.createText(tag, 16, 22, 'bold', 11, '#FFFFFF'));

        // White dropdown badge for the value (like component badges)
        const badgeX = 16 + tagWidth + 8;
        const badgeY = 8;
        const badgeH = 16;
        const badgeW = optWidth + 20;

        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // Badge background - white rounded rect
        const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badgeRect.setAttribute('x', badgeX);
        badgeRect.setAttribute('y', badgeY);
        badgeRect.setAttribute('width', badgeW);
        badgeRect.setAttribute('height', badgeH);
        badgeRect.setAttribute('rx', '3');
        badgeRect.setAttribute('ry', '3');
        badgeRect.setAttribute('fill', '#FFFFFF');
        badgeRect.setAttribute('stroke', 'rgba(0,0,0,0.1)');
        badgeRect.setAttribute('stroke-width', '1');
        badgeG.appendChild(badgeRect);

        // Badge text - dark text
        const badgeText = this.createText(defaultOpt, badgeX + 5, badgeY + 12, 'normal', 10, '#333333');
        badgeG.appendChild(badgeText);

        // Dropdown triangle inside badge
        const triX = badgeX + optWidth + 9;
        const triY = badgeY + 8;
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', `${triX},${triY - 2} ${triX + 5},${triY - 2} ${triX + 2.5},${triY + 2}`);
        polygon.setAttribute('fill', '#666666');
        badgeG.appendChild(polygon);

        svg.appendChild(badgeG);

        return svg;
    }

    // ================== HELPER METHODS ==================

    static measureText(text) {
        // Approximate text width (11px font)
        return text.length * 6.5;
    }

    static createSvg(width, height) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.classList.add('mock-block-svg');
        return svg;
    }

    static createPath(d, fill, stroke = null) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', fill);
        path.setAttribute('stroke', stroke || this.darkenColor(fill));
        path.setAttribute('stroke-width', '1');
        return path;
    }

    static createText(content, x, y, weight = 'normal', size = 12, color = '#FFFFFF') {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('fill', color);
        text.setAttribute('font-family', 'sans-serif');
        text.setAttribute('font-size', size);
        text.setAttribute('font-weight', weight);
        text.textContent = content;
        return text;
    }

    static createComponentBadge(name, x, y, bgColor) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const textWidth = this.measureText(name);
        const badgeW = textWidth + 20; // Slightly wider for dropdown arrow space
        const badgeH = 18;

        // Badge background (rounded rect) - white like real App Inventor
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', badgeW);
        rect.setAttribute('height', badgeH);
        rect.setAttribute('rx', '3');
        rect.setAttribute('ry', '3');
        rect.setAttribute('fill', this.COLORS.component_badge);
        rect.setAttribute('stroke', this.COLORS.component_badge_border);
        rect.setAttribute('stroke-width', '1');
        g.appendChild(rect);

        // Badge text - dark text on white background
        const text = this.createText(name, x + 6, y + 13, 'normal', 11, this.COLORS.component_badge_text);
        g.appendChild(text);

        // Dropdown triangle inside badge (dark color for visibility)
        const triX = x + textWidth + 10;
        const triY = y + 9;
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', `${triX},${triY - 2} ${triX + 5},${triY - 2} ${triX + 2.5},${triY + 2}`);
        polygon.setAttribute('fill', '#666666');
        g.appendChild(polygon);

        return g;
    }

    static createDropdownTriangle(x, y, color = 'rgba(255,255,255,0.8)') {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', `${x},${y - 3} ${x + 6},${y - 3} ${x + 3},${y + 2}`);
        polygon.setAttribute('fill', color);
        return polygon;
    }

    /**
     * Create property dropdown badge - white rounded badge with name and dropdown
     * Used for property names in getter/setter blocks
     */
    static createPropertyDropdown(name, x, y) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const textWidth = this.measureText(name);
        const badgeW = textWidth + 20;
        const badgeH = 18;

        // Badge background (rounded rect) - white
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', badgeW);
        rect.setAttribute('height', badgeH);
        rect.setAttribute('rx', '3');
        rect.setAttribute('ry', '3');
        rect.setAttribute('fill', this.COLORS.component_badge);
        rect.setAttribute('stroke', this.COLORS.component_badge_border);
        rect.setAttribute('stroke-width', '1');
        g.appendChild(rect);

        // Property name text - dark
        const text = this.createText(name, x + 6, y + 13, 'normal', 11, this.COLORS.component_badge_text);
        g.appendChild(text);

        // Dropdown triangle
        const triX = x + textWidth + 10;
        const triY = y + 9;
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', `${triX},${triY - 2} ${triX + 5},${triY - 2} ${triX + 2.5},${triY + 2}`);
        polygon.setAttribute('fill', '#666666');
        g.appendChild(polygon);

        return g;
    }

    static createParamSocket(x, y, w, h) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // Socket background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('rx', '4');
        rect.setAttribute('fill', 'rgba(255,255,255,0.25)');
        rect.setAttribute('stroke', 'rgba(255,255,255,0.3)');
        rect.setAttribute('stroke-width', '1');
        g.appendChild(rect);

        return g;
    }

    static createSocket(x, y, w, h) {
        return this.createParamSocket(x, y, w, h);
    }

    static darkenColor(hex) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - 40);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - 40);
        const b = Math.max(0, (num & 0x0000FF) - 40);
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }

    /**
     * Convert SVG to PNG blob
     */
    static async svgToPngBlob(svgElement, scale = 2) {
        return new Promise((resolve, reject) => {
            try {
                const w = (parseInt(svgElement.getAttribute('width')) || 200) * scale;
                const h = (parseInt(svgElement.getAttribute('height')) || 50) * scale;

                // Clone and set namespace
                const clone = svgElement.cloneNode(true);
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                clone.setAttribute('width', w);
                clone.setAttribute('height', h);

                // Serialize to string
                const svgString = new XMLSerializer().serializeToString(clone);
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;

                    const ctx = canvas.getContext('2d');
                    // Transparent background
                    ctx.clearRect(0, 0, w, h);
                    // Draw image
                    ctx.drawImage(img, 0, 0, w, h);

                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(url);
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    }, 'image/png');
                };

                img.onerror = (e) => {
                    URL.revokeObjectURL(url);
                    console.error('Image load error:', e);
                    reject(new Error('Failed to load SVG image'));
                };

                img.src = url;
            } catch (err) {
                console.error('svgToPngBlob error:', err);
                reject(err);
            }
        });
    }
}

/**
 * BlockExporter - Export blocks as ZIP
 */
export class BlockExporter {
    static async exportAllToZip(blocks, filename) {
        return new Promise((resolve, reject) => {
            zip.createWriter(new zip.BlobWriter('application/zip'), async (writer) => {
                try {
                    for (let i = 0; i < blocks.length; i++) {
                        const block = blocks[i];
                        const blob = await MockBlockRenderer.svgToPngBlob(block.svg);
                        const name = `${i}_${block.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                        await new Promise((res, rej) => {
                            writer.add(name, new zip.BlobReader(blob), res, rej);
                        });
                    }
                    writer.close((blob) => {
                        Downloader.downloadBlob(blob, filename);
                        resolve();
                    });
                } catch (err) {
                    console.error('ZIP error:', err);
                    reject(err);
                }
            }, reject);
        });
    }
}
