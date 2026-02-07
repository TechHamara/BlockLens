import { DescriptorGenerator } from './aia_reader.js';
import { View } from '../views/view.js';
import { Label, Button, Dialog, Downloader, Dropdown, DropdownItem } from '../views/widgets.js';
import { ExtensionViewer, MockBlockRenderer } from './extension_viewer.js';

export class AIProject {
    constructor(name) {
        this.name = name;
        this.screens = [];
        this.extensions = [];
        this.assets = [];
    }

    addAssets(assets) {
        for (let asset of assets) {
            this.addAsset(asset);
        }
    }

    addScreens(screens) {
        for (let screen of screens) {
            this.addScreen(screen);
        }
    }

    addExtensions(extensions) {
        for (let ext of extensions) {
            this.addExtension(ext);
        }
    }

    addAsset(asset) {
        if (!(asset instanceof AIAsset)) {
            throw new TypeError('Attempt to add ' + typeof asset + ' to AIProject');
        }
        this.assets.push(asset);
    }

    addScreen(screen) {
        if (!(screen instanceof AIScreen)) {
            throw new TypeError('Attempt to add ' + typeof screen + ' to AIProject');
        }
        this.screens.push(screen);
    }

    addExtension(extension) {
        if (!(extension instanceof AIExtension)) {
            throw new TypeError('Attempt to add ' + typeof extension + ' to AIProject');
        }
        this.extensions.push(extension);
    }
}

export class AIScreen {
    async init(scm, bky, name, project) {
        this.addToProject(project);
        this.form = await this.generateSchemeData(scm);
        this.generateBlocks(bky);
        this.name = name;
        if (name == null) {
            throw new TypeError('Screen name cannot be null!');
        }
        return this;
    }

    addToProject(project) {
        if (!(project instanceof AIProject)) {
            throw new TypeError('Attempt to set ' + typeof project + ' as project of AIScreen');
        }
        this.project = project;
    }

    async generateSchemeData(scm) {
        const json = JSON.parse(scm.substring(9, scm.length - 3));
        return this.generateComponent(json.Properties);
    }

    async generateComponent(properties) {
        let origin;
        const extension = this.project.extensions.find(ext =>
            ext.name.split('.').pop() === properties.$Type
        );

        if (extension != null) {
            var descriptor = extension.descriptorJSON;
            origin = 'EXTENSION';
        } else {
            origin = 'BUILT-IN';
        }

        const component = new Component(properties.$Name, properties.$Type, properties.Uuid || 0, origin);
        component.properties = await component.loadProperties(properties, descriptor || null);

        for (let child of properties.$Components || []) {
            component.addChild(await this.generateComponent(child));
        }

        return component;
    }

    generateBlocks(bky) {
        this.blocks = bky;
    }
}

class Component {
    constructor(name, type, uid, origin) {
        this.name = name;
        this.type = type;
        this.uid = uid;
        this.children = [];
        this.origin = origin;
        this.properties = [];
        this.faulty = false;
    }

    loadProperties(propertyJSON, descriptorJSON) {
        return new Promise(async (resolve, reject) => {
            if (AIProject.descriptorJSON == null) {
                AIProject.descriptorJSON = await DescriptorGenerator.generate();
            }

            const worker = new Worker('unchive/property_processor.js');

            try {
                const descriptor = descriptorJSON || AIProject.descriptorJSON.find(d =>
                    d.type === 'com.google.appinventor.components.runtime.' + this.type
                );

                worker.postMessage({
                    type: this.name,
                    propertyJSON: propertyJSON,
                    descriptorJSON: (descriptor?.properties) || []
                });
            } catch (error) {
                console.log('Error in ' + this.name + '(' + this.uid + ' / ' + this.type + '), message: ' + error.message);
                this.faulty = true;
                resolve([]);
                worker.terminate();
            }

            worker.addEventListener('message', (e) => {
                resolve(e.data.properties);
                worker.terminate();
            });
        });
    }

    addChild(child) {
        if (!(child instanceof Component)) {
            throw new TypeError('Attempt to add ' + typeof child + ' to Component.');
        }
        this.children.push(child);
    }
}

