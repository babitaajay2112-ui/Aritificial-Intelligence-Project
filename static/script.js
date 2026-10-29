
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const beforeInput = document.getElementById("before-image");
    const afterInput = document.getElementById("after-image");

    const beforePreview = document.getElementById("before-preview");
    const afterPreview = document.getElementById("after-preview");

    const beforeFilename = document.getElementById("before-filename");
    const afterFilename = document.getElementById("after-filename");

    const form = document.getElementById("compare-form");
    const submitButton = document.getElementById("compare-button");

    const themeButton = document.getElementById("theme-toggle");

    const overlayButton = document.getElementById("overlay-toggle");
    const scanButton = document.getElementById("scan-toggle");
    const compareButton = document.getElementById("compare-toggle");
    const resetButton = document.getElementById("reset-view");

    const differenceCard = document.querySelector(".result-image-featured");
    const comparisonView = document.getElementById("comparison-view");
    const comparisonSlider = document.getElementById("comparison-slider");
    const comparisonStage = document.querySelector(".comparison-stage");
    const comparisonClip = document.querySelector(".comparison-after-clip");
    const comparisonDivider = document.querySelector(".comparison-divider");

    const MAX_FILE_SIZE = 15 * 1024 * 1024;

    const ALLOWED_EXTENSIONS = [
        "jpg", "jpeg", "png", "webp", "tif", "tiff"
    ];

    let submitting = false;
    let scanning = false;
    let overlayVisible = true;

    // --------------------------------------------------
    // THEME SWITCHER
    // --------------------------------------------------

    function setTheme(theme) {
        const light = theme === "light";

        document.body.classList.toggle("light-mode", light);

        if (themeButton) {
            themeButton.textContent = light ? "☾" : "☼";
            themeButton.setAttribute(
                "aria-label",
                light ? "Switch to dark theme" : "Switch to light theme"
            );
            themeButton.title = light ? "Dark theme" : "Light theme";
        }
    }

    function getSavedTheme() {
        try {
            return localStorage.getItem("terravision-theme") || "dark";
        } catch (error) {
            return "dark";
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem("terravision-theme", theme);
        } catch (error) {
            // Theme still works if browser storage is unavailable.
        }
    }

    setTheme(getSavedTheme());

    if (themeButton) {
        themeButton.addEventListener("click", () => {
            const nextTheme = document.body.classList.contains("light-mode")
                ? "dark"
                : "light";

            setTheme(nextTheme);
            saveTheme(nextTheme);
        });
    }

    // --------------------------------------------------
    // FILE VALIDATION
    // --------------------------------------------------

    function validateFile(file) {
        if (!file) {
            return "Please select an image.";
        }

        const extension = file.name.split(".").pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return "Unsupported file. Use JPG, PNG, WEBP or TIFF.";
        }

        if (file.size === 0) {
            return "The selected file is empty.";
        }

        if (file.size > MAX_FILE_SIZE) {
            return "Image size exceeds 15 MB. Please select a smaller file.";
        }

        return null;
    }

    function showError(message) {
        let box = document.getElementById("client-file-error");

        if (!box) {
            box = document.createElement("div");
            box.id = "client-file-error";
            box.className = "alert";
            box.setAttribute("role", "alert");

            const uploadGrid = document.querySelector(".upload-grid");

            if (uploadGrid) {
                uploadGrid.insertAdjacentElement("afterend", box);
            } else if (form) {
                form.prepend(box);
            }
        }

        box.textContent = message;

        box.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function clearError() {
        const box = document.getElementById("client-file-error");

        if (box) {
            box.remove();
        }
    }

    // --------------------------------------------------
    // IMAGE PREVIEWS
    // --------------------------------------------------

    function updatePreview(input, preview, filename) {
        if (!input || !preview || !filename) {
            return;
        }

        input.addEventListener("change", () => {
            clearError();

            const file = input.files && input.files[0];

            if (!file) {
                preview.removeAttribute("src");
                preview.hidden = true;
                filename.textContent = "No file selected";
                filename.classList.remove("selected");
                return;
            }

            const error = validateFile(file);

            if (error) {
                input.value = "";
                preview.removeAttribute("src");
                preview.hidden = true;
                filename.textContent = "No file selected";
                filename.classList.remove("selected");
                showError(error);
                return;
            }

            filename.textContent = file.name;
            filename.classList.add("selected");

            const reader = new FileReader();

            reader.onload = (event) => {
                preview.src = event.target.result;
                preview.hidden = false;
            };

            reader.onerror = () => {
                input.value = "";
                preview.hidden = true;
                filename.textContent = "Unable to preview image";
                showError("The browser could not read this image.");
            };

            reader.readAsDataURL(file);
        });
    }

    updatePreview(beforeInput, beforePreview, beforeFilename);
    updatePreview(afterInput, afterPreview, afterFilename);

    // --------------------------------------------------
    // DRAG AND DROP
    // --------------------------------------------------

    document.querySelectorAll(".upload-box").forEach((box) => {
        const input = box.querySelector('input[type="file"]');

        if (!input) {
            return;
        }

        ["dragenter", "dragover"].forEach((eventName) => {
            box.addEventListener(eventName, (event) => {
                event.preventDefault();
                box.classList.add("drag-over");
            });
        });

        ["dragleave", "dragend", "drop"].forEach((eventName) => {
            box.addEventListener(eventName, (event) => {
                event.preventDefault();
                box.classList.remove("drag-over");
            });
        });

        box.addEventListener("drop", (event) => {
            const files = event.dataTransfer?.files;

            if (!files || !files.length) {
                return;
            }

            try {
                const transfer = new DataTransfer();
                transfer.items.add(files[0]);
                input.files = transfer.files;

                input.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            } catch (error) {
                showError(
                    "Drag-and-drop failed. Please browse for the image instead."
                );
            }
        });
    });

    // --------------------------------------------------
    // SUBMIT FORM AND SHOW LOADING
    // --------------------------------------------------

    if (form) {
        form.addEventListener("submit", (event) => {
            if (submitting) {
                event.preventDefault();
                return;
            }

            clearError();

            const beforeFile = beforeInput?.files?.[0];
            const afterFile = afterInput?.files?.[0];

            if (!beforeFile || !afterFile) {
                event.preventDefault();
                showError("Please select both Before and After images.");
                return;
            }

            const beforeError = validateFile(beforeFile);
            const afterError = validateFile(afterFile);

            if (beforeError || afterError) {
                event.preventDefault();
                showError(beforeError || afterError);
                return;
            }

            submitting = true;

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add("is-loading");

                const label = submitButton.querySelector(".button-label");

                if (label) {
                    label.textContent = "PROCESSING IMAGES...";
                }
            }
        });
    }

    // --------------------------------------------------
    // CHANGE OVERLAY TOGGLE
    // --------------------------------------------------

    function setOverlay(visible) {
        overlayVisible = visible;

        if (differenceCard) {
            differenceCard.classList.toggle("overlay-off", !visible);
        }

        if (overlayButton) {
            overlayButton.classList.toggle("active", visible);
            overlayButton.setAttribute("aria-pressed", String(visible));
        }
    }

    if (overlayButton && differenceCard) {
        overlayButton.addEventListener("click", () => {
            setOverlay(!overlayVisible);
        });
    }

    // --------------------------------------------------
    // SCAN ANIMATION TOGGLE
    // --------------------------------------------------

    function setScanning(enabled) {
        scanning = enabled;

        if (differenceCard) {
            differenceCard.classList.toggle("scanning", enabled);
        }

        if (scanButton) {
            scanButton.classList.toggle("active", enabled);
            scanButton.setAttribute("aria-pressed", String(enabled));

            scanButton.innerHTML = enabled
                ? "<span>Ⅱ</span> Stop Scan"
                : "<span>⌖</span> Scan Animation";
        }
    }

    if (scanButton && differenceCard) {
        scanButton.addEventListener("click", () => {
            setScanning(!scanning);
        });
    }

    // --------------------------------------------------
    // BEFORE / AFTER COMPARISON SLIDER
    // --------------------------------------------------

    function updateComparison(value) {
        const position = `${value}%`;

        if (comparisonClip) {
            comparisonClip.style.width = position;
        }

        if (comparisonDivider) {
            comparisonDivider.style.left = position;
        }
    }

    if (comparisonSlider) {
        comparisonSlider.addEventListener("input", () => {
            updateComparison(comparisonSlider.value);
        });

        updateComparison(comparisonSlider.value);
    }

    // Show or hide comparison workspace.
    if (compareButton && comparisonView) {
        compareButton.addEventListener("click", () => {
            const show = comparisonView.hidden;

            comparisonView.hidden = !show;
            compareButton.classList.toggle("active", show);
            compareButton.setAttribute("aria-expanded", String(show));

            if (show) {
                if (comparisonSlider) {
                    comparisonSlider.value = 50;
                    updateComparison(50);
                }

                comparisonView.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        });
    }

    // --------------------------------------------------
    // RESET INTERACTIVE CONTROLS
    // --------------------------------------------------

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            setOverlay(true);
            setScanning(false);

            if (comparisonSlider) {
                comparisonSlider.value = 50;
                updateComparison(50);
            }

            if (comparisonView) {
                comparisonView.hidden = true;
            }

            if (compareButton) {
                compareButton.classList.remove("active");
                compareButton.setAttribute("aria-expanded", "false");
            }
        });
    }

    // --------------------------------------------------
    // CLICK RESULT IMAGE TO OPEN FULL SIZE
    // --------------------------------------------------

    document.querySelectorAll(".result-image").forEach((image) => {
        image.addEventListener("click", () => {
            if (image.src) {
                window.open(
                    image.src,
                    "_blank",
                    "noopener,noreferrer"
                );
            }
        });
    });

    // --------------------------------------------------
    // SIDEBAR NAVIGATION
    // --------------------------------------------------

    document.querySelectorAll(".nav-item").forEach((link) => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-item").forEach((item) => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });
    });

    console.info("TerraVision AI: interface initialized.");
});
