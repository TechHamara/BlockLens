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
        // Override helpers_dropdown with a simpler version that works for documentation rendering
        // The official block from lib/blockly/blocks/helpers.js requires full AI infrastructure
        const self = this;

        // Ensure the helper color constant is defined (red color for helper blocks)
        if (!Blockly.COLOUR_HELPERS) {
            Blockly.COLOUR_HELPERS = '#BF4343';
        }

        // Simple dropdown field that doesn't require FieldInvalidDropdown
        const DropdownField = Blockly.FieldDropdown || Blockly.Field;

        Blockly.Blocks['helpers_dropdown'] = {
            init: function () {
                this.key_ = '';
                this.setColour(Blockly.COLOUR_HELPERS);  // Red color for helper blocks
                this.setOutput(true);
                // The rest gets configured in domToMutation
            },

            mutationToDom: function () {
                const mutation = document.createElement('mutation');
                mutation.setAttribute('key', this.key_ || '');
                mutation.setAttribute('value', this.value_ || '');
                return mutation;
            },

            domToMutation: function (xml) {
                // Force the helper block color to red (in case it was inherited from parent)
                this.setColour(Blockly.COLOUR_HELPERS);

                this.key_ = xml.getAttribute('key') || '';
                const value = xml.getAttribute('value') || '';
                this.value_ = value;

                // Get the component database
                const db = this.workspace.getComponentDatabase ? this.workspace.getComponentDatabase() : null;
                let optionList = null;
                let tag = this.key_;
                let options = [[value || '', value || '']];

                // Try to get option list from database
                if (db && db.getOptionList) {
                    optionList = db.getOptionList(this.key_);
                    if (optionList) {
                        tag = optionList.tag || this.key_;
                        // Build options from the option list
                        if (optionList.options && optionList.options.length > 0) {
                            options = optionList.options
                                .filter(opt => !opt.deprecated)
                                .map(opt => [opt.name, opt.name]);
                            if (options.length === 0) {
                                options = [[value || '', value || '']];
                            }
                        }
                    }
                }

                // Remove any existing input
                if (this.getInput('DUMMY')) {
                    this.removeInput('DUMMY');
                }

                // Create the dropdown with options
                const dropdown = new Blockly.FieldDropdown(options);
                this.appendDummyInput('DUMMY')
                    .appendField(tag)
                    .appendField(dropdown, 'OPTION');

                // Set the value to defaultOpt or the value from xml
                const defaultValue = value || (optionList && optionList.defaultOpt) || (options[0] && options[0][1]) || '';
                if (defaultValue) {
                    try {
                        this.setFieldValue(defaultValue, 'OPTION');
                    } catch (e) {
                        // Value might not be in options, ignore
                    }
                }
            }
        };

        // Verify other required blocks exist
        const requiredBlocks = [
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
                    // Register our component instance in ComponentDatabase so dropdown shows it
                    const componentDb = workspace.getComponentDatabase();

                    // Ensure the component database has the required methods for instance management
                    if (componentDb) {
                        // Initialize internal instance storage if not present
                        if (!componentDb.instances_) {
                            componentDb.instances_ = {};
                        }
                        if (!componentDb.instanceNameUid_) {
                            componentDb.instanceNameUid_ = {};
                        }

                        // Add hasInstance method if missing
                        if (!componentDb.hasInstance) {
                            componentDb.hasInstance = (uid) => uid in componentDb.instances_;
                        }

                        // Add getInstance method if missing
                        if (!componentDb.getInstance) {
                            componentDb.getInstance = (uidOrName) => {
                                return componentDb.instances_[uidOrName] ||
                                    componentDb.instances_[componentDb.instanceNameUid_[uidOrName]];
                            };
                        }

                        // Add instanceNameToTypeName method if missing
                        if (!componentDb.instanceNameToTypeName) {
                            componentDb.instanceNameToTypeName = (instanceName) => {
                                if (instanceName in componentDb.instanceNameUid_) {
                                    return componentDb.instances_[componentDb.instanceNameUid_[instanceName]].typeName;
                                }
                                return false;
                            };
                        }

                        // Add addInstance method if missing
                        if (!componentDb.addInstance) {
                            componentDb.addInstance = (uid, name, typeName) => {
                                if (componentDb.hasInstance(uid)) {
                                    return false;
                                }
                                componentDb.instances_[uid] = { uid: uid, name: name, typeName: typeName };
                                componentDb.instanceNameUid_[name] = uid;
                                return true;
                            };
                        }

                        // Now register our instance
                        const instanceExists = componentDb.hasInstance(this.instanceName) ||
                            (this.instanceName in componentDb.instanceNameUid_);

                        if (!instanceExists) {
                            // Generate a unique uid for this instance
                            const uid = this.instanceName + '_' + Date.now();
                            componentDb.addInstance(uid, this.instanceName, this.componentName);
                        }
                    }

                    // Register option lists from extension so helper blocks can find defaultOpt and options
                    if (componentDb && this.optionLists) {
                        // Ensure optionLists_ exists on componentDb
                        if (!componentDb.optionLists_) {
                            componentDb.optionLists_ = {};
                        }
                        for (const key in this.optionLists) {
                            if (!componentDb.optionLists_[key]) {
                                const data = this.optionLists[key];
                                componentDb.optionLists_[key] = {
                                    className: data.className,
                                    tag: data.tag || key,
                                    defaultOpt: data.defaultOpt,
                                    underlyingType: data.underlyingType,
                                    options: (data.options || []).map(opt => ({
                                        name: opt.name,
                                        value: opt.value,
                                        description: opt.description,
                                        deprecated: opt.deprecated === 'true' || opt.deprecated === true
                                    }))
                                };
                            }
                        }

                        // Ensure getOptionList method exists
                        if (!componentDb.getOptionList) {
                            componentDb.getOptionList = (key) => componentDb.optionLists_[key];
                        }

                        // Ensure getInternationalizedOptionListTag method exists (for dropdown labels)
                        if (!componentDb.getInternationalizedOptionListTag) {
                            componentDb.getInternationalizedOptionListTag = (name) => name || '';
                        }

                        // Ensure getInternationalizedOptionName method exists
                        if (!componentDb.getInternationalizedOptionName) {
                            componentDb.getInternationalizedOptionName = (key, defaultName) => defaultName || '';
                        }
                    }

                    // Override getComponentNamesByType to return our instance
                    // This is crucial for the component dropdown to display the instance name
                    // MUST be outside the optionLists check to always execute
                    if (componentDb) {
                        const self = this;
                        componentDb.getComponentNamesByType = (typeName) => {
                            // If the requested type matches our component, return our instance name
                            if (typeName === self.componentName) {
                                return [[self.instanceName, self.instanceName]];
                            }
                            // Fallback to default behavior
                            return [[' ', 'none']];
                        };
                    }

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
                    const renderedBlock = Blockly.Xml.domToBlock(blockElement, workspace);

                    // Post-render fix: Explicitly set the component dropdown text
                    // The dropdown may not display correctly if setValue is called before 
                    // the menuGenerator_ returns valid options
                    if (renderedBlock && !renderedBlock.isGeneric) {
                        const componentDropDown = renderedBlock.componentDropDown;
                        if (componentDropDown) {
                            // Force set the value and text
                            componentDropDown.setValue(this.instanceName);
                            // Also set the text field directly for display
                            if (componentDropDown.textElement_) {
                                componentDropDown.textElement_.textContent = this.instanceName;
                            }
                            // Use forceRerender if available
                            if (typeof componentDropDown.forceRerender === 'function') {
                                componentDropDown.forceRerender();
                            }
                        }
                        // Also try setting via setFieldValue on the block
                        try {
                            renderedBlock.setFieldValue(this.instanceName, Blockly.ComponentBlock.COMPONENT_SELECTOR);
                        } catch (e) {
                            // Field might not exist, ignore
                        }
                    }

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

    // Helper to parse option lists from properties and method params
    parseOptionLists() {
        const processHelper = (helper) => {
            if (helper && helper.data) {
                const key = helper.data.key || helper.data.tag;
                if (key) {
                    this.optionLists[key] = helper.data;
                }
            }
        };

        const processProps = (props) => {
            if (!props) return;
            props.forEach(prop => processHelper(prop.helper));
        };

        const processMethods = (methods) => {
            if (!methods) return;
            methods.forEach(method => {
                // Check method return type helper
                processHelper(method.helper);
                // Check each param for helper
                if (method.params) {
                    method.params.forEach(param => processHelper(param.helper));
                }
                if (method.parameters) {
                    method.parameters.forEach(param => processHelper(param.helper));
                }
            });
        };

        if (this.descriptor.properties) processProps(this.descriptor.properties);
        if (this.descriptor.blockProperties) processProps(this.descriptor.blockProperties);
        if (this.descriptor.methods) processMethods(this.descriptor.methods);
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
        let helperInputsXml = '';

        // Get params from either params or parameters field
        const params = method.params || method.parameters || [];

        // Generate helper blocks for params that have helpers
        params.forEach((param, index) => {
            if (param.helper) {
                const helperData = param.helper.data;
                const helperType = param.helper.type;
                const key = helperData && (helperData.key || helperData.tag);

                // ARG input name follows Blockly convention: ARG0, ARG1, etc.
                const argName = `ARG${index}`;

                if ((helperType === 'OPTION_LIST' || (helperData && helperData.options)) && key) {
                    // Dropdown helper
                    let defaultValue = helperData.defaultOpt || (helperData.options && helperData.options[0] ? helperData.options[0].name : '');
                    helperInputsXml += `<value name="${argName}">
                        <block type="helpers_dropdown">
                            <mutation key="${key}" value="${defaultValue}"></mutation>
                            <field name="OPTION">${defaultValue}</field>
                        </block>
                    </value>`;
                } else if (helperType === 'ASSET') {
                    helperInputsXml += `<value name="${argName}">
                        <block type="helpers_assets">
                            <mutation value=""></mutation>
                            <field name="ASSET"></field>
                        </block>
                    </value>`;
                } else if (helperType === 'SCREEN') {
                    helperInputsXml += `<value name="${argName}">
                        <block type="helpers_screen_names">
                            <mutation value=""></mutation>
                            <field name="SCREEN"></field>
                        </block>
                    </value>`;
                }
            }
        });

        const xml = `<xml>
            <block type="component_method">
                <mutation 
                    component_type="${this.componentName}" 
                    method_name="${method.name}" 
                    is_generic="false" 
                    instance_name="${this.instanceName}">
                </mutation>
                ${helperInputsXml}
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
