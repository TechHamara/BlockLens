import { View } from './view.js';
import { Image, Label, Button, Dropdown, DropdownItem, Dialog, Downloader, URLHandler } from './widgets.js';
import { ScreenNode, AdditionalListNode, ExtensionNode, AssetNode } from './nodes/node.js';
import { NodeList } from './nodes/node_list.js';
import { AIAReader, DescriptorGenerator } from '../unchive/aia_reader.js';
import { AIXReader } from '../unchive/aix_reader.js';
import { AIProject } from '../unchive/ai_project.js';
import { SummaryWriter } from '../unchive/summary_writer.js';
import { ExtensionPage } from './extension_page.js';
import { ExtensionDocsPage } from './extension_docs_page.js';
import { MarkdownDocsPage } from './markdown_docs_page.js';

// App Version - Update this when releasing new versions
const APP_VERSION = 'v1.1.0';

export class Screen extends View {
    constructor() {
        super('DIV');
        this.setStyleName('root-panel');

        // Title bar
        this.titleBar = new TitleBar(this);
        this.addView(this.titleBar);

        // Main content area
        this.mainContent = new View('DIV');
        this.mainContent.setStyleName('main-content');
        this.addView(this.mainContent);

        // Upload page (centered)
        this.uploadPage = new UploadPage(this);
        this.mainContent.addView(this.uploadPage);

        // Node list container (hidden initially)
        this.nodeListContainer = new View('DIV');
        this.nodeListContainer.addStyleName('node-list-container');
        this.nodeListContainer.setVisible(false);
        this.mainContent.addView(this.nodeListContainer);

        // Extension page placeholder
        this.extensionPage = null;
        this.extensionDocsPage = null;

        // Theme state
        this.isDarkMode = false;
    }

