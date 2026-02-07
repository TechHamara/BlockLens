import { SummaryNode, AssetNode, HeaderNode, ScreenNode, ChainedNode, svgToPngBlob } from '../views/nodes/node.js';
import { View } from '../views/view.js';
import { Label, Dialog, AssetFormatter, Downloader } from '../views/widgets.js';

export class SummaryWriter {
    static async generateSummmaryNodesForProject(project, nodeList) {
        this.header = new HeaderNode('Download summary', 'save_alt');
        this.header.addStyleName('unchive-summary-node__header');
        nodeList.addNode(this.header);

        this.header.addClickListener(() => {
            SummaryHTMLWriter.writeProjectSummary(project);
        });

        nodeList.addNodeAsync(SummaryNode.promiseNode('Stats', this.generateStats(project)));
        nodeList.addNodeAsync(SummaryNode.promiseNode('Most used components', this.generateMostUsed(project)));
        nodeList.addNodeAsync(SummaryNode.promiseNode('% of blocks by screen', this.generateCodeShare(project).getHTML()));
        nodeList.addNodeAsync(SummaryNode.promiseNode('Assets by type', this.generateAssetTypeShare(project).getHTML()));
        nodeList.addNodeAsync(SummaryNode.promiseNode('% of built-in components', this.generateNativeShare(project).getHTML()));
        nodeList.addNodeAsync(SummaryNode.promiseNode('Block usage by type', this.getBlockTypeShare(project).getHTML()));
    }

    static generateStats(project) {
        const container = new View('DIV');
        container.addView(new SummaryItem('Number of screens', project.screens.length));
        container.addView(new SummaryItem('Number of extensions', project.extensions.length));

        let blockCount = 0;
        for (let screen of project.screens) {
            blockCount += Array.from(new DOMParser().parseFromString(screen.blocks, 'text/xml').getElementsByTagName('block')).length;
        }
        container.addView(new SummaryItem('Total number of blocks', blockCount));

        let assetSize = 0;
        for (let asset of project.assets) {
            assetSize += asset.size;
        }
        container.addView(new SummaryItem('Number of assets', project.assets.length));
        container.addView(new SummaryItem('Total size of assets', AssetFormatter.formatSize(assetSize)));

        return container.domElement.innerHTML;
    }

    static generateMostUsed(project) {
        const container = new View('DIV');
        const components = [];

        function countComponents(component) {
            const existing = components.find(c => c[0] === component.type);
            if (existing) {
                existing[1]++;
            } else {
                components.push([component.type, 1]);
            }
            for (let child of component.children) {
                countComponents(child);
            }
        }

        for (let screen of project.screens) {
            countComponents(screen.form);
        }

        components.sort((a, b) => b[1] - a[1]);

        for (let i = 0; i < 8 && i < components.length; i++) {
            const comp = components[i];
            container.addView(new SummaryItem(
                Messages[comp[0][0].toLowerCase() + comp[0].slice(1) + 'ComponentPallette'] || comp[0],
                comp[1]
            ));
        }

        return container.domElement.innerHTML;
    }

    static generateCodeShare(project) {
        const data = [['Screen', 'Percentage']];
        for (let screen of project.screens) {
            const blockCount = Array.from(new DOMParser().parseFromString(screen.blocks, 'text/xml').getElementsByTagName('block')).length;
            data.push([screen.name, blockCount]);
        }
        return new SummaryChart(data);
    }

    static generateAssetTypeShare(project) {
        const data = [['Asset type', 'Percentage']];
        for (let asset of project.assets) {
            const existing = data.find(d => d[0] === asset.type.toLowerCase());
            if (existing) {
                existing[1]++;
            } else {
                data.push([asset.type.toLowerCase(), 1]);
            }
        }
        return new SummaryChart(data);
    }

    static generateNativeShare(project) {
        const builtin = ['Built-in', 0];
        const extension = ['Extensions', 0];

        function countOrigins(component, ext, native) {
            if (component.origin === 'EXTENSION') {
                ext[1]++;
            } else {
                native[1]++;
            }
            for (let child of component.children) {
                countOrigins(child, ext, native);
            }
        }

        for (let screen of project.screens) {
            countOrigins(screen.form, extension, builtin);
        }

        return new SummaryChart([['Type', 'Percentage'], builtin, extension]);
    }