export class AIExtension {
    constructor(name, descriptorJSON, buildInfo = {}, fileSize = 0, packageName = '') {
        this.name = name;
        this.descriptorJSON = descriptorJSON;
        this.buildInfo = buildInfo;
        this.fileSize = fileSize;
        this.packageName = packageName;
    }
}

export class AIAsset {
    constructor(name, type, blob) {
        this.name = name;
        this.type = type;
        this.blob = blob;
        this.size = blob.size;
        this.url = '';
    }

    getURL() {
        if (this.url === '') {
            this.url = URL.createObjectURL(this.blob);
        }
        return this.url;
    }

    revokeURL() {
        URL.revokeObjectURL(this.url);
    }
}

export class BlocklyWorkspace {
    constructor(blocks) {
        this.workspaceView = new View('DIV');
        this.loaded = false;
        this.blocks = blocks;
        this.faulty = false;
        this.validTypes = ['global_declaration', 'component_event', 'procedures_defnoreturn', 'procedures_defreturn', 'component_method', 'component_set_get'];
    }

    initializeWorkspace() {
        if (this.loaded) {
            this.resizeWorkspace();
        } else {
            this.loaded = true;
            this.workspace = Blockly.inject(this.workspaceView.domElement, {
                toolbox: false,
                trashcan: false,
                readOnly: true,
                scrollbars: false
            });
            // Monkey-patch badBlock to prevent crashes if it's missing in some block definitions
            if (!Blockly.Block.prototype.badBlock) {
                Blockly.Block.prototype.badBlock = function () {
                    // No-op or console.warn("badBlock called on", this);
                };
            }
            this.workspace.setScale(1);
            this.workspace.getDescriptor = (type) => {
                let descriptor = AIProject.descriptorJSON.find(d =>
                    d.type === 'com.google.appinventor.components.runtime.' + type
                );
                if (descriptor == null) {
                    for (let ext of RootPanel.project?.extensions || []) {
                        if (ext.name.split('.').pop() === type) {
                            return ext.descriptorJSON;
                        }
                    }
                }
                return descriptor;
            };

            // Pre-calculate option lists dictionary for helper blocks
            this.optionLists = {};
            this.populateOptionLists();

            // Ensure helper blocks are defined properly similar to blockly_block_renderer.js
            this.defineHelperBlocks();

            // Create mock component database for block rendering
            this.workspace.componentDb_ = this.createMockComponentDatabase();
            this.workspace.getComponentDatabase = () => this.workspace.componentDb_;

            // Connect workspace helper methods to project data
            // These are required by the helper blocks (Screen, Asset, Provider)
            this.workspace.getScreenList = () => {
                // Return list of screen names
                if (RootPanel.project && RootPanel.project.screens) {
                    return RootPanel.project.screens.map(s => s.name);
                }
                return ['Screen1']; // Fallback
            };

            this.workspace.getAssetList = () => {
                // Return list of asset filenames
                if (RootPanel.project && RootPanel.project.assets) {
                    return RootPanel.project.assets.map(a => a.name);
                }
                return [];
            };

            // Provider lists - Mocking or fetching if available
            this.workspace.getProviderModelList = () => {
                return ['Gemini', 'ChatGPT', 'Claude', 'PaLM']; // Standard list or fetch from somewhere if available
            };

            this.workspace.getProviderList = () => {
                // Only return providers that are present in the project (extensions/components)
                if (RootPanel.project && RootPanel.project.extensions) {
                    return RootPanel.project.extensions
                        .filter(ext => ext.descriptorJSON && ext.descriptorJSON.categoryString === 'Extension') // Rough check
                        .map(ext => ext.name);
                }
                return [];
            };

            this.addBlocksToWorkspace();
            this.resizeWorkspace();
        }
    }

