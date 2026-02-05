/**
 * BlocklyBlockRenderer - Creates real Blockly blocks for extension documentation
 * Uses actual Blockly workspace to render blocks like in .aia files
 */

import { View } from './view.js';
import { AIProject, BlocklyWorkspace } from '../unchive/ai_project.js';

export class BlocklyBlockRenderer {
    /**
     * @param {Object} extensionDescriptor - The extension descriptor JSON
     */
    constructor(extensionDescriptor) {
        this.descriptor = extensionDescriptor;
        this.componentType = extensionDescriptor.type || extensionDescriptor.name;
        this.componentName = this.componentType.split('.').pop();
        this.instanceName = this.componentName + '1';

        // Parse option lists from properties for helpers
        this.optionLists = {};
        this.parseOptionLists();

        // Index events, methods, and properties for faster lookup
        this.events = {};
        if (this.descriptor.events) {
            this.descriptor.events.forEach(e => {
                // Ensure parameters property exists as component_database.js expects it
                if (!e.parameters && e.params) {
                    e.parameters = e.params;
                }
                this.events[e.name] = e;
            });
        }

        this.methods = {};
        if (this.descriptor.methods) {
            this.descriptor.methods.forEach(m => {
                if (!m.parameters && m.params) {
                    m.parameters = m.params;
                }
                this.methods[m.name] = m;
            });
        }

        this.properties = {};
        if (this.descriptor.properties) {
            this.descriptor.properties.forEach(p => this.properties[p.name] = p);
        }
        if (this.descriptor.blockProperties) {
            this.descriptor.blockProperties.forEach(p => this.properties[p.name] = p);
        }

        // Ensure helper blocks are defined
        this.defineHelperBlocks();

        // Register the extension descriptor with AIProject descriptorJSON so Blockly can find it
        this.registerDescriptor();
    }

    defineHelperBlocks() {
        // Blocks are now loaded via lib/blockly/blocks/helpers.js in index.html
        // We can verify if they exist, but we don't need to define them here manually.
        const requiredBlocks = [
            'helpers_dropdown',
            'helpers_screen_names',
            'helpers_assets',
            'helpers_providermodel',
            'helpers_provider'
        ];

        const missing = requiredBlocks.filter(b => !Blockly.Blocks[b]);
        if (missing.length > 0) {
            console.warn('Missing helper blocks:', missing.join(', '));
        }
    }

    createPropertyXML(prop, setOrGet) {
        let helperXml = '';

        // If it's a setter and has a helper, try to generate the helper block
        if (setOrGet === 'set' && prop.helper) {
            const helperData = prop.helper.data;
            const helperType = prop.helper.type;
            const key = helperData && (helperData.key || helperData.tag);

            if ((helperType === 'OPTION_LIST' || (helperData && helperData.options)) && key) {
                // Dropdown helper
                let defaultValue = helperData.defaultOpt || (helperData.options && helperData.options[0] ? helperData.options[0].name : '');
                helperXml = `<value name="VALUE">
                    <block type="helpers_dropdown">
                        <mutation key="${key}" value="${defaultValue}"></mutation>
                        <field name="OPTION">${defaultValue}</field>
                    </block>
                </value>`;
            } else if (helperType === 'ASSET') {
                // Asset helper
                helperXml = `<value name="VALUE">
                    <block type="helpers_assets">
                        <mutation value=""></mutation>
                        <field name="ASSET"></field>
                    </block>
                </value>`;
            } else if (helperType === 'SCREEN') {
                // Screen Name helper
                helperXml = `<value name="VALUE">
                    <block type="helpers_screen_names">
                        <mutation value=""></mutation>
                        <field name="SCREEN"></field>
                    </block>
                </value>`;
            } else if (helperType === 'PROVIDER_MODEL') {
                // Provider Model helper
                helperXml = `<value name="VALUE">
                    <block type="helpers_providermodel">
                        <mutation value=""></mutation>
                        <field name="PROVIDERMODEL"></field>
                    </block>
                </value>`;
            } else if (helperType === 'PROVIDER') {
                // Provider helper
                helperXml = `<value name="VALUE">
                    <block type="helpers_provider">
                        <mutation value=""></mutation>
                        <field name="PROVIDER"></field>
                    </block>
                </value>`;
            }
        }

        return `<xml>
            <block type="component_set_get">
                <mutation 
                    component_type="${this.componentName}" 
                    instance_name="${this.instanceName}" 
                    property_name="${prop.name}" 
                    set_or_get="${setOrGet}"
                    is_generic="false">
                </mutation>
                ${helperXml}
            </block>
        </xml>`;
    }