    static getBlockTypeShare(project) {
        let events = 0, methods = 0, properties = 0, procedures = 0, variables = 0;

        for (let screen of project.screens) {
            const doc = new DOMParser().parseFromString(screen.blocks, 'text/xml');
            events += Array.from(doc.querySelectorAll('block[type="component_event"]')).length;
            methods += Array.from(doc.querySelectorAll('block[type="component_method"]')).length;
            properties += Array.from(doc.querySelectorAll('block[type="component_set_get"]')).length;
            procedures += Array.from(doc.querySelectorAll('block[type="procedures_defnoreturn"], block[type="procedures_defreturn"]')).length;
            variables += Array.from(doc.querySelectorAll('block[type="global_declaration"]')).length;
        }

        return new SummaryChart(
            [['Type', 'Percentage'], ['Events', events], ['Methods', methods], ['Properties', properties], ['Variables', variables], ['Procedures', procedures]],
            [Blockly.COLOUR_EVENT, Blockly.COLOUR_METHOD, Blockly.COLOUR_SET, 'rgb(244, 81, 30)', '#AAA']
        );
    }
}

class SummaryItem extends Label {
    constructor(label, value) {
        super(`${label} <span>${value}</span>`, true);
        this.addStyleName('summary-item');
    }
}

class SummaryChart extends View {
    constructor(data, colors) {
        super('DIV');

        const chartData = google.visualization.arrayToDataTable(data);
        this.options = {
            legend: { position: 'right', textStyle: { color: 'black' } },
            pieSliceTextStyle: { color: '#000', background: '#FFF' },
            pieHole: 0.5,
            width: 260,
            chartArea: { left: 0, top: 20, width: '100%', height: '100%' },
            enableInteractivity: false
        };

        if (colors) {
            this.options.colors = colors;
        }

        this.chart = new google.visualization.PieChart(this.domElement);
        this.chart.draw(chartData, this.options);
    }

    getHTML() {
        return this.domElement.outerHTML;
    }

    getChartHTML() {
        const svg = this.domElement.getElementsByTagName('svg')[0];
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return svg.outerHTML;
    }
}

class SummaryHTMLWriter {
    static writeProjectSummary(project) {
        const dialog = new Dialog('Generating summary...', 'This may take a while');
        setTimeout(() => dialog.open(), 1);

        setTimeout(async () => {
            try {
                const html = [];
                // Store files as {name, content} for Downloader.downloadZip
                const files = [];

                html.push('<!DOCTYPE html>');
                html.push('<html lang="en">');
                html.push(`<head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Project Summary - ${project.name}</title>
                    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
                </head>`);
                html.push('<body>');

                // Header
                html.push('<header class="summary-header">');
                html.push('<div class="container">');
                html.push(`<h1>${project.name} <span class="badge badge-primary">Project Summary</span></h1>`);
                html.push(`<p class="meta">Generated on ${this.getDateTime()}</p>`);
                html.push('</div>');
                html.push('</header>');

                html.push('<main class="container">');

                // Overview Grid (TOC + Stats)
                html.push('<div class="grid grid-2">');

                // TOC
                html.push('<div class="card">');
                this.writeTOContents(html, project);
                html.push('</div>');

                // Stats
                html.push('<div class="card">');
                this.writeStats(html, project);
                html.push('</div>');

                html.push('</div>'); // End Grid

                // Insights
                html.push('<section id="insights" class="section">');
                this.writeInsights(html, files, project);
                html.push('</section>');

                // Screens
                await this.writeScreens(html, files, project);

                // Extensions
                if (project.extensions.length) {
                    html.push('<section id="exts" class="section">');
                    this.writeExtensions(html, project);
                    html.push('</section>');
                }

                html.push('</main>'); // End Main

                // Footer
                html.push('<footer class="summary-footer">');
                html.push('<p>Generated by <strong>BlockLens</strong> &bull; Built for MIT App Inventor 2 & distributions</p>');
                html.push('</footer>');

                this.writeStyles(html, files);
                html.push('</body></html>');

                // Add HTML file
                files.push({
                    name: `${project.name}.html`,
                    content: new Blob([html.join('')], { type: 'text/html' })
                });

                // Download using robust Downloader
                await Downloader.downloadZip('project_summary.zip', files);

                dialog.close();
            } catch (error) {
                console.error('Error generating summary:', error);
                dialog.close();
                alert('Error generating summary: ' + error.message);
            }
        }, 20);
    }


