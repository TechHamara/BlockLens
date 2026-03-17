import { AIProject, AIScreen, AIExtension, AIAsset } from './ai_project.js';
import { Label, Button, Dialog, Downloader, Dropdown, DropdownItem } from '../views/widgets.js';
import { ExtensionViewer, MockBlockRenderer } from './extension_viewer.js';

export class AIAReader {
    static async read(source) {
        return new Promise(async (resolve, reject) => {
            // always start with the built-in component descriptors
            AIProject.descriptorJSON = await DescriptorGenerator.generate();
            // quick audit: warn if there are descriptors without corresponding
            // Blockly block implementations (helps catch missing library files)
            if (window && window.Blockly) {
                AIProject.descriptorJSON.forEach(desc => {
                    const type = desc.type.split('.').pop();
                    if (!window.Blockly.Blocks[type]) {
                        console.warn('⚠️ AIAReader audit: no Blockly block defined for', type);
                    }
                });
            }

            const project = new AIProject();
            const reader = source instanceof Blob
                ? new zip.BlobReader(source)
                : new zip.HttpReader(source);

            zip.createReader(reader, (zipReader) => {
                zipReader.getEntries(async (entries) => {
                    console.log('🔍 AIAReader: total entries in archive =', entries.length);
                    if (entries.length) {
                        // filter json files (extensions and build info)
                        const jsonEntries = entries.filter(e => ['json'].includes(this.getFileType(e)));
                        console.log('📦 AIAReader: found JSON entries:', jsonEntries.map(e => e.filename));
                        project.addExtensions(await this.generateExtensions(jsonEntries));

                        // gather screens
                        const screenEntries = entries.filter(e => {
                            const t = this.getFileType(e);
                            return t === 'scm' || t === 'bky';
                        });
                        console.log('🖥 AIAReader: found screen files:', screenEntries.map(e => e.filename));
                        project.addScreens(await this.generateScreens(screenEntries, project));

                        // after screens loaded, log any unknown block types so that missing
                        // component descriptors from simple_components.json can be identified
                        try {
                            const types = new Set();
                            project.screens.forEach(s => {
                                if (s.blocks) {
                                    const xml = new DOMParser().parseFromString(s.blocks, 'text/xml');
                                    xml.querySelectorAll('block').forEach(b => {
                                        const t = b.getAttribute('type');
                                        if (t) types.add(t);
                                    });
                                }
                            });
                            types.forEach(t => {
                                let found = AIProject.descriptorJSON.find(d =>
                                    d.type === 'com.google.appinventor.components.runtime.' + t
                                );
                                if (!found) {
                                    // check extensions in this project as well
                                    const extMatch = project.extensions?.find(ext =>
                                        ext.name.split('.').pop() === t
                                    );
                                    if (extMatch) {
                                        found = extMatch.descriptorJSON;
                                    }
                                }
                                if (!found) {
                                    console.warn('⚠️ AIAReader: block type has no descriptor', t);
                                }
                            });
                        } catch (e) {
                            console.warn('Could not analyze block types:', e);
                        }

                        // assets at root of assets/ folder
                        const assetEntries = entries.filter(e => {
                            const parts = e.filename.split('/');
                            return parts[0] === 'assets' && parts.length === 2;
                        });
                        console.log('🖼 AIAReader: found asset files:', assetEntries.map(e => e.filename));
                        project.addAssets(await this.generateAssets(assetEntries));

                        resolve(project);
                    }
                });
            });
        });
    }

    static async generateScreens(entries, project) {
        const scms = [];
        const bkys = [];
        const screens = [];

        for (let entry of entries) {
            const content = await this.getFileContent(entry);
            const type = this.getFileType(entry);
            const name = this.getFileName(entry);
            if (type === 'scm') {
                scms.push({ name, scm: content });
            } else if (type === 'bky') {
                bkys.push({ name, bky: content });
            } else {
                // unknown type filtered earlier, but log for safety
                console.warn('⚠️ AIAReader.generateScreens: unexpected file type', entry.filename);
            }
        }

        for (let scm of scms) {
            const screen = new AIScreen();
            const bkyEntry = bkys.find(b => b.name === scm.name);
            if (!bkyEntry) {
                console.warn(`⚠️ AIAReader.generateScreens: missing .bky for screen ${scm.name}`);
            }
            const bky = bkyEntry ? bkyEntry.bky : '<xml></xml>'; // empty placeholder if missing
            screens.push(screen.init(scm.scm, bky, scm.name, project));
        }

        return Promise.all(screens);
    }

    static async generateExtensions(entries) {
        const buildInfos = [];
        const descriptors = [];
        const extensions = [];

        for (let entry of entries) {
            const content = await this.getFileContent(entry);
            const filename = this.getFileName(entry);
            console.log('🔧 AIAReader.generateExtensions processing', filename);

            // Some archives may include the type as part of the path or use uppercase
            if (/component_build_info/i.test(filename)) {
                // third segment of path usually holds the extension name
                const parts = entry.filename.split('/');
                const name = parts[2] || filename;
                buildInfos.push({
                    name,
                    info: JSON.parse(content)
                });
            } else if (/^component(s)?$/i.test(filename)) {
                const parts = entry.filename.split('/');
                const name = parts[2] || filename;
                descriptors.push({
                    name,
                    descriptor: JSON.parse(content)
                });
            } else {
                // might be other JSON data (e.g. project properties) – ignore
            }
        }

        for (let buildInfo of buildInfos) {
            if (Array.isArray(buildInfo.info)) {
                for (let info of buildInfo.info) {
                    const descriptor = descriptors.find(d => d.name === buildInfo.name);
                    if (!descriptor) {
                        console.warn('⚠️ Extension buildInfo without matching descriptor', buildInfo.name);
                        continue;
                    }
                    extensions.push(new AIExtension(
                        info.type,
                        descriptor.descriptor[buildInfo.info.indexOf(info)]
                    ));
                }
            } else {
                const descriptor = descriptors.find(d => d.name === buildInfo.name);
                if (!descriptor) {
                    console.warn('⚠️ Extension buildInfo without matching descriptor', buildInfo.name);
                    continue;
                }
                extensions.push(new AIExtension(buildInfo.info.type, descriptor.descriptor));
            }
        }

        return extensions;
    }

    static async generateAssets(entries) {
        const assets = [];

        for (let entry of entries) {
            const content = await this.getFileContent(entry, new zip.BlobWriter());
            assets.push(new AIAsset(this.getFileName(entry), this.getFileType(entry), content));
        }

        return assets;
    }

    static getFileContent(entry, writer = new zip.TextWriter()) {
        return new Promise((resolve, reject) => {
            entry.getData(writer, (content) => {
                resolve(content);
            });
        });
    }

    static getFileType(entry) {
        // return lower-case extension (after last dot) to make handling case-insensitive
        const parts = entry.filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    static getFileName(entry) {
        return entry.filename.split('/').pop().split('.')[0];
    }
}

export class DescriptorGenerator {
    static generate() {
        return new Promise((resolve, reject) => {
            this.fetchJSON((json) => {
                resolve(JSON.parse(json));
            });
        });
    }

    static fetchJSON(callback) {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.open('GET', fetchDir('unchive/simple_components.json'), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                callback(xhr.responseText);
            }
        };
        xhr.send(null);
    }
}