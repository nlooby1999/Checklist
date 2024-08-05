let products = [];
let consignments = {};
let totalProducts = 0;
let scannedProducts = 0;
let previewData = [];
let runSummaries = [];
let allPreviewData = [];
let zoomLevel = 1;

document.addEventListener("DOMContentLoaded", () => {
    const scanInput = document.getElementById("scan-input");
    const fileInput = document.getElementById("file-input");
    const savedReportInput = document.getElementById("saved-report-input");
    const downloadReportButton = document.getElementById("download-report-button");
    const unknownScanDiv = document.getElementById("unknown-scan");
    const runCompleteDiv = document.getElementById("run-complete");
    const previewTable = document.getElementById("preview-table");
    const zoomInButton = document.getElementById("zoom-in");
    const zoomOutButton = document.getElementById("zoom-out");
    const runFilter = document.getElementById("run-filter");
    const modeFilter = document.getElementById("mode-filter");

    // Load data from local storage
    loadDataFromLocalStorage();

    // Handle file input change
    fileInput.addEventListener("change", handleFileUpload);

    // Handle saved report file input change
    savedReportInput.addEventListener("change", handleSavedReportUpload);

    // Handle scan input
    scanInput.addEventListener("keypress", (event) => {
        if (event.key === 'Enter') {
            processScanInput(scanInput.value.trim());
            scanInput.value = "";
        }
    });

    // Handle download report button click
    downloadReportButton.addEventListener("click", () => {
        const isComplete = confirm("Is this complete?");
        if (isComplete) {
            const reportName = prompt("What should this report be called?", "Report");
            if (reportName) {
                downloadReport(reportName);
                clearChecklistData();
            }
        }
    });

    // Handle mode filter change
    modeFilter.addEventListener("change", () => {
        displayPreviewData(previewData);
    });

    // Zoom in and zoom out functionality
    zoomInButton.addEventListener("click", () => {
        zoomLevel += 0.1;
        previewTable.style.transform = `scale(${zoomLevel})`;
    });

    zoomOutButton.addEventListener("click", () => {
        if (zoomLevel > 0.2) {
            zoomLevel -= 0.1;
            previewTable.style.transform = `scale(${zoomLevel})`;
        }
    });

    function processScanInput(scannedCode) {
        if (scannedCode) {
            let found = false;
            unknownScanDiv.classList.add("hidden");

            if (modeFilter.value === "mark") {
                previewTable.querySelector("tbody").innerHTML = ""; // Clear the table
            }

            previewData.forEach((row, index) => {
                if (row.productNumbers.includes(scannedCode)) {
                    if (modeFilter.value === "scan") {
                        row.scannedNumbers.add(scannedCode);
                        if (row.scannedNumbers.size === row.productNumbers.length) {
                            const rowElement = document.querySelector(`tr[data-index="${index}"]`);
                            rowElement.children[10].classList.add("complete");
                            rowElement.children[11].classList.add("complete");
                            rowElement.children[12].classList.add("complete");
                            rowElement.querySelector('.status').innerHTML = '✅';
                        }
                    } else if (modeFilter.value === "mark") {
                        row.markedOff = true;
                        displayScannedRow(row, index);
                    }
                    found = true;
                    scannedProducts++;
                }
            });

            if (found) {
                scanInput.classList.add("text-green-500");
                setTimeout(() => {
                    scanInput.classList.remove("text-green-500");
                }, 1000);
                checkRunCompletion();
                saveDataToLocalStorage();
            } else {
                unknownScanDiv.classList.remove("hidden");
                setTimeout(() => {
                    unknownScanDiv.classList.add("hidden");
                }, 3000);
                scanInput.classList.add("text-red-500");
                setTimeout(() => {
                    scanInput.classList.remove("text-red-500");
                }, 1000);
            }

            if (scannedProducts === totalProducts) {
                runCompleteDiv.classList.remove("hidden");
            }
        }
    }

    function displayScannedRow(row, index) {
        const previewTbody = previewTable.querySelector("tbody");
        const rowElement = document.createElement("tr");
        rowElement.setAttribute('data-index', index);
        rowElement.innerHTML = `
            <td class="run-letter">${row.runLetter}</td>
            <td>${row.dropNumber}</td>
            <td>${row.location}</td>
            <td>${row.date}</td>
            <td>${row.soNumber}</td>
            <