    static getDateTime() {
        const date = new Date();
        return date.toLocaleDateString() + ' @ ' + date.toLocaleTimeString();
    }

    static writeTOContents(html, project) {
        html.push('<h3><i class="material-icons">list</i> Table of Contents</h3>');
        html.push('<nav class="toc">');
        html.push('<ul>');
        html.push('<li><a href="#stats">Project Stats</a></li>');
        html.push('<li><a href="#insights">Insights & Charts</a></li>');
        html.push('<li>Screens<ul>');
        for (let screen of project.screens) {
            html.push(`<li><a href="#screen-${screen.name}">${screen.name}</a></li>`);
        }
        html.push('</ul></li>');
        if (project.extensions.length) {
            html.push('<li><a href="#exts">Extensions Summary</a></li>');
        }
        html.push('</ul>');
        html.push('</nav>');
    }

    static writeStats(html, project) {
        html.push('<a name="stats"></a>');
        html.push('<h3><i class="material-icons">analytics</i> Project Stats</h3>');

        // Use the original generateStats HTML but wrap in a clean list
        const statsHtml = SummaryWriter.generateStats(project)
            .replace(/<div class="summary-item">(.*?)<span>(.*?)<\/span><\/div>/g, '<li><span class="label">$1</span><span class="value">$2</span></li>');

        html.push('<ul class="stat-list">');
        html.push(statsHtml);
        html.push('</ul>');

        html.push('<h4>Most used components</h4>');
        const mostUsedHtml = SummaryWriter.generateMostUsed(project)
            .replace(/<div class="summary-item">(.*?)<span>(.*?)<\/span><\/div>/g, '<li><span class="label">$1</span><span class="value">$2</span></li>');
        html.push('<ul class="stat-list compact">');
        html.push(mostUsedHtml);
        html.push('</ul>');
    }

    static writeInsights(html, files, project) {
        html.push('<h2><i class="material-icons">pie_chart</i> Insights</h2>');

        files.push({
            name: 'code_share.svg',
            content: new Blob([SummaryWriter.generateCodeShare(project).getChartHTML()], { type: 'image/svg+xml' })
        });
        files.push({
            name: 'asset_type_share.svg',
            content: new Blob([SummaryWriter.generateAssetTypeShare(project).getChartHTML()], { type: 'image/svg+xml' })
        });
        files.push({
            name: 'native_share.svg',
            content: new Blob([SummaryWriter.generateNativeShare(project).getChartHTML()], { type: 'image/svg+xml' })
        });
        files.push({
            name: 'block_type_share.svg',
            content: new Blob([SummaryWriter.getBlockTypeShare(project).getChartHTML()], { type: 'image/svg+xml' })
        });

        html.push('<div class="grid grid-2 charts-grid">');

        const charts = [
            { img: 'code_share.svg', caption: 'Percentage of blocks by screen' },
            { img: 'asset_type_share.svg', caption: 'Types of assets by frequency' },
            { img: 'native_share.svg', caption: 'Built-in components vs Extensions' },
            { img: 'block_type_share.svg', caption: 'Percentage of blocks by type' }
        ];

        charts.forEach(chart => {
            html.push('<div class="card chart-card">');
            html.push('<div class="chart-container">');
            html.push(`<img src="${chart.img}" alt="${chart.caption}">`);
            html.push('</div>');
            html.push(`<p class="caption">${chart.caption}</p>`);
            html.push('</div>');
        });

        html.push('</div>');
    }