    renderBlockFromXML(xmlString) {
        const container = document.createElement('div');
        container.className = 'blockly-block-container';
        container.style.position = 'relative';
        container.style.display = 'inline-block';

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            const blockElement = xmlDoc.querySelector('block');

            if (blockElement) {
                // Use BlocklyWorkspace for authentic rendering
                // Pass empty XML initially to delay block rendering until after we mock methods
                const emptyXml = document.createElement('xml');
                const workspaceHelper = new BlocklyWorkspace(emptyXml);

                // TEMPORARY: Attach to DOM for correct Blockly.inject sizing behavior
                const wsElem = workspaceHelper.workspaceView.domElement;
                wsElem.style.position = 'absolute';
                wsElem.style.left = '-9999px';
                wsElem.style.top = '-9999px';
                wsElem.style.visibility = 'hidden';
                document.body.appendChild(wsElem);

                // Initialize (injects Blockly)
                workspaceHelper.initializeWorkspace();

                // Post-init overrides to ensure it finds OUR component
                const workspace = workspaceHelper.workspace;
                if (workspace) {
                    workspace.getDescriptor = (type) => {
                        // Check if it matches our component
                        if (type === 'com.google.appinventor.components.runtime.' + this.componentName ||
                            type === this.componentType ||
                            type.endsWith('.' + this.componentName)) {
                            return this.descriptor;
                        }
                        // Fallback to global lookup
                        return AIProject.descriptorJSON?.find(d =>
                            d.type === 'com.google.appinventor.components.runtime.' + type ||
                            d.type?.endsWith('.' + type)
                        );
                    };

                    // Mock methods required for helper blocks (must be done BEFORE rendering the block)
                    workspace.getScreenList = () => ['Screen1'];
                    workspace.getAssetList = () => ['example.png'];
                    workspace.getProviderModelList = () => ['Gemini', 'ChatGPT', 'Claude'];
                    workspace.getProviderList = () => ['ChatBot1'];

                    // Now render the actual block manually
                    Blockly.Xml.domToBlock(blockElement, workspace);

                    // Force resize to fit content
                    const metrics = workspace.getMetrics();
                    const width = metrics.contentWidth + 10; // modest padding
                    const height = metrics.contentHeight + 10;

                    wsElem.style.width = width + 'px';
                    wsElem.style.height = height + 'px';
                    Blockly.svgResize(workspace);

                    // SVG cleanup for clean export/display
                    const svg = wsElem.querySelector('.blocklySvg');
                    if (svg) {
                        svg.style.backgroundColor = 'transparent';
                        const bg = svg.querySelector('.blocklyMainBackground');
                        if (bg) {
                            bg.style.fill = 'transparent';
                            bg.style.stroke = 'none';
                        }
                    }
                }

                // Move to final container and reset temp styles
                container.appendChild(wsElem);
                wsElem.style.position = 'relative';
                wsElem.style.left = '0px';
                wsElem.style.top = '0px';
                wsElem.style.visibility = 'visible';

                // Store SVG for export
                const rawSvg = container.querySelector('svg');
                if (rawSvg) {
                    container.dataset.svg = rawSvg.outerHTML;
                }
            } else {
                container.innerHTML = '<span style="color:red">Invalid Block XML</span>';
            }

        } catch (error) {
            console.error('Error rendering block:', error);
            container.innerHTML = `<div style="color:red;padding:10px;">Error rendering block: ${error.message}</div>`;
        }

        return container;
    }

    /**
     * Static method to render a single block and get its SVG
     */
    static renderBlock(extensionDescriptor, blockType, blockInfo) {
        const renderer = new BlocklyBlockRenderer(extensionDescriptor);

        switch (blockType) {
            case 'event':
                return renderer.createEventBlock(blockInfo);
            case 'method':
                return renderer.createMethodBlock(blockInfo);
            case 'setter':
                // Pass blockInfo as prop
                return renderer.createPropertySetterBlock(blockInfo);
            case 'getter':
                return renderer.createPropertyGetterBlock(blockInfo);
            default:
                throw new Error(`Unknown block type: ${blockType}`);
        }
    }

    // Helper to parse option lists (reused from original)
    parseOptionLists() {
        const processProps = (props) => {
            if (!props) return;
            props.forEach(prop => {
                if (prop.helper && prop.helper.data) {
                    const key = prop.helper.data.key || prop.helper.data.tag;
                    if (key) {
                        this.optionLists[key] = prop.helper.data;
                    }
                }
            });
        };

        if (this.descriptor.properties) processProps(this.descriptor.properties);
        if (this.descriptor.blockProperties) processProps(this.descriptor.blockProperties);
    }

    // Helper to generic events/methods (reused from original)
    createEventBlock(event) {
        let paramsXml = '';
        if (event.parameters && event.parameters.length > 0) {
            event.parameters.forEach(p => {
                paramsXml += `<arg name="${p.name}"></arg>`;
            });
        }

        const xml = `<xml>
            <block type="component_event">
                <mutation 
                    component_type="${this.componentName}" 
                    is_generic="false" 
                    instance_name="${this.instanceName}" 
                    event_name="${event.name}">
                    ${paramsXml}
                </mutation>
            </block>
        </xml>`;

        return this.renderBlockFromXML(xml);
    }

    createMethodBlock(method) {
        let argsXml = '';
        // Method arguments are inputs (values)
        if (method.parameters && method.parameters.length > 0) {
            method.parameters.forEach(p => {
                // We don't need actual value blocks, just the sockets
                // component_method mutation handles the shape
            });
        }

        const xml = `<xml>
            <block type="component_method">
                <mutation 
                    component_type="${this.componentName}" 
                    method_name="${method.name}" 
                    is_generic="false" 
                    instance_name="${this.instanceName}">
                </mutation>
            </block>
        </xml>`;

        return this.renderBlockFromXML(xml);
    }

    createPropertySetterBlock(prop) {
        return this.renderBlockFromXML(this.createPropertyXML(prop, 'set'));
    }

    createPropertyGetterBlock(prop) {
        return this.renderBlockFromXML(this.createPropertyXML(prop, 'get'));
    }

    registerDescriptor() {
        if (!AIProject.descriptorJSON) {
            AIProject.descriptorJSON = [];
        }
        // Check if exists
        const exists = AIProject.descriptorJSON.find(d => d.name === this.descriptor.name);
        if (!exists) {
            AIProject.descriptorJSON.push(this.descriptor);
        }
    }
}