    async handleURLData() {
        this.req = URLHandler.getReqParams();
        if (this.req.url) {
            Opener.openURL(this.req.url);
        }
        if (this.req.embed === 'true') {
            this.titleBar.setVisible(false);
            this.addStyleName('embed');
        }
        // Check saved theme preference
        if (localStorage.getItem('theme') === 'dark') {
            this.toggleTheme();
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        this.titleBar.updateThemeIcon(this.isDarkMode);
    }

    async openProject(project) {
        if (AIProject.descriptorJSON == null) {
            AIProject.descriptorJSON = await DescriptorGenerator.generate();
        }
        console.log('Opening project:', project);
        this.project = project;

        // Hide upload page, show node list
        this.uploadPage.setVisible(false);
        this.nodeListContainer.setVisible(true);
        this.titleBar.exportButton.setVisible(true);
        this.titleBar.backButton.setVisible(true);
        this.titleBar.title.setText(`${Messages.pageTitle} - ${project.name}.${this.aiv ? 'aiv' : 'aia'}`);

        this.initializeNodeLists();

        for (let screen of project.screens) {
            this.primaryNodeList.addNodeAsync(ScreenNode.promiseNode(screen));
        }

        this.primaryNodeList.addNodeAsync(AdditionalListNode.promiseNode('Extensions', project.extensions, function (extensions) {
            for (let ext of extensions) {
                this.chainNodeList.addNode(new ExtensionNode(ext.descriptorJSON.name, ext.name, ext.descriptorJSON.helpString));
            }
        }));

        this.primaryNodeList.addNodeAsync(AdditionalListNode.promiseNode('Assets', project.assets, function (assets) {
            for (let asset of assets) {
                this.chainNodeList.addNode(new AssetNode(asset.name, asset.type, asset.size, RootPanel.aiv ? 'unknown.unknown' : asset.getURL()));
            }
        }));

        this.primaryNodeList.addNodeAsync(AdditionalListNode.promiseNode('Summary', null, null, function () {
            if (!this.loaded) {
                this.loaded = true;
                SummaryWriter.generateSummmaryNodesForProject(project, this.chainNodeList);
            }
        }));

        if (project.extensions && project.extensions.length > 0) {
            this.primaryNodeList.addNodeAsync(AdditionalListNode.promiseNode('Extensions Docs', project.extensions, function (extensions) {
                // No sub-list generation needed
            }, () => {
                RootPanel.openExtensionDocs(project.extensions);
            }));
        }
    }

    async openExtensionDocs(extensions) {
        // Close other views
        this.uploadPage.setVisible(false);
        this.nodeListContainer.setVisible(false);

        if (this.extensionDocsPage) {
            this.mainContent.removeView(this.extensionDocsPage);
        }

        // Use MarkdownDocsPage for simple Preview/Raw toggle documentation view
        this.extensionDocsPage = new MarkdownDocsPage(extensions);
        this.mainContent.addView(this.extensionDocsPage);

        this.titleBar.title.setText(`${Messages.pageTitle} - Extensions Documentation`);
        this.titleBar.backButton.setVisible(true);
    }

    async openExtension(extensions) {
        console.log('Opening extension viewer with', extensions.length, 'extensions');
        this.uploadPage.setVisible(false);
        this.nodeListContainer.setVisible(false);

        this.extensionPage = new ExtensionPage(extensions);
        this.mainContent.addView(this.extensionPage);

        this.titleBar.title.setText(`${Messages.pageTitle} - Extension Viewer`);
        this.titleBar.exportButton.setVisible(false);
        this.titleBar.backButton.setVisible(true);
    }

    showMainScreen() {
        // Remove extension page if exists
        if (this.extensionPage) {
            this.mainContent.removeView(this.extensionPage);
            this.extensionPage = null;
        }
        if (this.extensionDocsPage) {
            this.mainContent.removeView(this.extensionDocsPage);
            this.extensionDocsPage = null;
        }

        // Hide node list
        this.nodeListContainer.setVisible(false);

        // Show upload page
        this.uploadPage.setVisible(true);

        // Reset title bar
        this.titleBar.title.setText(Messages.pageTitle);
        this.titleBar.exportButton.setVisible(false);
        this.titleBar.backButton.setVisible(false);
    }

    initializeNodeLists() {
        this.primaryNodeList = new NodeList();
        this.primaryNodeList.addStyleName('node-list--primary');
        this.nodeLists = [this.primaryNodeList];
        this.nodeListContainer.clear();
        this.nodeListContainer.addView(this.primaryNodeList);

        this.helpPanel = new View('DIV');
        this.helpPanel.addView(new Label('Click on a Screen to view its details'));
        this.helpPanel.addStyleName('help-panel');
        this.nodeListContainer.addView(this.helpPanel);
    }
}

/**
 * TitleBar - Navigation bar with theme toggle
 */
class TitleBar extends View {
    constructor(screen) {
        super('DIV');
        this.screen = screen;
        this.setStyleName('title-bar');

        // Left section
        const leftSection = new View('DIV');
        leftSection.setStyleName('title-bar__left');

        // Back button (hidden initially)
        this.backButton = new Button('arrow_back', true);
        this.backButton.addStyleName('title-bar__back-button');
        this.backButton.domElement.title = 'Back to Home';
        this.backButton.addClickListener(() => this.screen.showMainScreen());
        this.backButton.setVisible(false);
        leftSection.addView(this.backButton);

        // Logo
        this.logo = new Image('logo.png');
        this.logo.addStyleName('title-bar__logo');
        this.logo.setSource(fetchDir('logo.png'));
        leftSection.addView(this.logo);

        // Title
        this.title = new Label(Messages.pageTitle);
        this.title.addStyleName('title-bar__title');
        leftSection.addView(this.title);

        // Version Badge
        this.versionBadge = new Label(APP_VERSION);
        this.versionBadge.addStyleName('title-bar__version-badge');
        this.versionBadge.domElement.title = 'Current Version';
        leftSection.addView(this.versionBadge);

        this.addView(leftSection);

        // Right section
        const rightSection = new View('DIV');
        rightSection.setStyleName('title-bar__right');

        // Theme toggle
        this.themeButton = new Button('dark_mode', true);
        this.themeButton.addStyleName('title-bar__theme-button');
        this.themeButton.domElement.title = 'Toggle Dark Mode';
        this.themeButton.addClickListener(() => this.screen.toggleTheme());
        rightSection.addView(this.themeButton);

        // Export button (hidden initially)
        this.exportButton = new Button('cloud_download', true);
        this.exportButton.addStyleName('title-bar__export-button');
        this.exportButton.domElement.title = 'Export as .aiv';
        this.exportButton.addClickListener(() => {
            Downloader.downloadURL(
                'data:application/json;charset=utf-8,' + encodeURIComponent(Flatted.stringify(RootPanel.project)),
                `${RootPanel.project.name}.aiv`
            );
        });
        this.exportButton.setVisible(false);
        rightSection.addView(this.exportButton);

        // Locale dropdown
        this.localeDropdown = new Dropdown('', (e) => {
            window.location = '?locale=' + window.locales.find(l => l[0] == this.localeDropdown.getValue())[1];
        });
        for (let locale of window.locales) {
            this.localeDropdown.addDropdownItem(new DropdownItem(locale[0]));
        }
        this.localeDropdown.setValue(window.locale[0]);
        this.localeDropdown.addStyleName('title-bar__locale-dropdown');
        rightSection.addView(this.localeDropdown);

        this.addView(rightSection);
    }

