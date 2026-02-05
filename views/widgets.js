import { View } from './view.js';

export class Image extends View {
    constructor(src) {
        super('IMG');
        if (src != null) {
            this.setSource(src);
        }
    }

    setSource(src) {
        this.setAttribute('src', src);
        this.source = src;
    }
}

export class Label extends View {
    constructor(text, isHTML) {
        super('P');
        this.addStyleName('blocklens-label');
        if (text != null) {
            if (isHTML) {
                this.setHTML(text);
            } else {
                this.setText(text);
            }
        }
    }

    setText(text) {
        this.domElement.innerText = text;
        this.text = text;
    }

    setHTML(html) {
        this.domElement.innerHTML = html;
        this.text = html;
    }
}

export class Button extends View {
    constructor(text, isIcon) {
        super('BUTTON');
        this.addStyleName('blocklens-button');
        if (isIcon) {
            this.addStyleName('blocklens-button--icon');
        }
        this.isIconButton = isIcon;
        if (text != null) {
            this.setHTML(text);
        }
    }

    setHTML(text) {
        this.domElement.innerHTML = this.isIconButton
            ? '<i class="material-icons">' + text + '</i>'
            : text;
        this.text = text;
    }

    addClickListener(callback) {
        this.domElement.addEventListener('click', callback);
    }
}

export class Dropdown extends View {
    constructor(value, onChange) {
        super('SELECT');
        this.domElement.value = value;
        this.addStyleName('blocklens-dropdown');
        this.domElement.addEventListener('change', onChange);
    }

    addDropdownItem(item) {
        this.addView(item);
    }

    getValue() {
        return this.domElement.value;
    }

    setValue(value) {
        this.domElement.value = value;
    }
}

export class DropdownItem extends View {
    constructor(text) {
        super('OPTION');
        this.domElement.innerHTML = text;
        this.addStyleName('blocklens-dropdown-item');
    }
}

export class Downloader {
    static downloadURL(url, filename) {
        const link = new View('A');
        link.domElement.href = url;
        link.domElement.target = '_blank';
        link.domElement.download = filename;
        link.domElement.click();
    }

    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        this.downloadURL(url, filename);
        URL.revokeObjectURL(url);
    }

    static downloadText(text, filename) {
        this.downloadBlob(new Blob([text], { type: 'text/html' }), filename);
    }

    /**
     * Create and download a ZIP file containing multiple files
     * @param {string} filename - Name of the ZIP file
     * @param {Array} files - Array of {name, content, type} objects
     */
    static async downloadZip(filename, files) {
        return new Promise((resolve, reject) => {
            window.zip.createWriter(new window.zip.BlobWriter('application/zip'), async (writer) => {
                try {
                    for (const file of files) {
                        let reader;
                        if (file.content instanceof Blob) {
                            reader = new window.zip.BlobReader(file.content);
                        } else {
                            // Text content
                            const textBlob = new Blob([file.content], { type: file.type || 'text/plain' });
                            reader = new window.zip.BlobReader(textBlob);
                        }
                        await new Promise((res, rej) => {
                            writer.add(file.name, reader, res, rej);
                        });
                    }
                    writer.close((blob) => {
                        this.downloadBlob(blob, filename);
                        resolve();
                    });
                } catch (err) {
                    console.error('ZIP creation error:', err);
                    reject(err);
                }
            }, reject);
        });
    }
}

export class URLHandler {
    static getReqParams() {
        const search = window.location.search.substr(1);
        if (search != null && search !== '') {
            return this.makeArray(search);
        }
        return {};
    }

    static makeArray(search) {
        const params = {};
        const pairs = search.split('&');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            params[pair[0]] = pair[1];
        }
        return params;
    }
}

export class ScriptLoader {
    static loadScript(src, callback) {
        const script = document.createElement('SCRIPT');
        script.src = src;
        document.head.appendChild(script);
        script.onload = () => {
            if (callback) {
                callback();
            }
        };
    }
}

export class AssetFormatter {
    static formatSize(bytes) {
        let index = 0;
        while (bytes > 1000) {
            bytes /= 1000;
            index++;
        }
        return parseInt(bytes) + ['B', 'kB', 'MB', 'GB', 'TB', 'PB'][index];
    }
}

export class Dialog extends View {
    constructor(title, content) {
        super('DIV');
        this.addStyleName('blocklens-dialog');

        this.titleView = new Label(title, true);
        this.titleView.addStyleName('blocklens-dialog__title');

        this.contentView = new Label(content, true);
        this.contentView.addStyleName('blocklens-dialog__content');

        this.addView(this.titleView);
        this.addView(this.contentView);

        this.glass = new View('DIV');
        this.glass.addStyleName('blocklens-dialog__glass');
    }

    open() {
        RootPanel.addView(this);
        RootPanel.addView(this.glass);
    }

    close() {
        RootPanel.removeView(this);
        RootPanel.removeView(this.glass);
    }
}