    static async writeScreens(html, files, project) {
        let screenIndex = 0;

        // Check if RootPanel and primaryNodeList exist
        if (!window.RootPanel || !RootPanel.primaryNodeList || !RootPanel.primaryNodeList.nodes) {
            console.warn('RootPanel not available for screen capture');
            return;
        }

        for (let node of RootPanel.primaryNodeList.nodes) {
            if (node instanceof ScreenNode) {
                html.push(`<section id="screen-${node.caption}" class="section screen-section">`);
                html.push('<div class="card">');
                html.push(`<div class="card-header">
                    <h2><i class="material-icons">smartphone</i> ${node.caption}</h2>
                </div>`);

                html.push('<div class="card-body">');
                html.push('<div class="grid grid-sidebar">');

                // Components Sidebar
                html.push('<div class="components-sidebar">');
                html.push('<h4>Components</h4>');
                html.push('<div class="component-tree">');
                html.push('<ul>');

                const screen = project.screens.find(s => s.name === node.caption);
                if (screen && screen.form) {
                    this.writeComponent(html, screen.form);
                }
                html.push('</ul>');
                html.push('</div>'); // End component-tree
                html.push('</div>'); // End components-sidebar

                // Blocks Area
                html.push('<div class="blocks-area">');
                html.push('<h4>Blocks</h4>');

                node.open();

                // Safety check for chainNodeList
                if (!node.chainNodeList || !node.chainNodeList.nodes || !node.chainNodeList.nodes[1]) {
                    html.push('<p class="empty-state">No blocks found.</p>');
                } else {
                    node.chainNodeList.nodes[1].open();
                    const blockNodes = node.chainNodeList.nodes[1].chainNodeList;

                    if (!blockNodes || !blockNodes.nodes || blockNodes.nodes.length === 0) {
                        html.push('<p class="empty-state">No blocks found.</p>');
                    } else {
                        html.push('<div class="blocks-container">');
                        let blockIndex = 0;
                        for (let block of blockNodes.nodes) {
                            try {
                                block.initializeWorkspace();
                                const previewContainer = block.domElement?.children[1]?.children[0];
                                const svgElement = previewContainer?.querySelector('svg.blocklySvg');

                                if (svgElement) {
                                    // Use shared svgToPngBlob function from node.js
                                    const pngBlob = await svgToPngBlob(svgElement);
                                    if (pngBlob) {
                                        const imageName = `block_${screenIndex}_${blockIndex}.png`;
                                        html.push('<div class="block-wrapper">');
                                        html.push(`<img src="${imageName}" class="block-img">`);
                                        files.push({
                                            name: imageName,
                                            content: pngBlob
                                        });
                                        html.push('</div>');
                                        blockIndex++;
                                    }
                                }
                            } catch (blockError) {
                                console.error(`Error processing block:`, blockError);
                            }
                        }
                        html.push('</div>'); // End blocks-container
                    }
                }

                html.push('</div>'); // End blocks-area
                html.push('</div>'); // End grid-sidebar
                html.push('</div>'); // End card-body
                html.push('</div>'); // End card
                html.push('</section>');
                screenIndex++;
            }
        }

        // Safety check before accessing last node
        const nodes = RootPanel.primaryNodeList.nodes;
        if (nodes.length > 0) {
            nodes[nodes.length - 1].open();
        }
    }

    static writeComponent(html, component) {
        // Tree view item
        html.push(`<li>
            <div class="tree-item">
                <span class="tree-icon"></span>
                <span class="component-name">${component.name}</span>
                <span class="component-type badge">${component.type}</span>
            </div>`);

        if (component.children && component.children.length > 0) {
            html.push('<ul>');
            for (let child of component.children) {
                this.writeComponent(html, child);
            }
            html.push('</ul>');
        }

        html.push('</li>');
    }

    static writeExtensions(html, project) {
        html.push('<a name="exts"></a>');
        html.push('<h2><i class="material-icons">extension</i> Extensions Summary</h2>');

        html.push('<div class="card">');
        html.push('<ul class="extension-list">');
        for (let ext of project.extensions) {
            html.push(`<li class="extension-item">
                <div class="extension-header">
                    <strong>${ext.name}</strong>
                </div>
                <div class="extension-desc">
                    ${ext.descriptorJSON.helpString || 'No description available.'}
                </div>
            </li>`);
        }
        html.push('</ul>');
        html.push('</div>');
    }