    updateThemeIcon(isDark) {
        this.themeButton.setHTML(isDark ? 'light_mode' : 'dark_mode');
    }
}

/**
 * UploadPage - Centered upload with drag & drop
 */
class UploadPage extends View {
    constructor(screen) {
        super('DIV');
        this.screen = screen;
        this.setStyleName('upload-page');
        this.render();
        this.setupDragDrop();
    }

    render() {
        // Hero section
        const hero = new View('DIV');
        hero.setStyleName('upload-page__hero');

        // Icon
        const iconWrapper = new View('DIV');
        iconWrapper.setStyleName('upload-page__icon-wrapper');
        iconWrapper.domElement.innerHTML = '<i class="material-icons">folder_open</i>';
        hero.addView(iconWrapper);

        // Title
        const title = new Label('BlockLens');
        title.addStyleName('upload-page__title');
        hero.addView(title);

        // Subtitle
        const subtitle = new Label('View and analyze App Inventor projects (.aia) and extensions (.aix)');
        subtitle.addStyleName('upload-page__subtitle');
        hero.addView(subtitle);

        this.addView(hero);

        // Drop zone
        this.dropZone = new View('DIV');
        this.dropZone.setStyleName('upload-page__drop-zone');

        // Drop zone content
        const dropContent = new View('DIV');
        dropContent.setStyleName('upload-page__drop-content');

        const dropIcon = new View('DIV');
        dropIcon.setStyleName('upload-page__drop-icon');
        dropIcon.domElement.innerHTML = '<i class="material-icons">cloud_upload</i>';
        dropContent.addView(dropIcon);

        const dropText = new Label('Drag & drop your file here');
        dropText.addStyleName('upload-page__drop-text');
        dropContent.addView(dropText);

        const orText = new Label('or');
        orText.addStyleName('upload-page__or-text');
        dropContent.addView(orText);

        // Browse button
        this.browseButton = new Button('Browse Files', false);
        this.browseButton.addStyleName('upload-page__browse-button');
        this.browseButton.domElement.title = 'Click to browse .aia or .aix files';

        // Hidden file input
        this.fileInput = new View('INPUT');
        this.fileInput.domElement.type = 'file';
        this.fileInput.domElement.accept = '.aia,.aiv,.aix';
        this.fileInput.domElement.style.display = 'none';
        this.fileInput.domElement.addEventListener('change', (event) => {
            if (event.target.files[0]) {
                Opener.openFile(event.target.files[0].name, event.target.files[0]);
                event.target.value = ''; // Reset input to allow selecting same file again
            }
        });

        this.browseButton.addClickListener(() => this.fileInput.domElement.click());
        dropContent.addView(this.browseButton);
        dropContent.addView(this.fileInput);

        // Supported formats
        const formats = new Label('.aia • .aix • .aiv');
        formats.addStyleName('upload-page__formats');
        dropContent.addView(formats);

        this.dropZone.addView(dropContent);
        this.addView(this.dropZone);

        // Features section
        const features = new View('DIV');
        features.setStyleName('upload-page__features');

        this.addFeatureCard(features, 'visibility', 'View Projects', 'Explore screens, components, and blocks');
        this.addFeatureCard(features, 'extension', 'Analyze Extensions', 'View events, methods, and properties');
        this.addFeatureCard(features, 'download', 'Export Blocks', 'Download blocks as PNG images');
        this.addFeatureCard(features, 'description', 'Documentation', 'Generate markdown documentation');

        this.addView(features);

        // FAQ Section
        const faqSection = new View('DIV');
        faqSection.setStyleName('faq-section');

        const faqHeader = new View('DIV');
        faqHeader.setStyleName('faq-section__header');

        const faqTitle = new Label('Frequently Asked Questions');
        faqTitle.addStyleName('faq-section__title');
        faqHeader.addView(faqTitle);

        const faqSubtitle = new Label('Everything you need to know about BlockLens');
        faqSubtitle.addStyleName('faq-section__subtitle');
        faqHeader.addView(faqSubtitle);

        faqSection.addView(faqHeader);

        const faqContainer = new View('DIV');
        faqContainer.setStyleName('faq-container');

        // FAQ Items
        const faqItems = [
            {
                question: 'What file formats are supported?',
                answer: 'BlockLens supports .aia (App Inventor project files), .aix (extension files), and .aiv (project archives). You can upload any of these formats to view and analyze their contents.'
            },
            {
                question: 'Is my data secure?',
                answer: 'Absolutely! All file processing happens directly in your browser. Your files are never uploaded to any server, ensuring complete privacy and security.'
            },
            {
                question: 'Can I export blocks as images?',
                answer: 'Yes! BlockLens allows you to export individual blocks as PNG images or download all blocks at once as a ZIP file. Perfect for documentation and tutorials.'
            },
            {
                question: 'Which block color themes are available?',
                answer: 'You can choose between App Inventor, Kodular, and Niotron block color themes. Switch anytime to match your development environment.'
            },
            {
                question: 'Does it work offline?',
                answer: 'Yes! Once the page is loaded, BlockLens works completely offline. You can save the webpage for offline use anytime.'
            },
            {
                question: 'How do I generate extension documentation?',
                answer: 'Simply upload your .aix file, then click the "Documentation" button. BlockLens will automatically generate professional Markdown documentation with all methods, events, and properties.'
            }
        ];

        faqItems.forEach((item, index) => {
            this.addFaqItem(faqContainer, item.question, item.answer, index);
        });

        faqSection.addView(faqContainer);
        this.addView(faqSection);

        // Footer Section
        const footer = new View('FOOTER');
        footer.setStyleName('footer');

        const footerContent = new View('DIV');
        footerContent.setStyleName('footer__content');

        // Footer Brand
        const footerBrand = new View('DIV');
        footerBrand.setStyleName('footer__brand');

        const footerLogo = new View('DIV');
        footerLogo.setStyleName('footer__logo');
        footerLogo.domElement.innerHTML = `
            <img src="logo.png" alt="BlockLens" class="footer__logo-img">
            <span class="footer__logo-text">BlockLens</span>
        `;
        footerBrand.addView(footerLogo);

        const footerDesc = new Label('A powerful AIA Project Viewer and AIX Extension Analyzer for App Inventor 2 & its distributions');
        footerDesc.addStyleName('footer__description');
        footerBrand.addView(footerDesc);

        footerContent.addView(footerBrand);

        // Footer Links
        const footerLinks = new View('DIV');
        footerLinks.setStyleName('footer__links');

        // Quick Links Column
        const quickLinks = new View('DIV');
        quickLinks.setStyleName('footer__links-column');
        quickLinks.domElement.innerHTML = `
            <h4 class="footer__links-title">Quick Links</h4>
            <a href="https://github.com/TechHamara/BlockLens" target="_blank" class="footer__link">
                <i class="material-icons">code</i> GitHub Repository
            </a>
            <a href="https://github.com/TechHamara/BlockLens/issues" target="_blank" class="footer__link">
                <i class="material-icons">bug_report</i> Report Bug
            </a>
            <a href="https://github.com/TechHamara/BlockLens/discussions" target="_blank" class="footer__link">
                <i class="material-icons">forum</i> Discussions
            </a>
        `;
        footerLinks.addView(quickLinks);

        // Resources Column
        const resourceLinks = new View('DIV');
        resourceLinks.setStyleName('footer__links-column');
        resourceLinks.domElement.innerHTML = `
            <h4 class="footer__links-title">Resources</h4>
            <a href="https://github.com/TechHamara/BlockLens#readme" target="_blank" class="footer__link">
                <i class="material-icons">menu_book</i> Documentation
            </a>
            <a href="https://github.com/TechHamara/BlockLens#-contributing" target="_blank" class="footer__link">
                <i class="material-icons">handshake</i> Contributing
            </a>
            <a href="LICENSE" target="_blank" class="footer__link">
                <i class="material-icons">gavel</i> MIT License
            </a>
        `;
        footerLinks.addView(resourceLinks);

        footerContent.addView(footerLinks);
        footer.addView(footerContent);

        // Footer Bottom
        const footerBottom = new View('DIV');
        footerBottom.setStyleName('footer__bottom');
        footerBottom.domElement.innerHTML = `
            <div class="footer__credits">
                <span>Made with ❤️ by <a href="https://github.com/TechHamara" target="_blank">TechHamara</a></span>
            </div>
            <div class="footer__version">
                <span class="footer__version-badge">${APP_VERSION}</span>
            </div>
            <div class="footer__social">
                <a href="https://github.com/TechHamara" target="_blank" class="footer__social-link" title="GitHub">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                </a>
            </div>
            <div class="footer__copyright">
                <span>© ${new Date().getFullYear()} BlockLens. All rights reserved.</span>
            </div>
        `;
        footer.addView(footerBottom);

        this.addView(footer);
    }

