/**
 * Image Compression Utility for Block PNG Export
 * Handles SVG to PNG conversion with size constraints
 * Max dimensions: 500px width × 80px height
 */

export class ImageCompressor {
    /**
     * Configuration for image compression
     */
    static get CONFIG() {
        return {
            MAX_WIDTH: 400,
            MAX_HEIGHT: 80,
            PADDING: 8,
            CANVAS_SCALE: 1, // 2x for high-resolution output
            JPEG_QUALITY: 0.95,
            PNG_COMPRESSION: 9
        };
    }

    /**
     * Compress SVG to PNG Blob with size constraints
     * @param {SVGElement} svg - The SVG element to compress
     * @param {Object} options - Configuration options
     * @returns {Promise<Blob>}
     */
    static async svgToPNG(svg, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                if (!svg || !(svg instanceof SVGElement)) {
                    reject(new Error('Invalid SVG element'));
                    return;
                }

                const config = { ...this.CONFIG, ...options };
                
                // Get SVG dimensions
                const bbox = svg.getBBox();
                let svgWidth = parseFloat(svg.getAttribute('width') || bbox.width);
                let svgHeight = parseFloat(svg.getAttribute('height') || bbox.height);

                // Validate dimensions
                if (isNaN(svgWidth) || isNaN(svgHeight) || svgWidth <= 0 || svgHeight <= 0) {
                    svgWidth = bbox.width;
                    svgHeight = bbox.height;
                }

                // Apply size constraints
                const { scaledWidth, scaledHeight } = this.calculateDimensions(
                    svgWidth,
                    svgHeight,
                    config.MAX_WIDTH,
                    config.MAX_HEIGHT
                );

                // Add padding
                const totalWidth = scaledWidth + config.PADDING * 2;
                const totalHeight = scaledHeight + config.PADDING * 2;

                // Clone and prepare SVG for export
                const svgClone = svg.cloneNode(true);
                svgClone.setAttribute('width', scaledWidth);
                svgClone.setAttribute('height', scaledHeight);
                svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
                svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

                // Sync computed styles for WYSIWYG fidelity
                this.syncComputedStyles(svg, svgClone);

                // Wrap content with padding
                const content = svgClone.innerHTML;
                svgClone.innerHTML = `<g transform="translate(${config.PADDING}, ${config.PADDING})">${content}</g>`;

                // Convert SVG to data URL
                const svgData = new XMLSerializer().serializeToString(svgClone);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                // Load and render to canvas
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const canvasScale = config.CANVAS_SCALE;
                    canvas.width = totalWidth * canvasScale;
                    canvas.height = totalHeight * canvasScale;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        URL.revokeObjectURL(url);
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    ctx.scale(canvasScale, canvasScale);
                    ctx.drawImage(img, 0, 0, totalWidth, totalHeight);

                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(url);
                        if (!blob) {
                            reject(new Error('Failed to create blob from canvas'));
                            return;
                        }
                        resolve(blob);
                    }, 'image/png', config.JPEG_QUALITY);
                };

                img.onerror = (e) => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to load SVG image'));
                };

                img.src = url;

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Calculate scaled dimensions while maintaining aspect ratio
     * @param {number} width - Original width
     * @param {number} height - Original height
     * @param {number} maxWidth - Maximum allowed width
     * @param {number} maxHeight - Maximum allowed height
     * @returns {Object} { scaledWidth, scaledHeight }
     */
    static calculateDimensions(width, height, maxWidth, maxHeight) {
        let scale = 1;

        // Calculate scale needed to fit within constraints
        if (height > maxHeight || width > maxWidth) {
            const heightScale = maxHeight / height;
            const widthScale = maxWidth / width;
            scale = Math.min(heightScale, widthScale, 1);
        }

        return {
            scaledWidth: Math.round(width * scale),
            scaledHeight: Math.round(height * scale)
        };
    }

    /**
     * Sync computed styles from source to clone elements
     * @param {SVGElement} source - Source SVG
     * @param {SVGElement} clone - Cloned SVG
     */
    static syncComputedStyles(source, clone) {
        const sourceElements = source.querySelectorAll('*');
        const cloneElements = clone.querySelectorAll('*');

        for (let i = 0; i < sourceElements.length; i++) {
            const sourceEl = sourceElements[i];
            const cloneEl = cloneElements[i];

            if (!cloneEl || sourceEl.tagName !== cloneEl.tagName) {
                continue;
            }

            const computed = window.getComputedStyle(sourceEl);

            // Apply common styles
            cloneEl.style.fill = computed.fill;
            cloneEl.style.stroke = computed.stroke;
            cloneEl.style.strokeWidth = computed.strokeWidth;
            cloneEl.style.opacity = computed.opacity;
            cloneEl.style.display = computed.display;
            cloneEl.style.visibility = computed.visibility;
            cloneEl.style.fillOpacity = computed.fillOpacity;
            cloneEl.style.strokeOpacity = computed.strokeOpacity;

            // Apply text-specific styles
            if (sourceEl.tagName === 'text' || sourceEl.tagName === 'tspan') {
                cloneEl.style.fontFamily = computed.fontFamily;
                cloneEl.style.fontSize = computed.fontSize;
                cloneEl.style.fontWeight = computed.fontWeight;
                cloneEl.style.fontStyle = computed.fontStyle;
                cloneEl.style.textAnchor = computed.textAnchor;
                cloneEl.style.dominantBaseline = computed.dominantBaseline;
            }
        }
    }

    /**
     * Get compression ratio (for info purposes)
     * @param {number} originalSize - Original size in bytes
     * @param {number} compressedSize - Compressed size in bytes
     * @returns {string} Percentage string
     */
    static getCompressionRatio(originalSize, compressedSize) {
        const ratio = ((1 - (compressedSize / originalSize)) * 100).toFixed(2);
        return `${ratio}%`;
    }

    /**
     * Validate image dimensions
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Object} { valid: boolean, message?: string }
     */
    static validateDimensions(width, height) {
        const { MAX_WIDTH, MAX_HEIGHT } = this.CONFIG;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            return {
                valid: false,
                message: `Image exceeds limits (${width}x${height}). Max: ${MAX_WIDTH}x${MAX_HEIGHT}`
            };
        }

        if (width <= 0 || height <= 0) {
            return {
                valid: false,
                message: 'Invalid dimensions: width and height must be positive'
            };
        }

        return { valid: true };
    }
}