    static writeStyles(html, files) {
        html.push(`<style>
            :root {
                --primary: #3f51b5;
                --primary-dark: #303f9f;
                --secondary: #ff4081;
                --bg-color: #f5f7fa;
                --text-color: #333;
                --text-muted: #666;
                --card-bg: #fff;
                --border-color: #e0e0e0;
                --radius: 8px;
                --shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            * { box-sizing: border-box; }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: var(--bg-color);
                color: var(--text-color);
                line-height: 1.6;
                margin: 0;
                padding: 0;
            }

            h1, h2, h3, h4, h5 { color: var(--primary-dark); margin-top: 0; }
            a { color: var(--primary); text-decoration: none; }
            a:hover { text-decoration: underline; }

            .container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }

            /* Header */
            .summary-header {
                background: #fff;
                border-bottom: 1px solid var(--border-color);
                padding: 2rem 0;
                margin-bottom: 2rem;
                text-align: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.02);
            }
            .summary-header h1 { margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 10px; }
            .meta { color: var(--text-muted); font-size: 0.9rem; }

            /* Badges */
            .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                background: #e0e0e0;
                color: #555;
            }
            .badge-primary { background: var(--primary); color: #fff; }

            /* Grid System */
            .grid { display: grid; gap: 20px; }
            .grid-2 { grid-template-columns: 1fr 1fr; }
            @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }

            /* Cards */
            .card {
                background: var(--card-bg);
                border-radius: var(--radius);
                box-shadow: var(--shadow);
                overflow: hidden;
                margin-bottom: 20px;
                border: 1px solid var(--border-color);
                padding: 20px;
            }
            
            .section { margin-bottom: 3rem; }

            /* TOC */
            .toc ul { list-style: none; padding-left: 0; }
            .toc > ul > li { margin-bottom: 8px; font-weight: 600; }
            .toc ul ul { padding-left: 20px; font-weight: normal; margin-top: 5px; }
            .toc li a { display: block; padding: 4px 0; }

            /* Stats List */
            .stat-list { list-style: none; padding: 0; margin: 0; }
            .stat-list li {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .stat-list li:last-child { border-bottom: none; }
            .stat-list .label { color: var(--text-muted); }
            .stat-list .value { font-weight: 700; color: var(--primary-dark); }
            .stat-list.compact { font-size: 0.9rem; }

            /* Charts */
            .charts-grid { margin-top: 20px; }
            .chart-card { text-align: center; padding: 15px; }
            .chart-container { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 200px; /* Fixed height for charts */
                overflow: hidden;
            }
            .chart-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .caption { margin-top: 10px; font-size: 0.9rem; color: var(--text-muted); }

            /* Screen & Blocks */
            .screen-section .card { padding: 0; }
            .card-header { 
                background: #f8f9fa; 
                padding: 15px 20px; 
                border-bottom: 1px solid var(--border-color);
            }
            .card-header h2 { margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 10px; }
            .card-body { padding: 20px; }
            
            .grid-sidebar { grid-template-columns: 250px 1fr; }
            @media (max-width: 768px) { .grid-sidebar { grid-template-columns: 1fr; } }
            
            .components-sidebar { border-right: 1px solid #eee; padding-right: 20px; }
            @media (max-width: 768px) { .components-sidebar { border-right: none; border-bottom: 1px solid #eee; padding-right: 0; padding-bottom: 20px; margin-bottom: 20px; } }

            /* Component Tree */
            .component-tree ul { list-style: none; padding-left: 20px; position: relative; }
            .component-tree > ul { padding-left: 0; }
            .component-tree li { margin: 5px 0; position: relative; }
            .component-tree .tree-item { display: flex; align-items: center; gap: 8px; }
            .component-tree .tree-icon { 
                width: 8px; height: 8px; border-radius: 50%; background: #ccc; 
                display: inline-block;
            }
            .component-tree li li .tree-icon { background: var(--primary); }
            
            /* Blocks */
            .blocks-container { display: flex; flex-direction: column; gap: 20px; }
            .block-wrapper { 
                padding: 10px; 
                background: #fafafa; 
                border-radius: 4px; 
                border: 1px solid #eee;
                overflow-x: auto;
            }
            .block-img { max-width: 100%; display: block; }
            .empty-state { color: #999; font-style: italic; text-align: center; padding: 20px; }

            /* Extension List */
            .extension-list { list-style: none; padding: 0; }
            .extension-item { padding: 10px; border-bottom: 1px solid #eee; }
            .extension-item:last-child { border-bottom: none; }
            .extension-desc { font-size: 0.9rem; color: #666; margin-top: 4px; }

            /* Footer */
            .summary-footer { 
                text-align: center; 
                margin-top: 4rem; 
                padding: 2rem 0; 
                color: #888; 
                font-size: 0.9rem;
                border-top: 1px solid var(--border-color);
            }

            /* Print Styles */
            @media print {
                body { background: #fff; color: #000; }
                .card { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
                .screen-section { page-break-before: always; }
                .container { max-width: 100%; padding: 0; }
                a { text-decoration: none; color: #000; }
            }
        </style>`);

        // This keeps the DOM clean for editing if opened in a browser
        html.push('<script>document.designMode = "off"<\/script>');
    }
}