    addFaqItem(container, question, answer, index) {
        const faqItem = new View('DIV');
        faqItem.setStyleName('faq-item');

        const faqQuestion = new View('DIV');
        faqQuestion.setStyleName('faq-item__question');
        faqQuestion.domElement.innerHTML = `
            <span>${question}</span>
            <i class="material-icons faq-item__toggle-icon">add</i>
        `;
        faqItem.addView(faqQuestion);

        const faqAnswer = new View('DIV');
        faqAnswer.setStyleName('faq-item__answer');
        faqAnswer.domElement.innerHTML = `<p>${answer}</p>`;
        faqItem.addView(faqAnswer);

        faqQuestion.addClickListener(() => {
            faqItem.toggleStyleName('faq-item--active');
            const icon = faqQuestion.domElement.querySelector('.faq-item__toggle-icon');
            if (faqItem.hasStyleName('faq-item--active')) {
                icon.textContent = 'remove';
                faqAnswer.domElement.style.maxHeight = faqAnswer.domElement.scrollHeight + 'px';
            } else {
                icon.textContent = 'add';
                faqAnswer.domElement.style.maxHeight = '0';
            }
        });

        container.addView(faqItem);
    }

    addFeatureCard(container, icon, title, description) {
        const card = new View('DIV');
        card.setStyleName('upload-page__feature-card');
        card.domElement.innerHTML = `
      <i class="material-icons">${icon}</i>
      <h3>${title}</h3>
      <p>${description}</p>
    `;
        container.addView(card);
    }