    populateOptionLists() {
        // Collect all available option lists from built-in components and extensions

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

        // Also scan method parameters for helpers
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

        // Scan built-in components
        if (AIProject.descriptorJSON) {
            AIProject.descriptorJSON.forEach(desc => {
                processProps(desc.properties);
                processProps(desc.blockProperties);
                processMethods(desc.methods);
            });
        }

        // Scan extensions
        // Scan extensions
        const project = this.project || RootPanel.project;
        if (project && project.extensions) {
            project.extensions.forEach(ext => {
                if (ext.descriptorJSON) {
                    processProps(ext.descriptorJSON.properties);
                    processProps(ext.descriptorJSON.blockProperties);
                    processMethods(ext.descriptorJSON.methods);
                }
            });
        }
    }

    defineHelperBlocks() {
        // Helper: InvalidDropdown class (fallback)
        const FieldInvalidDropdown = (window.AI && AI.Blockly && AI.Blockly.FieldInvalidDropdown)
            ? AI.Blockly.FieldInvalidDropdown
            : Blockly.FieldDropdown;

        // Ensure the helper color constant is defined (red color)
        if (!Blockly.COLOUR_HELPERS) {
            Blockly.COLOUR_HELPERS = '#BF4343';
        }

        // 1. helpers_dropdown
        if (!Blockly.Blocks['helpers_dropdown']) {
            Blockly.Blocks['helpers_dropdown'] = {
                init: function () {
                    this.setColour(Blockly.COLOUR_HELPERS);  // Red color for helper blocks
                    this.appendDummyInput()
                        .appendField(new FieldInvalidDropdown([['', '']]), 'OPTION');
                    this.setOutput(true);
                },
                mutationToDom: function () {
                    const mutation = document.createElement('mutation');
                    mutation.setAttribute('key', this.key_ || '');
                    return mutation;
                },
                domToMutation: function (xml) {
                    // Force helper color to red (in case inherited from parent)
                    this.setColour(Blockly.COLOUR_HELPERS);

                    this.key_ = xml.getAttribute('key');
                    const value = xml.getAttribute('value');

                    const db = this.workspace.getComponentDatabase();
                    if (db && db.getOptionList) {
                        const optionList = db.getOptionList(this.key_);
                        const field = this.getField('OPTION');

                        if (optionList && field) {
                            const options = optionList.options.map(opt => {
                                const key = optionList.tag + opt.name;
                                const i18nName = db.getInternationalizedOptionName(key, opt.name);
                                return [i18nName, opt.name];
                            });

                            if (options.length === 0) options.push(['', '']);
                            options.sort((a, b) => a[0].localeCompare(b[0]));
                            field.menuGenerator_ = options;

                            if (value) field.setValue(value);
                        }
                    }
                }
            };
        }

        // 2. helpers_screen_names
        if (!Blockly.Blocks['helpers_screen_names']) {
            Blockly.Blocks['helpers_screen_names'] = {
                init: function () {
                    this.setColour("#BF4343");
                    this.setOutput(true, 'text');
                    this.appendDummyInput()
                        .appendField(new FieldInvalidDropdown(this.generateOptions.bind(this)), 'SCREEN');
                },
                mutationToDom: function () { return document.createElement('mutation'); },
                domToMutation: function (xml) {
                    const value = xml.getAttribute('value');
                    if (value) this.setFieldValue(value, 'SCREEN');
                },
                generateOptions: function () {
                    const screens = this.workspace.getScreenList ? this.workspace.getScreenList() : [];
                    if (!screens.length) return [['', '']];
                    return screens.map(s => [s, s]);
                }
            };
        }

        // 3. helpers_assets
        if (!Blockly.Blocks['helpers_assets']) {
            Blockly.Blocks['helpers_assets'] = {
                init: function () {
                    this.setColour("#BF4343");
                    this.setOutput(true, 'text');
                    this.appendDummyInput().appendField(new FieldInvalidDropdown(this.generateOptions.bind(this)), 'ASSET');
                },
                domToMutation: function (xml) {
                    const value = xml.getAttribute('value');
                    if (value) this.setFieldValue(value, 'ASSET');
                },
                generateOptions: function () {
                    const assets = this.workspace.getAssetList ? this.workspace.getAssetList() : [];
                    if (!assets.length) return [['', '']];
                    return assets.map(a => [a, a]);
                }
            };
        }

        // 4. helpers_providermodel
        if (!Blockly.Blocks['helpers_providermodel']) {
            Blockly.Blocks['helpers_providermodel'] = {
                init: function () {
                    this.setColour("#BF4343");
                    this.setOutput(true, 'text');
                    this.appendDummyInput().appendField(new FieldInvalidDropdown(this.generateOptions.bind(this)), 'PROVIDERMODEL');
                },
                domToMutation: function (xml) {
                    const value = xml.getAttribute('value');
                    if (value) this.setFieldValue(value, 'PROVIDERMODEL');
                },
                generateOptions: function () {
                    const models = this.workspace.getProviderModelList ? this.workspace.getProviderModelList() : [];
                    if (!models.length) return [['', '']];
                    return models.map(m => [m, m]);
                }
            };
        }

        // 5. helpers_provider
        if (!Blockly.Blocks['helpers_provider']) {
            Blockly.Blocks['helpers_provider'] = {
                init: function () {
                    this.setColour("#BF4343");
                    this.setOutput(true, 'text');
                    this.appendDummyInput().appendField(new FieldInvalidDropdown(this.generateOptions.bind(this)), 'PROVIDER');
                },
                domToMutation: function (xml) {
                    const value = xml.getAttribute('value');
                    if (value) this.setFieldValue(value, 'PROVIDER');
                },
                generateOptions: function () {
                    const providers = this.workspace.getProviderList ? this.workspace.getProviderList() : [];
                    if (!providers.length) return [['', '']];
                    return providers.map(p => [p, p]);
                }
            };
        }
    }