    setupDragDrop() {
        const dropZone = this.dropZone.domElement;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                this.dropZone.addStyleName('upload-page__drop-zone--active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                this.dropZone.removeStyleName('upload-page__drop-zone--active');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                Opener.openFile(files[0].name, files[0]);
            }
        });
    }
}

/**
 * Opener - File opener utility
 */
class Opener {
    static async openFile(path, file) {
        const parts = path.split('.');
        const ext = parts.pop().toLowerCase();
        const name = parts.join('.').split('\\').pop().split('/').pop();

        console.log('Opening file:', name, 'extension:', ext);

        if (ext === 'aiv') {
            const project = await this.openAiv(URL.createObjectURL(file));
            project.name = name;
            RootPanel.openProject(project);
        } else if (ext === 'aia') {
            const project = await AIAReader.read(file);
            project.name = name;
            RootPanel.openProject(project);
        } else if (ext === 'aix') {
            try {
                const extensions = await AIXReader.read(file);
                RootPanel.openExtensionDocs(extensions);
            } catch (error) {
                console.error('AIX Error:', error);
                new Dialog('Error opening extension', error.message || 'Unknown error').open();
            }
        } else {
            new Dialog('Unknown file type', 'Please upload .aia, .aix, or .aiv files').open();
        }
    }

    static async openURL(url) {
        const ext = url.split('.').pop().toLowerCase();
        const name = url.split('/').pop().split('.')[0];

        if (ext === 'aia') {
            const project = await AIAReader.read(url);
            project.name = name;
            RootPanel.openProject(project);
        } else if (ext === 'aiv') {
            const project = await this.openAiv(url);
            project.name = name;
            RootPanel.openProject(project);
        } else if (ext === 'aix') {
            try {
                const extensions = await AIXReader.read(url);
                RootPanel.openExtensionDocs(extensions);
            } catch (error) {
                new Dialog('Error', error.message).open();
            }
        }
    }

    static async openAiv(url) {
        RootPanel.aiv = true;
        const response = await fetch(url);
        return Flatted.parse(JSON.stringify(await response.json()));
    }
}