    /**
     * Creates a mock component database that provides methods needed by
     * component blocks (events, methods, properties) for proper rendering.
     */
    createMockComponentDatabase() {
        const getDescriptor = this.workspace.getDescriptor;

        // Build types map from descriptorJSON
        const types = {};
        for (const comp of AIProject.descriptorJSON || []) {
            const name = comp.name || comp.type?.split('.').pop();
            if (name) {
                types[name] = {
                    type: comp.type,
                    external: comp.external,
                    componentInfo: comp,
                    eventDictionary: {},
                    methodDictionary: {},
                    properties: {}
                };
                // Build event dictionary
                for (const event of comp.events || []) {
                    types[name].eventDictionary[event.name] = {
                        name: event.name,
                        description: event.description,
                        deprecated: event.deprecated === 'true' || event.deprecated === true,
                        parameters: (event.params || []).map(p => ({
                            name: p.name,
                            type: p.type
                        }))
                    };
                }
                // Build method dictionary
                for (const method of comp.methods || []) {
                    types[name].methodDictionary[method.name] = {
                        name: method.name,
                        description: method.description,
                        deprecated: method.deprecated === 'true' || method.deprecated === true,
                        returnType: method.returnType,
                        parameters: (method.params || []).map(p => ({
                            name: p.name,
                            type: p.type
                        }))
                    };
                }
                // Build property dictionary
                for (const prop of comp.blockProperties || []) {
                    types[name].properties[prop.name] = prop;
                }
            }
        }

        // Add extension types
        for (const ext of RootPanel.project?.extensions || []) {
            const comp = ext.descriptorJSON;
            const name = comp?.name || ext.name?.split('.').pop();
            if (name && comp) {
                types[name] = {
                    type: comp.type,
                    external: 'true',
                    componentInfo: comp,
                    eventDictionary: {},
                    methodDictionary: {},
                    properties: {}
                };
                for (const event of comp.events || []) {
                    types[name].eventDictionary[event.name] = {
                        name: event.name,
                        description: event.description,
                        deprecated: event.deprecated === 'true' || event.deprecated === true,
                        parameters: (event.params || []).map(p => ({
                            name: p.name,
                            type: p.type
                        }))
                    };
                }
                for (const method of comp.methods || []) {
                    types[name].methodDictionary[method.name] = {
                        name: method.name,
                        description: method.description,
                        deprecated: method.deprecated === 'true' || method.deprecated === true,
                        returnType: method.returnType,
                        parameters: (method.params || []).map(p => ({
                            name: p.name,
                            type: p.type
                        }))
                    };
                }
                for (const prop of comp.blockProperties || []) {
                    types[name].properties[prop.name] = prop;
                }
            }
        }

        return {
            // Type checks
            hasType: (typeName) => typeName in types,
            getType: (typeName) => types[typeName],

            // Event/method/property lookups
            getEventForType: (typeName, eventName) => {
                return types[typeName]?.eventDictionary[eventName];
            },
            getMethodForType: (typeName, methodName) => {
                return types[typeName]?.methodDictionary[methodName];
            },
            getPropertyForType: (typeName, propName) => {
                return types[typeName]?.properties[propName];
            },

            // Instance management (mock - returns component based on name pattern)
            getInstance: (nameOrUid) => {
                // Try to infer type from instance name (e.g., Button1 -> Button)
                const match = nameOrUid?.match(/^([A-Za-z]+)\d*$/);
                const typeName = match ? match[1] : nameOrUid;
                return { name: nameOrUid, typeName: typeName, uid: nameOrUid };
            },
            instanceNameToTypeName: (instanceName) => {
                const match = instanceName?.match(/^([A-Za-z]+)\d*$/);
                return match ? match[1] : instanceName;
            },

            // Setter/getter lists
            getSetterNamesForType: (typeName) => {
                const props = types[typeName]?.properties || {};
                return Object.keys(props).filter(k => {
                    const rw = props[k].rw;
                    return rw === 'read-write' || rw === 'read-only';
                });
            },
            getGetterNamesForType: (typeName) => {
                const props = types[typeName]?.properties || {};
                return Object.keys(props).filter(k => {
                    const rw = props[k].rw;
                    return rw === 'read-write' || rw === 'read-only';
                });
            },

            // Internationalization (just return the name as-is)
            getInternationalizedComponentType: (name) => name,
            getInternationalizedEventName: (name) => name,
            getInternationalizedMethodName: (name) => name,
            getInternationalizedPropertyName: (name) => name,
            getInternationalizedParameterName: (name) => name,
            getInternationalizedEventDescription: (comp, name, desc) => desc || '',
            getInternationalizedMethodDescription: (comp, name, desc) => desc || '',
            getInternationalizedPropertyDescription: (comp, name, desc) => desc || '',
            getInternationalizedOptionName: (key, defaultName) => defaultName,
            getInternationalizedOptionListTag: (name) => name,

            // Option lists
            optionLists_: (() => {
                const opts = {};
                if (this.optionLists) {
                    for (const key in this.optionLists) {
                        const data = this.optionLists[key];
                        opts[key] = {
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
                return opts;
            })(),

            getOptionList: function (key) {
                return this.optionLists_[key];
            },
            forEachOptionList: () => { },

            // Instance iteration (empty - we don't have real instances)
            forEachInstance: () => { },
            getComponentNamesByType: () => [['', 'none']],
            getComponentUidNameMapByType: () => [],

            // Event/method iteration
            forEventInType: (typeName, callback) => {
                const events = types[typeName]?.eventDictionary || {};
                Object.entries(events).forEach(([name, event]) => {
                    if (!event.deprecated) callback(event, name);
                });
            },
            forMethodInType: (typeName, callback) => {
                const methods = types[typeName]?.methodDictionary || {};
                Object.entries(methods).forEach(([name, method]) => {
                    if (!method.deprecated) callback(method, name);
                });
            }
        };
    }

    addBlocksToWorkspace() {
        try {
            Blockly.Xml.domToBlock(this.blocks, this.workspace).setCollapsed(false);
        } catch (error) {
            this.faulty = true;
        } finally {
            if (this.validTypes.indexOf(this.blocks.getAttribute('type')) === -1) {
                this.faulty = true;
            }
        }
    }

    resizeWorkspace() {
        const metrics = this.workspace.getMetrics();
        this.workspaceView.setAttribute('style',
            'height: ' + metrics.contentHeight + 'px;width: ' + metrics.contentWidth + 'px;'
        );
        Blockly.svgResize(this.workspace);
    }

    getWorkspaceView() {
        return this.workspaceView;
    }
}